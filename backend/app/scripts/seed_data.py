from sqlalchemy.orm import Session
from app.models.user import User
from app.models.contact import Contact
from app.models.conversation import Conversation, ConversationType
from app.models.participant import ConversationParticipant, ParticipantRole
from app.models.message import Message, MessageType
from app.models.receipt import MessageReceipt, ReceiptStatus

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

GREETINGS = {
    "+15551234567": "Hey! Signal Core Security active 🔒 Your identity is verified.",
    "+15559876543": "Privacy advocate here 🛡️ — all your messages are encrypted.",
    "+15554567890": "Double ratchet key exchange complete 🔑 We can chat securely.",
    "+15553332222": "Security audit clean — all systems go 🔍",
    "+15554445555": "Encrypted tunnel operational ⚡ Connection secured.",
    "+15556667777": "Zero-knowledge proof confirmed 🌐 Your data stays yours.",
    "+15558889999": "Quantum-resistant encryption initialized ⚛️ Future-proof security!",
    "+15550001111": "Welcome to Signal Messenger! 🔐 Speak freely — we've got your privacy covered."
}


def _ensure_demo_users(db: Session):
    """Creates any missing demo users in the DB. Returns list of all demo User objects."""
    users = []
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
        users.append(u)
    return users


def _ensure_group_chat(db: Session, demo_users):
    """Creates the Dev Core Team group chat if it doesn't exist yet."""
    group_conv = db.query(Conversation).filter(
        Conversation.type == ConversationType.GROUP,
        Conversation.title == "Dev Core Team 🔒"
    ).first()

    if not group_conv:
        group_conv = Conversation(
            type=ConversationType.GROUP,
            title="Dev Core Team 🔒",
            avatar_url="https://api.dicebear.com/7.x/identicon/svg?seed=DevCore"
        )
        db.add(group_conv)
        db.flush()

        for i, u in enumerate(demo_users[:3]):
            role = ParticipantRole.ADMIN if i == 0 else ParticipantRole.MEMBER
            db.add(ConversationParticipant(conversation_id=group_conv.id, user_id=u.id, role=role))
        db.commit()

        msg = Message(
            conversation_id=group_conv.id,
            sender_id=demo_users[0].id,
            content="Welcome to Signal Messenger! All messages are end-to-end encrypted. 🔒",
            message_type=MessageType.TEXT
        )
        db.add(msg)
        db.commit()

    return group_conv


def seed_initial_data(db: Session):
    """Ensure all demo users and the group chat exist in DB."""
    demo_users = _ensure_demo_users(db)
    _ensure_group_chat(db, demo_users)


def auto_add_contacts_for_user(db: Session, user: User):
    """
    Unconditionally ensures that the logged-in user:
    1. Has all demo platform users as contacts
    2. Has an active direct conversation with each demo user (with an initial greeting)
    3. Is a member of the Dev Core Team group chat
    """
    demo_users = _ensure_demo_users(db)
    group_conv = _ensure_group_chat(db, demo_users)

    from app.crud.crud_conversation import get_or_create_direct_conversation, add_group_member

    for demo_user in demo_users:
        if demo_user.id == user.id:
            continue

        # Add contact if missing (idempotent)
        existing_contact = db.query(Contact).filter(
            Contact.owner_id == user.id,
            Contact.contact_user_id == demo_user.id
        ).first()
        if not existing_contact:
            db.add(Contact(
                owner_id=user.id,
                contact_user_id=demo_user.id,
                custom_name=demo_user.display_name
            ))

        # Create or get direct conversation
        conv = get_or_create_direct_conversation(db, user.id, demo_user.id)

        # Add greeting message only if chat is completely empty
        msg_exists = db.query(Message).filter(Message.conversation_id == conv.id).count()
        if msg_exists == 0:
            greeting = GREETINGS.get(demo_user.phone_number, "Hey there! I am using Signal.")
            msg = Message(
                conversation_id=conv.id,
                sender_id=demo_user.id,
                content=greeting,
                message_type=MessageType.TEXT
            )
            db.add(msg)
            db.flush()
            db.add(MessageReceipt(message_id=msg.id, user_id=user.id, status=ReceiptStatus.READ))

    db.commit()

    # Add user to group chat (idempotent)
    add_group_member(db, group_conv.id, user.id, ParticipantRole.MEMBER)
