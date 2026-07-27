'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ArrowLeft, Camera, User as UserIcon } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/context/auth-context';

type Step = 'WELCOME' | 'LOGIN' | 'OTP' | 'PROFILE';

/* ── Signal Logo SVG ── */
function SignalLogo({ size = 80, ringColor = 'white', bubbleColor = 'white' }: { size?: number; ringColor?: string; bubbleColor?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="100" cy="100" r="88" stroke={ringColor} strokeWidth="4.5" strokeDasharray="12 8" strokeLinecap="round" />
            <path
                fillRule="evenodd" clipRule="evenodd"
                d="M100 42C68 42 42 66 42 96C42 114 51 130 65 140L58 162L81 152C87 154 93 155 100 155C132 155 158 131 158 101C158 71 132 42 100 42Z"
                fill={bubbleColor}
            />
        </svg>
    );
}

/* ── Button Spinner ── */
function Spinner() {
    return (
        <span style={{
            display: 'inline-block', width: 18, height: 18,
            borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.25)',
            borderTopColor: '#fff', animation: 'spin 0.75s linear infinite',
        }} />
    );
}

export default function SignalOnboarding() {
    const { login, updateUser } = useAuth();
    const router = useRouter();

    const [step, setStep] = useState<Step>('WELCOME');
    const [mounted, setMounted] = useState(false);
    const [animIn, setAnimIn] = useState(false);

    const [countryCode] = useState('+91');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
    const [timerSeconds, setTimerSeconds] = useState(30);

    const [displayName, setDisplayName] = useState('');
    const [about, setAbout] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const avatarFileRef = useRef<HTMLInputElement>(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [mockOtp] = useState('123456');
    const phoneRef = useRef<HTMLInputElement>(null);

    /* mount animation */
    useEffect(() => {
        setMounted(true);
        const t = setTimeout(() => setAnimIn(true), 40);
        return () => clearTimeout(t);
    }, []);

    /* auto-focus */
    useEffect(() => {
        if (step === 'LOGIN') setTimeout(() => phoneRef.current?.focus(), 200);
        if (step === 'OTP') setTimeout(() => otpRefs.current[0]?.focus(), 200);
    }, [step]);

    /* OTP timer */
    useEffect(() => {
        if (step !== 'OTP') return;
        setTimerSeconds(30);
        const id = setInterval(() => setTimerSeconds(s => Math.max(0, s - 1)), 1000);
        return () => clearInterval(id);
    }, [step]);

    const goTo = (next: Step) => {
        setAnimIn(false);
        setTimeout(() => { setStep(next); setError(''); setAnimIn(true); }, 280);
    };

    const handleRequestOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (phoneNumber.trim().length < 4) return;
        setError(''); setLoading(true);
        try {
            const res = await apiClient.post('/auth/request-otp', { phone_number: `${countryCode} ${phoneNumber.trim()}` });
            setOtpDigits(['', '', '', '', '', '']);
            goTo('OTP');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Could not send code. Try again.');
        } finally { setLoading(false); }
    };

    const handleOtpChange = (idx: number, val: string) => {
        const d = val.replace(/\D/g, '').slice(-1);
        const next = [...otpDigits]; next[idx] = d; setOtpDigits(next);
        if (d && idx < 5) otpRefs.current[idx + 1]?.focus();
    };
    const handleOtpKey = (idx: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otpDigits[idx] && idx > 0) {
            const next = [...otpDigits]; next[idx - 1] = ''; setOtpDigits(next);
            otpRefs.current[idx - 1]?.focus();
        }
    };
    const handleOtpPaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('');
        const next = ['', '', '', '', '', ''];
        digits.forEach((d, i) => { next[i] = d; });
        setOtpDigits(next);
        otpRefs.current[Math.min(digits.length, 5)]?.focus();
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        const code = otpDigits.join('');
        if (code.length < 6) return setError('Enter all 6 digits.');
        setError(''); setLoading(true);
        try {
            const res = await apiClient.post('/auth/verify-otp', { phone_number: `${countryCode} ${phoneNumber.trim()}`, otp: code });
            const u = await login(res.data.access_token);
            if (u && !u.display_name) goTo('PROFILE'); else router.push('/');
        } catch { setError('Incorrect code. The test OTP is 123456.'); }
        finally { setLoading(false); }
    };

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!displayName.trim()) return setError('Display name is required.');
        setError(''); setLoading(true);
        try {
            const res = await apiClient.patch('/auth/me', {
                display_name: displayName.trim(),
                avatar_url: avatarUrl || null,
                about: about.trim() || 'Available on Signal',
            });
            updateUser(res.data);
            router.push('/');
        } catch (err: any) { setError(err.response?.data?.detail || 'Failed to save.'); }
        finally { setLoading(false); }
    };

    const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => setAvatarUrl(ev.target?.result as string);
        reader.readAsDataURL(file);
    };

    const timerFmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    const validPhone = phoneNumber.trim().length >= 4;
    const otpFull = otpDigits.every(d => d !== '');

    /* === Shared style helpers === */
    const screenStyle = (bg: string): React.CSSProperties => ({
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: bg,
        opacity: animIn ? 1 : 0,
        transform: animIn ? 'translateY(0)' : 'translateY(14px)',
        transition: 'opacity 0.28s ease, transform 0.28s ease',
    });

    const inputStyle: React.CSSProperties = {
        width: '100%', height: 52,
        background: '#1C1E22', border: '1.5px solid #333',
        borderRadius: 10, padding: '0 16px',
        color: '#fff', fontSize: 14, outline: 'none',
        transition: 'border-color 0.15s',
        boxSizing: 'border-box',
    };

    const btnPrimary = (disabled: boolean): React.CSSProperties => ({
        width: '100%', height: 48,
        borderRadius: 10, border: 'none',
        background: disabled ? '#1a2a50' : '#2C6BED',
        color: disabled ? '#555' : '#fff',
        fontWeight: 700, fontSize: 14, letterSpacing: '0.02em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        transition: 'background 0.15s, transform 0.1s',
    });

    const font = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

    if (!mounted) return null;

    return (
        <>
            {/* Keyframe for spinner */}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

            {/* Root wrapper — fills entire screen */}
            <div style={{ position: 'fixed', inset: 0, fontFamily: font, userSelect: 'none', overflow: 'hidden' }}>

                {/* ══════════════════════════════════════════
                    SCREEN 1 — WELCOME
                ══════════════════════════════════════════ */}
                {step === 'WELCOME' && (
                    <div style={screenStyle('#2962D9')}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '0 32px' }}>
                            <div style={{ marginBottom: 40 }}>
                                <SignalLogo size={90} ringColor="rgba(255,255,255,0.6)" bubbleColor="white" />
                            </div>

                            <h1 style={{ color: '#fff', fontSize: 36, fontWeight: 300, letterSpacing: '-0.5px', margin: 0, marginBottom: 14, lineHeight: 1.2 }}>
                                Welcome to Signal Desktop
                            </h1>
                            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 18, margin: 0, marginBottom: 52, lineHeight: 1.6 }}>
                                Privacy is possible. Signal makes it easy.
                            </p>

                            <button
                                onClick={() => goTo('LOGIN')}
                                style={{
                                    background: '#fff', color: '#2962D9',
                                    border: 'none', borderRadius: 8,
                                    padding: '16px 64px',
                                    fontSize: 13, fontWeight: 800,
                                    letterSpacing: '0.12em', textTransform: 'uppercase',
                                    cursor: 'pointer',
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
                                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                                    fontFamily: font,
                                }}
                                onMouseEnter={e => {
                                    (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)';
                                    (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 12px 40px rgba(0,0,0,0.30)';
                                }}
                                onMouseLeave={e => {
                                    (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                                    (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.22)';
                                }}
                                onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)'; }}
                                onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)'; }}
                            >
                                GET STARTED
                            </button>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════
                    SCREEN 2 — LOGIN
                ══════════════════════════════════════════ */}
                {step === 'LOGIN' && (
                    <div style={screenStyle('#111315')}>
                        <div style={{ width: '100%', maxWidth: 420, padding: '0 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                            <div style={{ marginBottom: 20 }}>
                                <SignalLogo size={60} ringColor="#4A7CF4" bubbleColor="#4A7CF4" />
                            </div>

                            <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0, marginBottom: 6 }}>Signal</h1>
                            <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 500, margin: 0, marginBottom: 6 }}>
                                Log in or register to use Signal
                            </h2>
                            <p style={{ color: '#8A8A8E', fontSize: 13, margin: 0, marginBottom: 28, lineHeight: 1.5 }}>
                                Enter your phone number to get started.
                            </p>

                            {error && (
                                <div style={{ width: '100%', marginBottom: 16, padding: '10px 14px', background: 'rgba(220,53,53,0.1)', border: '1px solid rgba(220,53,53,0.3)', borderRadius: 10, color: '#f87171', fontSize: 13, textAlign: 'center' }}>
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleRequestOtp} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {/* Phone number input */}
                                <div style={{ position: 'relative' }}>
                                    <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', padding: '0', paddingLeft: 12 }}>
                                        {/* Country */}
                                        <span style={{ color: '#fff', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', paddingRight: 8 }}>IN ▾</span>
                                        <div style={{ width: 1, height: 20, background: '#333', marginRight: 10 }} />
                                        <span style={{ color: '#fff', fontSize: 13, fontWeight: 500, marginRight: 8 }}>{countryCode}</span>
                                        <input
                                            ref={phoneRef}
                                            type="tel"
                                            placeholder="Enter phone number"
                                            value={phoneNumber}
                                            onChange={e => setPhoneNumber(e.target.value)}
                                            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 14, height: '100%', fontFamily: font }}
                                        />
                                    </div>
                                </div>

                                <p style={{ color: '#636366', fontSize: 12, lineHeight: 1.6, margin: 0, textAlign: 'center' }}>
                                    Signal will send you a verification code. Message and data rates may apply.
                                </p>

                                <button type="submit" disabled={!validPhone || loading} style={btnPrimary(!validPhone || loading)}>
                                    {loading ? <><Spinner /> Sending…</> : 'Next'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════
                    SCREEN 3 — OTP VERIFICATION
                ══════════════════════════════════════════ */}
                {step === 'OTP' && (
                    <div style={screenStyle('#111315')}>
                        <div style={{ width: '100%', maxWidth: 420, padding: '0 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                            {/* Back */}
                            <button
                                onClick={() => goTo('LOGIN')}
                                style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#8A8A8E', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 28, fontFamily: font, padding: 0 }}
                            >
                                <ArrowLeft size={15} /> Change number
                            </button>

                            <div style={{ marginBottom: 20 }}>
                                <SignalLogo size={56} ringColor="#4A7CF4" bubbleColor="#4A7CF4" />
                            </div>

                            <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: 0, marginBottom: 8 }}>
                                Verify your phone number
                            </h2>
                            <p style={{ color: '#8A8A8E', fontSize: 13, margin: 0, marginBottom: 28, lineHeight: 1.6 }}>
                                We sent a code to <strong style={{ color: '#ccc' }}>{countryCode} {phoneNumber}</strong>
                            </p>

                            {error && (
                                <div style={{ width: '100%', marginBottom: 16, padding: '10px 14px', background: 'rgba(220,53,53,0.1)', border: '1px solid rgba(220,53,53,0.3)', borderRadius: 10, color: '#f87171', fontSize: 13, textAlign: 'center' }}>
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleVerifyOtp} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                {/* 6 OTP boxes */}
                                <div style={{ display: 'flex', gap: 10, marginBottom: 20, justifyContent: 'center' }} onPaste={handleOtpPaste}>
                                    {otpDigits.map((digit, idx) => (
                                        <input
                                            key={idx}
                                            ref={el => { otpRefs.current[idx] = el; }}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={digit}
                                            onChange={e => handleOtpChange(idx, e.target.value)}
                                            onKeyDown={e => handleOtpKey(idx, e)}
                                            style={{
                                                width: 48, height: 56,
                                                background: '#1C1E22',
                                                border: `2px solid ${digit ? '#2C6BED' : '#2E2E32'}`,
                                                borderRadius: 10,
                                                textAlign: 'center',
                                                fontSize: 22, fontWeight: 700,
                                                color: '#fff', outline: 'none',
                                                transition: 'border-color 0.15s',
                                                fontFamily: font,
                                                caretColor: '#2C6BED',
                                            }}
                                            onFocus={e => { e.currentTarget.style.borderColor = '#2C6BED'; }}
                                            onBlur={e => { e.currentTarget.style.borderColor = digit ? '#2C6BED' : '#2E2E32'; }}
                                        />
                                    ))}
                                </div>

                                {/* Timer + dev helper */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 20 }}>
                                    <span style={{ color: '#636366', fontSize: 12, fontFamily: 'monospace' }}>{timerFmt(timerSeconds)}</span>
                                    <button
                                        type="button"
                                        onClick={() => setOtpDigits(['1','2','3','4','5','6'])}
                                        style={{ background: 'rgba(44,107,237,0.12)', border: 'none', borderRadius: 6, padding: '5px 12px', color: '#4A7CF4', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: font }}
                                    >
                                        Dev: fill {mockOtp}
                                    </button>
                                </div>

                                <button type="submit" disabled={!otpFull || loading} style={{ ...btnPrimary(!otpFull || loading), width: '100%' }}>
                                    {loading ? <><Spinner /> Verifying…</> : 'Verify'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════
                    SCREEN 4 — PROFILE SETUP
                ══════════════════════════════════════════ */}
                {step === 'PROFILE' && (
                    <div style={screenStyle('#111315')}>
                        <div style={{ width: '100%', maxWidth: 420, padding: '0 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                            <div style={{ marginBottom: 20 }}>
                                <SignalLogo size={56} ringColor="#4A7CF4" bubbleColor="#4A7CF4" />
                            </div>

                            <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: 0, marginBottom: 8 }}>Create your profile</h2>
                            <p style={{ color: '#636366', fontSize: 13, margin: 0, marginBottom: 28, lineHeight: 1.6 }}>
                                Encrypted and only shared with your contacts.
                            </p>

                            {error && (
                                <div style={{ width: '100%', marginBottom: 16, padding: '10px 14px', background: 'rgba(220,53,53,0.1)', border: '1px solid rgba(220,53,53,0.3)', borderRadius: 10, color: '#f87171', fontSize: 13, textAlign: 'center' }}>
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleProfileSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                                {/* Avatar */}
                                <div style={{ position: 'relative', marginBottom: 8 }}>
                                    <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'linear-gradient(135deg, #1a6c45, #0c4a30)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 700, color: '#fff', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}>
                                        {avatarUrl ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                         : displayName ? displayName[0].toUpperCase()
                                         : <UserIcon size={36} color="rgba(255,255,255,0.7)" />}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => avatarFileRef.current?.click()}
                                        style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: '50%', background: '#2C6BED', border: '2px solid #111315', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                    >
                                        <Camera size={13} color="#fff" />
                                    </button>
                                    <input ref={avatarFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarFile} />
                                </div>

                                <div style={{ width: '100%', textAlign: 'left' }}>
                                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#636366', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                                        Display Name <span style={{ color: '#f87171' }}>*</span>
                                    </label>
                                    <input
                                        type="text" placeholder="Your name" value={displayName}
                                        onChange={e => setDisplayName(e.target.value)}
                                        style={{ ...inputStyle }}
                                        onFocus={e => { e.currentTarget.style.borderColor = '#2C6BED'; }}
                                        onBlur={e => { e.currentTarget.style.borderColor = '#333'; }}
                                        required
                                    />
                                </div>

                                <div style={{ width: '100%', textAlign: 'left' }}>
                                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#636366', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                                        About (optional)
                                    </label>
                                    <input
                                        type="text" placeholder="Available on Signal" value={about}
                                        onChange={e => setAbout(e.target.value)}
                                        style={{ ...inputStyle }}
                                        onFocus={e => { e.currentTarget.style.borderColor = '#2C6BED'; }}
                                        onBlur={e => { e.currentTarget.style.borderColor = '#333'; }}
                                    />
                                </div>

                                <button type="submit" disabled={!displayName.trim() || loading} style={{ ...btnPrimary(!displayName.trim() || loading), marginTop: 8 }}>
                                    {loading ? <><Spinner /> Saving…</> : 'Continue'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}