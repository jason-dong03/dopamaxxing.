'use client'
import { useEffect, useRef, useState } from 'react'
import { formatBR } from '@/lib/battlePower'

type FloatingLabel = { id: number; delta: number }

export default function BRDisplay({ initialBP }: { initialBP: number }) {
    const [displayed, setDisplayed] = useState(initialBP)
    const [floats, setFloats] = useState<FloatingLabel[]>([])
    const animRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null)
    const startRef = useRef<number>(0)
    const fromRef = useRef<number>(initialBP)
    const toRef = useRef<number>(initialBP)
    const displayedRef = useRef<number>(initialBP)

    function setDisplayedSync(v: number) {
        displayedRef.current = v
        setDisplayed(v)
    }

    function animateTo(newBR: number) {
        if (animRef.current) cancelAnimationFrame(animRef.current)
        fromRef.current = displayedRef.current
        toRef.current = newBR
        startRef.current = performance.now()
        const duration = 1200

        function step(now: number) {
            const t = Math.min((now - startRef.current) / duration, 1)
            // ease-out cubic
            const eased = 1 - Math.pow(1 - t, 3)
            const current = Math.round(fromRef.current + (toRef.current - fromRef.current) * eased)
            setDisplayedSync(current)
            if (t < 1) {
                animRef.current = requestAnimationFrame(step)
            }
        }
        animRef.current = requestAnimationFrame(step)
    }

    useEffect(() => {
        function onBRUpdated(e: Event) {
            const { newBR } = (e as CustomEvent<{ newBR: number }>).detail
            if (newBR <= toRef.current) return
            const delta = newBR - toRef.current
            animateTo(newBR)
            const id = Date.now()
            setFloats((prev) => [...prev, { id, delta }])
            setTimeout(() => setFloats((prev) => prev.filter((f) => f.id !== id)), 1600)
        }
        window.addEventListener('br-updated', onBRUpdated)
        return () => window.removeEventListener('br-updated', onBRUpdated)
    }, [])

    return (
        <span
            title={`Battle Rating: ${toRef.current.toLocaleString()}`}
            style={{ position: 'relative', display: 'inline-block', cursor: 'default' }}
        >
            <span
                style={{
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.92)',
                    textShadow: '0 0 8px rgba(255,255,255,0.5), 0 0 16px rgba(255,255,255,0.25)',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    letterSpacing: '-0.01em',
                }}
            >
                {formatBR(displayed)} BR
            </span>
            {floats.map((f) => (
                <span
                    key={f.id}
                    className="br-float"
                    style={{
                        position: 'absolute',
                        top: -18,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        whiteSpace: 'nowrap',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: 'rgba(255,255,255,0.85)',
                        textShadow: '0 0 6px rgba(255,255,255,0.4)',
                        pointerEvents: 'none',
                        zIndex: 9999,
                    }}
                >
                    +{formatBR(f.delta)} BR
                </span>
            ))}
        </span>
    )
}
