from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.models.conversation import ConversationType
from app.schemas.user import UserResponse


class DirectConversationCreate(BaseModel):
    target_user_id: str


class GroupConversationCreate(BaseModel):
    title: str
    avatar_url: Optional[str] = None
    participant_ids: List[str]  # List of user IDs to add


class GroupConversationUpdate(BaseModel):
    title: Optional[str] = None
    avatar_url: Optional[str] = None


class ConversationParticipantResponse(BaseModel):
    user: UserResponse
    role: str
    joined_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationResponse(BaseModel):
    id: str
    type: ConversationType
    title: Optional[str] = None
    avatar_url: Optional[str] = None
    updated_at: datetime
    created_at: datetime
    participants: List[ConversationParticipantResponse] = []
    unread_count: int = 0
    last_message: Optional[str] = None
    last_message_time: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)