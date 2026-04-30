'use client'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type Tier = 'legendary' | 'divine' | 'celestial' | 'mystery'

const TIER_CONFIG: Record<Tier, {
    line1: string
    line2: string
    color: string
    glowColor: string
    bgTint: string
}> = {
    legendary: {
        line1: "what's this...?",
        line2: 'A legendary power stirs...',
        color: '#fde68a',
        glowColor: 'rgba(234,179,8,0.5)',
        bgTint: 'rgba(100,55,0,0.85)',
    },
    divine: {
        line1: "what's this...?",
        line2: 'A divine force awakens...',
        color: '#fca5a5',
        glowColor: 'rgba(239,68,68,0.5)',
        bgTint: 'rgba(90,0,10,0.9)',
    },
    celestial: {
        line1: "what's this...?",
        line2: 'The cosmos answers your call!!',
        color: '#e0f2fe',
        glowColor: 'rgba(186,230,253,0.5)',
        bgTint: 'rgba(0,25,70,0.9)',
    },
    mystery: {
        line1: "what's this...?",
        line2: 'An ancient power is answering your call!!',
        color: '#ffffff',
        glowColor: 'rgba(255,255,255,0.35)',
        bgTint: 'rgba(20,0,35,0.92)',
    },
}

function useTypewriter(text: string, startMs: number, charMs: number, active: boolean) {
    const [displayed, setDisplayed] = useState('')
    const [done, setDone] = useState(false)
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        if (!active) return
        setDisplayed('')
        setDone(false)
        timeoutRef.current = setTimeout(() => {
            let i = 0
            intervalRef.current = setInterval(() => {
                i++
                setDisplayed(text.slice(0, i))
                if (i >= text.length) {
                    clearInterval(intervalRef.current!)
                    setDone(true)
                }
            }, charMs)
        }, startMs)
        return () => {
            clearTimeout(timeoutRef.current!)
            clearInterval(intervalRef.current!)
        }
    }, [active])  // eslint-disable-line react-hooks/exhaustive-deps

    return { displayed, done }
}

export function PackCutscene({ tier, onComplete }: { tier: Tier; onComplete: () => void }) {
    const [show, setShow] = useState(false)
    const [line1Active, setLine1Active] = useState(false)
    const [showDivider, setShowDivider] = useState(false)
    const [line2Active, setLine2Active] = useState(false)
    const [exiting, setExiting] = useState(false)
    const [gone, setGone] = useState(false)

    const cfg = TIER_CONFIG[tier]

    const { displayed: text1, done: done1 } = useTypewriter(cfg.line1, 0, 35, line1Active)
    const { displayed: text2 } = useTypewriter(cfg.line2, 0, 25, line2Active)

    // line 1 done → show divider
    useEffect(() => {
        if (!done1) return
        const t = setTimeout(() => setShowDivider(true), 120)
        return () => clearTimeout(t)
    }, [done1])

    // divider shown → start line 2
    useEffect(() => {
        if (!showDivider) return
        const t = setTimeout(() => setLine2Active(true), 300)
        return () => clearTimeout(t)
    }, [showDivider])

    // total duration timing
    useEffect(() => {
        const line1StartMs = 150
        const line1Duration = cfg.line1.length * 35
        const dividerDelay = 120
        const dividerDuration = 300
        const line2Duration = cfg.line2.length * 25
        const holdMs = 300

        const exitAt = line1StartMs + line1Duration + dividerDelay + dividerDuration + line2Duration + holdMs
        const doneAt = exitAt + 250

        const timers = [
            setTimeout(() => setShow(true), 10),
            setTimeout(() => setLine1Active(true), line1StartMs),
            setTimeout(() => setExiting(true), exitAt),
            setTimeout(() => { setGone(true); onComplete() }, doneAt),
        ]
        return () => timers.forEach(clearTimeout)
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    if (gone || typeof document === 'undefined') return null

    return createPortal(
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 20000,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: `radial-gradient(ellipse 75% 55% at 50% 50%, ${cfg.bgTint}, rgba(0,0,0,0.97) 60%)`,
                opacity: show && !exiting ? 1 : 0,
                transition: exiting ? 'opacity 250ms ease-out' : 'opacity 180ms ease-out',
                pointerEvents: 'none',
            }}
        >
            {/* scanlines */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)',
            }} />
            {/* vignette */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: 'radial-gradient(ellipse 90% 90% at 50% 50%, transparent 35%, rgba(0,0,0,0.55) 100%)',
            }} />

            <div style={{ position: 'relative', textAlign: 'center', padding: '0 32px' }}>

                {/* line 1 — typewriter */}
                <p style={{
                    fontSize: 'clamp(0.65rem, 2vw, 0.82rem)',
                    letterSpacing: '0.32em',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.45)',
                    fontWeight: 600,
                    marginBottom: 24,
                    minHeight: '1.4em',
                    fontFamily: 'monospace',
                }}>
                    {text1}
                    {line1Active && !done1 && (
                        <span className="cutscene-cursor">|</span>
                    )}
                </p>

                {/* divider */}
                <div style={{
                    height: 1,
                    background: `linear-gradient(90deg, transparent, ${cfg.color}, transparent)`,
                    boxShadow: `0 0 14px 2px ${cfg.glowColor}`,
                    width: 'clamp(100px, 28vw, 180px)',
                    margin: `0 auto 24px`,
                    transformOrigin: 'center',
                    transform: showDivider ? 'scaleX(1)' : 'scaleX(0)',
                    opacity: showDivider ? 1 : 0,
                    transition: 'transform 300ms cubic-bezier(0.22,1,0.36,1), opacity 180ms ease-out',
                }} />

                {/* line 2 — typewriter, hype */}
                <p
                    className={tier === 'mystery' ? 'cutscene-rainbow-text' : undefined}
                    style={{
                        fontSize: 'clamp(1.05rem, 3.8vw, 1.5rem)',
                        fontWeight: 800,
                        letterSpacing: '0.04em',
                        lineHeight: 1.4,
                        maxWidth: 'clamp(260px, 58vw, 500px)',
                        margin: '0 auto',
                        color: tier === 'mystery' ? undefined : cfg.color,
                        textShadow: `0 0 24px ${cfg.glowColor}, 0 0 48px ${cfg.glowColor}`,
                        fontFamily: 'monospace',
                        minHeight: '2.8em',
                    }}
                >
                    {text2}
                    {line2Active && text2.length < cfg.line2.length && (
                        <span className="cutscene-cursor">|</span>
                    )}
                </p>
            </div>
        </div>,
        document.body,
    )
}
