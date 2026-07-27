import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship

from app.core.database import Base


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    owner_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    contact_user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    custom_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint("owner_id", "contact_user_id", name="uq_owner_contact"),
    )

    # Relationships
    owner = relationship("User", foreign_keys=[owner_id], back_populates="contacts_owned")
    contact_user = relationship("User", foreign_keys=[contact_user_id])