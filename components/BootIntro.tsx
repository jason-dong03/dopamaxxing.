'use client'
import { useEffect, useState } from 'react'
import { markIntroShown } from '@/lib/introState'

/**
 * Global cold-start boot sequence. Mounted at the root layout so it plays on
 * every hard refresh regardless of route (login, dashboard, anywhere).
 *
 *   Phase 1 — logo flash      ("Dop / ama / xxi / ng.")
 *   Phase 2 — loading screen   (/assets/loading-screen.png + progress 0→100)
 *   Fade-out                  (reveals the underlying page)
 *
 * A module-level flag (resets only on full reload) keeps it from replaying
 * during in-app navigation. If the underlying page is already SSR-ready, the
 * loading screen still plays for the minimum duration so the user always sees
 * the full sequence.
 */

let _bootShown = false
const LOGO_LINES = ['Dop', 'ama', 'xxi', 'ng.']

const LOGO_MS = 1000
const LOAD_MS = 1600
const FADE_MS = 420

const PHASE_LABELS: Array<{ pct: number; label: string }> = [
    { pct: 0,  label: 'Connecting…' },
    { pct: 16, label: 'Authenticating…' },
    { pct: 32, label: 'Loading user data…' },
    { pct: 50, label: 'Loading collection…' },
    { pct: 68, label: 'Preparing the shop…' },
    { pct: 84, label: 'Syncing quests…' },
    { pct: 95, label: 'Almost ready…' },
]

function labelFor(pct: number): string {
    let label = PHASE_LABELS[0].label
    for (const p of PHASE_LABELS) {
        if (pct >= p.pct) label = p.label
    }
    return label
}

export default function BootIntro() {
    const [mounted, setMounted] = useState(!_bootShown)
    const [phase, setPhase] = useState<'logo' | 'load' | 'fade'>('logo')
    const [logoVisible, setLogoVisible] = useState(false)
    const [progress, setProgress] = useState(0)

    useEffect(() => {
        if (_bootShown) return
        _bootShown = true
        markIntroShown()

        const t0 = setTimeout(() => setLogoVisible(true), 40)
        const t1 = setTimeout(() => setLogoVisible(false), LOGO_MS - 220)
        const t2 = setTimeout(() => setPhase('load'), LOGO_MS)
        const t3 = setTimeout(() => setPhase('fade'), LOGO_MS + LOAD_MS)
        const t4 = setTimeout(() => setMounted(false), LOGO_MS + LOAD_MS + FADE_MS)

        // Animate progress 0 → 100 across LOAD_MS once phase 2 begins
        let raf = 0
        const startAt = performance.now() + LOGO_MS
        function tick(now: number) {
            const elapsed = now - startAt
            if (elapsed < 0) {
                raf = requestAnimationFrame(tick)
                return
            }
            const pct = Math.min(100, (elapsed / LOAD_MS) * 100)
            setProgress(pct)
            if (pct < 100) raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)

        return () => {
            clearTimeout(t0); clearTimeout(t1); clearTimeout(t2)
            clearTimeout(t3); clearTimeout(t4)
            if (raf) cancelAnimationFrame(raf)
        }
    }, [])

    if (!mounted) return null

    return (
        <div
            style={{
                position: 'fixed', inset: 0,
                background: '#000',
                zIndex: 100000,
                overflow: 'hidden',
                opacity: phase === 'fade' ? 0 : 1,
                transition: phase === 'fade' ? `opacity ${FADE_MS}ms ease` : undefined,
                pointerEvents: phase === 'fade' ? 'none' : 'auto',
            }}
        >
            {/* ── Phase 2: loading screen — mounted as soon as we leave logo ── */}
            {phase !== 'logo' && (
                <>
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
                    <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0, height: 220,
                        background: 'linear-gradient(0deg, rgba(0,0,0,0.85), transparent)',
                        pointerEvents: 'none',
                    }} />
                    <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        padding: '20px 24px 32px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                        pointerEvents: 'none',
                    }}>
                        <span
                            key={labelFor(progress)}
                            style={{
                                fontSize: '0.72rem',
                                color: 'rgba(255,255,255,0.72)',
                                letterSpacing: '0.07em',
                                fontFamily: 'monospace',
                                animation: 'bootLabelIn 0.28s ease',
                                textShadow: '0 1px 4px rgba(0,0,0,0.85)',
                            }}
                        >
                            {labelFor(progress)}
                        </span>
                        <div style={{
                            width: '100%', maxWidth: 320, height: 4,
                            borderRadius: 4,
                            background: 'rgba(255,255,255,0.14)',
                            overflow: 'hidden',
                            boxShadow: '0 0 12px rgba(0,0,0,0.6)',
                        }}>
                            <div style={{
                                height: '100%',
                                width: `${progress}%`,
                                borderRadius: 4,
                                background: 'linear-gradient(90deg, #16a34a, #4ade80)',
                                boxShadow: '0 0 14px rgba(74,222,128,0.7)',
                            }} />
                        </div>
                    </div>
                </>
            )}

            {/* ── Phase 1: logo — sits above loading screen until we transition ── */}
            <div
                style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: '#000',
                    opacity: phase === 'logo' ? 1 : 0,
                    transition: 'opacity 320ms ease',
                    pointerEvents: 'none',
                }}
            >
                {/* Mobile: stacked 3-chars-per-row, fills the screen */}
                <div
                    className="boot-logo-mobile"
                    style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        gap: 0,
                        opacity: logoVisible ? 1 : 0,
                        transition: 'opacity 380ms ease',
                    }}
                >
                    {LOGO_LINES.map((line, i) => (
                        <span
                            key={i}
                            style={{
                                fontSize: 'clamp(4.5rem, 28vw, 12rem)',
                                fontWeight: 900,
                                color: '#fff',
                                letterSpacing: '-0.06em',
                                lineHeight: 0.88,
                                fontFamily: 'inherit',
                                animation: `bootLogoRise 720ms cubic-bezier(0.22,1,0.36,1) ${i * 80}ms backwards`,
                            }}
                        >
                            {line}
                        </span>
                    ))}
                </div>

                {/* Desktop: single horizontal "Dopamaxxing" */}
                <div
                    className="boot-logo-desktop"
                    style={{
                        opacity: logoVisible ? 1 : 0,
                        transition: 'opacity 380ms ease',
                    }}
                >
                    <span
                        style={{
                            fontSize: 'clamp(3rem, 9vw, 7rem)',
                            fontWeight: 900,
                            color: '#fff',
                            letterSpacing: '-0.04em',
                            lineHeight: 1,
                            fontFamily: 'inherit',
                            animation: 'bootLogoRise 720ms cubic-bezier(0.22,1,0.36,1) backwards',
                        }}
                    >
                        Dopamaxxing.
                    </span>
                </div>
            </div>

            <style>{`
                @keyframes bootLogoRise {
                    from { opacity: 0; transform: translateY(14px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes bootLabelIn {
                    from { opacity: 0; transform: translateY(3px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @media (min-width: 640px) {
                    .boot-logo-mobile { display: none !important; }
                }
                @media (max-width: 639px) {
                    .boot-logo-desktop { display: none !important; }
                }
            `}</style>
        </div>
    )
}
