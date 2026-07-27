from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.schemas.user import UserResponse


class ContactCreate(BaseModel):
    contact_user_id: str
    custom_name: Optional[str] = None


class ContactResponse(BaseModel):
    id: str
    custom_name: Optional[str] = None
    contact_user: UserResponse
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)