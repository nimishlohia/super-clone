import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import Base, engine
import app.models  # Register all database models
from app.api.v1.router import api_router
from app.sockets.manager import sio
import app.sockets.events  # Register event handlers

# Auto-create all SQLite tables on startup
Base.metadata.create_all(bind=engine)

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

# Mount Next.js frontend export if available (for single-service deployment)
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

out_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../frontend/out"))
if not os.path.exists(out_dir):
    out_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../frontend/out"))

if os.path.exists(out_dir):
    next_dir = os.path.join(out_dir, "_next")
    if os.path.exists(next_dir):
        fastapi_app.mount("/_next", StaticFiles(directory=next_dir), name="next_static")

    @fastapi_app.get("/{full_path:path}")
    async def serve_static_frontend(full_path: str):
        if full_path.startswith("api") or full_path.startswith("socket.io"):
            return None
        target = os.path.join(out_dir, full_path)
        if os.path.isfile(target):
            return FileResponse(target)
        target_html = os.path.join(out_dir, f"{full_path}.html")
        if os.path.isfile(target_html):
            return FileResponse(target_html)
        index_html = os.path.join(out_dir, "index.html")
        if os.path.isfile(index_html):
            return FileResponse(index_html)
        return FileResponse(os.path.join(out_dir, "index.html"))

# Wrap FastAPI with Socket.IO ASGI server
app = socketio.ASGIApp(
    socketio_server=sio,
    other_asgi_app=fastapi_app,
    socketio_path="/socket.io"
)