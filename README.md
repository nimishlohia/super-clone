# Signal Desktop Clone

A full-stack, production-grade **Signal Desktop Clone** application developed for the **Scaler SDE Full-Stack Assignment**. This project faithfully recreates the official Signal Desktop user experience, pixel-perfect dark/light design aesthetic, and real-time messaging architecture.

---

## Table of Contents

- [Project Description](#project-description)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup Instructions](#setup-instructions)
- [Environment Variables](#environment-variables)
- [Architecture Overview](#architecture-overview)
- [Database Schema](#database-schema)
- [API Overview](#api-overview)
- [Real-Time Flow](#real-time-flow)
- [Assumptions](#assumptions)
- [Future Improvements](#future-improvements)
- [Screenshots](#screenshots)
- [License](#license)

---

## Project Description

The objective of this project is to build a complete, highly responsive, and robust Signal Desktop experience. The application features phone number authentication with mock OTP validation, persistent database storage, real-time one-to-one and group messaging via WebSockets, delivery and read receipts (Signal-style single check, double check, blue double check), real-time typing indicators, contacts management, settings modal, and dark/light theme switching.

---

## Features

- **Authentication & Sessions**: Phone number entry, 6-digit OTP verification (mocked: `123456`), JWT access tokens, and persistent user sessions via local storage.
- **Signal Desktop UI & Themes**: Pixel-perfect Signal Desktop layout, sidebar collapse toggle, Signal dark and light themes, and smooth micro-animations.
- **One-to-One Messaging**: Instant direct messaging between registered users with chronological chat history.
- **Group Messaging**: Complete Signal group chat management — create groups, upload/set group avatars, search contact members, inline admin profile editing, add/remove members, leave group, and auto-admin transfer.
- **Delivery & Read Receipts (Signal-style)**:
  - ⏳ **Sending**: Pending message transmission (`Clock` icon).
  - ✓ **Sent**: Saved on server/database (`Check` icon).
  - ✓✓ **Delivered**: Received by recipient's device socket (`CheckCheck` grey icon).
  - ✓✓ **Read**: Opened/viewed by recipient (`CheckCheck` blue icon `#85B6FF`).
- **Real-Time Typing Indicators**: Shows animated `"<User> is typing..."` in header subtitle and chat area when the recipient is composing a message.
- **Contacts & Conversation List**: Real-time filtering, auto-sorting conversation list by recent activity (`updated_at.desc()`), saved contacts tab with 1-click chat initiation, and unread badges.
- **Online & Last Seen Indicators**: Displays online green status badge and "Last seen HH:MM" indicators.
- **Settings Modal**: User profile editor (name, phone, about), theme toggle (Dark / Light / System), account management, privacy options, and about dialog.

---

## Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Library**: React 18, TypeScript
- **Styling**: Vanilla CSS, HSL design system tokens, Tailwind CSS
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **Real-Time**: Socket.IO Client (`socket.io-client`)

### Backend
- **Framework**: FastAPI (Python 3.11)
- **ORM**: SQLAlchemy 2.0
- **Database**: SQLite (`signal.db`)
- **Real-Time Engine**: python-socketio (ASGI engine)
- **Security & Auth**: PyJWT, Passlib (Bcrypt), Python-Multipart

### State Management
- React Context API (`AuthContext`, `SocketContext`) and local React component state (`useState`, `useEffect`, `useRef`).

---

## Project Structure

```
super-clone/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── api.py
│   │   │       └── endpoints/
│   │   │           ├── auth.py
│   │   │           ├── contacts.py
│   │   │           ├── conversations.py
│   │   │           ├── messages.py
│   │   │           └── users.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   │   └── security.py
│   │   ├── crud/
│   │   │   ├── crud_contact.py
│   │   │   ├── crud_conversation.py
│   │   │   ├── crud_message.py
│   │   │   └── crud_user.py
│   │   ├── models/
│   │   │   ├── contact.py
│   │   │   ├── conversation.py
│   │   │   ├── message.py
│   │   │   ├── receipt.py
│   │   │   └── user.py
│   │   ├── schemas/
│   │   │   ├── contact.py
│   │   │   ├── conversation.py
│   │   │   ├── message.py
│   │   │   ├── token.py
│   │   │   └── user.py
│   │   ├── sockets/
│   │   │   ├── events.py
│   │   │   └── manager.py
│   │   └── main.py
│   ├── requirements.txt
│   └── signal.db
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   └── login/page.tsx
│   │   │   ├── (dashboard)/
│   │   │   │   └── page.tsx
│   │   │   ├── layout.tsx
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   └── settings/settings-view.tsx
│   │   ├── context/
│   │   │   ├── auth-context.tsx
│   │   │   └── socket-context.tsx
│   │   ├── lib/
│   │   │   ├── api-client.ts
│   │   │   └── utils.ts
│   │   └── types/
│   │       ├── chat.ts
│   │       └── user.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── next.config.mjs
└── README.md
```

---

## Setup Instructions

### Prerequisites
- Node.js (v18.x or higher)
- Python (v3.11 or higher)
- npm or yarn

### 1. Clone Repository
```bash
git clone https://github.com/your-username/super-clone.git
cd super-clone
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
# source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Frontend Setup
Open a new terminal window in the root directory:
```bash
cd frontend
npm install
npm run dev
```

### 4. Open Application
Navigate to `http://localhost:3000` in your web browser.

---

## Environment Variables

### Backend (`backend/.env`)
```env
SECRET_KEY=super-secret-signal-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=43200
DATABASE_URL=sqlite:///./signal.db
CORS_ORIGINS=["http://localhost:3000"]
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_SOCKET_URL=http://localhost:8000
```

---

## Architecture Overview

1. **Client Tier**: Next.js 14 App Router application handling state, WebSocket real-time event subscriptions, and responsive UI rendering.
2. **REST API Tier**: FastAPI service exposing endpoints for authentication, contacts, conversation management, message history, and user settings.
3. **Real-Time WebSocket Tier**: Socket.IO server engine (`python-socketio`) managing active connection pools, room joins (`room_join`), real-time message broadcasting (`message_send` -> `message:new`), typing notifications (`typing_start` / `typing_stop`), and receipt updates (`message_read` -> `receipt:update`).
4. **Database Tier**: SQLite database managed via SQLAlchemy 2.0 models and CRUD services.

---

## Database Schema

```
+--------------------+       +--------------------+       +------------------------------+
|       users        |       |    conversations   |       |  conversation_participants   |
+--------------------+       +--------------------+       +------------------------------+
| id (PK)            |<----->| id (PK)            |<----->| id (PK)                      |
| phone_number (UQ)  |       | type (DIRECT/GROUP)|       | conversation_id (FK)         |
| username           |       | title              |       | user_id (FK)                 |
| display_name       |       | avatar_url         |       | role (ADMIN/MEMBER)          |
| avatar_url         |       | created_at         |       | joined_at                    |
| about              |       | updated_at         |       +------------------------------+
| is_online          |       +--------------------+
| last_seen          |                 ^
+--------------------+                 |
          ^                            v
          |                  +--------------------+       +------------------------------+
          |                  |      messages      |       |       message_receipts       |
          |                  +--------------------+       +------------------------------+
          +----------------->| id (PK)            |<----->| id (PK)                      |
                             | conversation_id(FK)|       | message_id (FK)              |
                             | sender_id (FK)     |       | user_id (FK)                 |
                             | content            |       | status (DELIVERED/READ)      |
                             | message_type       |       | updated_at                   |
                             | created_at         |       +------------------------------+
                             +--------------------+
```

---

## API Overview

### Auth Endpoints (`/api/v1/auth`)
- `POST /auth/request-otp` – Request 6-digit OTP for phone number.
- `POST /auth/verify-otp` – Validate OTP (`123456`) and return JWT access token.

### User Endpoints (`/api/v1/users`)
- `GET /users/me` – Fetch logged-in user profile.
- `PATCH /users/me` – Update display name, avatar URL, or about section.

### Contact Endpoints (`/api/v1/contacts`)
- `GET /contacts` – List saved contacts for logged-in user.
- `POST /contacts` – Save a user to contacts list.
- `GET /contacts/search?q=` – Search users by name or phone number.

### Conversation Endpoints (`/api/v1/conversations`)
- `GET /conversations` – Fetch active conversations sorted by activity.
- `POST /conversations/direct` – Start or get direct 1-to-1 conversation.
- `POST /conversations/group` – Create new group chat with title, avatar, and members.
- `PATCH /conversations/{id}` – Admin update group title or avatar.
- `POST /conversations/{id}/members` – Admin add group members.
- `DELETE /conversations/{id}/members/{user_id}` – Remove or leave group member.
- `DELETE /conversations/{id}` – Admin delete group chat.

### Message Endpoints (`/api/v1/messages`)
- `GET /messages/{conversation_id}` – Fetch chronological message history with status.
- `POST /messages/{conversation_id}/read` – Mark conversation messages as read.

---

## Real-Time Flow

1. **Connection & Rooms**: On login, client connects to Socket.IO and joins conversation rooms via `room_join`.
2. **Sending Messages**: Client emits `message_send` with `{ conversation_id, content, temp_id }`. Server saves message in DB, auto-creates `DELIVERED` receipts for active sockets, and emits `message:new` to room and participant sockets.
3. **Read Receipts**: Client emits `message_read` on viewing active conversation. Server marks receipts as `READ` in DB and broadcasts `receipt:update` to room.
4. **Typing Indicators**: Client emits `typing_start` / `typing_stop`. Server broadcasts `typing:update` to room (excluding sender).

---

## Assumptions

- **Mocked OTP**: Verification accepts `123456` for any phone number.
- **Simulated Security**: Displays Signal safety badges and shield indicators.
- **Mocked Presence**: Online status and last-seen timestamps automatically track Socket.IO connection states.

---

## Future Improvements

- End-to-End Encryption (Signal Protocol implementation).
- Media, image, and voice note upload attachments.
- Native Desktop packaging via Electron.
- Push Notifications.

---

## Screenshots

*(Placeholder: UI mockups can be captured when running the application locally)*
- **Dark Theme Dashboard**: Signal dark theme chat view with conversation sidebar.
- **Group Management Modal**: Admin group settings, member search, and role management.
- **Light Theme Interface**: Sleek light theme option.

---

## License

This project is licensed under the [MIT License](LICENSE).
