import sys
import os
from datetime import datetime, timezone, timedelta

# Add backend parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.core.database import SessionLocal, engine, Base
from app.models.user import User
from app.models.contact import Contact
from app.models.conversation import Conversation, ConversationType
from app.models.participant import ConversationParticipant, ParticipantRole
from app.models.message import Message, MessageType

def seed_data():
    print("Seeding database with initial sample data...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 1. Primary User (Matching User Screenshot 3)
        user_me = db.query(User).filter_map if hasattr(db.query(User), 'filter_map') else None
        user_me = db.query(User).filter(User.phone_number == "098161 07025").first()
        if not user_me:
            user_me = User(
                phone_number="098161 07025",
                username="nimishlohia",
                display_name="Nimish Lohia",
                about="Available on Signal",
                is_online=True
            )
            db.add(user_me)
            db.flush()

        # 2. Contact User (Matching User Screenshot 1 & 2)
        user_akash = db.query(User).filter(User.phone_number == "+1987654321").first()
        if not user_akash:
            user_akash = User(
                phone_number="+1987654321",
                username="akashbiswas",
                display_name="Akash Biswas BU",
                about="Coding on Signal",
                is_online=True
            )
            db.add(user_akash)
            db.flush()

        # 3. Additional Contact User
        user_sarah = db.query(User).filter(User.phone_number == "+1122334455").first()
        if not user_sarah:
            user_sarah = User(
                phone_number="+1122334455",
                username="sarah_connor",
                display_name="Sarah Connor",
                about="No fate but what we make.",
                is_online=False
            )
            db.add(user_sarah)
            db.flush()

        # 4. Contacts Links
        c1 = db.query(Contact).filter(Contact.owner_id == user_me.id, Contact.contact_user_id == user_akash.id).first()
        if not c1:
            db.add(Contact(owner_id=user_me.id, contact_user_id=user_akash.id))
        c2 = db.query(Contact).filter(Contact.owner_id == user_me.id, Contact.contact_user_id == user_sarah.id).first()
        if not c2:
            db.add(Contact(owner_id=user_me.id, contact_user_id=user_sarah.id))

        # 5. Direct Conversation between Nimish and Akash
        conv_akash = db.query(Conversation).join(ConversationParticipant).filter(
            Conversation.type == ConversationType.DIRECT,
            ConversationParticipant.user_id == user_me.id
        ).first()

        if not conv_akash:
            conv_akash = Conversation(type=ConversationType.DIRECT, updated_at=datetime.now(timezone.utc) - timedelta(minutes=8))
            db.add(conv_akash)
            db.flush()

            p1 = ConversationParticipant(conversation_id=conv_akash.id, user_id=user_me.id, role=ParticipantRole.MEMBER)
            p2 = ConversationParticipant(conversation_id=conv_akash.id, user_id=user_akash.id, role=ParticipantRole.MEMBER)
            db.add_all([p1, p2])
            db.flush()

            # Seed initial messages
            m1 = Message(
                conversation_id=conv_akash.id,
                sender_id=user_akash.id,
                content="Hey Nimish! Let's test the Signal messaging app.",
                message_type=MessageType.TEXT,
                created_at=datetime.now(timezone.utc) - timedelta(minutes=10)
            )
            m2 = Message(
                conversation_id=conv_akash.id,
                sender_id=user_me.id,
                content="Hi Akash, the UI and real-time sockets are working great!",
                message_type=MessageType.TEXT,
                created_at=datetime.now(timezone.utc) - timedelta(minutes=8)
            )
            db.add_all([m1, m2])

        db.commit()
        print("[SUCCESS] Sample data seeded successfully!")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
