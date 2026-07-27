'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    MessageSquare, Phone, Radio, Settings, Menu, Search, Edit,
    Video, MoreVertical, Smile, Mic, Plus, CheckCheck, Users, X, Shield,
    FileText, Check, ChevronRight, Archive, Pin, Trash2, Ban, VolumeX, EyeOff,
    Copy, Reply, Info, Paperclip, UserPlus, UserMinus, Send, Clock
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useSocket } from '@/context/socket-context';
import { apiClient } from '@/lib/api-client';
import { formatSignalTime, formatMessageTimestamp } from '@/lib/utils';
import { Conversation, Message } from '@/types/chat';
import SettingsView, { ThemeMode } from '@/components/settings/settings-view';

type ViewMode = 'CHATS' | 'SETTINGS';
type ChatFilter = 'ALL' | 'UNREAD' | 'GROUPS' | 'CONTACTS';

function Avatar({ name, src, size = 44, isLight = false }: { name?: string | null; src?: string | null; size?: number; isLight?: boolean }) {
    const initials = name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';
    return (
        <div style={{ width: size, height: size, borderRadius: '50%', background: isLight ? '#E5E5EA' : '#3A3A3E', color: isLight ? '#1C1C1E' : '#fff', fontSize: size * 0.32, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
            {src ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
        </div>
    );
}

function IconBtn({ children, onClick, active = false, title, isLight = false }: { children: React.ReactNode; onClick?: () => void; active?: boolean; title?: string; isLight?: boolean }) {
    const [hover, setHover] = useState(false);
    return (
        <button
            title={title}
            onClick={onClick}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: active ? (isLight ? 'rgba(44,107,237,0.15)' : 'rgba(44,107,237,0.2)') : hover ? (isLight ? '#E5E5EA' : '#252628') : 'transparent',
                color: active ? '#2C6BED' : hover ? (isLight ? '#1C1C1E' : '#E4E4E7') : (isLight ? '#6C6C70' : '#8E8E93'),
                transition: 'background 0.12s, color 0.12s',
                flexShrink: 0,
            }}
        >
            {children}
        </button>
    );
}

export default function SignalDashboard() {
    const { user } = useAuth();
    const { socket } = useSocket();

    const [themeMode, setThemeMode] = useState<ThemeMode>('dark');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const [viewMode, setViewMode] = useState<ViewMode>('CHATS');
    const [chatFilter, setChatFilter] = useState<ChatFilter>('ALL');

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConv, setActiveConv] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [showNewGroupModal, setShowNewGroupModal] = useState(false);
    const [showAddContactModal, setShowAddContactModal] = useState(false);
    const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
    const [showCallModal, setShowCallModal] = useState(false);
    const [showStoryModal, setShowStoryModal] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showContactInfoModal, setShowContactInfoModal] = useState(false);
    const [showVoiceRecorderModal, setShowVoiceRecorderModal] = useState(false);
    const [showSearchInChat, setShowSearchInChat] = useState(false);
    const [chatSearchQuery, setChatSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const [convContextMenu, setConvContextMenu] = useState<{ x: number; y: number; conv: Conversation } | null>(null);
    const [msgContextMenu, setMsgContextMenu] = useState<{ x: number; y: number; msg: Message } | null>(null);

    const [groupTitle, setGroupTitle] = useState('');
    const [groupAvatarUrl, setGroupAvatarUrl] = useState('');
    const [groupMemberSearch, setGroupMemberSearch] = useState('');
    const [groupSearchHits, setGroupSearchHits] = useState<any[]>([]);
    const [selectedMembers, setSelectedMembers] = useState<any[]>([]);
    const [creatingGroup, setCreatingGroup] = useState(false);
    const [groupError, setGroupError] = useState('');

    const [isEditingGroupTitle, setIsEditingGroupTitle] = useState(false);
    const [editGroupTitle, setEditGroupTitle] = useState('');
    const [isEditingGroupAvatar, setIsEditingGroupAvatar] = useState(false);
    const [editGroupAvatar, setEditGroupAvatar] = useState('');
    const [groupMemberFilter, setGroupMemberFilter] = useState('');
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [addMemberQuery, setAddMemberQuery] = useState('');
    const [addMemberHits, setAddMemberHits] = useState<any[]>([]);

    const [addContactQuery, setAddContactQuery] = useState('');
    const [addContactResults, setAddContactResults] = useState<any[]>([]);
    const [addContactMessage, setAddContactMessage] = useState('');
    const [savedContacts, setSavedContacts] = useState<any[]>([]);
    const [addContactTab, setAddContactTab] = useState<'SEARCH' | 'CREATE'>('SEARCH');
    const [customPhone, setCustomPhone] = useState('');
    const [customName, setCustomName] = useState('');
    const [customAbout, setCustomAbout] = useState('');
    const [creatingCustomUser, setCreatingCustomUser] = useState(false);

    const handleCreateCustomUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!customPhone.trim() || !customName.trim()) return;
        setCreatingCustomUser(true);
        setAddContactMessage('');
        try {
            const res = await apiClient.post('/contacts/custom', {
                phone_number: customPhone.trim(),
                display_name: customName.trim(),
                about: customAbout.trim() || 'Hey there! I am using Signal.'
            });
            triggerToast(`Contact "${customName.trim()}" added`);
            setAddContactMessage(`Added ${customName.trim()} to contacts`);
            setShowAddContactModal(false);
            setCustomPhone('');
            setCustomName('');
            setCustomAbout('');
            fetchSavedContacts();
            fetchConversations();
            if (res.data?.contact_user?.id) {
                startChat(res.data.contact_user.id);
            }
        } catch (err: any) {
            setAddContactMessage(err.response?.data?.detail || 'Failed to create custom contact');
        } finally {
            setCreatingCustomUser(false);
        }
    };

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const typingRef = useRef<NodeJS.Timeout | null>(null);

    const EMOJIS = ['👍','❤️','😂','😮','😢','🔥','🎉','🙏','✨','💯','😊','🚀','👍','🔥'];

    useEffect(() => {
        const savedTheme = localStorage.getItem('signal_theme') as ThemeMode;
        if (savedTheme) setThemeMode(savedTheme);
        const savedSidebar = localStorage.getItem('signal_sidebar_collapsed');
        if (savedSidebar !== null) setIsSidebarCollapsed(savedSidebar === 'true');
    }, []);

    const handleThemeChange = (mode: ThemeMode) => {
        setThemeMode(mode);
        localStorage.setItem('signal_theme', mode);
    };

    const toggleSidebar = () => {
        setIsSidebarCollapsed(prev => {
            const next = !prev;
            localStorage.setItem('signal_sidebar_collapsed', String(next));
            return next;
        });
    };

    const isLight = themeMode === 'light';

    const C = {
        bg:       isLight ? '#F2F2F7' : '#111214',
        panel:    isLight ? '#FFFFFF' : '#1A1B1E',
        border:   isLight ? '#E5E5EA' : '#2A2B2E',
        hover:    isLight ? '#F2F2F7' : '#222326',
        selected: isLight ? '#E5E5EA' : '#252628',
        card:     isLight ? '#FFFFFF' : '#1E1F22',
        input:    isLight ? '#E5E5EA' : '#252628',
        blue:     '#2C6BED',
        text:     isLight ? '#1C1C1E' : '#E4E4E7',
        sub:      isLight ? '#6C6C70' : '#8E8E93',
        muted:    isLight ? '#8E8E93' : '#636366',
        bubble_out: '#2C6BED',
        bubble_in:  isLight ? '#E5E5EA' : '#2A2B2E',
        font: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    };

    const triggerToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    useEffect(() => {
        fetchConversations();
        fetchSavedContacts();
    }, []);

    useEffect(() => {
        if (activeConv) {
            fetchMessages(activeConv.id);
            socket?.emit('room_join', { conversation_id: activeConv.id });
            socket?.emit('message_read', { conversation_id: activeConv.id });
            apiClient.post(`/messages/${activeConv.id}/read`).catch(() => {});
        }
    }, [activeConv]);

    useEffect(() => {
        const handleGlobalClick = () => {
            setConvContextMenu(null);
            setMsgContextMenu(null);
        };
        window.addEventListener('click', handleGlobalClick);
        return () => window.removeEventListener('click', handleGlobalClick);
    }, []);

    useEffect(() => {
        if (!socket) return;
        const onMsg = (msg: Message) => {
            if (activeConv && msg.conversation_id === activeConv.id) {
                setMessages(p => {
                    const existingIdx = p.findIndex(m => m.id === msg.id || (m.temp_id && m.temp_id === msg.temp_id));
                    if (existingIdx !== -1) {
                        const updated = [...p];
                        updated[existingIdx] = { ...msg, status: msg.status || 'SENT' };
                        return updated;
                    }
                    return [...p, { ...msg, status: msg.status || 'SENT' }];
                });
                scrollToBottom();
                if (msg.sender_id !== user?.id) {
                    socket.emit('message_read', { conversation_id: activeConv.id });
                }
            }
            setConversations(prevConvs => {
                const idx = prevConvs.findIndex(c => c.id === msg.conversation_id);
                if (idx !== -1) {
                    const targetConv = prevConvs[idx];
                    const isActive = activeConv && msg.conversation_id === activeConv.id;
                    const isMine = msg.sender_id === user?.id;
                    const updatedConv: Conversation = {
                        ...targetConv,
                        last_message: msg.content,
                        last_message_time: msg.created_at,
                        updated_at: msg.created_at,
                        unread_count: (isActive || isMine) ? targetConv.unread_count : targetConv.unread_count + 1
                    };
                    const remaining = prevConvs.filter(c => c.id !== msg.conversation_id);
                    return [updatedConv, ...remaining];
                }
                fetchConversations();
                return prevConvs;
            });
        };

        const onReceiptUpdate = (d: { conversation_id: string; status: 'READ' | 'DELIVERED'; message_ids?: string[] }) => {
            if (activeConv && d.conversation_id === activeConv.id) {
                setMessages(prev => prev.map(m => {
                    if (m.sender_id === user?.id) {
                        if (d.status === 'READ') return { ...m, status: 'READ' };
                        if (d.status === 'DELIVERED' && m.status !== 'READ') return { ...m, status: 'DELIVERED' };
                    }
                    return m;
                }));
            }
        };

        const onTyping = (d: { conversation_id: string; is_typing: boolean; user_id: string }) => {
            if (activeConv && d.conversation_id === activeConv.id && d.user_id !== user?.id) setIsTyping(d.is_typing);
        };
        const onStatus = (d: { user_id: string; is_online: boolean }) => {
            setConversations(p => p.map(c => ({ ...c, participants: c.participants.map(pp => pp.user.id === d.user_id ? { ...pp, user: { ...pp.user, is_online: d.is_online } } : pp) })));
            setSavedContacts(p => p.map(c => c.contact_user?.id === d.user_id ? { ...c, contact_user: { ...c.contact_user, is_online: d.is_online } } : c));
        };

        socket.on('message:new', onMsg);
        socket.on('receipt:update', onReceiptUpdate);
        socket.on('typing:update', onTyping);
        socket.on('user:status', onStatus);

        return () => {
            socket.off('message:new', onMsg);
            socket.off('receipt:update', onReceiptUpdate);
            socket.off('typing:update', onTyping);
            socket.off('user:status', onStatus);
        };
    }, [socket, activeConv, user]);

    const fetchConversations = async () => {
        try {
            const res = await apiClient.get('/conversations');
            setConversations(res.data);
            if (res.data.length > 0 && !activeConv) setActiveConv(res.data[0]);
        } catch {}
    };

    const fetchSavedContacts = async () => {
        try {
            const res = await apiClient.get('/contacts');
            setSavedContacts(res.data);
        } catch {}
    };

    const handleSelectConversation = (conv: Conversation) => {
        setActiveConv(conv);
        setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c));
    };

    const fetchMessages = async (id: string) => {
        try { const r = await apiClient.get(`/messages/${id}`); setMessages(r.data); scrollToBottom(); } catch {}
    };

    const scrollToBottom = () => setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputMessage(e.target.value);
        if (!activeConv || !socket) return;
        socket.emit('typing_start', { conversation_id: activeConv.id });
        if (typingRef.current) clearTimeout(typingRef.current);
        typingRef.current = setTimeout(() => socket.emit('typing_stop', { conversation_id: activeConv.id }), 2000);
    };

    const handleSend = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!inputMessage.trim() || !activeConv) return;
        
        const text = inputMessage.trim();
        const tempId = `tmp-${Date.now()}`;
        const newMsg: Message = {
            id: tempId,
            temp_id: tempId,
            conversation_id: activeConv.id,
            sender_id: user?.id || '',
            content: text,
            message_type: 'TEXT',
            status: 'SENT',
            created_at: new Date().toISOString()
        };
        
        setMessages(p => [...p, newMsg]);
        scrollToBottom();

        setInputMessage('');
        setShowEmojiPicker(false);

        if (socket && socket.connected) {
            socket.emit('message_send', { conversation_id: activeConv.id, content: text, temp_id: tempId });
            if (typingRef.current) clearTimeout(typingRef.current);
            socket.emit('typing_stop', { conversation_id: activeConv.id });
        } else {
            try {
                const res = await apiClient.post('/messages', { conversation_id: activeConv.id, content: text });
                setMessages(p => p.map(m => m.id === tempId ? { ...res.data, status: 'SENT' } : m));
                fetchConversations();
            } catch (err) {
                console.error("REST message send error:", err);
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleSearch = async (q: string) => {
        setSearchQuery(q);
        if (!q.trim()) { setSearchResults([]); return; }
        try { const r = await apiClient.get(`/contacts/search?q=${q}`); setSearchResults(r.data); } catch {}
    };

    const handleAddContactSearch = async (q: string) => {
        setAddContactQuery(q);
        if (!q.trim()) { setAddContactResults([]); return; }
        try { const r = await apiClient.get(`/contacts/search?q=${q}`); setAddContactResults(r.data); } catch {}
    };

    const handleAddContact = async (contactUserId: string) => {
        try {
            await apiClient.post('/contacts', { contact_user_id: contactUserId });
            setAddContactMessage('Contact added successfully');
            triggerToast('Contact added');
            setShowAddContactModal(false);
            fetchSavedContacts();
        } catch (err: any) {
            setAddContactMessage(err.response?.data?.detail || 'Failed to add contact');
        }
    };

    const handleGroupSearch = async (q: string) => {
        setGroupMemberSearch(q);
        if (!q.trim()) { setGroupSearchHits([]); return; }
        try { const r = await apiClient.get(`/contacts/search?q=${q}`); setGroupSearchHits(r.data); } catch {}
    };

    const startChat = async (uid: string) => {
        try {
            const r = await apiClient.post('/conversations/direct', { target_user_id: uid });
            setActiveConv(r.data); setSearchQuery(''); setSearchResults([]); fetchConversations();
        } catch {}
    };

    const createGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!groupTitle.trim()) return setGroupError('Group name is required');
        if (selectedMembers.length === 0) return setGroupError('Add at least 1 member');
        setGroupError(''); setCreatingGroup(true);
        try {
            const r = await apiClient.post('/conversations/group', {
                title: groupTitle.trim(),
                participant_ids: selectedMembers.map(m => m.id),
                avatar_url: groupAvatarUrl.trim() || null
            });
            setActiveConv(r.data);
            setShowNewGroupModal(false);
            setGroupTitle('');
            setGroupAvatarUrl('');
            setSelectedMembers([]);
            fetchConversations();
            triggerToast(`Group "${groupTitle}" created`);
        } catch (err: any) { setGroupError(err.response?.data?.detail || 'Failed to create group'); }
        finally { setCreatingGroup(false); }
    };

    const updateGroupTitle = async (newTitle: string) => {
        if (!activeConv || !newTitle.trim()) return;
        try {
            const r = await apiClient.patch(`/conversations/${activeConv.id}`, { title: newTitle.trim() });
            setActiveConv(r.data);
            setIsEditingGroupTitle(false);
            fetchConversations();
            triggerToast('Group name updated');
        } catch (err: any) {
            triggerToast(err.response?.data?.detail || 'Failed to update group name');
        }
    };

    const updateGroupAvatar = async (newAvatarUrl: string) => {
        if (!activeConv) return;
        try {
            const r = await apiClient.patch(`/conversations/${activeConv.id}`, { avatar_url: newAvatarUrl.trim() || null });
            setActiveConv(r.data);
            setIsEditingGroupAvatar(false);
            fetchConversations();
            triggerToast('Group avatar updated');
        } catch (err: any) {
            triggerToast(err.response?.data?.detail || 'Failed to update group avatar');
        }
    };

    const handleSearchAddMember = async (q: string) => {
        setAddMemberQuery(q);
        if (!q.trim()) { setAddMemberHits([]); return; }
        try {
            const r = await apiClient.get(`/contacts/search?q=${q}`);
            // Filter out existing members
            const existingIds = new Set(activeConv?.participants.map(p => p.user.id) || []);
            setAddMemberHits(r.data.filter((u: any) => !existingIds.has(u.id)));
        } catch {}
    };

    const addMemberToGroup = async (targetUserId: string) => {
        if (!activeConv) return;
        try {
            await apiClient.post(`/conversations/${activeConv.id}/members?user_id=${targetUserId}`);
            triggerToast('Member added');
            fetchConversations();
            const updatedConvs = await apiClient.get('/conversations');
            setConversations(updatedConvs.data);
            const found = updatedConvs.data.find((c: any) => c.id === activeConv.id);
            if (found) setActiveConv(found);
            setShowAddMemberModal(false);
            setAddMemberQuery('');
            setAddMemberHits([]);
        } catch (err: any) {
            triggerToast(err.response?.data?.detail || 'Failed to add member');
        }
    };

    const removeGroupMember = async (conversationId: string, memberUserId: string) => {
        try {
            await apiClient.delete(`/conversations/${conversationId}/members/${memberUserId}`);
            triggerToast('Member removed');
            fetchConversations();
            if (activeConv) {
                setActiveConv(prev => prev ? { ...prev, participants: prev.participants.filter(p => p.user.id !== memberUserId) } : null);
            }
        } catch (err: any) {
            triggerToast(err.response?.data?.detail || 'Failed to remove member');
        }
    };

    const leaveGroup = async () => {
        if (!activeConv || !user) return;
        try {
            await apiClient.delete(`/conversations/${activeConv.id}/members/${user.id}`);
            triggerToast('Left group');
            setShowGroupInfoModal(false);
            setActiveConv(null);
            fetchConversations();
        } catch (err: any) {
            triggerToast(err.response?.data?.detail || 'Failed to leave group');
        }
    };

    const deleteGroup = async () => {
        if (!activeConv) return;
        try {
            await apiClient.delete(`/conversations/${activeConv.id}`);
            triggerToast('Group deleted');
            setShowGroupInfoModal(false);
            setActiveConv(null);
            fetchConversations();
        } catch (err: any) {
            triggerToast(err.response?.data?.detail || 'Failed to delete group');
        }
    };

    const toggleMember = (m: any) => {
        if (selectedMembers.some(s => s.id === m.id)) setSelectedMembers(selectedMembers.filter(s => s.id !== m.id));
        else setSelectedMembers([...selectedMembers, m]);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeConv || !socket) return;
        socket.emit('message_send', { conversation_id: activeConv.id, content: `📎 Attached file: ${file.name}`, temp_id: `tmp-${Date.now()}` });
        triggerToast(`Attached: ${file.name}`);
        e.target.value = '';
    };

    const getOther = (conv: Conversation) => {
        if (conv.type === 'GROUP') return null;
        const p = conv.participants.find(p => p.user.id !== user?.id);
        return p ? p.user : null;
    };

    const targetUser = activeConv ? getOther(activeConv) : null;
    const activeTitle = activeConv ? (activeConv.type === 'GROUP' ? activeConv.title : (targetUser?.display_name || targetUser?.phone_number || 'Unknown')) : '';

    const filteredConversations = conversations.filter(conv => {
        const other = getOther(conv);
        const name = conv.type === 'GROUP' ? conv.title : (other?.display_name || other?.phone_number || '');

        if (chatFilter === 'UNREAD' && conv.unread_count === 0) return false;
        if (chatFilter === 'GROUPS' && conv.type !== 'GROUP') return false;
        if (chatFilter === 'CONTACTS' && conv.type !== 'DIRECT') return false;

        if (searchQuery.trim() && !name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    const filteredMessages = messages.filter(m => {
        if (!chatSearchQuery.trim()) return true;
        return m.content.toLowerCase().includes(chatSearchQuery.toLowerCase());
    });

    return (
        <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', background: C.bg, color: C.text, fontFamily: C.font, userSelect: 'none' }}>

            <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileUpload} />

            {toastMessage && (
                <div style={{ position: 'fixed', top: 20, right: 20, background: C.blue, color: '#fff', padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,0.3)', zIndex: 300 }}>
                    {toastMessage}
                </div>
            )}

            {/* LEFT NAV RAIL */}
            <div style={{ width: 56, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, paddingBottom: 10, background: C.panel, borderRight: `1px solid ${C.border}`, zIndex: 20 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <IconBtn onClick={toggleSidebar} title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} isLight={isLight}>
                        <Menu size={18} />
                    </IconBtn>
                    <div style={{ width: 30, height: 1, background: C.border, margin: '4px 0' }} />
                    <IconBtn active={viewMode === 'CHATS'} onClick={() => setViewMode('CHATS')} title="Chats" isLight={isLight}>
                        <MessageSquare size={18} />
                    </IconBtn>
                    <IconBtn onClick={() => setShowCallModal(true)} title="Calls" isLight={isLight}>
                        <Phone size={18} />
                    </IconBtn>
                    <div style={{ position: 'relative' }}>
                        <IconBtn onClick={() => setShowStoryModal(true)} title="Stories" isLight={isLight}>
                            <Radio size={18} />
                        </IconBtn>
                        <span style={{ position: 'absolute', top: 2, right: 2, width: 14, height: 14, background: '#E5534B', color: '#fff', fontSize: 8, fontWeight: 700, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</span>
                    </div>
                </div>
                <IconBtn active={viewMode === 'SETTINGS'} onClick={() => setViewMode(viewMode === 'SETTINGS' ? 'CHATS' : 'SETTINGS')} title="Settings" isLight={isLight}>
                    <Settings size={18} />
                </IconBtn>
            </div>

            {/* SETTINGS OVERLAY or MAIN CONTENT */}
            {viewMode === 'SETTINGS' ? (
                <SettingsView onClose={() => setViewMode('CHATS')} themeMode={themeMode} onThemeChange={handleThemeChange} />
            ) : (
                <>
                    {/* CHAT LIST PANEL */}
                    <div
                        style={{
                            width: isSidebarCollapsed ? 0 : 300,
                            opacity: isSidebarCollapsed ? 0 : 1,
                            flexShrink: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            background: C.panel,
                            borderRight: isSidebarCollapsed ? 'none' : `1px solid ${C.border}`,
                            overflow: 'hidden',
                            transition: 'width 0.22s ease, opacity 0.22s ease',
                        }}
                    >
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 14px 10px' }}>
                            <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Chats</span>
                            <div style={{ display: 'flex', gap: 4 }}>
                                <IconBtn onClick={() => setShowAddContactModal(true)} title="Add Contact" isLight={isLight}>
                                    <UserPlus size={16} />
                                </IconBtn>
                                <IconBtn onClick={() => setShowNewGroupModal(true)} title="New Group Chat" isLight={isLight}>
                                    <Edit size={16} />
                                </IconBtn>
                            </div>
                        </div>

                        {/* Search bar */}
                        <div style={{ padding: '0 10px 8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.input, borderRadius: 10, padding: '8px 12px' }}>
                                <Search size={14} style={{ color: C.muted, flexShrink: 0 }} />
                                <input
                                    type="text" placeholder="Search"
                                    value={searchQuery} onChange={e => handleSearch(e.target.value)}
                                    style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: C.text, fontSize: 13, fontFamily: C.font }}
                                />
                            </div>
                        </div>

                        {/* Filter Categories */}
                        <div style={{ display: 'flex', gap: 4, padding: '0 10px 10px', borderBottom: `1px solid ${C.border}` }}>
                            {[
                                { id: 'ALL', label: 'All' },
                                { id: 'UNREAD', label: 'Unread' },
                                { id: 'GROUPS', label: 'Groups' },
                                { id: 'CONTACTS', label: 'Contacts' },
                            ].map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setChatFilter(f.id as ChatFilter)}
                                    style={{
                                        flex: 1, padding: '4px 0', borderRadius: 14, border: 'none',
                                        background: chatFilter === f.id ? (isLight ? '#E5E5EA' : '#2A2B2E') : 'transparent',
                                        color: chatFilter === f.id ? C.text : C.sub,
                                        fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: C.font,
                                        transition: 'all 0.12s ease'
                                    }}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        {/* Search Contact Results */}
                        {searchResults.length > 0 && (
                            <div style={{ padding: '0 6px', maxHeight: 160, overflowY: 'auto', borderBottom: `1px solid ${C.border}` }}>
                                <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '4px 8px 4px' }}>Contacts Found</p>
                                {searchResults.map(u => (
                                    <div key={u.id} onClick={() => startChat(u.id)}
                                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 8px', borderRadius: 8, cursor: 'pointer' }}
                                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = C.hover; }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                                    >
                                        <Avatar name={u.display_name || u.phone_number} size={34} isLight={isLight} />
                                        <div style={{ minWidth: 0 }}>
                                            <p style={{ margin: 0, fontSize: 13, color: C.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.display_name || u.phone_number}</p>
                                            <p style={{ margin: 0, fontSize: 11, color: C.muted }}>{u.phone_number}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Conversation rows or Saved Contacts rows */}
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {chatFilter === 'CONTACTS' ? (
                                <div>
                                    <div style={{ padding: '8px 14px', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Saved Contacts ({savedContacts.length})
                                    </div>
                                    {savedContacts.length === 0 && (
                                        <p style={{ textAlign: 'center', color: C.muted, fontSize: 13, marginTop: 30 }}>
                                            No saved contacts yet.<br />Click + icon above to add contacts.
                                        </p>
                                    )}
                                    {savedContacts
                                        .filter(c => {
                                            if (!searchQuery.trim()) return true;
                                            const target = c.contact_user;
                                            const name = (target?.display_name || target?.phone_number || '').toLowerCase();
                                            return name.includes(searchQuery.toLowerCase());
                                        })
                                        .map(c => {
                                            const u = c.contact_user;
                                            if (!u) return null;
                                            const name = u.display_name || u.phone_number;
                                            return (
                                                <div
                                                    key={c.id}
                                                    onClick={() => startChat(u.id)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', transition: 'background 0.1s' }}
                                                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = C.hover; }}
                                                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                                                >
                                                    <div style={{ position: 'relative' }}>
                                                        <Avatar name={name} src={u.avatar_url} size={42} isLight={isLight} />
                                                        {u.is_online && (
                                                            <span style={{ position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, background: '#3AD06A', border: `2px solid ${C.panel}`, borderRadius: '50%' }} />
                                                        )}
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
                                                        <p style={{ margin: '2px 0 0', fontSize: 11, color: C.sub }}>{u.phone_number}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            ) : (
                                <>
                                    {filteredConversations.length === 0 && (
                                        <p style={{ textAlign: 'center', color: C.muted, fontSize: 13, marginTop: 40 }}>No conversations found.<br/>Click + to start a new chat.</p>
                                    )}
                                    {filteredConversations.map(conv => {
                                        const other = getOther(conv);
                                        const title = conv.type === 'GROUP' ? conv.title : (other?.display_name || other?.phone_number || 'Unknown');
                                        const selected = activeConv?.id === conv.id;
                                        return (
                                            <div
                                                key={conv.id}
                                                onClick={() => handleSelectConversation(conv)}
                                                onContextMenu={(e) => {
                                                    e.preventDefault();
                                                    setConvContextMenu({ x: e.clientX, y: e.clientY, conv });
                                                }}
                                                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', background: selected ? C.selected : 'transparent', transition: 'background 0.1s' }}
                                                onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLDivElement).style.background = C.hover; }}
                                                onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                                            >
                                                <div style={{ position: 'relative' }}>
                                                    <Avatar name={title} src={conv.avatar_url || other?.avatar_url} size={44} isLight={isLight} />
                                                    {conv.type !== 'GROUP' && other?.is_online && (
                                                        <span style={{ position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, background: '#3AD06A', border: `2px solid ${C.panel}`, borderRadius: '50%' }} />
                                                    )}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                                        <span style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{title}</span>
                                                        <span style={{ fontSize: 11, color: C.muted, flexShrink: 0, marginLeft: 6 }}>
                                                            {conv.last_message_time ? formatSignalTime(conv.last_message_time) : ''}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                                                        <p style={{ margin: 0, fontSize: 12, color: C.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                                                            {conv.last_message || 'No messages yet'}
                                                        </p>
                                                        {conv.unread_count > 0 && (
                                                            <span style={{ background: C.blue, color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 10, padding: '1px 6px', flexShrink: 0, marginLeft: 4 }}>
                                                                {conv.unread_count}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </>
                            )}
                        </div>
                    </div>

                    {/* MAIN CHAT AREA */}
                    {activeConv ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: C.bg, minWidth: 0 }}>

                            {/* Chat header */}
                            <div style={{ height: 56, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 0 20px', background: C.panel, borderBottom: `1px solid ${C.border}` }}>
                                <div
                                    onClick={() => activeConv.type === 'GROUP' ? setShowGroupInfoModal(true) : setShowContactInfoModal(true)}
                                    style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                                >
                                    <Avatar name={activeTitle} src={targetUser?.avatar_url || activeConv.avatar_url} size={36} isLight={isLight} />
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                            <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{activeTitle}</span>
                                            <Shield size={12} style={{ color: C.muted }} />
                                        </div>
                                        {isTyping ? (
                                            <p style={{ margin: 0, fontSize: 11, color: C.blue, fontStyle: 'italic' }}>typing…</p>
                                        ) : activeConv.type === 'GROUP' ? (
                                            <p style={{ margin: 0, fontSize: 11, color: C.sub }}>{activeConv.participants.length} members</p>
                                        ) : targetUser?.is_online ? (
                                            <p style={{ margin: 0, fontSize: 11, color: '#3AD06A' }}>Online</p>
                                        ) : targetUser?.last_seen ? (
                                            <p style={{ margin: 0, fontSize: 11, color: C.sub }}>
                                                Last seen {new Date(targetUser.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        ) : (
                                            <p style={{ margin: 0, fontSize: 11, color: C.sub }}>Offline</p>
                                        )}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <IconBtn onClick={() => setShowCallModal(true)} title="Video call" isLight={isLight}><Video size={17} /></IconBtn>
                                    <IconBtn onClick={() => setShowCallModal(true)} title="Voice call" isLight={isLight}><Phone size={17} /></IconBtn>
                                    <IconBtn onClick={() => setShowSearchInChat(v => !v)} title="Search in chat" isLight={isLight}><Search size={17} /></IconBtn>
                                    <div style={{ position: 'relative' }}>
                                        <IconBtn onClick={() => setShowMoreMenu(v => !v)} title="More options" isLight={isLight}><MoreVertical size={17} /></IconBtn>
                                        {showMoreMenu && (
                                            <div style={{ position: 'absolute', right: 0, top: 42, width: 220, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: '4px 0', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', zIndex: 100 }}>
                                                {[
                                                    { icon: EyeOff, label: 'Disappearing messages', action: () => triggerToast('Disappearing messages enabled') },
                                                    { icon: VolumeX, label: 'Mute notifications', action: () => triggerToast('Notifications muted') },
                                                    { icon: Info, label: activeConv.type === 'GROUP' ? 'Group Information' : 'View Contact Info', action: () => activeConv.type === 'GROUP' ? setShowGroupInfoModal(true) : setShowContactInfoModal(true) },
                                                    { icon: Search, label: 'Search Messages', action: () => setShowSearchInChat(true) },
                                                    null,
                                                    { icon: Check, label: 'Select messages', action: () => triggerToast('Selection mode active') },
                                                    { icon: MessageSquare, label: 'Mark as unread', action: () => triggerToast('Marked as unread') },
                                                    { icon: Pin, label: 'Pin chat', action: () => triggerToast('Chat pinned to top') },
                                                    { icon: Archive, label: 'Archive', action: () => triggerToast('Chat archived') },
                                                    null,
                                                    { icon: Ban, label: 'Block', danger: true, action: () => triggerToast('Contact blocked') },
                                                    { icon: Trash2, label: 'Delete', danger: true, action: () => triggerToast('Chat history cleared') },
                                                ].map((item, i) =>
                                                    item === null ? (
                                                        <div key={i} style={{ height: 1, background: C.border, margin: '4px 0' }} />
                                                    ) : (
                                                        <button key={i} onClick={() => { item.action?.(); setShowMoreMenu(false); }}
                                                            style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: '8px 14px', fontSize: 12, color: item.danger ? '#E5534B' : C.text, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, fontFamily: C.font }}
                                                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = C.hover; }}
                                                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
                                                        >
                                                            <item.icon size={14} style={{ color: item.danger ? '#E5534B' : C.sub }} />
                                                            {item.label}
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Search Messages Bar */}
                            {showSearchInChat && (
                                <div style={{ background: C.panel, padding: '8px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <Search size={14} style={{ color: C.muted }} />
                                    <input
                                        type="text"
                                        placeholder="Search in this conversation..."
                                        value={chatSearchQuery}
                                        onChange={e => setChatSearchQuery(e.target.value)}
                                        style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: C.text, fontSize: 13, fontFamily: C.font }}
                                    />
                                    <button onClick={() => { setShowSearchInChat(false); setChatSearchQuery(''); }} style={{ background: 'none', border: 'none', color: C.sub, cursor: 'pointer' }}><X size={16} /></button>
                                </div>
                            )}

                            {/* Messages */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {/* Profile card */}
                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                                    <div
                                        onClick={() => activeConv.type === 'GROUP' ? setShowGroupInfoModal(true) : setShowContactInfoModal(true)}
                                        style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '24px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', minWidth: 240, cursor: 'pointer' }}
                                    >
                                        <Avatar name={activeTitle} src={targetUser?.avatar_url || activeConv.avatar_url} size={64} isLight={isLight} />
                                        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{activeTitle}</span>
                                            <ChevronRight size={14} style={{ color: C.muted }} />
                                        </div>
                                        <p style={{ margin: '6px 0 0', fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <Users size={12} /> {activeConv.type === 'GROUP' ? `${activeConv.participants.length} group members` : 'No groups in common'}
                                        </p>
                                    </div>
                                </div>

                                {/* Bubble messages */}
                                {filteredMessages.map(msg => {
                                    const mine = msg.sender_id === user?.id;
                                    const senderObj = msg.sender || activeConv?.participants.find(p => p.user.id === msg.sender_id)?.user;
                                    const senderName = senderObj?.display_name || senderObj?.phone_number || 'Group Member';
                                    return (
                                        <div key={msg.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 8 }}>
                                            {!mine && activeConv?.type === 'GROUP' && (
                                                <Avatar name={senderName} src={senderObj?.avatar_url} size={28} isLight={isLight} />
                                            )}
                                            <div
                                                onContextMenu={(e) => {
                                                    e.preventDefault();
                                                    setMsgContextMenu({ x: e.clientX, y: e.clientY, msg });
                                                }}
                                                style={{
                                                    maxWidth: '58%', padding: '8px 12px',
                                                    background: mine ? C.bubble_out : C.bubble_in,
                                                    color: mine ? '#fff' : C.text,
                                                    borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                                    boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {!mine && activeConv?.type === 'GROUP' && (
                                                    <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, marginBottom: 3 }}>
                                                        {senderName}
                                                    </div>
                                                )}
                                                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 3 }}>
                                                    <span style={{ fontSize: 10, color: mine ? 'rgba(255,255,255,0.7)' : C.sub }}>
                                                        {formatMessageTimestamp(msg.created_at)}
                                                    </span>
                                                    {mine && (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center' }} title={msg.status === 'SENDING' ? 'Sending...' : msg.status === 'READ' ? 'Read' : msg.status === 'DELIVERED' ? 'Delivered' : 'Sent'}>
                                                            {msg.status === 'SENDING' ? (
                                                                <Clock size={11} style={{ color: 'rgba(255,255,255,0.6)' }} />
                                                            ) : msg.status === 'READ' ? (
                                                                <CheckCheck size={12} style={{ color: '#40C4FF' }} />
                                                            ) : msg.status === 'DELIVERED' ? (
                                                                <CheckCheck size={12} style={{ color: 'rgba(255,255,255,0.7)' }} />
                                                            ) : (
                                                                <Check size={12} style={{ color: 'rgba(255,255,255,0.7)' }} />
                                                            )}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {isTyping && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '4px 0' }}>
                                        <Avatar name={activeTitle} src={targetUser?.avatar_url || activeConv.avatar_url} size={24} isLight={isLight} />
                                        <div style={{ background: C.bubble_in, padding: '6px 12px', borderRadius: '14px 14px 14px 4px', fontSize: 12, color: C.sub, fontStyle: 'italic' }}>
                                            typing...
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input bar */}
                            <div style={{ flexShrink: 0, padding: '10px 16px', background: C.panel, borderTop: `1px solid ${C.border}` }}>
                                <form onSubmit={handleSend} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {/* Emoji */}
                                    <div style={{ position: 'relative' }}>
                                        <IconBtn onClick={() => setShowEmojiPicker(v => !v)} title="Emoji" isLight={isLight}><Smile size={18} /></IconBtn>
                                        {showEmojiPicker && (
                                            <div style={{ position: 'absolute', bottom: 44, left: 0, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 8, display: 'flex', gap: 2, boxShadow: '0 8px 24px rgba(0,0,0,0.3)', zIndex: 100 }}>
                                                {EMOJIS.map(e => (
                                                    <button key={e} type="button"
                                                        onClick={() => { setInputMessage(p => p + e); setShowEmojiPicker(false); }}
                                                        style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', padding: '4px 6px', borderRadius: 6, lineHeight: 1 }}
                                                        onMouseEnter={ev => { (ev.currentTarget as HTMLButtonElement).style.background = C.hover; }}
                                                        onMouseLeave={ev => { (ev.currentTarget as HTMLButtonElement).style.background = 'none'; }}
                                                    >{e}</button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Input capsule */}
                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: C.input, borderRadius: 22, padding: '9px 16px' }}>
                                        <input
                                            type="text" placeholder="Message"
                                            value={inputMessage}
                                            onChange={handleInputChange}
                                            onKeyDown={handleKeyDown}
                                            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: C.text, fontSize: 13, fontFamily: C.font }}
                                        />
                                    </div>

                                    <IconBtn onClick={() => setShowVoiceRecorderModal(true)} title="Voice message" isLight={isLight}><Mic size={18} /></IconBtn>
                                    <IconBtn onClick={() => fileInputRef.current?.click()} title="Attach file" isLight={isLight}><Paperclip size={18} /></IconBtn>
                                    
                                    {/* Dedicated Send Button */}
                                    <button
                                        type="submit"
                                        disabled={!inputMessage.trim()}
                                        style={{
                                            height: 36,
                                            padding: '0 14px',
                                            borderRadius: 18,
                                            border: 'none',
                                            background: inputMessage.trim() ? C.blue : (isLight ? '#E5E5EA' : '#2A2B2E'),
                                            color: inputMessage.trim() ? '#fff' : C.sub,
                                            fontSize: 13,
                                            fontWeight: 600,
                                            cursor: inputMessage.trim() ? 'pointer' : 'default',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            transition: 'all 0.15s ease',
                                            fontFamily: C.font,
                                            flexShrink: 0
                                        }}
                                    >
                                        <Send size={14} />
                                        <span>Send</span>
                                    </button>
                                </form>
                            </div>
                        </div>
                    ) : (
                        /* Empty state */
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: C.bg, color: C.muted }}>
                            <MessageSquare size={52} style={{ color: C.border, marginBottom: 14 }} />
                            <h2 style={{ margin: 0, marginBottom: 6, fontSize: 18, fontWeight: 600, color: C.text }}>No chat selected</h2>
                            <p style={{ margin: 0, fontSize: 13, color: C.muted }}>Choose a conversation or search to start messaging.</p>
                        </div>
                    )}
                </>
            )}

            {/* Context Menus */}
            {convContextMenu && (
                <div style={{ position: 'fixed', top: convContextMenu.y, left: convContextMenu.x, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: '4px 0', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', zIndex: 300, minWidth: 160 }}>
                    <button onClick={() => { triggerToast('Chat pinned'); setConvContextMenu(null); }} style={{ width: '100%', padding: '8px 14px', background: 'none', border: 'none', color: C.text, fontSize: 12, textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: C.font }}>
                        <Pin size={14} /> Pin Chat
                    </button>
                    <button onClick={() => { triggerToast('Marked as unread'); setConvContextMenu(null); }} style={{ width: '100%', padding: '8px 14px', background: 'none', border: 'none', color: C.text, fontSize: 12, textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: C.font }}>
                        <MessageSquare size={14} /> Mark as Unread
                    </button>
                    <button onClick={() => { triggerToast('Chat archived'); setConvContextMenu(null); }} style={{ width: '100%', padding: '8px 14px', background: 'none', border: 'none', color: C.text, fontSize: 12, textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: C.font }}>
                        <Archive size={14} /> Archive
                    </button>
                    <div style={{ height: 1, background: C.border, margin: '4px 0' }} />
                    <button onClick={() => { triggerToast('Chat deleted'); setConvContextMenu(null); }} style={{ width: '100%', padding: '8px 14px', background: 'none', border: 'none', color: '#E5534B', fontSize: 12, textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: C.font }}>
                        <Trash2 size={14} /> Delete
                    </button>
                </div>
            )}

            {msgContextMenu && (
                <div style={{ position: 'fixed', top: msgContextMenu.y, left: msgContextMenu.x, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: '4px 0', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', zIndex: 300, minWidth: 160 }}>
                    <button onClick={() => { navigator.clipboard.writeText(msgContextMenu.msg.content); triggerToast('Copied to clipboard'); setMsgContextMenu(null); }} style={{ width: '100%', padding: '8px 14px', background: 'none', border: 'none', color: C.text, fontSize: 12, textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: C.font }}>
                        <Copy size={14} /> Copy Text
                    </button>
                    <button onClick={() => { setInputMessage(`Replying to: "${msgContextMenu.msg.content.slice(0, 20)}..." `); setMsgContextMenu(null); }} style={{ width: '100%', padding: '8px 14px', background: 'none', border: 'none', color: C.text, fontSize: 12, textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: C.font }}>
                        <Reply size={14} /> Reply
                    </button>
                    <div style={{ height: 1, background: C.border, margin: '4px 0' }} />
                    <button onClick={() => { setMessages(p => p.filter(m => m.id !== msgContextMenu.msg.id)); triggerToast('Message deleted'); setMsgContextMenu(null); }} style={{ width: '100%', padding: '8px 14px', background: 'none', border: 'none', color: '#E5534B', fontSize: 12, textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: C.font }}>
                        <Trash2 size={14} /> Delete Message
                    </button>
                </div>
            )}

            {/* Modals */}
            {/* Add Contact Modal */}
            {showAddContactModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
                    <div style={{ width: 400, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, boxShadow: '0 24px 64px rgba(0,0,0,0.4)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text }}>Add New Contact</h2>
                            <IconBtn onClick={() => setShowAddContactModal(false)} isLight={isLight}><X size={16} /></IconBtn>
                        </div>
                        {addContactMessage && (
                            <div style={{ marginBottom: 14, padding: '8px 12px', background: 'rgba(44,107,237,0.12)', color: C.blue, fontSize: 12, borderRadius: 8, textAlign: 'center' }}>
                                {addContactMessage}
                            </div>
                        )}
                        {/* Tabs */}
                        <div style={{ display: 'flex', gap: 6, marginBottom: 14, borderBottom: `1px solid ${C.border}`, paddingBottom: 8 }}>
                            <button
                                type="button"
                                onClick={() => setAddContactTab('SEARCH')}
                                style={{
                                    flex: 1, padding: '6px 0', borderRadius: 8, border: 'none',
                                    background: addContactTab === 'SEARCH' ? C.blue : (isLight ? '#E5E5EA' : '#252628'),
                                    color: addContactTab === 'SEARCH' ? '#fff' : C.sub,
                                    fontSize: 12, fontWeight: 600, cursor: 'pointer'
                                }}
                            >
                                Search Users
                            </button>
                            <button
                                type="button"
                                onClick={() => setAddContactTab('CREATE')}
                                style={{
                                    flex: 1, padding: '6px 0', borderRadius: 8, border: 'none',
                                    background: addContactTab === 'CREATE' ? C.blue : (isLight ? '#E5E5EA' : '#252628'),
                                    color: addContactTab === 'CREATE' ? '#fff' : C.sub,
                                    fontSize: 12, fontWeight: 600, cursor: 'pointer'
                                }}
                            >
                                + Custom User
                            </button>
                        </div>

                        {addContactTab === 'SEARCH' ? (
                            <>
                                <div style={{ position: 'relative', marginBottom: 14 }}>
                                    <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.muted }} />
                                    <input
                                        type="text"
                                        placeholder="Search by name or phone number..."
                                        value={addContactQuery}
                                        onChange={e => handleAddContactSearch(e.target.value)}
                                        style={{ width: '100%', background: C.input, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px 10px 36px', color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: C.font }}
                                    />
                                </div>
                                {addContactResults.length > 0 && (
                                    <div style={{ background: C.input, borderRadius: 10, maxHeight: 180, overflowY: 'auto', padding: 4 }}>
                                        {addContactResults.map(u => (
                                            <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 8 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <Avatar name={u.display_name || u.phone_number} size={30} isLight={isLight} />
                                                    <div>
                                                        <p style={{ margin: 0, fontSize: 13, color: C.text, fontWeight: 600 }}>{u.display_name || u.phone_number}</p>
                                                        <p style={{ margin: 0, fontSize: 11, color: C.muted }}>{u.phone_number}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleAddContact(u.id)}
                                                    style={{ background: C.blue, color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <form onSubmit={handleCreateCustomUser} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.sub, marginBottom: 4 }}>Phone Number</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. +1 999 888 7777"
                                        value={customPhone}
                                        onChange={e => setCustomPhone(e.target.value)}
                                        required
                                        style={{ width: '100%', background: C.input, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: C.font }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.sub, marginBottom: 4 }}>Display Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Sarah Connor"
                                        value={customName}
                                        onChange={e => setCustomName(e.target.value)}
                                        required
                                        style={{ width: '100%', background: C.input, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: C.font }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: C.sub, marginBottom: 4 }}>About / Status (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Security Specialist 🛡️"
                                        value={customAbout}
                                        onChange={e => setCustomAbout(e.target.value)}
                                        style={{ width: '100%', background: C.input, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: C.font }}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={creatingCustomUser || !customPhone.trim() || !customName.trim()}
                                    style={{
                                        marginTop: 4,
                                        width: '100%',
                                        padding: '10px 0',
                                        borderRadius: 10,
                                        border: 'none',
                                        background: C.blue,
                                        color: '#fff',
                                        fontSize: 13,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        fontFamily: C.font,
                                        opacity: (!customPhone.trim() || !customName.trim() || creatingCustomUser) ? 0.6 : 1
                                    }}
                                >
                                    {creatingCustomUser ? 'Adding...' : 'Add Custom Contact'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Group Info Modal */}
            {showGroupInfoModal && activeConv?.type === 'GROUP' && (() => {
                const isCurrentAdmin = activeConv.participants.some(p => p.user.id === user?.id && p.role === 'ADMIN');
                const creationDate = activeConv.created_at ? new Date(activeConv.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '';
                const filteredMembers = activeConv.participants.filter(p => {
                    if (!groupMemberFilter.trim()) return true;
                    const name = (p.user.display_name || p.user.phone_number || '').toLowerCase();
                    return name.includes(groupMemberFilter.toLowerCase());
                });

                return (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
                        <div style={{ width: 440, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, boxShadow: '0 24px 64px rgba(0,0,0,0.4)', maxHeight: '85vh', overflowY: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text }}>Group Information</h2>
                                <IconBtn onClick={() => { setShowGroupInfoModal(false); setIsEditingGroupTitle(false); setIsEditingGroupAvatar(false); setShowAddMemberModal(false); }} isLight={isLight}><X size={16} /></IconBtn>
                            </div>

                            {/* Group Avatar & Title Header */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 20 }}>
                                <div style={{ position: 'relative' }}>
                                    <Avatar name={activeConv.title} src={activeConv.avatar_url} size={72} isLight={isLight} />
                                    {isCurrentAdmin && (
                                        <button
                                            onClick={() => { setIsEditingGroupAvatar(v => !v); setEditGroupAvatar(activeConv.avatar_url || ''); }}
                                            title="Change group avatar"
                                            style={{ position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: '50%', background: C.blue, color: '#fff', border: `2px solid ${C.panel}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                        >
                                            <Edit size={12} />
                                        </button>
                                    )}
                                </div>

                                {isEditingGroupAvatar && (
                                    <div style={{ marginTop: 10, display: 'flex', gap: 6, width: '100%', maxWidth: 300 }}>
                                        <input
                                            type="text"
                                            placeholder="Avatar Image URL..."
                                            value={editGroupAvatar}
                                            onChange={e => setEditGroupAvatar(e.target.value)}
                                            style={{ flex: 1, background: C.input, border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 10px', color: C.text, fontSize: 12, outline: 'none' }}
                                        />
                                        <button onClick={() => updateGroupAvatar(editGroupAvatar)} style={{ background: C.blue, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Save</button>
                                    </div>
                                )}

                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
                                    {isEditingGroupTitle ? (
                                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                            <input
                                                type="text"
                                                value={editGroupTitle}
                                                onChange={e => setEditGroupTitle(e.target.value)}
                                                style={{ background: C.input, border: `1px solid ${C.border}`, borderRadius: 8, padding: '4px 8px', color: C.text, fontSize: 14, fontWeight: 700, outline: 'none' }}
                                            />
                                            <button onClick={() => updateGroupTitle(editGroupTitle)} style={{ background: C.blue, color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Save</button>
                                        </div>
                                    ) : (
                                        <>
                                            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: C.text }}>{activeConv.title}</h3>
                                            {isCurrentAdmin && (
                                                <button onClick={() => { setIsEditingGroupTitle(true); setEditGroupTitle(activeConv.title || ''); }} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 2 }}>
                                                    <Edit size={14} />
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                                <p style={{ margin: '4px 0 0', fontSize: 12, color: C.muted }}>
                                    {activeConv.participants.length} members {creationDate ? `• Created on ${creationDate}` : ''}
                                </p>
                            </div>

                            {/* Members Section */}
                            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Group Members ({activeConv.participants.length})</p>
                                    {isCurrentAdmin && (
                                        <button
                                            onClick={() => setShowAddMemberModal(v => !v)}
                                            style={{ background: 'rgba(44,107,237,0.15)', color: C.blue, border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                                        >
                                            <UserPlus size={13} /> Add Member
                                        </button>
                                    )}
                                </div>

                                {/* Add Member Search Box if open */}
                                {showAddMemberModal && (
                                    <div style={{ marginBottom: 12, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 10 }}>
                                        <div style={{ position: 'relative', marginBottom: 6 }}>
                                            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.muted }} />
                                            <input
                                                type="text"
                                                placeholder="Search contacts to add..."
                                                value={addMemberQuery}
                                                onChange={e => handleSearchAddMember(e.target.value)}
                                                style={{ width: '100%', background: C.input, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px 8px 32px', color: C.text, fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        {addMemberHits.length > 0 && (
                                            <div style={{ maxHeight: 120, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                {addMemberHits.map(u => (
                                                    <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderRadius: 6, background: C.input }}>
                                                        <span style={{ fontSize: 12, color: C.text, fontWeight: 500 }}>{u.display_name || u.phone_number}</span>
                                                        <button onClick={() => addMemberToGroup(u.id)} style={{ background: C.blue, color: '#fff', border: 'none', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Add</button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Filter Members Search Bar */}
                                <div style={{ position: 'relative', marginBottom: 10 }}>
                                    <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.muted }} />
                                    <input
                                        type="text"
                                        placeholder="Search members..."
                                        value={groupMemberFilter}
                                        onChange={e => setGroupMemberFilter(e.target.value)}
                                        style={{ width: '100%', background: C.input, border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 10px 6px 32px', color: C.text, fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
                                    />
                                </div>

                                <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {filteredMembers.map(p => (
                                        <div key={p.user.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 8, background: C.input }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <Avatar name={p.user.display_name || p.user.phone_number} src={p.user.avatar_url} size={32} isLight={isLight} />
                                                <div>
                                                    <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{p.user.display_name || p.user.phone_number}</span>
                                                    {p.role === 'ADMIN' && <span style={{ fontSize: 10, background: 'rgba(44,107,237,0.15)', color: C.blue, padding: '1px 6px', borderRadius: 6, marginLeft: 6, fontWeight: 700 }}>Admin</span>}
                                                </div>
                                            </div>
                                            {isCurrentAdmin && p.user.id !== user?.id && (
                                                <button
                                                    onClick={() => removeGroupMember(activeConv.id, p.user.id)}
                                                    title="Remove member"
                                                    style={{ background: 'none', border: 'none', color: '#E5534B', cursor: 'pointer', padding: 4 }}
                                                >
                                                    <UserMinus size={15} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Actions */}
                            <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 16, paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <button
                                    onClick={leaveGroup}
                                    style={{ width: '100%', background: 'transparent', color: '#E5534B', border: '1px solid rgba(229,83,75,0.4)', borderRadius: 10, padding: '10px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: C.font }}
                                >
                                    Leave Group
                                </button>
                                {isCurrentAdmin && (
                                    <button
                                        onClick={deleteGroup}
                                        style={{ width: '100%', background: '#E5534B', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: C.font }}
                                    >
                                        <Trash2 size={15} /> Delete Group
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Contact Info Modal */}
            {showContactInfoModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
                    <div style={{ width: 360, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.4)' }}>
                        <Avatar name={activeTitle} src={targetUser?.avatar_url} size={80} isLight={isLight} />
                        <h2 style={{ margin: '14px 0 4px', color: C.text, fontSize: 18, fontWeight: 700 }}>{activeTitle}</h2>
                        <p style={{ margin: 0, color: C.sub, fontSize: 13 }}>{targetUser?.phone_number || 'Signal Contact'}</p>
                        <div style={{ margin: '20px 0', borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: '12px 0', color: C.muted, fontSize: 12 }}>
                            {targetUser?.about || 'Available on Signal'}
                        </div>
                        <button onClick={() => setShowContactInfoModal(false)} style={{ background: C.blue, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 0', fontSize: 14, fontWeight: 600, width: '100%', cursor: 'pointer', fontFamily: C.font }}>Close</button>
                    </div>
                </div>
            )}

            {/* Voice Recorder Modal */}
            {showVoiceRecorderModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
                    <div style={{ width: 360, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.4)' }}>
                        <Mic size={40} style={{ color: C.blue, margin: '0 auto 12px' }} />
                        <h2 style={{ margin: 0, marginBottom: 8, color: C.text, fontSize: 17, fontWeight: 700 }}>Voice Note</h2>
                        <p style={{ margin: 0, marginBottom: 20, color: C.sub, fontSize: 13 }}>Hold or click to record encrypted voice message.</p>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={() => setShowVoiceRecorderModal(false)} style={{ flex: 1, background: C.input, color: C.sub, border: 'none', borderRadius: 10, padding: '10px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                            <button onClick={() => { triggerToast('Voice note sent'); setShowVoiceRecorderModal(false); }} style={{ flex: 1, background: C.blue, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Send</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Group Modal */}
            {showNewGroupModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
                    <div style={{ width: 440, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, boxShadow: '0 24px 64px rgba(0,0,0,0.4)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text }}>Create Group Chat</h2>
                            <IconBtn onClick={() => setShowNewGroupModal(false)} isLight={isLight}><X size={16} /></IconBtn>
                        </div>
                        {groupError && <div style={{ marginBottom: 14, padding: '10px 14px', background: 'rgba(220,53,53,0.1)', border: '1px solid rgba(220,53,53,0.25)', borderRadius: 10, color: '#f87171', fontSize: 13, textAlign: 'center' }}>{groupError}</div>}
                        <form onSubmit={createGroup} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <input type="text" placeholder="Group name *" value={groupTitle} onChange={e => setGroupTitle(e.target.value)}
                                style={{ background: C.input, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', color: C.text, fontSize: 13, outline: 'none', fontFamily: C.font }} required />
                            
                            <input type="text" placeholder="Group Avatar URL (optional)" value={groupAvatarUrl} onChange={e => setGroupAvatarUrl(e.target.value)}
                                style={{ background: C.input, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', color: C.text, fontSize: 13, outline: 'none', fontFamily: C.font }} />

                            <div style={{ position: 'relative' }}>
                                <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.muted }} />
                                <input type="text" placeholder="Search members to add *" value={groupMemberSearch} onChange={e => handleGroupSearch(e.target.value)}
                                    style={{ background: C.input, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px 10px 36px', color: C.text, fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: C.font }} />
                            </div>
                            {groupSearchHits.length > 0 && (
                                <div style={{ background: C.input, borderRadius: 10, maxHeight: 130, overflowY: 'auto', padding: 4 }}>
                                    {groupSearchHits.map(m => {
                                        const sel = selectedMembers.some(s => s.id === m.id);
                                        return (
                                            <div key={m.id} onClick={() => toggleMember(m)}
                                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 8, cursor: 'pointer', background: sel ? 'rgba(44,107,237,0.12)' : 'transparent' }}
                                                onMouseEnter={e => { if (!sel) (e.currentTarget as HTMLDivElement).style.background = C.hover; }}
                                                onMouseLeave={e => { if (!sel) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                                            >
                                                <span style={{ fontSize: 13, color: C.text }}>{m.display_name || m.phone_number}</span>
                                                {sel ? <CheckCheck size={14} style={{ color: C.blue }} /> : <Plus size={14} style={{ color: C.sub }} />}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            {selectedMembers.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {selectedMembers.map(m => (
                                        <span key={m.id} style={{ background: 'rgba(44,107,237,0.15)', color: C.blue, fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 4 }}>
                                            {m.display_name || m.phone_number}
                                            <button type="button" onClick={() => toggleMember(m)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit', display: 'flex' }}><X size={11} /></button>
                                        </span>
                                    ))}
                                </div>
                            )}
                            <button type="submit" disabled={creatingGroup}
                                style={{ background: C.blue, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 0', fontSize: 14, fontWeight: 700, cursor: creatingGroup ? 'not-allowed' : 'pointer', opacity: creatingGroup ? 0.6 : 1, fontFamily: C.font, transition: 'background 0.15s' }}>
                                {creatingGroup ? 'Creating…' : 'Create Group'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Calls Modal */}
            {showCallModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
                    <div style={{ width: 360, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.4)' }}>
                        <Phone size={40} style={{ color: C.blue, marginBottom: 12 }} />
                        <h2 style={{ margin: 0, marginBottom: 8, color: C.text, fontSize: 17, fontWeight: 700 }}>Voice & Video Calls</h2>
                        <p style={{ margin: 0, marginBottom: 20, color: C.sub, fontSize: 13, lineHeight: 1.6 }}>End-to-end encrypted calling is coming soon to Signal Desktop.</p>
                        <button onClick={() => setShowCallModal(false)} style={{ background: C.blue, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 0', fontSize: 14, fontWeight: 600, width: '100%', cursor: 'pointer', fontFamily: C.font }}>Close</button>
                    </div>
                </div>
            )}

            {/* Stories Modal */}
            {showStoryModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
                    <div style={{ width: 360, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.4)' }}>
                        <Radio size={40} style={{ color: '#F5A623', marginBottom: 12 }} />
                        <h2 style={{ margin: 0, marginBottom: 8, color: C.text, fontSize: 17, fontWeight: 700 }}>Signal Stories</h2>
                        <p style={{ margin: 0, marginBottom: 20, color: C.sub, fontSize: 13, lineHeight: 1.6 }}>Share updates with your contacts that disappear after 24 hours.</p>
                        <button onClick={() => setShowStoryModal(false)} style={{ background: C.blue, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 0', fontSize: 14, fontWeight: 600, width: '100%', cursor: 'pointer', fontFamily: C.font }}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
}