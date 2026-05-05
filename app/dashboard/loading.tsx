'use client'
import { useEffect, useState } from 'react'

/**
 * Phase 2 of the boot sequence — shown on every dashboard navigation while
 * the dashboard server component renders. Phase 1 (logo flash) is handled
 * globally by <BootIntro/> in the root layout. Phase 3 (cloud entrance) is
 * <DashboardEntrance/>, played once after the dashboard mounts.
 *
 * Loading screen layout: full-bleed /assets/loading-screen.png with a
 * progress bar pinned to the bottom and rotating progress labels above it.
 */

const PROGRESS_STAGES = [
    { ms: 0,    pct: 8,  label: 'Connecting…' },
    { ms: 320,  pct: 24, label: 'Authenticating…' },
    { ms: 700,  pct: 42, label: 'Loading user data…' },
    { ms: 1080, pct: 58, label: 'Loading collection…' },
    { ms: 1460, pct: 74, label: 'Preparing the shop…' },
    { ms: 1840, pct: 88, label: 'Syncing quests…' },
    { ms: 2280, pct: 96, label: 'Almost ready…' },
] as const

export default function DashboardLoading() {
    const [stageIdx, setStageIdx] = useState(0)

    useEffect(() => {
        const timers = PROGRESS_STAGES.slice(1).map(({ ms }, i) =>
            setTimeout(() => setStageIdx(i + 1), ms),
        )
        return () => timers.forEach(clearTimeout)
    }, [])

    const { pct, label } = PROGRESS_STAGES[stageIdx]

    return (
        <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 9999, overflow: 'hidden' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src="/assets/loading-screen.png"
                alt=""
                style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center',
                }}
            />
            {/* bottom darken so text reads */}
            <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: 220,
                background: 'linear-gradient(0deg, rgba(0,0,0,0.85), transparent)',
                pointerEvents: 'none',
            }} />

            {/* progress bar + label, pinned to the bottom */}
            <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                padding: '20px 24px 32px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                pointerEvents: 'none',
            }}>
                <span
                    key={label}
                    style={{
                        fontSize: '0.72rem',
                        color: 'rgba(255,255,255,0.7)',
                        letterSpacing: '0.07em',
                        fontFamily: 'monospace',
                        animation: 'fadeInLabel 0.28s ease',
                        textShadow: '0 1px 4px rgba(0,0,0,0.85)',
                    }}
                >
                    {label}
                </span>
                <div style={{
                    width: '100%', maxWidth: 320, height: 4,
                    borderRadius: 4,
                    background: 'rgba(255,255,255,0.14)',
                    overflow: 'hidden',
                    boxShadow: '0 0 12px rgba(0,0,0,0.6)',
                }}>
                    <div style={{
                        height: '100%', width: `${pct}%`, borderRadius: 4,
                        background: 'linear-gradient(90deg, #16a34a, #4ade80)',
                        transition: 'width 360ms ease-out',
                        boxShadow: '0 0 14px rgba(74,222,128,0.7)',
                    }} />
                </div>
            </div>

            <style>{`
                @keyframes fadeInLabel {
                    from { opacity: 0; transform: translateY(3px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    )
}
