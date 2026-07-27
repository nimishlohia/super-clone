from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from app.models.user import User
from app.models.contact import Contact
from app.models.conversation import Conversation, ConversationType
from app.models.participant import ConversationParticipant, ParticipantRole
from app.models.message import Message, MessageType
from app.models.receipt import MessageReceipt, ReceiptStatus

def _mins_ago(m): return datetime.now(timezone.utc) - timedelta(minutes=m)
def _hours_ago(h): return datetime.now(timezone.utc) - timedelta(hours=h)
def _days_ago(d): return datetime.now(timezone.utc) - timedelta(days=d)

DEMO_USERS = [
    {"phone_number": "+15551234567", "display_name": "Alice Sentinel",         "about": "Signal Core Security 🔒",                   "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=Alice",         "is_online": True,  "last_seen": None},
    {"phone_number": "+15559876543", "display_name": "Bob Security",           "about": "Privacy advocate & dev 🛡️",                 "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=Bob",           "is_online": True,  "last_seen": None},
    {"phone_number": "+15550001111", "display_name": "Signal Assistant",       "about": "Official Signal Assistant ⚡",              "avatar_url": "https://api.dicebear.com/7.x/bottts/svg?seed=SignalSupport", "is_online": True,  "last_seen": None},
    {"phone_number": "+919876543210","display_name": "Aarav Sharma",           "about": "Software Engineer @ Infosys 💻",            "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Aarav",      "is_online": True,  "last_seen": None},
    {"phone_number": "+919123456789","display_name": "Priya Patel",            "about": "Life is short, travel more ✈️🌏",            "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya",      "is_online": False, "last_seen": _mins_ago(3)},
    {"phone_number": "+919234567890","display_name": "Rohan Mehta",            "about": "Cricket 🏏 | Chai ☕ | Code 💻",             "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Rohan",      "is_online": False, "last_seen": _mins_ago(15)},
    {"phone_number": "+919345678901","display_name": "Sneha Iyer",             "about": "Dancer 💃 | Foodie 🍜 | Dreamer ✨",         "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Sneha",      "is_online": True,  "last_seen": None},
    {"phone_number": "+919456789012","display_name": "Vikram Nair",            "about": "IITian | Startup guy 🚀 | Coffee addict",   "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Vikram",     "is_online": False, "last_seen": _mins_ago(45)},
    {"phone_number": "+919567890123","display_name": "Ananya Reddy",           "about": "Doctor 👩‍⚕️ | Saving lives one day at a time","avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Ananya",     "is_online": False, "last_seen": _hours_ago(1)},
    {"phone_number": "+919678901234","display_name": "Arjun Singh",            "about": "Army 🇮🇳 | Jai Hind 🙏",                     "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Arjun",      "is_online": False, "last_seen": _hours_ago(2)},
    {"phone_number": "+919789012345","display_name": "Kavya Krishnan",         "about": "Music 🎵 | Books 📚 | Chai lover ☕",         "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Kavya",      "is_online": True,  "last_seen": None},
    {"phone_number": "+919890123456","display_name": "Rahul Gupta",            "about": "Delhi boy 🏙️ | CA | Weekend biker 🏍️",      "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul",      "is_online": False, "last_seen": _hours_ago(3)},
    {"phone_number": "+919901234567","display_name": "Meera Joshi",            "about": "Teacher 👩‍🏫 | Yoga everyday 🧘‍♀️",          "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Meera",      "is_online": False, "last_seen": _hours_ago(4)},
    {"phone_number": "+918001234567","display_name": "Karthik Venkat",         "about": "Bangalore techie 🧑‍💻 | Foodie | FC Barcelona ⚽","avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Karthik",   "is_online": True,  "last_seen": None},
    {"phone_number": "+918012345678","display_name": "Pooja Desai",            "about": "Fashion designer 👗 | Mumbai 🌆",            "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Pooja",      "is_online": False, "last_seen": _hours_ago(5)},
    {"phone_number": "+918023456789","display_name": "Siddharth Kumar",        "about": "Product Manager | Ex-Flipkart | Dad 👨‍👧",   "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Siddharth",  "is_online": False, "last_seen": _hours_ago(6)},
    {"phone_number": "+918034567890","display_name": "Divya Menon",            "about": "Kerala 🌴 | Chef 👩‍🍳 | Home is food",       "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Divya",      "is_online": False, "last_seen": _hours_ago(8)},
    {"phone_number": "+918045678901","display_name": "Aditya Bose",            "about": "Kolkata | Poet 🎭 | Rabindranath fan",       "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Aditya",     "is_online": False, "last_seen": _hours_ago(10)},
    {"phone_number": "+918056789012","display_name": "Shreya Agarwal",         "about": "CA student 📊 | Jaipur girl 🏰",             "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Shreya",     "is_online": True,  "last_seen": None},
    {"phone_number": "+918067890123","display_name": "Nikhil Rao",             "about": "Hyderabad biryani > everything 🍛",          "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Nikhil",     "is_online": False, "last_seen": _hours_ago(12)},
    {"phone_number": "+918078901234","display_name": "Tanvi Shah",             "about": "Entrepreneur 💡 | Ahmedabad",                "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Tanvi",      "is_online": False, "last_seen": _days_ago(1)},
    {"phone_number": "+918089012345","display_name": "Manish Tiwari",          "about": "UPSC aspirant 📖 | Dilli | Chai ☕",          "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Manish",     "is_online": False, "last_seen": _days_ago(1)},
    {"phone_number": "+918090123456","display_name": "Ishaan Chopra",          "about": "Filmmaker 🎬 | Mumbai | Stories matter",     "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Ishaan",     "is_online": True,  "last_seen": None},
    {"phone_number": "+917001234567","display_name": "Riya Saxena",            "about": "Lucknow 👑 | CA | Dance & drama",            "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Riya",       "is_online": False, "last_seen": _days_ago(2)},
    {"phone_number": "+917012345678","display_name": "Varun Malhotra",         "about": "Punjab da puttar 🌾 | Gym 💪 | Hustler",     "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Varun",      "is_online": False, "last_seen": _days_ago(2)},
    {"phone_number": "+917023456789","display_name": "Nandita Pillai",         "about": "Lawyer ⚖️ | Chennai | Justice always wins",  "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Nandita",    "is_online": False, "last_seen": _days_ago(3)},
    {"phone_number": "+917034567890","display_name": "Ayush Verma",            "about": "Gym 🏋️ | Chess ♟️ | IIT Bombay alumni",      "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Ayush",      "is_online": True,  "last_seen": None},
    {"phone_number": "+917045678901","display_name": "Ankita Mishra",          "about": "Banaras ghat vibes 🕌 | Spiritual ✨",        "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Ankita",     "is_online": False, "last_seen": _days_ago(3)},
    {"phone_number": "+917056789012","display_name": "Harsh Vardhan",          "about": "Investor 📈 | Gurgaon | Chai & stocks",      "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Harsh",      "is_online": False, "last_seen": _days_ago(4)},
    {"phone_number": "+917067890123","display_name": "Simran Kaur",            "about": "Waheguru Ji 🙏 | Amritsar | Golden Temple",  "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Simran",     "is_online": False, "last_seen": _days_ago(5)},
    {"phone_number": "+917078901234","display_name": "Dev Choudhary",          "about": "Rajasthan royal 🏰 | Photographer 📷",       "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=Dev",        "is_online": True,  "last_seen": None},
]

