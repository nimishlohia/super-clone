from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.message import MessageType
from app.schemas.user import UserResponse


class MessageCreate(BaseModel):
    conversation_id: str
    content: str


class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    sender_id: str
    sender: UserResponse
    content: str
    message_type: MessageType
    status: str = "SENT"
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)