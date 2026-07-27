import uuid
from datetime import datetime, timezone
import enum
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship

from app.core.database import Base


class MessageType(str, enum.Enum):
    TEXT = "TEXT"
    SYSTEM = "SYSTEM"


class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(String, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(String, nullable=False)
    message_type = Column(SQLEnum(MessageType), default=MessageType.TEXT, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User", back_populates="sent_messages")
    receipts = relationship("MessageReceipt", back_populates="message", cascade="all, delete-orphan")