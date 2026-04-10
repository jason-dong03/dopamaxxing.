'use client'
import { useEffect, useRef, useState } from 'react'
import { formatBP } from '@/lib/battlePower'

type FloatingLabel = { id: number; delta: number }

export default function BPDisplay({ initialBP }: { initialBP: number }) {
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

    function animateTo(newBP: number) {
        if (animRef.current) cancelAnimationFrame(animRef.current)
        fromRef.current = displayedRef.current
        toRef.current = newBP
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
        function onBPUpdated(e: Event) {
            const { newBP } = (e as CustomEvent<{ newBP: number }>).detail
            if (newBP <= toRef.current) return
            const delta = newBP - toRef.current
            animateTo(newBP)
            const id = Date.now()
            setFloats((prev) => [...prev, { id, delta }])
            setTimeout(() => setFloats((prev) => prev.filter((f) => f.id !== id)), 1600)
        }
        window.addEventListener('bp-updated', onBPUpdated)
        return () => window.removeEventListener('bp-updated', onBPUpdated)
    }, [])

    return (
        <span
            title={`Battle Power: ${toRef.current.toLocaleString()}`}
            style={{ position: 'relative', display: 'inline-block' }}
        >
            <span
                style={{
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: '#facc15',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    letterSpacing: '-0.01em',
                }}
            >
                {formatBP(displayed)} BP
            </span>
            {floats.map((f) => (
                <span
                    key={f.id}
                    className="bp-float"
                    style={{
                        position: 'absolute',
                        top: -18,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        whiteSpace: 'nowrap',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: '#4ade80',
                        pointerEvents: 'none',
                        zIndex: 9999,
                    }}
                >
                    +{formatBP(f.delta)} BP
                </span>
            ))}
        </span>
    )
}
