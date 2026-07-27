from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.message import Message, MessageType
from app.models.receipt import MessageReceipt, ReceiptStatus


def get_conversation_messages(db: Session, conversation_id: str, limit: int = 50, offset: int = 0) -> List[Message]:
    return db.query(Message).filter(
        Message.conversation_id == conversation_id
    ).order_by(Message.created_at.asc()).offset(offset).limit(limit).all()


def create_message(db: Session, conversation_id: str, sender_id: str, content: str, message_type: MessageType = MessageType.TEXT) -> Message:
    msg = Message(
        conversation_id=conversation_id,
        sender_id=sender_id,
        content=content,
        message_type=message_type
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


def mark_messages_read(db: Session, conversation_id: str, user_id: str) -> List[str]:
    """Marks all messages in conversation as READ for user_id and returns list of read message IDs."""
    messages = db.query(Message).filter(
        Message.conversation_id == conversation_id,
        Message.sender_id != user_id
    ).all()
    
    all_read_ids = []
    for msg in messages:
        all_read_ids.append(msg.id)
        receipt = db.query(MessageReceipt).filter(
            MessageReceipt.message_id == msg.id,
            MessageReceipt.user_id == user_id
        ).first()

        if not receipt:
            receipt = MessageReceipt(message_id=msg.id, user_id=user_id, status=ReceiptStatus.READ)
            db.add(receipt)
        elif receipt.status != ReceiptStatus.READ:
            receipt.status = ReceiptStatus.READ

    db.commit()
    return all_read_ids


def get_message_status(msg: Message, current_user_id: str) -> str:
    """Calculates overall receipt status for sender: READ, DELIVERED, or SENT."""
    if not msg.receipts:
        return "SENT"
    statuses = []
    for r in msg.receipts:
        val = r.status.value if hasattr(r.status, 'value') else str(r.status)
        val = str(val).replace("ReceiptStatus.", "")
        statuses.append(val)
    if "READ" in statuses:
        return "READ"
    if "DELIVERED" in statuses:
        return "DELIVERED"
    return "SENT"