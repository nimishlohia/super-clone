import asyncio
import random
from datetime import datetime, timezone
from app.sockets.manager import sio, register_user_socket, remove_user_socket
from app.core.security import verify_token
from app.core.database import SessionLocal
from app.crud import crud_user, crud_message, crud_conversation
from app.models.message import MessageType


# Pool of realistic bot replies per contact phone number
BOT_REPLIES = {
    "+919876543210": ["Bhai kya scene hai? 😄", "Aaj office mein kuch interesting hua!", "Kab free hai tu? Coffee pe chalte hain ☕", "Yaar code review kar de mera jaldi 💻"],
    "+919123456789": ["Heyy! Kuch plan hai weekend ka? 🏖️", "Trip kab bana rahe hain? Goa ka wait nahi hota! ✈️", "Insta pe teri photo dekhi — bahut acchi thi! 😍"],
    "+919234567890": ["Bhai match dekhega aaj? 🏏", "Fantasy team ready hai tera?", "Rooftop pe IPL dekhte hain aaj raat 🔥"],
    "+919345678901": ["Hiiii! Kya kar rahi hai? 💃", "Naya song suna tune? Mast hai!", "Dance class join kar mere saath! 😄"],
    "+919456789012": ["Startup update: Series A mein ja rahe hain! 🚀", "Bhai investor ne haan bol di!", "Celebration dinner pe aayega? 🎉"],
    "+919567890123": ["Hello! Hospital se nikli abhi 😴", "Patient sab theek hain, thanks for asking 🙏", "Sunday coffee? Miss kar rahi hoon tujhe!"],
    "+919678901234": ["Jai Hind bhai 🇮🇳", "Desh sewa mein lage hain, yaad aata hai yaar", "Ghar ki khabar de kabhi kabhi 🙏"],
    "+919789012345": ["New playlist ready! 🎵 Bhejun?", "Arijit ke naye songs sun le — life changing hai", "Kabhi music show chalein saath mein? 🎶"],
    "+919890123456": ["Biking trip pakka Sunday! 🏍️", "Manali ya Kasol — teri choice bata", "Helmet full gear ready hai mera 💪"],
    "+919901234567": ["Namaste 🙏 Aaj yoga amazing tha!", "Tu bhi try kar — 15 minutes daily", "Inner peace milti hai yaar seriously ✨"],
    "+918001234567": ["Biryani Sunday pakka? 🍛", "Naya restaurant 4.8 stars pe hai Zomato mein!", "Champions League semifinal dekha? 🔥⚽"],
    "+918012345678": ["Naya collection launch ho gaya! 👗✨", "Tujhe pehle dikhaungi — special discount bhi", "Fashion week mein aayegi mere saath? 🌟"],
    "+918023456789": ["Product feature live ho gaya! 💡", "Beta testing mein help karoge?", "Bhai feedback do — real users ki zaroorat hai 🙏"],
    "+918034567890": ["Amma ne special payasam banaya aaj 😍", "Kerala ka monsoon amazing hai yaar 🌧️", "Ghar aa jao — proper Kerala feast dunga!"],
    "+918045678901": ["Naya poem likha aaj 📝", "Bhejun WhatsApp pe? Review chahiye", "Kolkata book fair mein chalein is baar? 📚"],
    "+918056789012": ["CA exams kaafi paas aa gaye 😰", "Prayer karo bhai — bahut pressure hai!", "Clear kar li toh treat pakka 🎊"],
    "+918067890123": ["Hyderabadi biryani update: naya spot mila! 🍛👑", "Paradise se bhi accha hai yaar seriously", "Iss weekend Hyderabad aaja — food tour dunga!"],
    "+918078901234": ["Product ka growth amazing chal raha hai 🚀", "1000 users ho gaye pehle week mein!", "Tera feedback chahiye — apna number de dunga app ka 😊"],
    "+918089012345": ["Prelims clear ho gaye! 🎉", "Mains ki taiyari shuru ho gayi", "UPSC journey chal rahi hai — dua karo yaar 🙏"],
    "+918090123456": ["Short film festival mein selection ho gayi! 🎬🏆", "National level competition hai", "Red carpet pe aayega mere saath? 😎"],
    "+917001234567": ["Lucknow mein aao kabhi 😊", "Tunday Kababi khilaungi — life changing experience", "Iss shahar ki mohabbat alag hi hai ❤️"],
    "+917012345678": ["Bhai gym session epic tha aaj 💪", "New PR set kiya bench press mein!", "Aaja kal gym — partner chahiye mujhe 🏋️"],
    "+917023456789": ["Court mein aaj interesting case tha ⚖️", "Justice system slow hai par kaam karta hai", "Legal advice chahiye kabhi toh bata 😊"],
    "+917034567890": ["Chess tournament next week! ♟️", "Practice kar raha hoon — Gold chahiye is baar", "Online chess khelenge kal raat?"],
    "+917045678901": ["Ganga ghaat pe aarti dekhi aaj 🕌", "Itna sukoon milta hai yahan", "Varanasi aao kabhi — spiritual journey karaati hoon ✨"],
    "+917056789012": ["Market aaj green tha 📈", "Portfolio 8% upar gaya is week", "Stock tips chahiye? Bata — investment advice de sakta hoon 😄"],
    "+917067890123": ["Golden Temple darshan kiya aaj 🙏", "Waheguru ki kirpa se sab accha hai", "Amritsar aao kabhi — langar bhi khilaunga!"],
    "+917078901234": ["Naya photo series upload ki hai! 📷", "Rajasthan landscapes — must see!", "Photography trip join karoge next month? 🌅"],
    "+15551234567": ["Your encryption keys are verified 🔒", "All messages secured with Signal Protocol", "You're protected. Message freely! 🛡️"],
    "+15559876543": ["Privacy check complete ✅", "Your data belongs to you only 🛡️", "No tracking. No ads. Pure privacy."],
    "+15550001111": ["Signal tip: Enable disappearing messages for extra privacy!", "You can verify safety numbers with your contacts 🔐", "Stay secure! Update the app regularly ⚡"],
}

