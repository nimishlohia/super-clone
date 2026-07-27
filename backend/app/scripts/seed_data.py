from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from app.models.user import User
from app.models.contact import Contact
from app.models.conversation import Conversation, ConversationType
from app.models.participant import ConversationParticipant, ParticipantRole
from app.models.message import Message, MessageType
from app.models.receipt import MessageReceipt, ReceiptStatus

# Helper to compute last_seen relative to now
def _mins_ago(m): return datetime.now(timezone.utc) - timedelta(minutes=m)
def _hours_ago(h): return datetime.now(timezone.utc) - timedelta(hours=h)
def _days_ago(d): return datetime.now(timezone.utc) - timedelta(days=d)

DEMO_USERS = [
    # ── Tech / Security core users (always online) ──────────────────────────
    {
        "phone_number": "+15551234567",
        "display_name": "Alice Sentinel",
        "about": "Signal Core Security 🔒",
        "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=Alice",
        "is_online": True,
        "last_seen": None,
    },
    {
        "phone_number": "+15559876543",
        "display_name": "Bob Security",
        "about": "Privacy advocate & dev 🛡️",
        "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=Bob",
        "is_online": True,
        "last_seen": None,
    },
    {
        "phone_number": "+15550001111",
        "display_name": "Signal Assistant",
        "about": "Official Signal Assistant ⚡",
        "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=SignalSupport",
        "is_online": True,
        "last_seen": None,
    },

    # ── Indian contacts ──────────────────────────────────────────────────────
    {
        "phone_number": "+919876543210",
        "display_name": "Aarav Sharma",
        "about": "Software Engineer @ Infosys 💻",
        "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Aarav",
        "is_online": True,
        "last_seen": None,
    },
    {
        "phone_number": "+919123456789",
        "display_name": "Priya Patel",
        "about": "Life is short, travel more ✈️🌏",
        "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya",
        "is_online": False,
        "last_seen": _mins_ago(3),
    },
    {
        "phone_number": "+919234567890",
        "display_name": "Rohan Mehta",
        "about": "Cricket 🏏 | Chai ☕ | Code 💻",
        "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Rohan",
        "is_online": False,
        "last_seen": _mins_ago(15),
    },
    {
        "phone_number": "+919345678901",
        "display_name": "Sneha Iyer",
        "about": "Dancer 💃 | Foodie 🍜 | Dreamer ✨",
        "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Sneha",
        "is_online": True,
        "last_seen": None,
    },
    {
        "phone_number": "+919456789012",
        "display_name": "Vikram Nair",
        "about": "IITian | Startup guy 🚀 | Coffee addict",
        "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Vikram",
        "is_online": False,
        "last_seen": _mins_ago(45),
    },
    {
        "phone_number": "+919567890123",
        "display_name": "Ananya Reddy",
        "about": "Doctor 👩‍⚕️ | Saving lives one day at a time",
        "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Ananya",
        "is_online": False,
        "last_seen": _hours_ago(1),
    },
    {
        "phone_number": "+919678901234",
        "display_name": "Arjun Singh",
        "about": "Army 🇮🇳 | Jai Hind 🙏",
        "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Arjun",
        "is_online": False,
        "last_seen": _hours_ago(2),
    },
    {
        "phone_number": "+919789012345",
        "display_name": "Kavya Krishnan",
        "about": "Music 🎵 | Books 📚 | Chai lover ☕",
        "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Kavya",
        "is_online": True,
        "last_seen": None,
    },
    {
        "phone_number": "+919890123456",
        "display_name": "Rahul Gupta",
        "about": "Delhi boy 🏙️ | CA | Weekend biker 🏍️",
        "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul",
        "is_online": False,
        "last_seen": _hours_ago(3),
    },
    {
        "phone_number": "+919901234567",
        "display_name": "Meera Joshi",
        "about": "Teacher 👩‍🏫 | Yoga everyday 🧘‍♀️",
        "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Meera",
        "is_online": False,
        "last_seen": _hours_ago(4),
    },
    {
        "phone_number": "+918001234567",
        "display_name": "Karthik Venkat",
        "about": "Bangalore techie 🧑‍💻 | Foodie | FC Barcelona ⚽",
        "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Karthik",
        "is_online": True,
        "last_seen": None,
    },
    {
        "phone_number": "+918012345678",
        "display_name": "Pooja Desai",
        "about": "Fashion designer 👗 | Mumbai 🌆",
        "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Pooja",
        "is_online": False,
        "last_seen": _hours_ago(5),
    },
    {
        "phone_number": "+918023456789",
        "display_name": "Siddharth Kumar",
        "about": "Product Manager | Ex-Flipkart | Dad 👨‍👧",
        "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Siddharth",
        "is_online": False,
        "last_seen": _hours_ago(6),
    },
    {
        "phone_number": "+918034567890",
        "display_name": "Divya Menon",
        "about": "Kerala 🌴 | Chef 👩‍🍳 | Home is where the food is",
        "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Divya",
        "is_online": False,
        "last_seen": _hours_ago(8),
    },
    {
        "phone_number": "+918045678901",
        "display_name": "Aditya Bose",
        "about": "Kolkata knight 🎭 | Poet | Rabindranath fan",
        "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Aditya",
        "is_online": False,
        "last_seen": _hours_ago(10),
    },
    {
        "phone_number": "+918056789012",
        "display_name": "Shreya Agarwal",
        "about": "CA student 📊 | Jaipur girl 🏰 | Pink city proud",
        "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Shreya",
        "is_online": True,
        "last_seen": None,
    },
    {
        "phone_number": "+918067890123",
        "display_name": "Nikhil Rao",
        "about": "Hyderabad biryani > everything 🍛",
        "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Nikhil",
        "is_online": False,
        "last_seen": _hours_ago(12),
    },
    {
        "phone_number": "+918078901234",
        "display_name": "Tanvi Shah",
        "about": "Entrepreneur 💡 | Ahmedabad | Making things happen",
        "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Tanvi",
        "is_online": False,
        "last_seen": _days_ago(1),
    },
    {
        "phone_number": "+918089012345",
        "display_name": "Manish Tiwari",
        "about": "UPSC aspirant 📖 | Dilli | Chai pe charcha ☕",
        "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Manish",
        "is_online": False,
        "last_seen": _days_ago(1),
    },
    {
        "phone_number": "+918090123456",
        "display_name": "Ishaan Chopra",
        "about": "Filmmaker 🎬 | Mumbai | Stories matter",
        "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Ishaan",
        "is_online": True,
        "last_seen": None,
    },
    {
        "phone_number": "+917001234567",
        "display_name": "Riya Saxena",
        "about": "Lucknow nawab 👑 | CA | Dance & drama",
        "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Riya",
        "is_online": False,
        "last_seen": _days_ago(2),
    },
    {
        "phone_number": "+917012345678",
        "display_name": "Varun Malhotra",
        "about": "Punjab da puttar 🌾 | Gym rat 💪 | Hustler",
        "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Varun",
        "is_online": False,
        "last_seen": _days_ago(2),
    },
    {
        "phone_number": "+917023456789",
        "display_name": "Nandita Pillai",
        "about": "Lawyer ⚖️ | Chennai | Justice always wins",
        "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Nandita",
        "is_online": False,
        "last_seen": _days_ago(3),
    },
    {
        "phone_number": "+917034567890",
        "display_name": "Ayush Verma",
        "about": "Gym 🏋️ | Chess ♟️ | IIT Bombay alumni",
        "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Ayush",
        "is_online": True,
        "last_seen": None,
    },
    {
        "phone_number": "+917045678901",
        "display_name": "Ankita Mishra",
        "about": "Banaras ghat vibes 🕌 | Sanskrit lover | Spiritual ✨",
        "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Ankita",
        "is_online": False,
        "last_seen": _days_ago(3),
    },
    {
        "phone_number": "+917056789012",
        "display_name": "Harsh Vardhan",
        "about": "Investor 📈 | Gurgaon | Chai & stocks",
        "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Harsh",
        "is_online": False,
        "last_seen": _days_ago(4),
    },
    {
        "phone_number": "+917067890123",
        "display_name": "Simran Kaur",
        "about": "Waheguru Ji 🙏 | Amritsar | Golden Temple daily",
        "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Simran",
        "is_online": False,
        "last_seen": _days_ago(5),
    },
    {
        "phone_number": "+917078901234",
        "display_name": "Dev Choudhary",
        "about": "Rajasthan royal 🏰 | Photographer 📷 | Wanderlust",
        "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Dev",
        "is_online": True,
        "last_seen": None,
    },
]

