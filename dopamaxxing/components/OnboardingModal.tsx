'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'

const STORAGE_KEY = 'dopamaxxing_onboarded_v1'

// Spotlight padding around the target element (px)
const PAD = 10

// Must be above the navbar's z-[10010]
const Z = { backdrop: 10020, panels: 10021, ring: 10023, intercept: 10024, tooltip: 10025, modal: 10021 }

type StepDef = {
    title: string
    body: string
    /** CSS selector for the element to spotlight */
    target?: string
    /** Text shown below the body to prompt the click */
    prompt?: string
    /** Position tooltip inside the top of the spotlight box instead of below/above */
    tooltipAnchor?: 'inside-top'
}

const STEPS: StepDef[] = [
    {
        title: 'Welcome to Dopamaxxing',
        body: "You've been given $100 coins to start. Use them to open packs and build your collection.",
    },
    {
        title: 'Your Coin Balance',
        body: 'You earn 1 coin per minute by being on the site. Your balance is always shown at the top.',
        target: '[data-tutorial="coins"]',
        prompt: 'Click your coin balance to continue',
    },
    {
        title: 'Opening Packs',
        body: 'Click any pack to open it. Each pack has 5 cards — the last slot is guaranteed Uncommon or better.',
        target: '[data-tutorial="packs"]',
        prompt: 'Click the pack grid to continue',
        tooltipAnchor: 'inside-top',
    },
    {
        title: 'Your Bag',
        body: 'Every card you collect goes into your Bag. Feed duplicates into cards you own to level them up.',
        target: 'a[href="/dashboard/bag"]',
        prompt: 'Click the Bag icon to continue',
    },
    {
        title: 'Battles',
        body: 'Challenge daily trainers to earn EXP for your cards. Win to level up your team.',
        target: 'a[href="/dashboard/battles"]',
        prompt: 'Click Battles to continue',
    },
    {
        title: 'Daily Quests',
        body: 'Complete quests to earn extra coins and XP. Many quests track automatic actions like opening packs.',
        target: 'a[href="/dashboard/quests"]',
        prompt: 'Click Quests to continue',
    },
    {
        title: "You're all set",
        body: 'Open packs, collect cards, battle trainers, and complete quests. Link Discord for free drops and community rewards.',
    },
]

// ─── Types ────────────────────────────────────────────────────────────────────