RANDOM_BOT_CONTACTS = [
    "+919876543210", "+919123456789", "+919234567890", "+919345678901",
    "+919456789012", "+919567890123", "+919789012345", "+919890123456",
    "+919901234567", "+918001234567", "+918012345678", "+918056789012",
]

# Keyword-based smart replies (checked against user's incoming message)
SMART_REPLIES = [
    (["hi", "hello", "hey", "heyy", "namaste", "hola"],
     ["Heyyy! Kaisa hai? 😄", "Hello! Kya haal hai? 👋", "Namaste ji! 🙏 Bolo kya scene hai?", "Hiii! So good to hear from you! 😊"]),
    (["kaise", "kaisa", "how are you", "sup", "what's up"],
     ["Main bilkul mast hoon yaar! Tu bata? 😄", "Sab badhiya! Life is good 🙌", "Ekdum first class! Coffee pi raha tha abhi ☕"]),
    (["kya kar", "what doing", "busy"],
     ["Yaar abhi thoda kaam tha, par tere liye time hai! 😄", "Bas phone pe hi tha! Bata kya hua?", "Kuch khas nahi, tujhse baat karni thi 😊"]),
    (["khana", "food", "lunch", "dinner", "biryani", "pizza", "chai", "coffee"],
     ["Arrey bhai! Abhi khaya — bahut accha tha 😋", "Food ki baat mat karo yaar, bhookh lag gayi! 😂", "Haan yaar! Kal saath mein khate hain? 🍛"]),
    (["plan", "weekend", "milte", "meet", "outing"],
     ["Haan yaar! Pakka milte hain weekend pe 🙌", "Plan bana! Main ready hoon 🎉", "Saturday ya Sunday — teri choice! 😄"]),
    (["work", "job", "office", "kaam"],
     ["Bhai office ka stress mat le — chill kar 😅", "Aaj kaam toh ho gaya, ab life bhi jee le! 😄", "Main bhi kaam mein laga hoon — mushkil hai yaar!"]),
    (["ok", "okay", "theek", "accha", "haan", "yes", "sure"],
     ["👍", "Perfect! 😊", "Haan bilkul!", "Sahi hai yaar!"]),
    (["bye", "tc", "take care", "alvida", "later"],
     ["Bye yaar! Take care 🙏", "Phir milenge! 😊", "Alvida! Dhayn rakho apna ❤️"]),
    (["love", "pyaar", "dil", "❤️", "😍"],
     ["Awwww 🥹❤️", "Yaar! 😊 Tu bhi!", "Hehe you're the best yaar!"]),
    (["thanks", "shukriya", "thank you", "ty"],
     ["Koi baat nahi yaar! 🙏", "Always for you! 😊", "Arrey yaar — mention not! ❤️"]),
]

