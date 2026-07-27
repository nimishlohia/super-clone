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
    return crud_contact.get_user_contacts(db, owner_id=current_user_id)


@router.post("", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
def add_new_contact(payload: ContactCreate, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    if payload.contact_user_id == current_user_id:
        raise HTTPException(status_code=400, detail="Cannot add yourself as a contact")
    return crud_contact.add_contact(db, owner_id=current_user_id, contact_user_id=payload.contact_user_id, custom_name=payload.custom_name)


@router.get("/search", response_model=List[UserResponse])
def search_users(q: str = Query(..., min_length=1), current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    return crud_contact.search_users(db, query=q, current_user_id=current_user_id)