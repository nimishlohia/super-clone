import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.v1.router import api_router
from app.sockets.manager import sio
import app.sockets.events  # Register event handlers

fastapi_app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS configuration
fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.CORS_ORIGINS] or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

fastapi_app.include_router(api_router, prefix=settings.API_V1_STR)

@fastapi_app.get("/health")
def health_check():
    return {"status": "ok", "app": settings.PROJECT_NAME, "version": settings.VERSION}

# Wrap FastAPI with Socket.IO ASGI server
app = socketio.ASGIApp(
    socketio_server=sio,
    other_asgi_app=fastapi_app,
    socketio_path="/socket.io"
)