from pydantic import BaseModel, Field


class OTPRequest(BaseModel):
    phone_number: str = Field(..., example="+1234567890", description="E.164 formatted phone number")


class OTPVerifyRequest(BaseModel):
    phone_number: str = Field(..., example="+1234567890")
    otp: str = Field(..., example="123456")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    is_new_user: bool
    user_id: str