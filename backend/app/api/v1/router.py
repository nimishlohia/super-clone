from fastapi import APIRouter
from app.api.v1.endpoints import auth, contacts, conversations, messages

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(contacts.router, prefix="/contacts", tags=["Contacts"])
api_router.include_router(conversations.router, prefix="/conversations", tags=["Conversations"])
api_router.include_router(messages.router, prefix="/messages", tags=["Messages"])