type Hole = {
    top: number; left: number; right: number; bottom: number
    width: number; height: number
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OnboardingModal() {
    const [visible, setVisible] = useState(false)
    const [step, setStep]       = useState(0)
    const [mounted, setMounted] = useState(false)
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
    const router = useRouter()

    useEffect(() => {
        setMounted(true)
        if (!localStorage.getItem(STORAGE_KEY)) setVisible(true)
        function handleReplay() {
            setStep(0)
            setVisible(true)
            router.push('/dashboard')
        }
        window.addEventListener('replay-tutorial', handleReplay)
        return () => window.removeEventListener('replay-tutorial', handleReplay)
    }, [router])

    const current = STEPS[step]

    // Track the target element's position
    useEffect(() => {
        if (!visible || !current.target) { setTargetRect(null); return }

        function update() {
            const el = document.querySelector(current.target!)
            setTargetRect(el ? el.getBoundingClientRect() : null)
        }

        update()
        window.addEventListener('resize', update)
        window.addEventListener('scroll', update, true)
        const interval = setInterval(update, 300)
        return () => {
            window.removeEventListener('resize', update)
            window.removeEventListener('scroll', update, true)
            clearInterval(interval)
        }
    }, [step, visible, current.target])

    function dismiss() {
        localStorage.setItem(STORAGE_KEY, '1')
        setVisible(false)
    }

    function next() {
        if (step < STEPS.length - 1) {
            setStep(s => s + 1)
        } else {
            fetch('/api/complete-tutorial', { method: 'POST' }).catch(() => {})
            window.dispatchEvent(new Event('tutorial-finished'))
            dismiss()
        }
    }

    function prev() { if (step > 0) setStep(s => s - 1) }

    if (!mounted || !visible) return null

    const isLast    = step === STEPS.length - 1
    const hasTarget = !!current.target

    // Compute spotlight geometry
    const hole: Hole | null = targetRect ? {
        top:    targetRect.top    - PAD,
        left:   targetRect.left   - PAD,
        right:  targetRect.right  + PAD,
        bottom: targetRect.bottom + PAD,
        width:  targetRect.width  + PAD * 2,
        height: targetRect.height + PAD * 2,
    } : null

    // Tooltip: above target when target is in the bottom half of screen
    const tooltipAbove = targetRect && !current.tooltipAnchor
        ? targetRect.top > (typeof window !== 'undefined' ? window.innerHeight * 0.5 : 400)
        : false

    return createPortal(
        <>
            {hasTarget && hole ? (
                // ── SPOTLIGHT MODE ──────────────────────────────────────────
                <>
                    {/* 4 blocking panels that cover everything outside the spotlight hole */}
                    <div style={{ position: 'fixed', zIndex: Z.panels, pointerEvents: 'all', background: 'rgba(0,0,0,0.82)', top: 0,           left: 0, right: 0,           height: hole.top   }} />
                    <div style={{ position: 'fixed', zIndex: Z.panels, pointerEvents: 'all', background: 'rgba(0,0,0,0.82)', top: hole.bottom,  left: 0, right: 0,           bottom: 0          }} />
                    <div style={{ position: 'fixed', zIndex: Z.panels, pointerEvents: 'all', background: 'rgba(0,0,0,0.82)', top: hole.top,     left: 0, width: hole.left,   height: hole.height }} />
                    <div style={{ position: 'fixed', zIndex: Z.panels, pointerEvents: 'all', background: 'rgba(0,0,0,0.82)', top: hole.top,     left: hole.right, right: 0, height: hole.height }} />

                    {/* Glowing highlight ring */}
                    <div style={{
                        position: 'fixed', zIndex: Z.ring, pointerEvents: 'none',
                        top: hole.top, left: hole.left,
                        width: hole.width, height: hole.height,
                        borderRadius: 12,
                        border: '2px solid rgba(168,85,247,0.9)',
                        boxShadow: '0 0 0 4px rgba(168,85,247,0.2), 0 0 28px rgba(168,85,247,0.45)',
                        animation: 'tut-ring-pulse 2s ease-in-out infinite',
                    }} />

                    {/* Click interceptor — catches click to advance step */}
                    <div
                        style={{
                            position: 'fixed', zIndex: Z.intercept, cursor: 'pointer',
                            top: hole.top, left: hole.left,
                            width: hole.width, height: hole.height,
                        }}
                        onClick={next}
                    />

                    {/* Tooltip bubble */}
                    <div style={{
                        position: 'fixed', zIndex: Z.tooltip,
                        left: '50%', transform: 'translateX(-50%)',
                        width: 'min(360px, calc(100vw - 32px))',
                        ...(current.tooltipAnchor === 'inside-top'
                            ? { top: hole.top + 14 }
                            : tooltipAbove
                                ? { bottom: window.innerHeight - hole.top + 14 }
                                : { top: hole.bottom + 14 }
                        ),
                        background: 'linear-gradient(160deg, #0e0e1a 0%, #0a0a12 100%)',
                        border: '1px solid rgba(168,85,247,0.3)',
                        borderRadius: 14,
                        padding: '16px 18px 14px',
                        boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
                    }}>
                        {/* Progress dots */}
                        <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                            {STEPS.map((_, i) => (
                                <div key={i} style={{
                                    width: i === step ? 16 : 5, height: 5,
                                    borderRadius: 3,
                                    background: i === step ? '#a855f7' : 'rgba(255,255,255,0.1)',
                                    transition: 'all 250ms',
                                }} />
                            ))}
                        </div>

                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f3f4f6', marginBottom: 6 }}>
                            {current.title}
                        </div>
                        <p style={{ fontSize: '0.76rem', color: '#9ca3af', lineHeight: 1.6, margin: '0 0 10px' }}>
                            {current.body}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.66rem', color: '#a855f7', fontWeight: 600 }}>
                                {current.prompt}
                            </span>
                            <button
                                onClick={dismiss}
                                style={{ background: 'none', border: 'none', fontSize: '0.62rem', color: '#374151', cursor: 'pointer', padding: 0 }}
                            >
                                Skip
                            </button>
                        </div>
                    </div>
                </>
            ) : (
                // ── CENTERED MODAL MODE (no target or target not found) ─────
                <div style={{
                    position: 'fixed', inset: 0, zIndex: Z.modal,
                    background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 20px',
                }}>
                    <div style={{
                        background: 'linear-gradient(160deg, #0e0e1a 0%, #0a0a12 100%)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 20,
                        width: '100%', maxWidth: 420,
                        padding: '32px 28px 24px',
                        display: 'flex', flexDirection: 'column', gap: 20,
                        boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
                    }}>
                        {/* Progress dots */}
                        <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
                            {STEPS.map((_, i) => (
                                <div key={i} style={{
                                    width: i === step ? 18 : 6, height: 6,
                                    borderRadius: 3,
                                    background: i === step ? '#a855f7' : 'rgba(255,255,255,0.1)',
                                    transition: 'all 300ms ease',
                                }} />
                            ))}
                        </div>

                        {/* Text */}
                        <div style={{ textAlign: 'center' }}>
                            <h2 style={{
                                fontSize: '1.1rem', fontWeight: 800, color: '#f3f4f6',
                                margin: '0 0 10px', letterSpacing: '-0.02em',
                            }}>
                                {current.title}
                            </h2>
                            <p style={{ fontSize: '0.82rem', color: '#9ca3af', lineHeight: 1.6, margin: 0 }}>
                                {current.body}
                            </p>
                        </div>

                        {/* Navigation */}
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            {step > 0 ? (
                                <button
                                    onClick={prev}
                                    style={{
                                        flex: 1, padding: '10px',
                                        background: 'rgba(255,255,255,0.04)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: 10, fontSize: '0.78rem', color: '#6b7280', cursor: 'pointer',
                                    }}
                                >Back</button>
                            ) : (
                                <button
                                    onClick={dismiss}
                                    style={{
                                        flex: 1, padding: '10px',
                                        background: 'none', border: 'none',
                                        fontSize: '0.72rem', color: '#374151', cursor: 'pointer',
                                    }}
                                >Skip</button>
                            )}
                            <button
                                onClick={next}
                                style={{
                                    flex: 2, padding: '10px 16px',
                                    background: isLast
                                        ? 'linear-gradient(135deg, #7c3aed, #4f46e5)'
                                        : 'rgba(168,85,247,0.15)',
                                    border: `1px solid ${isLast ? 'transparent' : 'rgba(168,85,247,0.3)'}`,
                                    borderRadius: 10,
                                    fontSize: '0.82rem', fontWeight: 700,
                                    color: isLast ? '#fff' : '#c084fc',
                                    cursor: 'pointer', transition: 'all 150ms ease',
                                }}
                            >
                                {isLast ? "Let's go" : 'Next'}
                            </button>
                        </div>

                        <p style={{ fontSize: '0.58rem', color: '#1f2937', textAlign: 'center', margin: 0 }}>
                            {step + 1} of {STEPS.length}
                        </p>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes tut-ring-pulse {
                    0%,100% { box-shadow: 0 0 0 4px rgba(168,85,247,0.2), 0 0 28px rgba(168,85,247,0.45); }
                    50%     { box-shadow: 0 0 0 7px rgba(168,85,247,0.3), 0 0 44px rgba(168,85,247,0.6); }
                }
            `}</style>
        </>,
        document.body
    )
}
