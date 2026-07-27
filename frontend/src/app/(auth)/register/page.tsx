'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Camera, ArrowRight, ShieldCheck } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/context/auth-context';

export default function RegisterProfilePage() {
    const { user, token, loading: authLoading, updateUser } = useAuth();
    const router = useRouter();

    const [displayName, setDisplayName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [about, setAbout] = useState('Available on Signal');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!authLoading) {
            if (!token || !user) {
                router.push('/login');
            } else if (user.display_name) {
                router.push('/');
            }
        }
    }, [user, token, authLoading, router]);

    const handleSubmitProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!displayName.trim()) return setError('Display name is required');

        setError('');
        setLoading(true);

        try {
            const res = await apiClient.patch('/auth/me', {
                display_name: displayName.trim(),
                avatar_url: avatarUrl.trim() || null,
                about: about.trim() || 'Available on Signal',
            });

            updateUser(res.data);
            router.push('/');
        } catch (err: any) {
            console.error("Profile Setup Error:", err);
            setError(err.response?.data?.detail || 'Failed to save profile. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (authLoading || !user) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-signal-bg">
                <div className="w-8 h-8 border-4 border-signal-blue border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-signal-bg px-4">
            <div className="w-full max-w-md bg-signal-sidebar border border-signal-border rounded-2xl p-8 shadow-2xl">
                {/* Header */}
                <div className="flex flex-col items-center mb-8">
                    <div className="relative mb-4">
                        <div className="w-24 h-24 bg-signal-blue rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg overflow-hidden border-2 border-signal-border">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : displayName ? (
                                displayName[0].toUpperCase()
                            ) : (
                                <User className="w-10 h-10 text-white/80" />
                            )}
                        </div>
                        <div className="absolute bottom-0 right-0 bg-signal-card p-1.5 rounded-full border border-signal-border text-signal-blue shadow">
                            <Camera className="w-4 h-4" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-signal-text-primary">Set Up Your Profile</h1>
                    <p className="text-sm text-signal-text-secondary mt-1 text-center">
                        Profiles are end-to-end encrypted. Choose your name and optional picture.
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmitProfile} className="space-y-5">
                    <div>
                        <label className="block text-xs font-semibold uppercase text-signal-text-secondary mb-2">
                            Display Name <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Alice Smith"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="w-full bg-signal-bg border border-signal-border rounded-xl px-4 py-3 text-signal-text-primary placeholder-signal-text-muted focus:outline-none focus:border-signal-blue transition"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase text-signal-text-secondary mb-2">
                            Avatar URL (Optional)
                        </label>
                        <input
                            type="url"
                            placeholder="https://example.com/avatar.jpg"
                            value={avatarUrl}
                            onChange={(e) => setAvatarUrl(e.target.value)}
                            className="w-full bg-signal-bg border border-signal-border rounded-xl px-4 py-3 text-signal-text-primary placeholder-signal-text-muted focus:outline-none focus:border-signal-blue transition"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase text-signal-text-secondary mb-2">
                            About / Bio
                        </label>
                        <input
                            type="text"
                            placeholder="Available on Signal"
                            value={about}
                            onChange={(e) => setAbout(e.target.value)}
                            className="w-full bg-signal-bg border border-signal-border rounded-xl px-4 py-3 text-signal-text-primary placeholder-signal-text-muted focus:outline-none focus:border-signal-blue transition"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-signal-blue hover:bg-blue-600 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg mt-6"
                    >
                        {loading ? 'Saving Profile...' : 'Complete Setup'}
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </form>
            </div>
        </div>
    );
}