'use client';

import React, { useState } from 'react';
import {
    User as UserIcon, Palette, MessageSquare, Phone,
    Bell, Lock, Database, Camera, ShieldCheck,
    Smartphone, HelpCircle, Info, LogOut, X, Moon, Sun, Monitor
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { apiClient } from '@/lib/api-client';

export type ThemeMode = 'dark' | 'light' | 'system';

interface SettingsViewProps {
    onClose?: () => void;
    themeMode?: ThemeMode;
    onThemeChange?: (mode: ThemeMode) => void;
}

type SettingsSection =
    | 'profile'
    | 'privacy'
    | 'notifications'
    | 'appearance'
    | 'chats'
    | 'storage'
    | 'devices'
    | 'help'
    | 'about';

export default function SettingsView({ onClose, themeMode = 'dark', onThemeChange }: SettingsViewProps) {
    const { user, updateUser, logout } = useAuth();
    const [activeSection, setActiveSection] = useState<SettingsSection>('profile');

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
        font: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    };

    // Profile form state
    const [displayName, setDisplayName] = useState(user?.display_name || '');
    const [username, setUsername] = useState(user?.username || '');
    const [about, setAbout] = useState(user?.about || 'Available on Signal');
    const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');

    const [editingField, setEditingField] = useState<'name' | 'about' | 'username' | 'avatar' | null>(null);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    // Settings toggles
    const [readReceipts, setReadReceipts] = useState(true);
    const [typingIndicators, setTypingIndicators] = useState(true);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [mediaAutoDownload, setMediaAutoDownload] = useState(true);

    const getInitials = (name?: string | null) => {
        if (!name) return 'SG';
        return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        setMessage('');
        try {
            const res = await apiClient.patch('/auth/me', {
                display_name: displayName.trim(),
                username: username.trim() || null,
                about: about.trim(),
                avatar_url: avatarUrl.trim() || null,
            });
            updateUser(res.data);
            setMessage('Profile updated successfully');
            setEditingField(null);
        } catch (err: any) {
            setMessage(err.response?.data?.detail || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const navItems: { id: SettingsSection; label: string; icon: React.ElementType }[] = [
        { id: 'profile', label: 'Profile', icon: UserIcon },
        { id: 'privacy', label: 'Privacy', icon: Lock },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'appearance', label: 'Appearance', icon: Palette },
        { id: 'chats', label: 'Chats', icon: MessageSquare },
        { id: 'storage', label: 'Storage & Data', icon: Database },
        { id: 'devices', label: 'Linked Devices', icon: Smartphone },
        { id: 'help', label: 'Help', icon: HelpCircle },
        { id: 'about', label: 'About', icon: Info },
    ];

    return (
        <div style={{ display: 'flex', width: '100%', height: '100%', background: C.bg, color: C.text, fontFamily: C.font, userSelect: 'none', overflow: 'hidden' }}>
            
            {/* LEFT SETTINGS NAVIGATION PANEL (300px) */}
            <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', background: C.panel, borderRight: `1px solid ${C.border}` }}>
                {/* Header */}
                <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h1 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: 0 }}>Settings</h1>
                    {onClose && (
                        <button
                            onClick={onClose}
                            style={{ background: 'none', border: 'none', color: C.sub, cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex' }}
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>

                {/* User Card */}
                <div
                    onClick={() => setActiveSection('profile')}
                    style={{
                        padding: 12, margin: 12, borderRadius: 12, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 12,
                        background: activeSection === 'profile' ? C.selected : 'transparent',
                        border: activeSection === 'profile' ? `1px solid ${C.border}` : '1px solid transparent',
                        transition: 'background 0.15s'
                    }}
                >
                    <div style={{ width: 42, height: 42, borderRadius: '50%', background: C.blue, color: '#fff', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                        {user?.avatar_url ? (
                            <img src={user.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            getInitials(user?.display_name || user?.phone_number)
                        )}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {user?.display_name || 'Signal User'}
                        </h3>
                        <p style={{ margin: 0, fontSize: 12, color: C.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.phone_number || ''}</p>
                    </div>
                </div>

                {/* Navigation Items */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 12px' }}>
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const active = activeSection === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveSection(item.id)}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '10px 14px', borderRadius: 10, border: 'none',
                                    background: active ? C.selected : 'transparent',
                                    color: active ? C.text : C.sub,
                                    fontSize: 13, fontWeight: 500, cursor: 'pointer',
                                    transition: 'background 0.12s, color 0.12s',
                                    marginBottom: 2, textAlign: 'left', fontFamily: C.font
                                }}
                            >
                                <Icon size={17} style={{ color: active ? C.blue : C.sub }} />
                                {item.label}
                            </button>
                        );
                    })}
                </div>

                {/* Logout Button */}
                <div style={{ padding: 12, borderTop: `1px solid ${C.border}` }}>
                    <button
                        onClick={logout}
                        style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                            padding: '10px 14px', borderRadius: 10, border: 'none',
                            background: 'rgba(229,83,75,0.1)', color: '#E5534B',
                            fontSize: 13, fontWeight: 600, cursor: 'pointer',
                            transition: 'background 0.15s', textAlign: 'left', fontFamily: C.font
                        }}
                    >
                        <LogOut size={17} /> Log Out
                    </button>
                </div>
            </div>

            {/* RIGHT MAIN CONTENT PANEL */}
            <div style={{ flex: 1, height: '100%', overflowY: 'auto', padding: '32px 48px', display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: '100%', maxWidth: 580 }}>
                    
                    {/* SECTION: Profile */}
                    {activeSection === 'profile' && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <h2 style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 28 }}>Your Profile</h2>

                            <div style={{ position: 'relative', marginBottom: 24 }}>
                                <div style={{ width: 96, height: 96, borderRadius: '50%', background: C.blue, color: '#fff', fontWeight: 700, fontSize: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', border: `2px solid ${C.border}` }}>
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        getInitials(user?.display_name || user?.phone_number)
                                    )}
                                </div>
                                <button
                                    onClick={() => setEditingField(editingField === 'avatar' ? null : 'avatar')}
                                    style={{ position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderRadius: '50%', background: C.blue, border: `2px solid ${C.bg}`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                >
                                    <Camera size={14} />
                                </button>
                            </div>

                            {editingField === 'avatar' && (
                                <div style={{ width: '100%', marginBottom: 20, padding: 16, background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12 }}>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 6 }}>Avatar URL</label>
                                    <input
                                        type="url"
                                        placeholder="https://example.com/photo.jpg"
                                        value={avatarUrl}
                                        onChange={(e) => setAvatarUrl(e.target.value)}
                                        style={{ width: '100%', background: C.input, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                                        <button onClick={() => setEditingField(null)} style={{ background: 'none', border: 'none', color: C.sub, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                                        <button onClick={handleSaveProfile} disabled={saving} style={{ background: C.blue, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Save</button>
                                    </div>
                                </div>
                            )}

                            {message && (
                                <div style={{ width: '100%', marginBottom: 16, padding: '10px 14px', background: 'rgba(44,107,237,0.12)', border: '1px solid rgba(44,107,237,0.3)', color: C.blue, fontSize: 12, borderRadius: 10, textAlign: 'center' }}>
                                    {message}
                                </div>
                            )}

                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
                                <div style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: 16 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <span style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase' }}>Display Name</span>
                                            {editingField === 'name' ? (
                                                <input
                                                    type="text"
                                                    value={displayName}
                                                    onChange={(e) => setDisplayName(e.target.value)}
                                                    style={{ display: 'block', marginTop: 4, background: C.input, border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 10px', color: C.text, fontSize: 14, outline: 'none' }}
                                                />
                                            ) : (
                                                <p style={{ margin: '4px 0 0', fontSize: 15, fontWeight: 600, color: C.text }}>{displayName || 'Signal User'}</p>
                                            )}
                                        </div>
                                        <button onClick={() => editingField === 'name' ? handleSaveProfile() : setEditingField('name')} style={{ background: 'none', border: 'none', color: C.blue, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                                            {editingField === 'name' ? 'Save' : 'Edit'}
                                        </button>
                                    </div>
                                </div>

                                <div style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: 16 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <span style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase' }}>About</span>
                                            {editingField === 'about' ? (
                                                <input
                                                    type="text"
                                                    value={about}
                                                    onChange={(e) => setAbout(e.target.value)}
                                                    style={{ display: 'block', marginTop: 4, background: C.input, border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 10px', color: C.text, fontSize: 14, outline: 'none' }}
                                                />
                                            ) : (
                                                <p style={{ margin: '4px 0 0', fontSize: 14, color: C.text }}>{about}</p>
                                            )}
                                        </div>
                                        <button onClick={() => editingField === 'about' ? handleSaveProfile() : setEditingField('about')} style={{ background: 'none', border: 'none', color: C.blue, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                                            {editingField === 'about' ? 'Save' : 'Edit'}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <span style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase' }}>Phone Number</span>
                                    <p style={{ margin: '4px 0 0', fontSize: 14, color: C.text, fontFamily: 'monospace' }}>{user?.phone_number || 'Registered Phone'}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SECTION: Privacy */}
                    {activeSection === 'privacy' && (
                        <div>
                            <h2 style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20 }}>Privacy</h2>
                            <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.text }}>Read Receipts</p>
                                        <p style={{ margin: '2px 0 0', fontSize: 12, color: C.muted }}>See and share when messages are read</p>
                                    </div>
                                    <input type="checkbox" checked={readReceipts} onChange={e => setReadReceipts(e.target.checked)} style={{ width: 18, height: 18, accentColor: C.blue, cursor: 'pointer' }} />
                                </div>
                                <div style={{ height: 1, background: C.border }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.text }}>Typing Indicators</p>
                                        <p style={{ margin: '2px 0 0', fontSize: 12, color: C.muted }}>See and share when typing messages</p>
                                    </div>
                                    <input type="checkbox" checked={typingIndicators} onChange={e => setTypingIndicators(e.target.checked)} style={{ width: 18, height: 18, accentColor: C.blue, cursor: 'pointer' }} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SECTION: Notifications */}
                    {activeSection === 'notifications' && (
                        <div>
                            <h2 style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20 }}>Notifications</h2>
                            <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.text }}>Notifications</p>
                                        <p style={{ margin: '2px 0 0', fontSize: 12, color: C.muted }}>Show desktop notifications for new messages</p>
                                    </div>
                                    <input type="checkbox" checked={notificationsEnabled} onChange={e => setNotificationsEnabled(e.target.checked)} style={{ width: 18, height: 18, accentColor: C.blue, cursor: 'pointer' }} />
                                </div>
                                <div style={{ height: 1, background: C.border }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.text }}>Notification Sounds</p>
                                        <p style={{ margin: '2px 0 0', fontSize: 12, color: C.muted }}>Play sound on receiving messages</p>
                                    </div>
                                    <input type="checkbox" checked={soundEnabled} onChange={e => setSoundEnabled(e.target.checked)} style={{ width: 18, height: 18, accentColor: C.blue, cursor: 'pointer' }} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SECTION: Appearance */}
                    {activeSection === 'appearance' && (
                        <div>
                            <h2 style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20 }}>Appearance</h2>
                            <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
                                <p style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 600, color: C.text }}>Theme</p>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                                    {[
                                        { id: 'dark', label: 'Dark', icon: Moon },
                                        { id: 'light', label: 'Light', icon: Sun },
                                        { id: 'system', label: 'System', icon: Monitor },
                                    ].map(t => {
                                        const TIcon = t.icon;
                                        const sel = themeMode === t.id;
                                        return (
                                            <button
                                                key={t.id}
                                                onClick={() => onThemeChange?.(t.id as ThemeMode)}
                                                style={{
                                                    padding: 16, borderRadius: 12,
                                                    border: sel ? `2px solid ${C.blue}` : `1px solid ${C.border}`,
                                                    background: sel ? 'rgba(44,107,237,0.1)' : C.input,
                                                    color: sel ? C.text : C.sub,
                                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                                                    cursor: 'pointer', fontFamily: C.font
                                                }}
                                            >
                                                <TIcon size={20} />
                                                <span style={{ fontSize: 12, fontWeight: 600 }}>{t.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SECTION: Chats */}
                    {activeSection === 'chats' && (
                        <div>
                            <h2 style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20 }}>Chats Settings</h2>
                            <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.text }}>Auto-download Media</p>
                                        <p style={{ margin: '2px 0 0', fontSize: 12, color: C.muted }}>Automatically download photos and attachments</p>
                                    </div>
                                    <input type="checkbox" checked={mediaAutoDownload} onChange={e => setMediaAutoDownload(e.target.checked)} style={{ width: 18, height: 18, accentColor: C.blue, cursor: 'pointer' }} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SECTION: Storage, Devices, Help, About */}
                    {['storage', 'devices', 'help', 'about'].includes(activeSection) && (
                        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 16, padding: 40, textAlign: 'center' }}>
                            <ShieldCheck size={48} style={{ color: C.blue, margin: '0 auto 16px' }} />
                            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: C.text, textTransform: 'capitalize' }}>{activeSection}</h3>
                            <p style={{ margin: 0, fontSize: 13, color: C.sub, lineHeight: 1.6 }}>
                                Signal Desktop v7.14.0 (Clone)<br />
                                End-to-end encryption with Signal Protocol.
                            </p>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