# Each entry is a list of (is_from_contact, text) — True = contact speaking, False = "you" (sent by contact as preview)
CONVERSATIONS = {
    "+15551234567": [
        (True,  "Hey! Signal Core Security active 🔒 Your identity is verified."),
        (True,  "All your messages are end-to-end encrypted. Nobody can read them — not even us."),
        (True,  "Stay safe online! Let me know if you have any security questions 🛡️"),
    ],
    "+15559876543": [
        (True,  "Hey there! Privacy advocate online 🛡️"),
        (True,  "Reminder: always use end-to-end encrypted apps for sensitive chats."),
        (True,  "Signal is the gold standard. You made a good choice 👍"),
    ],
    "+15550001111": [
        (True,  "Welcome to Signal Messenger! 🔐"),
        (True,  "You can message anyone on Signal securely. Tap the ✏️ icon to start a new chat."),
        (True,  "Need help? Just message me anytime. Speak freely — we've got your privacy covered ⚡"),
    ],
    "+919876543210": [
        (True,  "Arre yaar! Kaisa hai tu? 😄"),
        (True,  "Kab milte hain? Bahut time ho gaya baat kiye 😅"),
        (True,  "Aaj office mein kya chal raha hai? 💻"),
    ],
    "+919123456789": [
        (True,  "Heyy! 👋 Long time no see!"),
        (True,  "Trip ka plan bana rahe ho kya? Goa jaana tha na together 🏖️"),
        (True,  "Bata jaldi — dates fix karte hain! ✈️"),
    ],
    "+919234567890": [
        (True,  "Bhai! Kal match dekha? 🏏"),
        (True,  "Kya performance thi Rohit Sharma ki! 🔥 Full paisa vasool"),
        (True,  "Weekend pe match dekhte hain phir, ghare aa jao 😄"),
    ],
    "+919345678901": [
        (True,  "Hiiii! 💃 Dance class aaj amazing thi!"),
        (True,  "Naya choreography sikha — Bollywood song pe 🎵"),
        (True,  "Tu bhi join karle na! Bahut fun hai 😄"),
    ],
    "+919456789012": [
        (True,  "Bhai startup mein kya scene hai? 🚀"),
        (True,  "Investor meeting set ho gayi — fingers crossed 🤞"),
        (True,  "Agar funding aa gayi toh treat pakka hai! 🎉"),
    ],
    "+919567890123": [
        (True,  "Hello! Just came back from a 12-hour shift 😴"),
        (True,  "Two emergency cases aaye the aaj — sab theek hai thankfully 🙏"),
        (True,  "How are you doing? Coffee pe milte hain Sunday ko?"),
    ],
    "+919678901234": [
        (True,  "Jai Hind! 🇮🇳 Border pe sab theek chal raha hai."),
        (True,  "Desh ki seva mein lage hain. Ghar ki yaad aati hai kabhi kabhi 🙏"),
        (True,  "Tumhara haal bata, kya chal raha hai ghar mein?"),
    ],
    "+919789012345": [
        (True,  "Sunna yaar! 🎵 New playlist banaya hai"),
        (True,  "Arijit Singh ka naya album drop hua — must listen hai!"),
        (True,  "Koi song recommend karo — mood accha nahi hai aaj 😔"),
    ],
    "+919890123456": [
        (True,  "Bhai! Biking trip plan karte hain is weekend 🏍️"),
        (True,  "Manali route accha rahega ya Kasol? Teri kya choice hai?"),
        (True,  "Petrol ka budget dekh lena pehle 😂"),
    ],
    "+919901234567": [
        (True,  "Namaste 🙏 Aaj yoga class mein 20 students aaye!"),
        (True,  "Surya namaskar se din ki shuruaat bahut achhi hoti hai ☀️"),
        (True,  "Tu bhi try kar — 15 minutes rozana. Life change ho jaayegi!"),
    ],
    "+918001234567": [
        (True,  "Dude! Biryani plan Sunday? 🍛 Bangalore mein naya place khula hai"),
        (True,  "4.8 stars on Zomato — must try!"),
        (True,  "Aur haan, Champions League final dekha kal? What a match ⚽🔥"),
    ],
    "+918012345678": [
        (True,  "Yaar! Naya collection design kiya hai 👗✨"),
        (True,  "Summer vibes — pastel colors aur floral prints"),
        (True,  "Tera size kya hai? Tujhe pehle dikhati hoon 😄"),
    ],
    "+918023456789": [
        (True,  "Bhai! Product mein ek interesting feature build kar raha hoon 💡"),
        (True,  "AI-powered recommendation engine add kar rahe hain"),
        (True,  "Beta testing mein aayega tu? Feedback chahiye real users ka 🙏"),
    ],
    "+918034567890": [
        (True,  "Amma ne aaj special avial banaya 😍"),
        (True,  "Kerala ka khana is the best — no debate!"),
        (True,  "Recipe bhejti hoon tujhe — try karna zaroor 🍛"),
    ],
    "+918045678901": [
        (True,  "Yaar aaj ek nayi kavita likhi 📝"),
        (True,  "\"Shaam ke dhunde mein kho gaya main, teri yaad ka saaya liye...\" 🎭"),
        (True,  "Sunoge kya? Thodi review chahiye 😊"),
    ],
    "+918056789012": [
        (True,  "CA finals ka pressure bahut zyada hai yaar 😩"),
        (True,  "2 months bache hain — din raat padh rahi hoon"),
        (True,  "Dua karo — iss baar clear karni hi hai! 🙏"),
    ],
    "+918067890123": [
        (True,  "Yaar Hyderabadi biryani is LIFE 🍛👑"),
        (True,  "Paradise mein gaya tha kal — 3rd plate khayi 😂"),
        (True,  "Aaja Hyderabad — main guide karunga pura food tour!"),
    ],
    "+918078901234": [
        (True,  "New product launch ho gaya! 🚀"),
        (True,  "First 100 customers in 24 hours — overwhelming response!"),
        (True,  "Tujhe bhi chahiye? Special discount dunga apna wala 😊"),
    ],
    "+918089012345": [
        (True,  "Prelims ki taiyari kar raha hoon yaar 📖"),
        (True,  "History aur Polity done — ab Geography bachi hai"),
        (True,  "Prayer karo — UPSC iss baar pakka! 🙏"),
    ],
    "+918090123456": [
        (True,  "Short film ki shooting thi aaj! 🎬"),
        (True,  "Mountains mein shoot kiya — breathtaking views the"),
        (True,  "Trailer next week drop karunga — dekh lena zaroor 🎥"),
    ],
    "+917001234567": [
        (True,  "Lucknow mein aana ho toh zaroor batana! 😄"),
        (True,  "Tunday Kababi + Chikankari shopping — full plan hai 🍖"),
        (True,  "Iss city ki tehzeeb unparalleled hai yaar ❤️"),
    ],
    "+917012345678": [
        (True,  "Gym chhod ke pizza khaya 😅"),
        (True,  "Kal double session dunga — aaj ka mood nahi tha"),
        (True,  "Tu bhi aa gym mein? Partner mil jaayega 💪"),
    ],
    "+917023456789": [
        (True,  "Court mein aaj ek bada case jeet gaye! ⚖️"),
        (True,  "3 saal ka case — finally justice delivered 🙌"),
        (True,  "Celebration dinner pe aayega? Party time! 🎉"),
    ],
    "+917034567890": [
        (True,  "Chess tournament mein second aaya 🥈"),
        (True,  "Final mein ek blunder ho gayi — itni badi galti!"),
        (True,  "Next month phir try karunga — gold pakka is baar ♟️"),
    ],
    "+917045678901": [
        (True,  "Ganga ghaat pe baithi hoon aaj 🕌"),
        (True,  "Arti dekhi — bahut sukoon mila mann ko 🙏"),
        (True,  "Varanasi aana ho kabhi toh batana — main guide karungi ✨"),
    ],
    "+917056789012": [
        (True,  "Market green hai aaj! 📈"),
        (True,  "Sensex 500 points upar gaya — acche returns aa rahe hain"),
        (True,  "Investing ho raha hai tera? Koi stock tip chahiye? 😄"),
    ],
    "+917067890123": [
        (True,  "Waheguru Ji da Khalsa, Waheguru Ji di Fateh 🙏"),
        (True,  "Golden Temple darshan kiya aaj — peace of mind 🌅"),
        (True,  "Amritsar aana ho kabhi toh zaroor batana!"),
    ],
    "+917078901234": [
        (True,  "Rajasthan ke sunset ki photo upload ki hai! 📷🌅"),
        (True,  "Jaisalmer dunes pe shoot kiya — magical golden hour tha"),
        (True,  "Instagram mein dekh — @devchoudhary_photos 🏜️"),
    ],
}