FALLBACK_REPLIES = [
    "Haan yaar, sahi keh raha hai! 😄",
    "Sach mein? Bata aur! 👀",
    "Waah! Ekdum sahi 🙌",
    "Haha bhai tu toh kamaal hai 😂",
    "Acha acha, samajh gaya! 😊",
    "Arre yaar interesting hai yeh! 💡",
    "Haan bhai, main bhi yahi soch raha tha!",
    "LOL 😂 Tu toh pagal hai!",
    "Seriously?? Bata mujhe poora! 👀",
    "❤️ Bahut accha laga sun ke!",
    "Chalo yaar plan karte hain phir! 🎉",
    "Main abhi free nahi tha — ab hoon! Bata kya hua?",
    "Yaar tujhe pata hai tu best hai? 😄",
    "Haan haan — aur phir kya hua?",
    "😂😂 Classic!",
]


def _pick_reply(user_message: str, phone: str) -> str:
    """Pick a contextually smart reply based on the user's message."""
    msg_lower = user_message.lower()
    for keywords, replies in SMART_REPLIES:
        if any(k in msg_lower for k in keywords):
            return random.choice(replies)
    # Fall back to contact-specific reply pool or generic fallback
    contact_pool = BOT_REPLIES.get(phone, [])
    combined = contact_pool + FALLBACK_REPLIES
    return random.choice(combined)


async def _bot_auto_reply(bot_user_id: str, to_user_id: str, to_sid: str,
                           conversation_id: str, user_message: str):
    """Bot contact sends a contextually aware reply after a realistic typing delay."""
    await asyncio.sleep(random.uniform(2.0, 5.0))

    from app.sockets.manager import user_sockets
    # Only reply if user is still connected
    if to_sid not in user_sockets.get(to_user_id, set()):
        return

    db = SessionLocal()
    try:
        bot_user = crud_user.get_user_by_id(db, bot_user_id)
        if not bot_user:
            return

        # Show typing indicator
        typing_payload = {
            "conversation_id": conversation_id,
            "user_id": bot_user.id,
            "is_typing": True
        }
        await sio.emit("typing:update", typing_payload, to=to_sid)
        await asyncio.emit if False else None  # noop

        # Typing duration (1–3 sec)
        await asyncio.sleep(random.uniform(1.0, 3.0))
        await sio.emit("typing:update", {**typing_payload, "is_typing": False}, to=to_sid)

        # Pick smart reply
        reply_text = _pick_reply(user_message, bot_user.phone_number)

        # Save to DB
        from app.models.receipt import MessageReceipt, ReceiptStatus
        msg = crud_message.create_message(
            db,
            conversation_id=conversation_id,
            sender_id=bot_user.id,
            content=reply_text,
            message_type=MessageType.TEXT
        )
        db.add(MessageReceipt(message_id=msg.id, user_id=to_user_id, status=ReceiptStatus.READ))

        # Update conversation timestamp
        conv = crud_conversation.get_conversation_by_id(db, conversation_id)
        if conv:
            conv.updated_at = datetime.now(timezone.utc)
        db.commit()

        payload = {
            "id": msg.id,
            "temp_id": None,
            "conversation_id": conversation_id,
            "sender_id": bot_user.id,
            "sender": {
                "id": bot_user.id,
                "display_name": bot_user.display_name,
                "avatar_url": bot_user.avatar_url,
                "phone_number": bot_user.phone_number,
            },
            "content": reply_text,
            "message_type": "TEXT",
            "status": "READ",
            "created_at": msg.created_at.isoformat()
        }

        # Emit to user and the conversation room
        await sio.emit("message:new", payload, to=to_sid)
        await sio.emit("message:new", payload, room=conversation_id)
        await sio.emit("receipt:update", {
            "conversation_id": conversation_id,
            "user_id": to_user_id,
            "status": "READ",
            "message_ids": [msg.id]
        }, to=to_sid)

    except Exception as e:
        print(f"[BotReply] Error: {e}")
    finally:
        db.close()


