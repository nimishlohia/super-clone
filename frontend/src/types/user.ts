export interface User {
    id: string;
    phone_number: string;
    username?: string | null;
    display_name: string | null;
    avatar_url: string | null;
    about: string;
    is_online: boolean;
    last_seen: string;
    created_at: string;
}