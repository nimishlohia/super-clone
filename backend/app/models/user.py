import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.orm import relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    phone_number = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=True)
    display_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    about = Column(String, default="Hey there! I am using Signal.")
    is_online = Column(Boolean, default=False)
    last_seen = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    participations = relationship("ConversationParticipant", back_populates="user", cascade="all, delete-orphan")
    sent_messages = relationship("Message", back_populates="sender")
    contacts_owned = relationship("Contact", foreign_keys="Contact.owner_id", back_populates="owner")