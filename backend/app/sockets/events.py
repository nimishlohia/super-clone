from datetime import datetime, timezone
from app.sockets.manager import sio, register_user_socket, remove_user_socket
from app.core.security import verify_token
from app.core.database import SessionLocal
from app.crud import crud_user, crud_message, crud_conversation
from app.models.message import MessageType


@sio.event
async def connect(sid, environ, auth):
    """
    Client connection handler. Authenticates user via JWT token 
    passed in auth payload: { token: "Bearer ..." }
    """
    token = auth.get("token") if auth else None
    if token and token.startswith("Bearer "):
        token = token.split(" ")[1]

    user_id = verify_token(token) if token else None
    if not user_id:
        print(f"❌ [Socket] Authentication failed for sid: {sid}")
        return False  # Reject connection

    register_user_socket(user_id, sid)
    print(f"⚡ [Socket] User connected: {user_id} (sid: {sid})")

    # Update online status in DB and broadcast to contacts
    db = SessionLocal()
    try:
        user = crud_user.get_user_by_id(db, user_id)
        if user:
            user.is_online = True
            db.commit()
            await sio.emit("user:status", {"user_id": user_id, "is_online": True})
    finally:
        db.close()


@sio.event
async def disconnect(sid):
    """Handles socket disconnection and updates online status when all user tabs close."""
    user_id, is_offline = remove_user_socket(sid)
    if is_offline and user_id:
        print(f"🔌 [Socket] User disconnected (offline): {user_id}")
        db = SessionLocal()
        try:
            user = crud_user.get_user_by_id(db, user_id)
            if user:
                user.is_online = False
                user.last_seen = datetime.now(timezone.utc)
                db.commit()
                await sio.emit("user:status", {
                    "user_id": user_id, 
                    "is_online": False, 
                    "last_seen": user.last_seen.isoformat()
                })
        finally:
            db.close()


@sio.event
async def room_join(sid, data):
    """Join a conversation room: { conversation_id: "..." }"""
    conversation_id = data.get("conversation_id")
    if conversation_id:
        await sio.enter_room(sid, conversation_id)
        print(f"🚪 [Socket] sid {sid} joined room: {conversation_id}")


@sio.event
async def room_leave(sid, data):
    """Leave a conversation room: { conversation_id: "..." }"""
    conversation_id = data.get("conversation_id")
    if conversation_id:
        await sio.leave_room(sid, conversation_id)


@sio.event
async def message_send(sid, data):
    """
    Handles incoming message emission from client:
    { conversation_id: "...", content: "...", temp_id: "..." }
    """
    from app.sockets.manager import socket_users, user_sockets
    sender_id = socket_users.get(sid)
    if not sender_id:
        return

    conversation_id = data.get("conversation_id")
    content = data.get("content")
    temp_id = data.get("temp_id")

    if not conversation_id or not content:
        return

    db = SessionLocal()
    try:
        # Save message directly to database
        msg = crud_message.create_message(
            db, 
            conversation_id=conversation_id, 
            sender_id=sender_id, 
            content=content, 
            message_type=MessageType.TEXT
        )
        
        # Update conversation updated_at
        conv = db.query(crud_conversation.Conversation).get(conversation_id)
        if conv:
            conv.updated_at = datetime.now(timezone.utc)
            db.commit()

        # Fetch sender user details
        sender_user = crud_user.get_user_by_id(db, sender_id)
        sender_dict = {
            "id": sender_user.id,
            "display_name": sender_user.display_name,
            "avatar_url": sender_user.avatar_url,
            "phone_number": sender_user.phone_number
        } if sender_user else None

        # Check if recipient(s) are online to mark DELIVERED
        initial_status = "SENT"
        if conv:
            from app.models.receipt import MessageReceipt, ReceiptStatus
            for participant in conv.participants:
                if participant.user_id != sender_id:
                    target_sids = user_sockets.get(participant.user_id, set())
                    if target_sids:
                        initial_status = "DELIVERED"
                        existing_r = db.query(MessageReceipt).filter(
                            MessageReceipt.message_id == msg.id,
                            MessageReceipt.user_id == participant.user_id
                        ).first()
                        if not existing_r:
                            r = MessageReceipt(message_id=msg.id, user_id=participant.user_id, status=ReceiptStatus.DELIVERED)
                            db.add(r)
            db.commit()

        payload = {
            "id": msg.id,
            "temp_id": temp_id,
            "conversation_id": conversation_id,
            "sender_id": sender_id,
            "sender": sender_dict,
            "content": msg.content,
            "message_type": msg.message_type.value if hasattr(msg.message_type, 'value') else str(msg.message_type),
            "status": initial_status,
            "created_at": msg.created_at.isoformat()
        }

        # Broadcast new message to room
        await sio.emit("message:new", payload, room=conversation_id)

        # Also send directly to active sockets of all participants to update sidebar
        if conv:
            for participant in conv.participants:
                target_sids = user_sockets.get(participant.user_id, set())
                for t_sid in target_sids:
                    await sio.emit("message:new", payload, to=t_sid)

        if initial_status == "DELIVERED":
            await sio.emit("receipt:update", {
                "conversation_id": conversation_id,
                "status": "DELIVERED",
                "message_ids": [msg.id]
            }, room=conversation_id)

    finally:
        db.close()


@sio.event
async def typing_start(sid, data):
    """Data: { conversation_id: "..." }"""
    from app.sockets.manager import socket_users
    user_id = socket_users.get(sid)
    conversation_id = data.get("conversation_id")
    if user_id and conversation_id:
        await sio.emit(
            "typing:update", 
            {"conversation_id": conversation_id, "user_id": user_id, "is_typing": True}, 
            room=conversation_id, 
            skip_sid=sid
        )


@sio.event
async def typing_stop(sid, data):
    """Data: { conversation_id: "..." }"""
    from app.sockets.manager import socket_users
    user_id = socket_users.get(sid)
    conversation_id = data.get("conversation_id")
    if user_id and conversation_id:
        await sio.emit(
            "typing:update", 
            {"conversation_id": conversation_id, "user_id": user_id, "is_typing": False}, 
            room=conversation_id, 
            skip_sid=sid
        )


@sio.event
async def message_read(sid, data):
    """Data: { conversation_id: "..." }"""
    from app.sockets.manager import socket_users
    user_id = socket_users.get(sid)
    conversation_id = data.get("conversation_id")
    if user_id and conversation_id:
        db = SessionLocal()
        try:
            read_ids = crud_message.mark_messages_read(db, conversation_id=conversation_id, user_id=user_id)
            await sio.emit("receipt:update", {
                "conversation_id": conversation_id,
                "user_id": user_id,
                "status": "READ",
                "message_ids": read_ids
            }, room=conversation_id)
        finally:
            db.close()