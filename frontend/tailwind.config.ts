import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                signal: {
                    bg: "#121212",            // Deep main workspace background
                    rail: "#181818",          // Far-left icon navigation bar
                    sidebar: "#202124",       // Chats list pane background
                    card: "#2A2B2E",          // Active/Hover chat card background
                    bubble: {
                        incoming: "#2A2B2E",   // Received message bubble
                        outgoing: "#2C6BED",   // Sent message bubble (Signal Blue)
                    },
                    border: "#2F3136",        // Subtle panel borders
                    blue: "#2C6BED",          // Signal primary blue
                    text: {
                        primary: "#F5F5F5",
                        secondary: "#9AA0A6",
                        muted: "#5F6368",
                    }
                }
            }
        },
    },
    plugins: [],
};
export default config;