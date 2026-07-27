import { User } from './user';

export type ConversationType = 'DIRECT' | 'GROUP';
export type MessageType = 'TEXT' | 'SYSTEM';

export interface Participant {
    user: User;
    role: 'ADMIN' | 'MEMBER';
    joined_at: string;
}

export interface Message {
    id: string;
    temp_id?: string;
    conversation_id: string;
    sender_id: string;
    sender?: User;
    content: string;
    message_type: MessageType;
    status?: 'SENDING' | 'SENT' | 'DELIVERED' | 'READ';
    created_at: string;
}

export interface Conversation {
    id: string;
    type: ConversationType;
    title: string | null;
    avatar_url: string | null;
    updated_at: string;
    created_at: string;
    participants: Participant[];
    unread_count: number;
    last_message: string | null;
    last_message_time: string | null;
}