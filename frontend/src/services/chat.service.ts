import { apiClient } from '@/lib/api-client';
import { Conversation, Message } from '@/types/chat';

export const chatService = {
    async getConversations(): Promise<Conversation[]> {
        const res = await apiClient.get('/conversations');
        return res.data;
    },

    async createDirectChat(targetUserId: string): Promise<Conversation> {
        const res = await apiClient.post('/conversations/direct', { target_user_id: targetUserId });
        return res.data;
    },

    async createGroupChat(title: string, participantIds: string[], avatarUrl?: string): Promise<Conversation> {
        const res = await apiClient.post('/conversations/group', {
            title,
            participant_ids: participantIds,
            avatar_url: avatarUrl || null,
        });
        return res.data;
    },

    async updateGroupChat(conversationId: string, title?: string, avatarUrl?: string): Promise<Conversation> {
        const res = await apiClient.patch(`/conversations/${conversationId}`, {
            title,
            avatar_url: avatarUrl,
        });
        return res.data;
    },

    async addGroupMember(conversationId: string, userId: string): Promise<void> {
        await apiClient.post(`/conversations/${conversationId}/members?user_id=${userId}`);
    },

    async removeGroupMember(conversationId: string, userId: string): Promise<void> {
        await apiClient.delete(`/conversations/${conversationId}/members/${userId}`);
    },

    async deleteGroupChat(conversationId: string): Promise<void> {
        await apiClient.delete(`/conversations/${conversationId}`);
    },

    async getMessages(conversationId: string, limit = 50, offset = 0): Promise<Message[]> {
        const res = await apiClient.get(`/messages/${conversationId}?limit=${limit}&offset=${offset}`);
        return res.data;
    }
};