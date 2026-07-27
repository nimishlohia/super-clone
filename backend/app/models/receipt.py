import uuid
from datetime import datetime, timezone
import enum
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum as SQLEnum, UniqueConstraint
from sqlalchemy.orm import relationship

from app.core.database import Base


class ReceiptStatus(str, enum.Enum):
    DELIVERED = "DELIVERED"
    READ = "READ"


class MessageReceipt(Base):
    __tablename__ = "message_receipts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    message_id = Column(String, ForeignKey("messages.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(SQLEnum(ReceiptStatus), default=ReceiptStatus.DELIVERED, nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint("message_id", "user_id", name="uq_message_user_receipt"),
    )

    # Relationships
    message = relationship("Message", back_populates="receipts")
    user = relationship("User", foreign_keys=[user_id])