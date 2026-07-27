import socketio
from typing import Dict, Set

# Initialize Socket.IO AsyncServer with CORS allowed
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*"
)

# Maps user_id -> Set of socket IDs (allows multi-tab support)
user_sockets: Dict[str, Set[str]] = {}
# Maps socket_id -> user_id
socket_users: Dict[str, str] = {}


def register_user_socket(user_id: str, sid: str):
    if user_id not in user_sockets:
        user_sockets[user_id] = set()
    user_sockets[user_id].add(sid)
    socket_users[sid] = user_id


def remove_user_socket(sid: str) -> tuple[str | None, bool]:
    """Removes a socket connection. Returns (user_id, is_completely_offline)."""
    user_id = socket_users.pop(sid, None)
    if not user_id:
        return None, False

    if user_id in user_sockets:
        user_sockets[user_id].discard(sid)
        if not user_sockets[user_id]:
            del user_sockets[user_id]
            return user_id, True  # User has no active tabs left

    return user_id, False