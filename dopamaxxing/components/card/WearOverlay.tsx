'use client'
import { useState, useEffect } from 'react'

export default function WearOverlay({
    ucId,
    overallCond,
    attrSurface,
    grade,
    fading,
}: {
    ucId: string
    overallCond: number | null
    attrSurface: number | null
    grade?: number | null
    fading?: boolean
}) {
    const [mounted, setMounted] = useState(false)
    useEffect(() => { setMounted(true) }, [])

    // 9+ = pristine, no overlay
    if (!mounted || overallCond == null || overallCond >= 9.0) return null

    // FNV-1a hash for deterministic per-card variety
    const h = (i: number): number => {
        let v = 0x811c9dc5
        const s = ucId + i
        for (let j = 0; j < s.length; j++) {
            v ^= s.charCodeAt(j)
            v = Math.imul(v, 0x01000193)
        }
        return (v >>> 0) / 0x100000000
    }

    // 0 → 1 over cond 9 → 1
    const wearLevel = Math.max(0, (9.0 - overallCond) / 8.0)

    // Scratch opacity: faint at 7-8, moderate at 5-6, heavy below 5
    const scratchOpacity = Math.pow(wearLevel, 1.5) * 0.92
    //  8.0→0.04  7.0→0.13  6.0→0.24  5.0→0.35  4.0→0.49  1.0→0.92

    // Grain opacity: heavier below cond 5
    const surfacePenalty = attrSurface != null ? Math.max(0, (7.5 - attrSurface) / 7.5) : 0.3
    const heavyBoost = overallCond < 5 ? Math.pow((5 - overallCond) / 4, 0.7) * 0.45 : 0
    const grainOpacity = Math.pow(wearLevel, 0.7) * (0.15 + surfacePenalty * 0.22) + heavyBoost

    // Per-card variation: random rotation (0 / 90 / 180 / 270) + optional flip
    const rotations = [0, 90, 180, 270]
    const rotation = rotations[Math.floor(h(1) * 4)]
    const flipX = h(2) > 0.5 ? -1 : 1
    const flipY = h(3) > 0.5 ? -1 : 1
    const scratchTransform = `rotate(${rotation}deg) scaleX(${flipX}) scaleY(${flipY})`

    // Brightness boost so scratches read on dark card areas
    const brightnessPct = 110 + wearLevel * 60  // 110% → 170%

    // PSA 1 = catastrophic — grain only
    const showScratches = grade !== 1

    const transition = fading ? 'opacity 0.32s ease' : undefined

    return (
        <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            overflow: 'hidden',
            pointerEvents: 'none',
            zIndex: 20,
        }}>
            {/* grain texture — screen blend sits visually in front */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                    opacity: fading ? 0 : grainOpacity,
                    mixBlendMode: 'screen',
                    pointerEvents: 'none',
                    transition,
                }}
            />

            {/* scratch image overlay */}
            {showScratches && (
                <img
                    src="/assets/scratches.png"
                    alt=""
                    style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        pointerEvents: 'none',
                        opacity: fading ? 0 : scratchOpacity,
                        mixBlendMode: 'screen',
                        transform: scratchTransform,
                        transformOrigin: 'center center',
                        filter: `brightness(${brightnessPct}%) contrast(120%)`,
                        transition,
                    }}
                />
            )}
        </div>
    )
}
