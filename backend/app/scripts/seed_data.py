from sqlalchemy.orm import Session
from app.models.user import User
from app.models.contact import Contact
from app.models.conversation import Conversation, ConversationType
from app.models.participant import ConversationParticipant, ParticipantRole
from app.models.message import Message, MessageType, MessageStatus
from app.models.receipt import MessageReceipt, ReceiptStatus
from datetime import datetime, timezone

DEMO_USERS = [
    {
        "phone_number": "+15551234567",
        "display_name": "Alice Sentinel",
        "about": "Signal Core Security 🔒",
        "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=Alice"
    },
    {
        "phone_number": "+15559876543",
        "display_name": "Bob Security",
        "about": "Privacy advocate & dev 🛡️",
        "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=Bob"
    },
    {
        "phone_number": "+15554567890",
        "display_name": "Charlie Cipher",
        "about": "Cryptography enthusiast 🔑",
        "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=Charlie"
    },
    {
        "phone_number": "+15553332222",
        "display_name": "David Keymaster",
        "about": "Security Researcher 🔍",
        "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=David"
    },
    {
        "phone_number": "+15554445555",
        "display_name": "Eva Firewall",
        "about": "Network Systems Engineer ⚡",
        "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=Eva"
    },
    {
        "phone_number": "+15556667777",
        "display_name": "Frank Vault",
        "about": "Zero-Knowledge Proof Specialist 🌐",
        "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=Frank"
    },
    {
        "phone_number": "+15558889999",
        "display_name": "Grace Quantum",
        "about": "Post-Quantum Cryptography ⚛️",
        "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=Grace"
    },
    {
        "phone_number": "+15550001111",
        "display_name": "Signal Protocol Assistant",
        "about": "Official Signal Assistant ⚡",
        "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=SignalSupport"
    }
]


def seed_initial_data(db: Session):
    """Seed initial demo users and a sample group if DB has 0 users or demo users missing."""
    print("Verifying platform demo users...")
    created_users = []
    for u_data in DEMO_USERS:
        u = db.query(User).filter(User.phone_number == u_data["phone_number"]).first()
        if not u:
            u = User(
                phone_number=u_data["phone_number"],
                display_name=u_data["display_name"],
                about=u_data["about"],
                avatar_url=u_data["avatar_url"],
                is_online=True
            )
            db.add(u)
            db.commit()
            db.refresh(u)
        created_users.append(u)

    # Link demo contacts to each other
    for i, u1 in enumerate(created_users):
        for j, u2 in enumerate(created_users):
            if i != j:
                existing = db.query(Contact).filter(
                    Contact.owner_id == u1.id,
                    Contact.contact_user_id == u2.id
                ).first()
                if not existing:
                    c = Contact(owner_id=u1.id, contact_user_id=u2.id, custom_name=u2.display_name)
                    db.add(c)
    db.commit()

    # Create a demo group conversation if it doesn't exist
    existing_group = db.query(Conversation).filter(Conversation.type == ConversationType.GROUP, Conversation.title == "Dev Core Team 🔒").first()
    if not existing_group and len(created_users) >= 3:
        group_conv = Conversation(
            type=ConversationType.GROUP,
            title="Dev Core Team 🔒",
            avatar_url="https://api.dicebear.com/7.x/identicon/svg?seed=DevCore"
        )
        db.add(group_conv)
        db.flush()

        p1 = ConversationParticipant(conversation_id=group_conv.id, user_id=created_users[0].id, role=ParticipantRole.ADMIN)
        p2 = ConversationParticipant(conversation_id=group_conv.id, user_id=created_users[1].id, role=ParticipantRole.MEMBER)
        p3 = ConversationParticipant(conversation_id=group_conv.id, user_id=created_users[2].id, role=ParticipantRole.MEMBER)
        db.add_all([p1, p2, p3])
        db.commit()

        msg = Message(
            conversation_id=group_conv.id,
            sender_id=created_users[0].id,
            content="Welcome to Signal Messenger! All messages are end-to-end encrypted.",
            message_type=MessageType.TEXT,
            status=MessageStatus.READ
        )
        db.add(msg)
        db.commit()


def auto_add_contacts_for_user(db: Session, user: User):
    """Automatically add existing demo/platform users as contacts for a newly registered or logging-in user."""
    seed_initial_data(db)
    other_users = db.query(User).filter(User.id != user.id).all()
    for o in other_users:
        existing = db.query(Contact).filter(
            Contact.owner_id == user.id,
            Contact.contact_user_id == o.id
        ).first()
        if not existing:
            c = Contact(owner_id=user.id, contact_user_id=o.id, custom_name=o.display_name or o.phone_number)
            db.add(c)
    db.commit()

    # Also auto-create initial welcome conversation with Alice Sentinel & Signal Protocol Assistant
    from app.crud.crud_conversation import get_or_create_direct_conversation
    alice = db.query(User).filter(User.phone_number == "+15551234567").first()
    if alice and alice.id != user.id:
        conv = get_or_create_direct_conversation(db, user.id, alice.id)
        msg_count = db.query(Message).filter(Message.conversation_id == conv.id).count()
        if msg_count == 0:
            msg = Message(
                conversation_id=conv.id,
                sender_id=alice.id,
                content="Hey there! Welcome to Signal. Your communications are end-to-end encrypted.",
                message_type=MessageType.TEXT,
                status=MessageStatus.READ
            )
            db.add(msg)
            db.flush()
            r = MessageReceipt(message_id=msg.id, user_id=user.id, status=ReceiptStatus.READ)
            db.add(r)
            db.commit()
