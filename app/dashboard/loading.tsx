'use client'
import { useEffect, useState } from 'react'

const STEPS: { ms: number; pct: number; label: string }[] = [
    { ms: 0,    pct: 8,  label: 'Initializing session…' },
    { ms: 320,  pct: 24, label: 'Fetching your profile…' },
    { ms: 680,  pct: 42, label: 'Loading your card collection…' },
    { ms: 1050, pct: 58, label: 'Syncing quest progress…' },
    { ms: 1380, pct: 72, label: 'Checking bag & stash…' },
    { ms: 1700, pct: 84, label: 'Preparing the shop…' },
    { ms: 2050, pct: 94, label: 'Almost ready…' },
]

const S = {
    bg:     'rgba(255,255,255,0.06)',
    bgFaint:'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.07)',
}

export default function DashboardLoading() {
    const [pct, setPct]     = useState(STEPS[0].pct)
    const [label, setLabel] = useState(STEPS[0].label)

    useEffect(() => {
        const timers = STEPS.slice(1).map(({ ms, pct: p, label: l }) =>
            setTimeout(() => { setPct(p); setLabel(l) }, ms)
        )
        return () => timers.forEach(clearTimeout)
    }, [])

    return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#08080d' }}>

            {/* ── header ── */}
            <div
                className="animate-pulse"
                style={{
                    width: '100%',
                    background: '#08080d',
                    borderBottom: '1px solid rgba(255,255,255,0.07)',
                    flexShrink: 0,
                    zIndex: 40,
                }}
            >
                <div
                    style={{
                        width: '100%',
                        padding: '0 16px',
                        height: 50,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                    }}
                >
                    {/* left: brand + avatar + username */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                        {/* brand — desktop only */}
                        <div className="hidden sm:flex" style={{ flexDirection: 'column', gap: 3, flexShrink: 0, marginRight: 4 }}>
                            <div style={{ height: 11, width: 88, borderRadius: 3, background: S.bg }} />
                        </div>

                        {/* divider — desktop only */}
                        <div className="hidden sm:block" style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />

                        {/* avatar */}
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: S.bg, flexShrink: 0 }} />

                        {/* username + name */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                            <div style={{ height: 11, width: 80, borderRadius: 4, background: S.bg }} />
                            <div className="hidden sm:block" style={{ height: 8, width: 56, borderRadius: 4, background: S.bgFaint }} />
                        </div>
                    </div>

                    {/* right: BR + stash + coins + level */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        {/* BR pill */}
                        <div style={{ height: 26, width: 72, borderRadius: 999, background: S.bg }} />
                        {/* stash — desktop only */}
                        <div className="hidden sm:block" style={{ height: 26, width: 44, borderRadius: 999, background: S.bg }} />
                        {/* coins */}
                        <div style={{ height: 26, width: 84, borderRadius: 999, background: S.bg }} />
                        {/* level + xp bar — desktop only */}
                        <div className="hidden sm:flex" style={{ alignItems: 'center', gap: 8 }}>
                            <div style={{ height: 26, width: 46, borderRadius: 999, background: S.bg }} />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                                <div style={{ width: 100, height: 5, borderRadius: 3, background: S.bgFaint }} />
                                <div style={{ width: 60, height: 7, borderRadius: 3, background: S.bgFaint }} />
                            </div>
                        </div>
                        {/* settings gear */}
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: S.bg, flexShrink: 0 }} />
                    </div>
                </div>
            </div>

            {/* ── event banner slot ── */}
            <div style={{ flexShrink: 0, height: 0 }} />

            {/* ── pack area skeleton ── */}
            <div
                className="animate-pulse"
                style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '16px 16px 0' }}
            >
                {/* tab row */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                    {['Classic', 'Special', 'Crates', 'Test'].map((tab) => (
                        <div
                            key={tab}
                            style={{
                                height: 28,
                                width: 58,
                                borderRadius: 8,
                                background: tab === 'Classic' ? S.bg : S.bgFaint,
                            }}
                        />
                    ))}
                </div>

                {/* pack card grid */}
                <div style={{ flex: 1, minHeight: 0, overflowY: 'hidden' }}>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                            gap: 12,
                        }}
                    >
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div
                                key={i}
                                style={{
                                    aspectRatio: '3/4',
                                    borderRadius: 12,
                                    background: S.bgFaint,
                                    border: S.border,
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* ── progress bar — fixed bottom ── */}
            <div style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '16px 24px 20px',
                background: 'linear-gradient(0deg, rgba(8,8,13,0.98) 0%, transparent 100%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                pointerEvents: 'none',
            }}>
                <span style={{
                    fontSize: '0.65rem',
                    color: 'rgba(255,255,255,0.28)',
                    letterSpacing: '0.06em',
                    fontFamily: 'monospace',
                }}>
                    {label}
                </span>
                <div style={{
                    width: '100%',
                    maxWidth: 260,
                    height: 2,
                    borderRadius: 2,
                    background: 'rgba(255,255,255,0.07)',
                    overflow: 'hidden',
                }}>
                    <div style={{
                        height: '100%',
                        width: `${pct}%`,
                        borderRadius: 2,
                        background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                        transition: 'width 300ms ease-out',
                        boxShadow: '0 0 8px rgba(139,92,246,0.6)',
                    }} />
                </div>
            </div>
        </div>
    )
}
