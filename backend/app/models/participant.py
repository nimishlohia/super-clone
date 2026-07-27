import uuid
from datetime import datetime, timezone
import enum
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SQLEnum, UniqueConstraint
from sqlalchemy.orm import relationship

from app.core.database import Base


class ParticipantRole(str, enum.Enum):
    ADMIN = "ADMIN"
    MEMBER = "MEMBER"


class ConversationParticipant(Base):
    __tablename__ = "conversation_participants"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(String, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(SQLEnum(ParticipantRole), default=ParticipantRole.MEMBER, nullable=False)
    last_read_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    joined_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint("conversation_id", "user_id", name="uq_conversation_user"),
    )

    # Relationships
    conversation = relationship("Conversation", back_populates="participants")
    user = relationship("User", back_populates="participations")