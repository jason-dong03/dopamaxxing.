'use client'

import { useRef, useState } from 'react'

export default function LiberatorEasterEgg({ children }: { children: React.ReactNode }) {
    const clicksRef = useRef(0)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const [phrase, setPhrase] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    async function handleClick() {
        if (loading) return

        clicksRef.current += 1

        // Reset click count after 2s of inactivity
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => { clicksRef.current = 0 }, 2000)

        if (clicksRef.current >= 7) {
            clicksRef.current = 0
            setLoading(true)
            try {
                const res = await fetch('/api/liberator-phrase', { method: 'POST' })
                if (res.ok) {
                    const { phrase: p } = await res.json()
                    setPhrase(p)
                    window.dispatchEvent(new Event('quest-claimed'))
                }
            } finally {
                setLoading(false)
            }
        }
    }

    return (
        <>
            <span
                onClick={handleClick}
                style={{ cursor: 'default', userSelect: 'none' }}
            >
                {children}
            </span>

            {phrase && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.88)',
                        zIndex: 99999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 24,
                    }}
                    onClick={() => setPhrase(null)}
                >
                    <div
                        style={{
                            background: 'rgba(5,20,10,0.98)',
                            border: '1px solid rgba(74,222,128,0.45)',
                            borderRadius: 16,
                            padding: '32px 28px',
                            maxWidth: 360,
                            textAlign: 'center',
                            boxShadow: '0 0 40px rgba(74,222,128,0.18)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <p style={{ fontSize: '0.65rem', color: '#4ade80', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                            N speaks to you
                        </p>
                        <p style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: 20 }}>
                            &ldquo;You found it. The phrase meant only for you — carry it, for our journey has only just begun.&rdquo;
                        </p>
                        <div style={{
                            background: 'rgba(74,222,128,0.07)',
                            border: '1px solid rgba(74,222,128,0.3)',
                            borderRadius: 10,
                            padding: '12px 20px',
                            marginBottom: 20,
                        }}>
                            <p style={{ fontSize: '1rem', fontWeight: 800, color: '#dcfce7', letterSpacing: '0.06em', fontFamily: 'monospace' }}>
                                {phrase}
                            </p>
                        </div>
                        <p style={{ fontSize: '0.58rem', color: '#475569' }}>
                            This phrase is yours alone. Your quest has been recorded.
                        </p>
                        <button
                            onClick={() => setPhrase(null)}
                            style={{
                                marginTop: 20,
                                background: 'transparent',
                                border: '1px solid rgba(74,222,128,0.35)',
                                borderRadius: 8,
                                color: '#4ade80',
                                fontSize: '0.65rem',
                                padding: '6px 16px',
                                cursor: 'pointer',
                                fontWeight: 600,
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}
