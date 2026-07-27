'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';

interface User {
    id: string;
    phone_number: string;
    username?: string | null;
    display_name: string | null;
    avatar_url: string | null;
    about: string;
    is_online: boolean;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    loading: boolean;
    login: (token: string) => Promise<User | null>;
    logout: () => void;
    updateUser: (updatedUser: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const fetchProfile = async (authToken?: string) => {
        try {
            const activeToken = authToken || token || localStorage.getItem('signal_token');
            if (!activeToken) {
                setLoading(false);
                return null;
            }

            const response = await apiClient.get('/auth/me', {
                headers: { Authorization: `Bearer ${activeToken}` }
            });
            setUser(response.data);
            return response.data;
        } catch (err) {
            logout();
            return null;
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const storedToken = localStorage.getItem('signal_token');
        const activeSession = sessionStorage.getItem('signal_session_active');
        if (storedToken && activeSession) {
            setToken(storedToken);
            fetchProfile(storedToken);
        } else {
            localStorage.removeItem('signal_token');
            setToken(null);
            setUser(null);
            setLoading(false);
        }
    }, []);

    const login = async (newToken: string) => {
        localStorage.setItem('signal_token', newToken);
        sessionStorage.setItem('signal_session_active', 'true');
        setToken(newToken);
        const fetchedUser = await fetchProfile(newToken);
        return fetchedUser;
    };

    const logout = () => {
        localStorage.removeItem('signal_token');
        sessionStorage.removeItem('signal_session_active');
        setToken(null);
        setUser(null);
        router.push('/login');
    };

    const updateUser = (updatedUser: Partial<User>) => {
        if (user) {
            setUser({ ...user, ...updatedUser });
        }
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};