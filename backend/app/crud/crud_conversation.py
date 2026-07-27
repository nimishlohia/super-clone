from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.conversation import Conversation, ConversationType
from app.models.participant import ConversationParticipant, ParticipantRole


def get_or_create_direct_conversation(db: Session, user1_id: str, user2_id: str) -> Conversation:
    """Gets existing direct conversation between 2 users or creates a new one."""
    user1_conv_ids = [
        cp.conversation_id for cp in db.query(ConversationParticipant).filter(
            ConversationParticipant.user_id == user1_id
        ).all()
    ]
    if user1_conv_ids:
        existing = db.query(Conversation).filter(
            Conversation.id.in_(user1_conv_ids),
            Conversation.type == ConversationType.DIRECT
        ).join(ConversationParticipant).filter(
            ConversationParticipant.user_id == user2_id
        ).first()

        if existing:
            return existing

    # Create new conversation
    new_conv = Conversation(type=ConversationType.DIRECT)
    db.add(new_conv)
    db.flush()

    p1 = ConversationParticipant(conversation_id=new_conv.id, user_id=user1_id, role=ParticipantRole.MEMBER)
    p2 = ConversationParticipant(conversation_id=new_conv.id, user_id=user2_id, role=ParticipantRole.MEMBER)
    db.add_all([p1, p2])
    db.commit()
    db.refresh(new_conv)
    return new_conv


def create_group_conversation(db: Session, creator_id: str, title: str, participant_ids: List[str], avatar_url: Optional[str] = None) -> Conversation:
    new_conv = Conversation(type=ConversationType.GROUP, title=title, avatar_url=avatar_url)
    db.add(new_conv)
    db.flush()

    # Creator is ADMIN
    creator_p = ConversationParticipant(conversation_id=new_conv.id, user_id=creator_id, role=ParticipantRole.ADMIN)
    db.add(creator_p)

    # Other members
    unique_members = set(participant_ids) - {creator_id}
    for member_id in unique_members:
        member_p = ConversationParticipant(conversation_id=new_conv.id, user_id=member_id, role=ParticipantRole.MEMBER)
        db.add(member_p)

    db.commit()
    db.refresh(new_conv)
    return new_conv


def get_user_conversations(db: Session, user_id: str) -> List[Conversation]:
    """Fetches all conversations for a user ordered by most recent activity."""
    return db.query(Conversation).join(ConversationParticipant).filter(
        ConversationParticipant.user_id == user_id
    ).order_by(Conversation.updated_at.desc()).all()


def get_group_members(db: Session, conversation_id: str) -> List[ConversationParticipant]:
    return db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id
    ).all()


def add_group_member(db: Session, conversation_id: str, user_id: str, role: ParticipantRole = ParticipantRole.MEMBER) -> ConversationParticipant:
    existing = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id,
        ConversationParticipant.user_id == user_id
    ).first()
    if existing:
        return existing
    p = ConversationParticipant(conversation_id=conversation_id, user_id=user_id, role=role)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


def is_group_admin(db: Session, conversation_id: str, user_id: str) -> bool:
    participant = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id,
        ConversationParticipant.user_id == user_id
    ).first()
    return participant is not None and participant.role == ParticipantRole.ADMIN


def is_group_member(db: Session, conversation_id: str, user_id: str) -> bool:
    participant = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id,
        ConversationParticipant.user_id == user_id
    ).first()
    return participant is not None


def get_conversation_by_id(db: Session, conversation_id: str) -> Optional[Conversation]:
    return db.query(Conversation).filter(Conversation.id == conversation_id).first()


def remove_group_member(db: Session, conversation_id: str, user_id: str):
    target_p = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id,
        ConversationParticipant.user_id == user_id
    ).first()
    
    if not target_p:
        return

    was_admin = (target_p.role == ParticipantRole.ADMIN)
    db.delete(target_p)
    db.commit()

    # Check remaining participants
    remaining = db.query(ConversationParticipant).filter(
        ConversationParticipant.conversation_id == conversation_id
    ).all()

    if not remaining:
        # Delete empty conversation
        delete_conversation(db, conversation_id)
    elif was_admin:
        # Ensure there is at least one admin
        has_admin = any(p.role == ParticipantRole.ADMIN for p in remaining)
        if not has_admin and remaining:
            remaining[0].role = ParticipantRole.ADMIN
            db.commit()


def update_group_conversation(db: Session, conversation_id: str, title: Optional[str] = None, avatar_url: Optional[str] = None) -> Optional[Conversation]:
    conv = db.query(Conversation).filter(Conversation.id == conversation_id, Conversation.type == ConversationType.GROUP).first()
    if not conv:
        return None
    if title is not None and title.strip():
        conv.title = title.strip()
    if avatar_url is not None:
        conv.avatar_url = avatar_url
    db.commit()
    db.refresh(conv)
    return conv


def delete_conversation(db: Session, conversation_id: str):
    db.query(Conversation).filter(Conversation.id == conversation_id).delete()
    db.commit()
