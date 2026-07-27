from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.crud import crud_conversation
from app.schemas.conversation import ConversationResponse, DirectConversationCreate, GroupConversationCreate, GroupConversationUpdate

router = APIRouter()


@router.get("", response_model=List[ConversationResponse])
def list_conversations(current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    # Always ensure demo contacts and conversations exist for this user
    try:
        from app.crud import crud_user
        from app.scripts.seed_data import auto_add_contacts_for_user
        user = crud_user.get_user_by_id(db, user_id=current_user_id)
        if user:
            auto_add_contacts_for_user(db, user)
    except Exception as e:
        import traceback
        print(f"[WARN] seed in list_conversations failed: {e}")
        traceback.print_exc()
    convs = crud_conversation.get_user_conversations(db, user_id=current_user_id)
    result = []
    for conv in convs:
        sorted_messages = sorted(conv.messages, key=lambda m: m.created_at) if conv.messages else []
        last_msg = sorted_messages[-1] if sorted_messages else None
        
        # Calculate unread messages for current_user_id
        unread_count = 0
        if conv.messages:
            for msg in conv.messages:
                if msg.sender_id != current_user_id:
                    is_read = any(r.user_id == current_user_id and r.status.value == "READ" for r in msg.receipts)
                    if not is_read:
                        unread_count += 1

        result.append(ConversationResponse(
            id=conv.id,
            type=conv.type,
            title=conv.title,
            avatar_url=conv.avatar_url,
            updated_at=conv.updated_at,
            created_at=conv.created_at,
            participants=conv.participants,
            unread_count=unread_count,
            last_message=last_msg.content if last_msg else None,
            last_message_time=last_msg.created_at if last_msg else None
        ))
    return result


@router.post("/direct", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
def create_direct_chat(payload: DirectConversationCreate, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    if payload.target_user_id == current_user_id:
        raise HTTPException(status_code=400, detail="Cannot start chat with yourself")
    conv = crud_conversation.get_or_create_direct_conversation(db, user1_id=current_user_id, user2_id=payload.target_user_id)
    return conv


@router.post("/group", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
def create_group_chat(payload: GroupConversationCreate, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    if not payload.title or not payload.title.strip():
        raise HTTPException(status_code=400, detail="Group name cannot be empty")
    
    unique_members = set(payload.participant_ids) - {current_user_id}
    if not unique_members:
        raise HTTPException(status_code=400, detail="Select at least one member other than yourself")

    conv = crud_conversation.create_group_conversation(
        db, creator_id=current_user_id, title=payload.title.strip(), 
        participant_ids=list(unique_members), avatar_url=payload.avatar_url
    )
    return conv


@router.patch("/{conversation_id}", response_model=ConversationResponse)
def update_group_chat(conversation_id: str, payload: GroupConversationUpdate, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    if not crud_conversation.is_group_admin(db, conversation_id=conversation_id, user_id=current_user_id):
        raise HTTPException(status_code=403, detail="Only group admins can update group details")
    
    conv = crud_conversation.update_group_conversation(
        db, conversation_id=conversation_id, title=payload.title, avatar_url=payload.avatar_url
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Group conversation not found")
    return conv


@router.post("/{conversation_id}/members", status_code=status.HTTP_201_CREATED)
def add_member_to_group(conversation_id: str, user_id: str, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    if not crud_conversation.is_group_admin(db, conversation_id=conversation_id, user_id=current_user_id):
        raise HTTPException(status_code=403, detail="Only group admins can add members")
    
    crud_conversation.add_group_member(db, conversation_id=conversation_id, user_id=user_id)
    return {"message": "Member added successfully"}


@router.delete("/{conversation_id}/members/{user_id}")
def remove_member_from_group(conversation_id: str, user_id: str, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    # User can remove themselves (leave group), or an Admin can remove any member
    is_self = (user_id == current_user_id)
    is_admin = crud_conversation.is_group_admin(db, conversation_id=conversation_id, user_id=current_user_id)

    if not is_self and not is_admin:
        raise HTTPException(status_code=403, detail="Only group admins can remove other members")

    crud_conversation.remove_group_member(db, conversation_id=conversation_id, user_id=user_id)
    return {"message": "Member removed successfully"}


@router.delete("/{conversation_id}")
def delete_group_chat(conversation_id: str, current_user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    if not crud_conversation.is_group_admin(db, conversation_id=conversation_id, user_id=current_user_id):
        raise HTTPException(status_code=403, detail="Only group admins can delete the group")

    crud_conversation.delete_conversation(db, conversation_id=conversation_id)
    return {"message": "Group deleted successfully"}