'use client'

import { useEffect, useState } from 'react'

type ToastKind = 'complete' | 'progress'

type Toast = {
    id: number
    kind: ToastKind
    name: string
    coins?: number
    xp?: number
    progress?: number // 0-1
}

export default function QuestToast() {
    const [toasts, setToasts] = useState<Toast[]>([])

    useEffect(() => {
        function addToast(t: Omit<Toast, 'id'>) {
            const id = Date.now() + Math.random()
            setToasts((prev) => [...prev, { ...t, id }])
            setTimeout(
                () => setToasts((prev) => prev.filter((x) => x.id !== id)),
                3500,
            )
        }

        function onComplete(e: Event) {
            const { name, coins, xp } = (e as CustomEvent).detail ?? {}
            if (!name) return
            addToast({ kind: 'complete', name, coins, xp })
        }

        function onProgress(e: Event) {
            const { name, progress } = (e as CustomEvent).detail ?? {}
            if (!name || progress == null) return
            addToast({ kind: 'progress', name, progress })
        }

        window.addEventListener('quest-complete', onComplete)
        window.addEventListener('quest-progress', onProgress)
        return () => {
            window.removeEventListener('quest-complete', onComplete)
            window.removeEventListener('quest-progress', onProgress)
        }
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
            {toasts.map((t) => (
                <div
                    key={t.id}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 3,
                        padding: '8px 14px',
                        borderRadius: 12,
                        background:
                            t.kind === 'complete'
                                ? 'rgba(16,185,129,0.12)'
                                : 'rgba(96,165,250,0.10)',
                        border:
                            t.kind === 'complete'
                                ? '1px solid rgba(16,185,129,0.45)'
                                : '1px solid rgba(96,165,250,0.35)',
                        backdropFilter: 'blur(10px)',
                        boxShadow:
                            t.kind === 'complete'
                                ? '0 0 18px rgba(16,185,129,0.25)'
                                : '0 0 14px rgba(96,165,250,0.18)',
                        minWidth: 180,
                        maxWidth: 240,
                        animation: 'passiveCoinToast 3.5s ease-out forwards',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                        }}
                    >
                        <span style={{ fontSize: '0.8rem' }}>
                            {t.kind === 'complete' ? '✅' : '📈'}
                        </span>
                        <span
                            style={{
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                color:
                                    t.kind === 'complete'
                                        ? '#34d399'
                                        : '#60a5fa',
                                letterSpacing: '0.04em',
                                textTransform: 'uppercase',
                            }}
                        >
                            {t.kind === 'complete'
                                ? 'Quest Complete'
                                : 'Quest Progress'}
                        </span>
                    </div>
                    <span
                        style={{
                            fontSize: '0.72rem',
                            color: '#e2e8f0',
                            fontWeight: 500,
                            lineHeight: 1.3,
                        }}
                    >
                        {t.name}
                    </span>
                    {t.kind === 'complete' && (t.coins || t.xp) && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                            {t.coins ? (
                                <span
                                    style={{
                                        fontSize: '0.63rem',
                                        color: '#fbbf24',
                                        fontWeight: 700,
                                    }}
                                >
                                    +${t.coins}
                                </span>
                            ) : null}
                            {t.xp ? (
                                <span
                                    style={{
                                        fontSize: '0.63rem',
                                        color: '#a78bfa',
                                        fontWeight: 700,
                                    }}
                                >
                                    +{t.xp} xp
                                </span>
                            ) : null}
                        </div>
                    )}
                    {t.kind === 'progress' && t.progress != null && (
                        <div style={{ marginTop: 3 }}>
                            <div
                                style={{
                                    height: 3,
                                    borderRadius: 2,
                                    background: 'rgba(96,165,250,0.2)',
                                    overflow: 'hidden',
                                }}
                            >
                                <div
                                    style={{
                                        height: '100%',
                                        width: `${Math.round(t.progress * 100)}%`,
                                        background: '#60a5fa',
                                        borderRadius: 2,
                                        transition: 'width 0.4s ease',
                                    }}
                                />
                            </div>
                            <span
                                style={{
                                    fontSize: '0.58rem',
                                    color: '#60a5fa',
                                    fontWeight: 600,
                                    marginTop: 2,
                                    display: 'block',
                                }}
                            >
                                {Math.round(t.progress * 100)}% complete
                            </span>
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}
