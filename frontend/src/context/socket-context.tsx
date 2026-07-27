'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
    socket: Socket | null;
    connected: boolean;
}

const SocketContext = createContext<SocketContextType>({ socket: null, connected: false });

export function SocketProvider({ children, token }: { children: React.ReactNode; token: string }) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8000';
        const socketInstance = io(socketUrl, {
            path: '/socket.io',
            auth: { token: `Bearer ${token}` },
            transports: ['websocket', 'polling'],
        });

        socketInstance.on('connect', () => {
            setConnected(true);
            console.log('⚡ Connected to Signal Socket Server');
        });

        socketInstance.on('disconnect', () => {
            setConnected(false);
        });

        setSocket(socketInstance);

        return () => {
            socketInstance.disconnect();
        };
    }, [token]);

    return (
        <SocketContext.Provider value={{ socket, connected }}>
            {children}
        </SocketContext.Provider>
    );
}

export const useSocket = () => useContext(SocketContext);