async def _send_bot_message(user_id: str, sid: str, delay: float):
    """Sends a bot message from a random contact to the user after `delay` seconds."""
    await asyncio.sleep(delay)

    from app.sockets.manager import user_sockets
    if sid not in user_sockets.get(user_id, set()):
        return  # user disconnected

    db = SessionLocal()
    try:
        # Pick a random bot contact
        bot_phone = random.choice(RANDOM_BOT_CONTACTS)
        bot_user = crud_user.get_user_by_phone(db, phone_number=bot_phone)
        if not bot_user:
            return

        # Find direct conversation between bot and user
        from app.crud.crud_conversation import get_or_create_direct_conversation
        conv = get_or_create_direct_conversation(db, user_id, bot_user.id)

        # Emit typing indicator
        typing_payload = {
            "conversation_id": conv.id,
            "user_id": bot_user.id,
            "is_typing": True
        }
        await sio.emit("typing:update", typing_payload, to=sid)

        # Wait 1.5–3 seconds (simulate typing)
        await asyncio.sleep(random.uniform(1.5, 3.0))

        # Stop typing
        await sio.emit("typing:update", {**typing_payload, "is_typing": False}, to=sid)

        # Pick and save the bot message
        reply_pool = BOT_REPLIES.get(bot_phone, ["Hey! 👋"])
        content = random.choice(reply_pool)

        from app.models.receipt import MessageReceipt, ReceiptStatus
        msg = crud_message.create_message(
            db,
            conversation_id=conv.id,
            sender_id=bot_user.id,
            content=content,
            message_type=MessageType.TEXT
        )

        # Mark as READ for the logged-in user
        existing_r = db.query(MessageReceipt).filter(
            MessageReceipt.message_id == msg.id,
            MessageReceipt.user_id == user_id
        ).first()
        if not existing_r:
            db.add(MessageReceipt(message_id=msg.id, user_id=user_id, status=ReceiptStatus.READ))
            db.commit()

        # Update conversation updated_at
        conv.updated_at = datetime.now(timezone.utc)
        db.commit()

        payload = {
            "id": msg.id,
            "temp_id": None,
            "conversation_id": conv.id,
            "sender_id": bot_user.id,
            "sender": {
                "id": bot_user.id,
                "display_name": bot_user.display_name,
                "avatar_url": bot_user.avatar_url,
                "phone_number": bot_user.phone_number
            },
            "content": content,
            "message_type": "TEXT",
            "status": "READ",
            "created_at": msg.created_at.isoformat()
        }

        # Deliver to the user's socket
        await sio.emit("message:new", payload, to=sid)

    except Exception as e:
        print(f"[BotMsg] Error sending bot message: {e}")
    finally:
        db.close()


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

    # Schedule 2–4 random bot messages arriving at random delays after login
    num_bots = random.randint(2, 4)
    delays = sorted(random.uniform(4, 20) for _ in range(num_bots))
    for delay in delays:
        asyncio.ensure_future(_send_bot_message(user_id, sid, delay))



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
        conv = crud_conversation.get_conversation_by_id(db, conversation_id)
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

        # --- BOT AUTO-REPLY ---
        # If this is a direct conversation with a bot contact, schedule a reply
        if conv and conv.type.value == "DIRECT":
            from app.models.conversation import ConversationType
            bot_participant_id = None
            for participant in conv.participants:
                if participant.user_id != sender_id:
                    # Check if this participant is a demo bot
                    other_user = crud_user.get_user_by_id(db, participant.user_id)
                    if other_user and other_user.phone_number in BOT_REPLIES:
                        bot_participant_id = other_user.id
                        break

            if bot_participant_id:
                asyncio.ensure_future(
                    _bot_auto_reply(
                        bot_user_id=bot_participant_id,
                        to_user_id=sender_id,
                        to_sid=sid,
                        conversation_id=conversation_id,
                        user_message=content
                    )
                )

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