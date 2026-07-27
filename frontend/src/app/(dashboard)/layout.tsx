'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { SocketProvider } from '@/context/socket-context';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, token, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!token || !user) {
                router.push('/login');
            } else if (!user.display_name) {
                router.push('/register');
            }
        }
    }, [loading, token, user, router]);

    if (loading || !user || !token || !user.display_name) {
        return (
            <div className="h-screen w-screen bg-signal-bg flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-signal-blue border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-signal-text-secondary font-medium">Loading Signal...</p>
                </div>
            </div>
        );
    }

    return (
        <SocketProvider token={token}>
            <div className="h-screen w-screen flex overflow-hidden bg-signal-bg select-none">
                {children}
            </div>
        </SocketProvider>
    );
}