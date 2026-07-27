from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, get_current_user_id
from app.crud import crud_user
from app.schemas.auth import OTPRequest, OTPVerifyRequest, TokenResponse
from app.schemas.user import UserResponse, UserUpdate

router = APIRouter()


@router.post("/request-otp", status_code=status.HTTP_200_OK)
def request_otp(payload: OTPRequest):
    """
    Simulates sending an SMS OTP to a given phone number.
    Returns instructions stating the mock OTP (e.g. 123456).
    """
    return {
        "message": f"OTP successfully sent to {payload.phone_number}.",
        "mock_otp": settings.MOCK_OTP,
        "note": "Use this mock_otp to complete verification."
    }


@router.post("/verify-otp", response_model=TokenResponse)
def verify_otp(payload: OTPVerifyRequest, db: Session = Depends(get_db)):
    """
    Verifies the provided OTP against the mock configuration[cite: 1].
    If valid, finds or creates the user and returns a signed JWT access token[cite: 1].
    """
    if payload.otp != settings.MOCK_OTP:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP code. Please use the mock OTP: 123456"
        )

    user = crud_user.get_user_by_phone(db, phone_number=payload.phone_number)
    is_new_user = False

    if not user:
        user = crud_user.create_user(db, phone_number=payload.phone_number)
        is_new_user = True

    # Always run on every login — ensures demo users, contacts, and conversations exist
    import traceback
    try:
        from app.scripts.seed_data import auto_add_contacts_for_user
        auto_add_contacts_for_user(db, user)
    except Exception as e:
        print(f"[WARN] auto_add_contacts_for_user failed: {e}")
        traceback.print_exc()

    access_token = create_access_token(subject=user.id)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        is_new_user=is_new_user or (not user.display_name),
        user_id=user.id
    )


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Returns profile for currently authenticated JWT token holder."""
    user = crud_user.get_user_by_id(db, user_id=current_user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.patch("/me", response_model=UserResponse)
def update_current_user_profile(
    payload: UserUpdate,
    current_user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    """Updates display name, avatar, or about text for logged-in user."""
    user = crud_user.get_user_by_id(db, user_id=current_user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return crud_user.update_user(db, user=user, obj_in=payload)