from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class UserBase(BaseModel):
    phone_number: str
    username: Optional[str] = None
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    about: Optional[str] = "Hey there! I am using Signal."


class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    username: Optional[str] = None
    avatar_url: Optional[str] = None
    about: Optional[str] = None


class UserResponse(UserBase):
    id: str
    is_online: bool
    last_seen: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)