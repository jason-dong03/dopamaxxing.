'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function UsernamePage() {
    const router = useRouter()
    const [value, setValue] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            const res = await fetch('/api/set-username', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: value }),
            })
            const data = await res.json()
            if (!res.ok) {
                setError(data.error ?? 'Something went wrong')
            } else {
                router.push('/dashboard')
            }
        } finally {
            setLoading(false)
        }
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
                fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
                padding: '0 24px',
            }}
        >
            <div style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>
                <h1
                    style={{
                        fontSize: '1.5rem',
                        fontWeight: 800,
                        color: '#fff',
                        margin: '0 0 8px',
                        letterSpacing: '-0.03em',
                    }}
                >
                    Pick a username
                </h1>
                <p
                    style={{
                        fontSize: '0.8rem',
                        color: '#4b5563',
                        margin: '0 0 32px',
                    }}
                >
                    This is how you'll appear in Dopamaxxing.
                </p>

                <form
                    onSubmit={handleSubmit}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                    }}
                >
                    <div style={{ position: 'relative' }}>
                        <span
                            style={{
                                position: 'absolute',
                                left: 14,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                fontSize: '0.88rem',
                                color: '#4b5563',
                                userSelect: 'none',
                            }}
                        >
                            @
                        </span>
                        <input
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            placeholder="username"
                            maxLength={20}
                            autoFocus
                            style={{
                                width: '100%',
                                boxSizing: 'border-box',
                                padding: '12px 14px 12px 28px',
                                background: 'rgba(255,255,255,0.05)',
                                border: error
                                    ? '1px solid rgba(239,68,68,0.5)'
                                    : '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 10,
                                fontSize: '0.9rem',
                                color: '#fff',
                                outline: 'none',
                            }}
                        />
                    </div>

                    {error && (
                        <p
                            style={{
                                fontSize: '0.72rem',
                                color: '#f87171',
                                margin: 0,
                            }}
                        >
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading || value.length < 3}
                        style={{
                            padding: '12px',
                            borderRadius: 10,
                            fontSize: '0.88rem',
                            fontWeight: 600,
                            cursor:
                                loading || value.length < 3
                                    ? 'not-allowed'
                                    : 'pointer',
                            background:
                                value.length >= 3
                                    ? 'rgba(255,255,255,0.08)'
                                    : 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: value.length >= 3 ? '#e5e7eb' : '#374151',
                            transition: 'all 200ms',
                        }}
                    >
                        {loading ? 'Setting…' : 'Continue →'}
                    </button>
                </form>

                <p
                    style={{
                        fontSize: '0.58rem',
                        color: '#1f2937',
                        marginTop: 20,
                    }}
                >
                    Letters, numbers and underscores only. 3–20 chars.
                </p>
            </div>
        </div>
    )
}
