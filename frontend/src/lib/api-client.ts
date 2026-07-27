import axios from 'axios';

const rawHost = process.env.NEXT_PUBLIC_BACKEND_HOST;
const hostApiUrl = rawHost ? (rawHost.startsWith('http') ? `${rawHost}/api/v1` : `https://${rawHost}/api/v1`) : null;
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || hostApiUrl || '/api/v1';

export const apiClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor to attach JWT token to every request
apiClient.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('signal_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});