GREETINGS = {
    "+15551234567": "Hey! Signal Core Security active 🔒 Your identity is verified.",
    "+15559876543": "Privacy advocate here 🛡️ — all your messages are encrypted.",
    "+15550001111": "Welcome to Signal Messenger! 🔐 Speak freely — we've got your privacy covered.",
    "+919876543210": "Arre yaar! Kaisa hai tu? 😄 Kab milte hai coffee pe?",
    "+919123456789": "Heyy! Long time no see 👋 Trip ka plan bana rahe ho?",
    "+919234567890": "Bhai! Kal match dekha? Kya game tha 🏏🔥",
    "+919345678901": "Hiiii! Dance class kaisi rahi? 💃",
    "+919456789012": "Startup mein kya chal raha hai bhai? Investor mila? 🚀",
    "+919567890123": "Hello! Just came back from a long shift 😴 How are you?",
    "+919678901234": "Jai Hind! Desh ki seva mein lage hain 🇮🇳",
    "+919789012345": "Sunna! New song recommend karo na 🎵 Kuch accha?",
    "+919890123456": "Bhai biking trip plan karte hain weekend pe? 🏍️",
    "+919901234567": "Namaste 🙏 Yoga kaisa chal raha hai tumhara?",
    "+918001234567": "Dude what are you doing this weekend? Biryani plan? 🍛",
    "+918012345678": "Yaar naya outfit design kiya hai! Dekhna hai? 👗✨",
    "+918023456789": "Bhai product mein kuch interesting feature build kar raha hoon 💡",
    "+918034567890": "Amma ne today special avial banaya 😍 Kerala vibes!",
    "+918045678901": "Aaj ek nayi kavita likhi... sunoge? 🎭📝",
    "+918056789012": "CA finals ka pressure bahut zyada hai yaar 😩 Wish me luck!",
    "+918067890123": "Hyderabadi biryani is life and there's no debate 🍛👑",
    "+918078901234": "New product launch ho gaya! Ab aage dekhte hain 🚀",
    "+918089012345": "Prelims ki taiyari kar raha hoon... prayer karo yaar 🙏",
    "+918090123456": "Short film ki shooting thi aaj! Amazing day 🎬",
    "+917001234567": "Lucknow mein aana ho toh zaroor batana! Kebab treat pe 😋",
    "+917012345678": "Gym chhod ke pizza khaya 😅 Kal double session pakka",
    "+917023456789": "Court mein aaj ek bada case jeet gaye! Justice delivered ⚖️",
    "+917034567890": "Chess tournament mein second aaya 🥈 Next time first!",
    "+917045678901": "Ganga ghaat pe baithi hoon 🕌 Bahut sukoon hai yahan",
    "+917056789012": "Market green hai aaj 📈 Acche returns aa rahe hain!",
    "+917067890123": "Waheguru Ji da Khalsa, Waheguru Ji di Fateh 🙏",
    "+917078901234": "Rajasthan ke sunset ki photo upload ki hai! Check karo 📷🌅",
}

