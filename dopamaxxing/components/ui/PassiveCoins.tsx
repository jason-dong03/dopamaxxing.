'use client'

import { useEffect, useState } from 'react'

type Toast = { id: number; awarded: number }

export default function PassiveCoins() {
    const [toasts, setToasts] = useState<Toast[]>([])

    useEffect(() => {
        async function award() {
            try {
                const res = await fetch('/api/passive-coins', {
                    method: 'POST',
                })
                if (!res.ok) return
                const data = await res.json()
                if (!data.awarded) return

                const id = Date.now()
                setToasts((prev) => [...prev, { id, awarded: data.awarded }])
                setTimeout(
                    () => setToasts((prev) => prev.filter((t) => t.id !== id)),
                    2800,
                )
            } catch {}
        }

        award()
        const interval = setInterval(award, 180_000)
        return () => clearInterval(interval)
    }, [])

    if (toasts.length === 0) return null

    return (
        <div
            style={{
                position: 'fixed',
                bottom: 80,
                right: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                zIndex: 9998,
                pointerEvents: 'none',
            }}
        >
            {toasts.map((t) => {
                const isBig = t.awarded >= 5
                const isLucky = t.awarded >= 10
                const isJackpot = t.awarded >= 100
                return (
                    <div
                        key={t.id}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: isLucky ? '8px 14px' : '6px 12px',
                            borderRadius: 20,
                            background: isJackpot
                                ? 'linear-gradient(135deg, rgba(234,179,8,0.25), rgba(251,146,60,0.2))'
                                : isLucky
                                  ? 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(16,185,129,0.15))'
                                  : isBig
                                    ? 'rgba(34,197,94,0.12)'
                                    : 'rgba(34,197,94,0.08)',
                            border: isJackpot
                                ? '1px solid rgba(234,179,8,0.6)'
                                : isLucky
                                  ? '1px solid rgba(34,197,94,0.5)'
                                  : isBig
                                    ? '1px solid rgba(34,197,94,0.3)'
                                    : '1px solid rgba(34,197,94,0.2)',
                            backdropFilter: 'blur(8px)',
                            boxShadow: isJackpot
                                ? '0 0 24px rgba(234,179,8,0.4)'
                                : isLucky
                                  ? '0 0 20px rgba(34,197,94,0.3)'
                                  : 'none',
                            fontSize: isLucky ? '0.85rem' : isBig ? '0.78rem' : '0.72rem',
                            fontWeight: 700,
                            color: isJackpot ? '#fbbf24' : isLucky ? '#4ade80' : isBig ? '#22c55e' : '#4ade80',
                            fontFamily: 'monospace',
                            animation: 'passiveCoinToast 2.8s ease-out forwards',
                        }}
                    >
                        {isJackpot ? '🌟' : isLucky ? '✨' : ''}+${t.awarded}
                        {isJackpot && (
                            <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>
                                jackpot!
                            </span>
                        )}
                        {isLucky && !isJackpot && (
                            <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>
                                lucky!
                            </span>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
