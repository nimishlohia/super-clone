import uuid
from datetime import datetime, timezone
import enum
from sqlalchemy import Column, String, DateTime, Enum as SQLEnum
from sqlalchemy.orm import relationship

from app.core.database import Base


class ConversationType(str, enum.Enum):
    DIRECT = "DIRECT"
    GROUP = "GROUP"


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    type = Column(SQLEnum(ConversationType), default=ConversationType.DIRECT, nullable=False)
    title = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    participants = relationship("ConversationParticipant", back_populates="conversation", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")