from typing import Optional
from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.user import UserUpdate


def get_user_by_id(db: Session, user_id: str) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_phone(db: Session, phone_number: str) -> Optional[User]:
    return db.query(User).filter(User.phone_number == phone_number).first()


def create_user(db: Session, phone_number: str) -> User:
    db_user = User(phone_number=phone_number)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def update_user(db: Session, user: User, obj_in: UserUpdate) -> User:
    update_data = obj_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user