GROUP_CHATS = [
    {
        "title": "Dev Core Team 🔒",
        "avatar_url": "https://api.dicebear.com/7.x/identicon/svg?seed=DevCore",
        "seed_phones": ["+15551234567", "+15559876543", "+919876543210"],
        "messages": [
            ("+15551234567", "Welcome to Signal Messenger! All messages are end-to-end encrypted. 🔒"),
            ("+919876543210", "Arre bhai! Finally ek secure platform 🔐"),
            ("+15559876543", "Privacy first! Great to have everyone here 🛡️"),
            ("+919876543210", "Koi code review chahiye toh batao — always here to help 💻"),
        ],
    },
    {
        "title": "College Buddies 🎓",
        "avatar_url": "https://api.dicebear.com/7.x/identicon/svg?seed=CollegeBuddies",
        "seed_phones": ["+919234567890", "+919345678901", "+919456789012", "+919789012345"],
        "messages": [
            ("+919234567890", "Yaad hai woh hostel ki raatein? 😂🍕"),
            ("+919345678901", "Haanji! Maggi at 2am aur exam ki padhai 😅"),
            ("+919456789012", "Those were the best days yaar! Miss karta hoon 🎓"),
            ("+919789012345", "Reunion plan karte hain! Dilli mein milte hain next month? 🎉"),
            ("+919234567890", "+1! Pakka milte hain 🙌"),
        ],
    },
    {
        "title": "Office Gang 💼",
        "avatar_url": "https://api.dicebear.com/7.x/identicon/svg?seed=OfficeGang",
        "seed_phones": ["+918001234567", "+918023456789", "+918056789012", "+918067890123"],
        "messages": [
            ("+918001234567", "Office pe chai break mein milte hain! ☕"),
            ("+918023456789", "Haan yaar! Aaj kuch important discuss karna hai project ke baare mein"),
            ("+918056789012", "Main 4 baje free hoon — tab chalega? 📊"),
            ("+918067890123", "Main bhi aata hoon! Biryani bhi order karte hain saath mein 🍛😂"),
            ("+918001234567", "Deal! 4pm conference room 2 😄"),
        ],
    },
    {
        "title": "Family 👨‍👩‍👧‍👦",
        "avatar_url": "https://api.dicebear.com/7.x/identicon/svg?seed=FamilyGroup",
        "seed_phones": ["+919567890123", "+919901234567", "+918034567890", "+917045678901"],
        "messages": [
            ("+919901234567", "Jai Shree Krishna 🙏 Sabka swagat hai!"),
            ("+918034567890", "Sabse pehle — khana kha liya sabne? 😄🍛"),
            ("+919567890123", "Haan Didi! Hospital se abhi loti hoon — bhukhi hoon 😅"),
            ("+917045678901", "Ganga Maiya ki jai 🕌 Sab khairiyat? 🙏"),
            ("+919901234567", "Sab theek hain! Roz yoga karo — sehat achhi rahegi 🧘‍♀️"),
        ],
    },
]


