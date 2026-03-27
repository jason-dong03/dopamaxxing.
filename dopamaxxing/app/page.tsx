'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const FEATURES = [
    {
        label: 'Open Packs',
        icon: (
            <svg
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
        ),
    },
    {
        label: 'Daily Quests',
        icon: (
            <svg
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
            </svg>
        ),
    },
    {
        label: 'Pokemon Battles',
        icon: (
            <svg
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
        ),
    },
    {
        label: 'Level Up',
        icon: (
            <svg
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
            </svg>
        ),
    },
]

export default function LandingPage() {
    const supabase = createClient()
    const [loading, setLoading] = useState<'google' | 'discord' | null>(null)

    async function signInWithGoogle() {
        setLoading('google')
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
                scopes: 'openid email profile',
                queryParams: { prompt: 'select_account' },
            },
        })
    }

    async function signInWithDiscord() {
        setLoading('discord')
        await supabase.auth.signInWithOAuth({
            provider: 'discord',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
                scopes: 'identify email',
            },
        })
    }

    return (
        <div
            style={{
                minHeight: '100vh',
                background:
                    'linear-gradient(160deg, #08080f 0%, #0c0b14 40%, #070709 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
            }}
        >
            {/* ambient glows */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        top: '-10%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 700,
                        height: 500,
                        background:
                            'radial-gradient(ellipse, rgba(109,40,217,0.08) 0%, transparent 65%)',
                    }}
                />
                <div
                    style={{
                        position: 'absolute',
                        bottom: '5%',
                        left: '30%',
                        width: 400,
                        height: 300,
                        background:
                            'radial-gradient(ellipse, rgba(99,102,241,0.05) 0%, transparent 70%)',
                    }}
                />
            </div>

            {/* subtle grid */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    backgroundImage: `
                    linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)
                `,
                    backgroundSize: '64px 64px',
                }}
            />

            <div
                style={{
                    position: 'relative',
                    zIndex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    padding: '0 24px',
                    maxWidth: 480,
                    width: '100%',
                }}
            >
                <h1
                    style={{
                        fontSize: 'clamp(2.2rem, 7vw, 3.4rem)',
                        fontWeight: 800,
                        letterSpacing: '-0.04em',
                        color: '#fff',
                        margin: '0 0 12px',
                        lineHeight: 1,
                    }}
                >
                    Dopamaxxing
                </h1>

                <p
                    style={{
                        fontSize: '0.88rem',
                        color: '#4b5563',
                        margin: '0 0 40px',
                        lineHeight: 1.6,
                        maxWidth: 260,
                    }}
                >
                    Collect Pokémon cards. Chase the dopamine.
                </p>

                {/* feature row */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0,
                        marginBottom: 44,
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: 14,
                        overflow: 'hidden',
                        backdropFilter: 'blur(8px)',
                        width: '100%',
                        maxWidth: 420,
                    }}
                >
                    {FEATURES.map((f, i) => (
                        <div
                            key={f.label}
                            style={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 6,
                                padding: '14px 8px',
                                borderRight:
                                    i < FEATURES.length - 1
                                        ? '1px solid rgba(255,255,255,0.06)'
                                        : 'none',
                                color: '#4b5563',
                            }}
                        >
                            <div style={{ color: '#6b7280' }}>{f.icon}</div>
                            <span
                                style={{
                                    fontSize: '0.58rem',
                                    fontWeight: 500,
                                    color: '#4b5563',
                                    letterSpacing: '0.04em',
                                    textTransform: 'uppercase',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {f.label}
                            </span>
                        </div>
                    ))}
                </div>

                {/* sign in buttons */}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                        width: '100%',
                        maxWidth: 300,
                    }}
                >
                    <button
                        onClick={signInWithGoogle}
                        disabled={loading !== null}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 10,
                            padding: '13px 20px',
                            borderRadius: 12,
                            border: '1px solid rgba(255,255,255,0.1)',
                            background:
                                loading !== null
                                    ? 'rgba(255,255,255,0.03)'
                                    : 'rgba(255,255,255,0.06)',
                            color: loading !== null ? '#374151' : '#e5e7eb',
                            fontSize: '0.88rem',
                            fontWeight: 600,
                            cursor:
                                loading !== null ? 'not-allowed' : 'pointer',
                            backdropFilter: 'blur(12px)',
                            letterSpacing: '-0.01em',
                            transition:
                                'background 200ms ease, border-color 200ms ease, transform 200ms ease',
                        }}
                        onMouseEnter={(e) => {
                            if (!loading) {
                                e.currentTarget.style.background =
                                    'rgba(255,255,255,0.09)'
                                e.currentTarget.style.borderColor =
                                    'rgba(255,255,255,0.16)'
                                e.currentTarget.style.transform =
                                    'translateY(-1px)'
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background =
                                loading !== null
                                    ? 'rgba(255,255,255,0.03)'
                                    : 'rgba(255,255,255,0.06)'
                            e.currentTarget.style.borderColor =
                                'rgba(255,255,255,0.1)'
                            e.currentTarget.style.transform = 'translateY(0)'
                        }}
                    >
                        {loading === 'google' ? (
                            <svg
                                width={17}
                                height={17}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                style={{
                                    animation:
                                        'landing-spin 1s linear infinite',
                                }}
                            >
                                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                            </svg>
                        ) : (
                            <GoogleIcon />
                        )}
                        {loading === 'google'
                            ? 'Signing in…'
                            : 'Continue with Google'}
                    </button>

                    <button
                        onClick={signInWithDiscord}
                        disabled={loading !== null}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 10,
                            padding: '13px 20px',
                            borderRadius: 12,
                            border: '1px solid rgba(88,101,242,0.3)',
                            background:
                                loading !== null
                                    ? 'rgba(88,101,242,0.04)'
                                    : 'rgba(88,101,242,0.12)',
                            color: loading !== null ? '#374151' : '#e5e7eb',
                            fontSize: '0.88rem',
                            fontWeight: 600,
                            cursor:
                                loading !== null ? 'not-allowed' : 'pointer',
                            backdropFilter: 'blur(12px)',
                            letterSpacing: '-0.01em',
                            transition:
                                'background 200ms ease, border-color 200ms ease, transform 200ms ease',
                        }}
                        onMouseEnter={(e) => {
                            if (!loading) {
                                e.currentTarget.style.background =
                                    'rgba(88,101,242,0.2)'
                                e.currentTarget.style.borderColor =
                                    'rgba(88,101,242,0.5)'
                                e.currentTarget.style.transform =
                                    'translateY(-1px)'
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background =
                                loading !== null
                                    ? 'rgba(88,101,242,0.04)'
                                    : 'rgba(88,101,242,0.12)'
                            e.currentTarget.style.borderColor =
                                'rgba(88,101,242,0.3)'
                            e.currentTarget.style.transform = 'translateY(0)'
                        }}
                    >
                        {loading === 'discord' ? (
                            <svg
                                width={17}
                                height={17}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                style={{
                                    animation:
                                        'landing-spin 1s linear infinite',
                                }}
                            >
                                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                            </svg>
                        ) : (
                            <DiscordIcon />
                        )}
                        {loading === 'discord'
                            ? 'Signing in…'
                            : 'Continue with Discord'}
                    </button>
                </div>

                <p
                    style={{
                        fontSize: '0.56rem',
                        color: '#1f2937',
                        marginTop: 20,
                    }}
                >
                    By continuing you agree to have fun collecting cards.
                </p>
            </div>
        </div>
    )
}

function DiscordIcon() {
    return (
        <svg
            width={17}
            height={17}
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            fill="#5865F2"
        >
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
        </svg>
    )
}

function GoogleIcon() {
    return (
        <svg
            width={17}
            height={17}
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
            />
            <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
            />
            <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
            />
            <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
            />
        </svg>
    )
}
