'use client'
import { useEffect, useState } from 'react'
import { markIntroShown } from '@/lib/introState'

const CLOUDS = [
    { w: 520, h: 260, top:  '0%', left: '-8%',  blur: 80, delay: 0,   dur: 13 },
    { w: 380, h: 200, top:  '8%', left: '55%',  blur: 65, delay: 0.4, dur: 10 },
    { w: 460, h: 240, top: '30%', left: '-12%', blur: 75, delay: 0.2, dur: 14 },
    { w: 340, h: 190, top: '35%', left: '62%',  blur: 60, delay: 0.6, dur: 11 },
    { w: 500, h: 260, top: '58%', left: '20%',  blur: 85, delay: 0.1, dur: 12 },
    { w: 400, h: 210, top: '65%', left: '-5%',  blur: 70, delay: 0.5, dur: 15 },
    { w: 360, h: 180, top: '72%', left: '68%',  blur: 60, delay: 0.3, dur: 10 },
]

/**
 * Indeterminate progress bar — slides a moving gradient back and forth.
 * No fake step labels, no counter. Stays up until the dashboard server
 * component finishes rendering (Next.js auto-shows loading.tsx during this).
 */
export default function DashboardLoading() {
    const [mode, setMode] = useState<'check' | 'intro' | 'simple'>('check')
    const [phase, setPhase] = useState<'intro' | 'loading' | 'clouds'>('intro')
    const [introVisible, setIntroVisible] = useState(false)
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
            const t3 = setTimeout(() => { setPhase('clouds'); setCloudsVisible(true) }, 1400 + 2400)

            return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
        } else {
            setMode('simple')
            setPhase('loading')
        }
    }, [])

    if (mode === 'check') {
        return <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 9999 }} />
    }

    const ProgressBar = (
        <div style={{ width: '100%', maxWidth: 280, height: 3, borderRadius: 3, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', position: 'relative' }}>
            <div style={{
                position: 'absolute',
                top: 0, bottom: 0,
                width: '40%',
                borderRadius: 3,
                background: 'linear-gradient(90deg, transparent, #4ade80, transparent)',
                boxShadow: '0 0 10px rgba(74,222,128,0.5)',
                animation: 'loadingSlide 1.4s ease-in-out infinite',
            }} />
        </div>
    )

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
                    {ProgressBar}
                </div>
                <style>{`
                    @keyframes loadingSlide {
                        0%   { transform: translateX(-100%); }
                        100% { transform: translateX(350%); }
                    }
                `}</style>
            </div>
        )
    }

    // mode === 'intro' (mobile first-open)
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
                    {ProgressBar}
                </div>
            )}

            <style>{`
                @keyframes loadingSlide {
                    0%   { transform: translateX(-100%); }
                    100% { transform: translateX(350%); }
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
