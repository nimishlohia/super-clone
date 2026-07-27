from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.contact import Contact
from app.models.user import User


def get_user_contacts(db: Session, owner_id: str) -> List[Contact]:
    return db.query(Contact).filter(Contact.owner_id == owner_id).all()


def add_contact(db: Session, owner_id: str, contact_user_id: str, custom_name: Optional[str] = None) -> Contact:
    existing = db.query(Contact).filter(
        Contact.owner_id == owner_id, 
        Contact.contact_user_id == contact_user_id
    ).first()
    if existing:
        return existing

    contact = Contact(
        owner_id=owner_id,
        contact_user_id=contact_user_id,
        custom_name=custom_name
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


def search_users(db: Session, query: str, current_user_id: str) -> List[User]:
    """Search registered users by phone or display name (excluding self)."""
    return db.query(User).filter(
        User.id != current_user_id,
        (User.phone_number.contains(query)) | (User.display_name.contains(query))
    ).limit(20).all()
    