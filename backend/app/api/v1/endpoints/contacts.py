from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.crud import crud_contact
from app.schemas.contact import ContactCreate, ContactResponse
from app.schemas.user import UserResponse

router = APIRouter()


@router.get("", response_model=List[ContactResponse])
def get_contacts(current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    contacts = crud_contact.get_user_contacts(db, owner_id=current_user_id)
    if not contacts:
        from app.crud import crud_user
        from app.scripts.seed_data import auto_add_contacts_for_user
        user = crud_user.get_user_by_id(db, user_id=current_user_id)
        if user:
            auto_add_contacts_for_user(db, user)
            contacts = crud_contact.get_user_contacts(db, owner_id=current_user_id)
    return contacts


@router.post("", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
def add_new_contact(payload: ContactCreate, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    if payload.contact_user_id == current_user_id:
        raise HTTPException(status_code=400, detail="Cannot add yourself as a contact")
    return crud_contact.add_contact(db, owner_id=current_user_id, contact_user_id=payload.contact_user_id, custom_name=payload.custom_name)


@router.get("/search", response_model=List[UserResponse])
def search_users(q: str = Query(..., min_length=1), current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    return crud_contact.search_users(db, query=q, current_user_id=current_user_id)


from pydantic import BaseModel
from typing import Optional
from app.crud import crud_user, crud_conversation

class CustomUserContactCreate(BaseModel):
    phone_number: str
    display_name: str
    about: Optional[str] = "Hey there! I am using Signal."
    avatar_url: Optional[str] = None


@router.post("/custom", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
def create_and_add_custom_user(
    payload: CustomUserContactCreate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    # Find or create target user
    target_user = crud_user.get_user_by_phone(db, phone_number=payload.phone_number)
    if not target_user:
        avatar = payload.avatar_url or f"https://api.dicebear.com/7.x/bottts/svg?seed={payload.display_name}"
        target_user = crud_user.create_user(db, phone_number=payload.phone_number)
        target_user.display_name = payload.display_name
        target_user.about = payload.about
        target_user.avatar_url = avatar
        target_user.is_online = True
        db.commit()
        db.refresh(target_user)
    elif payload.display_name:
        target_user.display_name = payload.display_name
        db.commit()

    if target_user.id == current_user_id:
        raise HTTPException(status_code=400, detail="Cannot add yourself as a contact")

    # Add contact for current user
    contact = crud_contact.add_contact(
        db,
        owner_id=current_user_id,
        contact_user_id=target_user.id,
        custom_name=payload.display_name
    )

    # Auto-create direct conversation
    crud_conversation.get_or_create_direct_conversation(db, current_user_id, target_user.id)

    return contact