def _ensure_demo_users(db: Session):
    """Creates or updates all demo users in DB. Returns list of all demo User objects."""
    users = []
    now = datetime.now(timezone.utc)
    for u_data in DEMO_USERS:
        u = db.query(User).filter(User.phone_number == u_data["phone_number"]).first()
        if not u:
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
            # Keep online status and last_seen realistic
            u.is_online = u_data.get("is_online", False)
            if u_data.get("last_seen"):
                u.last_seen = u_data["last_seen"]
            db.commit()
        users.append(u)
    return users


def _ensure_group_chats(db: Session, all_demo_users):
    """Creates group chats with realistic messages if they don't exist."""
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

            base_time = datetime.now(timezone.utc) - timedelta(hours=2)
            for idx, (phone, text) in enumerate(gdata.get("messages", [])):
                sender = phone_to_user.get(phone)
                if sender:
                    msg_time = base_time + timedelta(minutes=idx * 3)
                    db.add(Message(
                        conversation_id=group_conv.id,
                        sender_id=sender.id,
                        content=text,
                        message_type=MessageType.TEXT,
                        created_at=msg_time
                    ))
            db.commit()

        result.append(group_conv)
    return result


def seed_initial_data(db: Session):
    """Ensure all demo users and group chats exist in DB. Called at server startup."""
    print("[Seed] Verifying platform demo users and groups...")
    demo_users = _ensure_demo_users(db)
    _ensure_group_chats(db, demo_users)
    print(f"[Seed] {len(demo_users)} demo users verified in database.")


