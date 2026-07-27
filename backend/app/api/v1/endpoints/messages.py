from typing import List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.crud import crud_message
from app.schemas.message import MessageResponse

router = APIRouter()


@router.get("/{conversation_id}", response_model=List[MessageResponse])
def get_messages(
    conversation_id: str,
    limit: int = Query(50, le=100),
    offset: int = Query(0),
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    messages = crud_message.get_conversation_messages(db, conversation_id=conversation_id, limit=limit, offset=offset)
    result = []
    for msg in messages:
        msg_status = crud_message.get_message_status(msg, current_user_id)
        result.append(MessageResponse(
            id=msg.id,
            conversation_id=msg.conversation_id,
            sender_id=msg.sender_id,
            sender=msg.sender,
            content=msg.content,
            message_type=msg.message_type,
            status=msg_status,
            created_at=msg.created_at
        ))
    return result


@router.post("/{conversation_id}/read")
def mark_conversation_read(
    conversation_id: str,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    updated_ids = crud_message.mark_messages_read(db, conversation_id=conversation_id, user_id=current_user_id)
    return {"message": "Messages marked as read", "updated_count": len(updated_ids)}