GROUP_CHATS = [
    {
        "title": "Dev Core Team 🔒",
        "avatar_url": "https://api.dicebear.com/7.x/identicon/svg?seed=DevCore",
        "seed_phones": ["+15551234567", "+15559876543", "+919876543210"],
        "welcome": "Welcome to Signal Messenger! All messages are end-to-end encrypted. 🔒",
    },
    {
        "title": "College Buddies 🎓",
        "avatar_url": "https://api.dicebear.com/7.x/identicon/svg?seed=CollegeBuddies",
        "seed_phones": ["+919234567890", "+919345678901", "+919456789012", "+919789012345"],
        "welcome": "Yaad hai woh hostel ki raatein? 😂🍕 Good times!",
    },
    {
        "title": "Office Gang 💼",
        "avatar_url": "https://api.dicebear.com/7.x/identicon/svg?seed=OfficeGang",
        "seed_phones": ["+918001234567", "+918023456789", "+918056789012", "+918067890123"],
        "welcome": "Office pe chai break mein milte hain! ☕",
    },
    {
        "title": "Family 👨‍👩‍👧‍👦",
        "avatar_url": "https://api.dicebear.com/7.x/identicon/svg?seed=FamilyGroup",
        "seed_phones": ["+919567890123", "+919901234567", "+918034567890", "+917045678901"],
        "welcome": "Jai Shree Krishna 🙏 Sabka swagat hai! Sabse pehle... khana kha liya? 😄",
    },
]


