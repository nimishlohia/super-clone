/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    output: 'export',
    async rewrites() {
        const rawHost = process.env.NEXT_PUBLIC_BACKEND_HOST;
        const hostUrl = rawHost ? (rawHost.startsWith('http') ? rawHost : `https://${rawHost}`) : null;
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || hostUrl || 'http://127.0.0.1:8000';
        return [
            {
                source: '/api/:path*',
                destination: `${backendUrl}/api/:path*`,
            },
            {
                source: '/socket.io/:path*',
                destination: `${backendUrl}/socket.io/:path*`,
            },
        ];
    },
};

export default nextConfig;