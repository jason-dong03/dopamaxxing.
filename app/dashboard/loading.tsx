'use client'
import { useEffect, useState } from 'react'
import { markIntroShown } from '@/lib/introState'

/**
 * Three-phase boot sequence (Clash Royale style):
 *   1. Logo flash       — "dopamaxxing." for ~900ms (first dashboard visit per session)
 *   2. Progress bar     — indeterminate slider while the dashboard SSRs
 *   3. Dashboard fades in — handled by <DashboardEntrance/> after this unmounts
 *
 * Subsequent visits within the same session skip the logo and show only the
 * progress bar (Next.js auto-unmounts loading.tsx when page.tsx returns).
 */
export default function DashboardLoading() {
    const [mode, setMode] = useState<'check' | 'intro' | 'simple'>('check')
    const [phase, setPhase] = useState<'logo' | 'bar'>('logo')

    useEffect(() => {
        const seen = sessionStorage.getItem('intro_done')

        if (!seen) {
            sessionStorage.setItem('intro_done', '1')
            markIntroShown()
            setMode('intro')
            const t = setTimeout(() => setPhase('bar'), 900)
            return () => clearTimeout(t)
        }

        setMode('simple')
        setPhase('bar')
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

    return (
        <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 9999, overflow: 'hidden' }}>
            {/* Logo flash — only on first visit per session */}
            {mode === 'intro' && (
                <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: phase === 'logo' ? 1 : 0,
                    transition: 'opacity 380ms ease',
                    pointerEvents: 'none',
                }}>
                    <span style={{
                        fontSize: 'clamp(1.6rem, 5vw, 2.4rem)',
                        fontWeight: 800,
                        color: '#fff',
                        letterSpacing: '-0.03em',
                        animation: 'logoBreath 900ms ease-out',
                    }}>
                        dopamaxxing.
                    </span>
                </div>
            )}

            {/* Progress bar — fades in once logo is gone (or immediately for 'simple') */}
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                padding: '20px 24px 28px',
                background: 'linear-gradient(0deg, rgba(0,0,0,0.99) 0%, transparent 100%)',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                pointerEvents: 'none',
                opacity: mode === 'simple' || phase === 'bar' ? 1 : 0,
                transition: 'opacity 500ms ease 120ms',
            }}>
                {ProgressBar}
            </div>

            <style>{`
                @keyframes loadingSlide {
                    0%   { transform: translateX(-100%); }
                    100% { transform: translateX(350%); }
                }
                @keyframes logoBreath {
                    0%   { opacity: 0; transform: scale(0.96); }
                    25%  { opacity: 1; transform: scale(1); }
                    100% { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    )
}
