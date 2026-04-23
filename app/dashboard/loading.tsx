'use client'
import { useEffect, useState } from 'react'
import { markIntroShown } from '@/lib/introState'

const STEPS = [
    { ms: 0,    pct: 5,  label: 'Connecting…' },
    { ms: 300,  pct: 18, label: 'Authenticating session…' },
    { ms: 650,  pct: 34, label: 'Fetching user data…' },
    { ms: 1000, pct: 50, label: 'Loading card collection…' },
    { ms: 1350, pct: 64, label: 'Fetching assets…' },
    { ms: 1650, pct: 76, label: 'Syncing quests & achievements…' },
    { ms: 1950, pct: 88, label: 'Preparing the shop…' },
    { ms: 2300, pct: 96, label: 'Almost there…' },
]

const CLOUDS = [
    { w: 520, h: 260, top:  '0%', left: '-8%',  blur: 80, delay: 0,   dur: 13 },
    { w: 380, h: 200, top:  '8%', left: '55%',  blur: 65, delay: 0.4, dur: 10 },
    { w: 460, h: 240, top: '30%', left: '-12%', blur: 75, delay: 0.2, dur: 14 },
    { w: 340, h: 190, top: '35%', left: '62%',  blur: 60, delay: 0.6, dur: 11 },
    { w: 500, h: 260, top: '58%', left: '20%',  blur: 85, delay: 0.1, dur: 12 },
    { w: 400, h: 210, top: '65%', left: '-5%',  blur: 70, delay: 0.5, dur: 15 },
    { w: 360, h: 180, top: '72%', left: '68%',  blur: 60, delay: 0.3, dur: 10 },
]

