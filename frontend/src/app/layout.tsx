import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/auth-context";

export const metadata: Metadata = {
    title: "Signal Messenger",
    description: "Private messaging clone built with Next.js and FastAPI",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="dark">
            <body className="bg-signal-bg text-signal-text-primary h-screen w-screen overflow-hidden antialiased">
                <AuthProvider>
                    {children}
                </AuthProvider>
            </body>
        </html>
    );
}