def reseed_all_existing_users(db: Session):
    """Re-run auto_add_contacts_for_user for every non-demo user. Called at startup."""
    demo_phones = {u["phone_number"] for u in DEMO_USERS}
    real_users = db.query(User).filter(~User.phone_number.in_(demo_phones)).all()
    for user in real_users:
        try:
            auto_add_contacts_for_user(db, user)
        except Exception as e:
            print(f"[Seed] Warning for user {user.phone_number}: {e}")
    if real_users:
        print(f"[Seed] Re-seeded contacts for {len(real_users)} existing user(s).")


def auto_add_contacts_for_user(db: Session, user: User):
    """
    Unconditionally ensures the logged-in user has:
    1. All 30 demo users as contacts with realistic last_seen
    2. A direct conversation with each, populated with realistic back-and-forth messages
    3. Membership in all 4 group chats
    """
    demo_users = _ensure_demo_users(db)
    group_convs = _ensure_group_chats(db, demo_users)

    from app.crud.crud_conversation import get_or_create_direct_conversation, add_group_member

    phone_to_user = {u.phone_number: u for u in demo_users}

    for demo_user in demo_users:
        if demo_user.id == user.id:
            continue

        # 1. Ensure contact saved
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

        # 2. Create direct conversation
        conv = get_or_create_direct_conversation(db, user.id, demo_user.id)

        # 3. Populate realistic messages if empty
        msg_count = db.query(Message).filter(Message.conversation_id == conv.id).count()
        if msg_count == 0:
            convo_lines = CONVERSATIONS.get(demo_user.phone_number, [
                (True, f"Hey! I'm {demo_user.display_name} 👋"),
                (True, "Great to connect with you on Signal!"),
            ])

            base_time = datetime.now(timezone.utc) - timedelta(hours=1)
            for idx, (from_contact, text) in enumerate(convo_lines):
                sender_id = demo_user.id if from_contact else user.id
                msg_time = base_time + timedelta(minutes=idx * 5)
                msg = Message(
                    conversation_id=conv.id,
                    sender_id=sender_id,
                    content=text,
                    message_type=MessageType.TEXT,
                    created_at=msg_time
                )
                db.add(msg)
                db.flush()
                # Mark incoming messages as READ for the user
                if from_contact:
                    db.add(MessageReceipt(
                        message_id=msg.id,
                        user_id=user.id,
                        status=ReceiptStatus.READ
                    ))

    db.commit()

    # 4. Add user to all group chats
    for group_conv in group_convs:
        add_group_member(db, group_conv.id, user.id, ParticipantRole.MEMBER)