def _ensure_demo_users(db: Session):
    """Creates any missing demo users in the DB. Returns list of all demo User objects."""
    users = []
    for u_data in DEMO_USERS:
        u = db.query(User).filter(User.phone_number == u_data["phone_number"]).first()
        if not u:
            now = datetime.now(timezone.utc)
            u = User(
                phone_number=u_data["phone_number"],
                display_name=u_data["display_name"],
                about=u_data["about"],
                avatar_url=u_data["avatar_url"],
                is_online=u_data.get("is_online", False),
                last_seen=u_data.get("last_seen") or now,
            )
            db.add(u)
            db.commit()
            db.refresh(u)
        else:
            # Always keep last_seen and online status up to date
            u.is_online = u_data.get("is_online", False)
            if u_data.get("last_seen"):
                u.last_seen = u_data["last_seen"]
            db.commit()
        users.append(u)
    return users


def _ensure_group_chats(db: Session, all_demo_users):
    """Creates the group chats if they don't exist yet."""
    phone_to_user = {u.phone_number: u for u in all_demo_users}
    result = []

    for gdata in GROUP_CHATS:
        group_conv = db.query(Conversation).filter(
            Conversation.type == ConversationType.GROUP,
            Conversation.title == gdata["title"]
        ).first()

        if not group_conv:
            group_conv = Conversation(
                type=ConversationType.GROUP,
                title=gdata["title"],
                avatar_url=gdata["avatar_url"]
            )
            db.add(group_conv)
            db.flush()

            seed_members = [phone_to_user[p] for p in gdata["seed_phones"] if p in phone_to_user]
            for i, u in enumerate(seed_members):
                role = ParticipantRole.ADMIN if i == 0 else ParticipantRole.MEMBER
                db.add(ConversationParticipant(conversation_id=group_conv.id, user_id=u.id, role=role))
            db.commit()

            if seed_members:
                msg = Message(
                    conversation_id=group_conv.id,
                    sender_id=seed_members[0].id,
                    content=gdata["welcome"],
                    message_type=MessageType.TEXT
                )
                db.add(msg)
                db.commit()

        result.append(group_conv)
    return result


def seed_initial_data(db: Session):
    """Ensure all demo users and group chats exist in DB."""
    demo_users = _ensure_demo_users(db)
    _ensure_group_chats(db, demo_users)


def auto_add_contacts_for_user(db: Session, user: User):
    """
    Unconditionally ensures that the logged-in user has:
    1. All 30 demo platform users as contacts with last_seen
    2. An active direct conversation with each (with a realistic greeting)
    3. Membership in all 4 group chats
    """
    demo_users = _ensure_demo_users(db)
    group_convs = _ensure_group_chats(db, demo_users)

    from app.crud.crud_conversation import get_or_create_direct_conversation, add_group_member

    for demo_user in demo_users:
        if demo_user.id == user.id:
            continue

        # Add contact if missing
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
            greeting = GREETINGS.get(demo_user.phone_number, "Hey there! 👋 Drop me a message anytime!")
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

    # Add user to all group chats
    for group_conv in group_convs:
        add_group_member(db, group_conv.id, user.id, ParticipantRole.MEMBER)