export default function DashboardLoading() {
    // 'check' = waiting for useEffect to determine mode
    // 'intro' = mobile first-open: dopamaxxing → loading bar → clouds
    // 'simple' = normal progress bar only
    const [mode, setMode] = useState<'check' | 'intro' | 'simple'>('check')
    const [phase, setPhase] = useState<'intro' | 'loading' | 'clouds'>('intro')
    const [introVisible, setIntroVisible] = useState(false)
    const [step, setStep] = useState(0)
    const [cloudsVisible, setCloudsVisible] = useState(false)

    useEffect(() => {
        const isMobile = window.innerWidth < 640
        const seen = sessionStorage.getItem('intro_done')

        if (isMobile && !seen) {
            sessionStorage.setItem('intro_done', '1')
            markIntroShown()
            setMode('intro')

            const t0 = setTimeout(() => setIntroVisible(true), 80)
            const t1 = setTimeout(() => setIntroVisible(false), 1000)
            const t2 = setTimeout(() => setPhase('loading'), 1400)

            const stepTimers = STEPS.slice(1).map(({ ms }, i) =>
                setTimeout(() => setStep(i + 1), 1400 + ms)
            )

            const t3 = setTimeout(() => { setPhase('clouds'); setCloudsVisible(true) }, 1400 + 2400)

            return () => {
                clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3)
                stepTimers.forEach(clearTimeout)
            }
        } else {
            setMode('simple')
            setPhase('loading')
            setStep(STEPS.length - 1)
        }
    }, [])

    const { pct, label } = STEPS[step]

    if (mode === 'check') {
        return <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 9999 }} />
    }

    if (mode === 'simple') {
        return (
            <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 9999, overflow: 'hidden' }}>
                <div style={{
                    position: 'fixed', bottom: 0, left: 0, right: 0,
                    padding: '20px 24px 28px',
                    background: 'linear-gradient(0deg, rgba(0,0,0,0.99) 0%, transparent 100%)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                    pointerEvents: 'none',
                }}>
                    <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.07em', fontFamily: 'monospace' }}>
                        {label}
                    </span>
                    <div style={{ width: '100%', maxWidth: 280, height: 3, borderRadius: 3, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                        <div style={{
                            height: '100%', width: `${pct}%`, borderRadius: 3,
                            background: 'linear-gradient(90deg, #16a34a, #4ade80)',
                            transition: 'width 350ms ease-out',
                            boxShadow: '0 0 10px rgba(74,222,128,0.5)',
                        }} />
                    </div>
                    <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.12)', letterSpacing: '0.05em', fontFamily: 'monospace' }}>
                        {pct}%
                    </span>
                </div>
            </div>
        )
    }

    // mode === 'intro'
    return (
        <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 9999, overflow: 'hidden' }}>

            {/* ── intro: dopamaxxing. ── */}
            <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: introVisible ? 1 : 0,
                transition: introVisible ? 'opacity 500ms ease' : 'opacity 400ms ease',
                pointerEvents: 'none',
            }}>
                <span style={{
                    fontSize: 'clamp(1.4rem, 5vw, 2.2rem)',
                    fontWeight: 800,
                    color: '#fff',
                    letterSpacing: '-0.03em',
                    fontFamily: 'inherit',
                }}>
                    dopamaxxing.
                </span>
            </div>

            {/* ── loading bar ── */}
            {phase !== 'intro' && (
                <div style={{
                    position: 'absolute', inset: 0,
                    opacity: phase === 'loading' ? 1 : 0,
                    transition: 'opacity 600ms ease',
                    pointerEvents: 'none',
                }}>
                    {/* header skeleton */}
                    <div className="animate-pulse" style={{
                        width: '100%', background: '#000',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}>
                        <div style={{ width: '100%', padding: '0 16px', height: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                                <div style={{ height: 11, width: 88, borderRadius: 3, background: 'rgba(255,255,255,0.07)' }} />
                                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />
                                <div style={{ height: 11, width: 80, borderRadius: 4, background: 'rgba(255,255,255,0.07)' }} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ height: 26, width: 72, borderRadius: 999, background: 'rgba(255,255,255,0.07)' }} />
                                <div style={{ height: 26, width: 84, borderRadius: 999, background: 'rgba(255,255,255,0.07)' }} />
                                <div style={{ height: 26, width: 46, borderRadius: 999, background: 'rgba(255,255,255,0.07)' }} />
                            </div>
                        </div>
                    </div>
                    {/* pack area skeleton */}
                    <div className="animate-pulse" style={{ padding: '16px 16px 0' }}>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                            {['Classic','Special','Crates','Test'].map((tab, i) => (
                                <div key={tab} style={{ height: 28, width: 58, borderRadius: 8, background: i === 0 ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)' }} />
                            ))}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} style={{ aspectRatio: '3/4', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }} />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── clouds ── */}
            <div style={{
                position: 'absolute', inset: 0,
                opacity: cloudsVisible ? 1 : 0,
                transition: 'opacity 1200ms ease',
                pointerEvents: 'none',
                overflow: 'hidden',
                background: cloudsVisible ? 'rgba(240,245,255,0.15)' : 'transparent',
            }}>
                {CLOUDS.map((c, i) => (
                    <div
                        key={i}
                        style={{
                            position: 'absolute',
                            top: c.top,
                            left: c.left,
                            width: c.w,
                            height: c.h,
                            borderRadius: '50%',
                            background: `radial-gradient(ellipse, rgba(255,255,255,0.92) 0%, rgba(220,232,255,0.6) 55%, transparent 100%)`,
                            filter: `blur(${c.blur}px)`,
                            animation: `cloudDrift${(i % 3) + 1} ${c.dur}s ease-in-out ${c.delay}s infinite`,
                        }}
                    />
                ))}
            </div>

            {/* ── progress bar ── */}
            {phase !== 'intro' && (
                <div style={{
                    position: 'fixed', bottom: 0, left: 0, right: 0,
                    padding: '20px 24px 28px',
                    background: 'linear-gradient(0deg, rgba(0,0,0,0.99) 0%, transparent 100%)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                    pointerEvents: 'none',
                    opacity: phase === 'clouds' ? 0 : 1,
                    transition: 'opacity 800ms ease',
                    zIndex: 1,
                }}>
                    <span
                        key={label}
                        style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.07em', fontFamily: 'monospace', animation: 'fadeInLabel 0.25s ease' }}
                    >
                        {label}
                    </span>
                    <div style={{ width: '100%', maxWidth: 280, height: 3, borderRadius: 3, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                        <div style={{
                            height: '100%', width: `${pct}%`, borderRadius: 3,
                            background: 'linear-gradient(90deg, #16a34a, #4ade80)',
                            transition: 'width 350ms ease-out',
                            boxShadow: '0 0 10px rgba(74,222,128,0.5)',
                        }} />
                    </div>
                    <span style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.12)', letterSpacing: '0.05em', fontFamily: 'monospace' }}>
                        {pct}%
                    </span>
                </div>
            )}

            <style>{`
                @keyframes fadeInLabel {
                    from { opacity: 0; transform: translateY(4px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes cloudDrift1 {
                    0%   { transform: translate(0px, 0px); }
                    33%  { transform: translate(18px, -10px); }
                    66%  { transform: translate(-10px, 14px); }
                    100% { transform: translate(0px, 0px); }
                }
                @keyframes cloudDrift2 {
                    0%   { transform: translate(0px, 0px); }
                    40%  { transform: translate(-14px, 8px); }
                    70%  { transform: translate(12px, -6px); }
                    100% { transform: translate(0px, 0px); }
                }
                @keyframes cloudDrift3 {
                    0%   { transform: translate(0px, 0px); }
                    30%  { transform: translate(10px, 12px); }
                    65%  { transform: translate(-16px, -4px); }
                    100% { transform: translate(0px, 0px); }
                }
            `}</style>
        </div>
    )
}
