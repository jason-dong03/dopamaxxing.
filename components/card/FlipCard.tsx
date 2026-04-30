'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { rarityGlowRgb, isRainbow } from '@/lib/rarityConfig'

type Props = {
    card: {
        id: string
        name: string
        image_url: string
        image_url_hi?: string
        rarity: string
        attr_surface?: number
        attr_centering?: number
        attr_corners?: number
        attr_edges?: number
    }
    onReveal: () => void
    onSpecialChange: (active: boolean, glowColor: string) => void
    onFlipped: () => void
    onConfirmed: () => void
    cardWidth?: number
    cardHeight?: number
}

const SPECIAL_RARITIES = [
    'Epic',
    'Mythical',
    'Legendary',
    'Divine',
    'Celestial',
    '???',
]

const HOLO_RARITIES = ['Mythical', 'Legendary', 'Divine', 'Celestial', '???']

const LEGENDARY_PLUS = ['Legendary', 'Divine', 'Celestial', '???']

const SPARK_COUNT = 18

export default function FlipCard({
    card,
    onReveal,
    onSpecialChange,
    onFlipped,
    onConfirmed,
    cardWidth = 260,
    cardHeight = 364,
}: Props) {
    const [flipped, setFlipped] = useState(false)
    const [confirmed, setConfirmed] = useState(false)
    const [showSpecial, setShowSpecial] = useState(false)
    const [flash, setFlash] = useState(false)
    const [popped, setPopped] = useState(false)
    const [hovering, setHovering] = useState(false)
    const [legendarySpinning, setLegendarySpinning] = useState(false)
    const [sparks, setSparks] = useState<
        Array<{ ex: number; ey: number; dur: number }>
    >([])

    const glowRgb = rarityGlowRgb(card.rarity)
    const cardIsRainbow = isRainbow(card.rarity)
    const isSpecial = SPECIAL_RARITIES.includes(card.rarity)
    const isHolo = HOLO_RARITIES.includes(card.rarity)
    const isLegendaryPlus = LEGENDARY_PLUS.includes(card.rarity)

    const cardSrc = card.image_url_hi || card.image_url

    const glowStyle = cardIsRainbow
        ? undefined
        : `0 0 30px 6px rgba(${glowRgb}, 0.9)`

    function handleClick() {
        if (!flipped) {
            if (isSpecial) {
                setShowSpecial(true)
                onSpecialChange(true, glowRgb)
                setFlipped(true)
                onFlipped()
                setPopped(true)
                setTimeout(() => {
                    setFlash(true)
                    setTimeout(() => setFlash(false), 400)
                }, 1200)
                return
            } else {
                setFlipped(true)
                onFlipped()
            }
            return
        }
        if (!confirmed) {
            setConfirmed(true)
            setTimeout(() => setShowSpecial(false), 100)
            onSpecialChange(false, glowRgb)
            onConfirmed()
            onReveal()
        }
    }

    return (
        <div
            className="relative"
            style={{
                width: `${cardWidth}px`,
                height: `${cardHeight}px`,
            }}
        >
            {flash && (
                <div
                    className="fixed inset-0 pointer-events-none animate-flash"
                    style={{ zIndex: 60 }}
                />
            )}
            <div
                onClick={handleClick}
                data-flip-clickable
                className="cursor-pointer relative"
                style={{
                    width: `${cardWidth}px`,
                    height: `${cardHeight}px`,
                    perspective: '1000px',
                    zIndex: showSpecial ? 50 : 'auto',
                }}
            >
                {/* Container — preserve-3d so perspective reaches the spin overlay */}
                <div
                    style={{
                        width: '100%',
                        height: '100%',
                        position: 'relative',
                        transformStyle: 'preserve-3d',
                    }}
                >
                    {/*
                        Animation wrapper (pop / hover).
                        IMPORTANT: keep flip rotation OUT of this element — animations on
                        `transform` would clobber the inline rotateY in the CSS cascade,
                        which is what was making the card end on the back side.
                    */}
                    <div
                        style={{
                            width: '100%',
                            height: '100%',
                            position: 'relative',
                            transformStyle: 'preserve-3d',
                            opacity: legendarySpinning ? 0 : 1,
                        }}
                        className={
                            hovering
                                ? 'animate-card-hover'
                                : popped
                                  ? 'animate-card-pop'
                                  : ''
                        }
                        onAnimationEnd={(e) => {
                            // ignore the infinite hover animation's iteration events
                            if (e.animationName !== 'cardPop') return
                            if (popped && !hovering) {
                                setPopped(false)
                                if (isLegendaryPlus) {
                                    setLegendarySpinning(true)
                                } else {
                                    setHovering(true)
                                }
                            }
                        }}
                    >
                        {/* Flip rotation wrapper — only this element rotates for the flip */}
                        <div
                            style={{
                                width: '100%',
                                height: '100%',
                                position: 'relative',
                                transformStyle: 'preserve-3d',
                                transition: flipped
                                    ? isSpecial
                                        ? 'transform 1100ms cubic-bezier(0.4, 0, 0.2, 1)'
                                        : 'transform 500ms ease-in-out'
                                    : undefined,
                                transform: flipped
                                    ? 'rotateY(180deg)'
                                    : 'rotateY(0deg)',
                            }}
                        >
                            {/* Front - card back */}
                            <div
                                style={{
                                    position: 'absolute',
                                    width: '100%',
                                    height: '100%',
                                    backfaceVisibility: 'hidden',
                                    WebkitBackfaceVisibility: 'hidden',
                                    borderRadius: '12px',
                                }}
                            >
                                <img
                                    src="/assets/backside_card.png"
                                    alt="Card Back"
                                    className="w-full h-full object-cover rounded-xl"
                                />
                            </div>

                            {/* Back - actual card */}
                            <div
                                style={{
                                    position: 'absolute',
                                    width: '100%',
                                    height: '100%',
                                    backfaceVisibility: 'hidden',
                                    WebkitBackfaceVisibility: 'hidden',
                                    transform: 'rotateY(180deg)',
                                    borderRadius: '12px',
                                    boxShadow: flipped ? glowStyle : undefined,
                                }}
                                className={cardIsRainbow ? 'glow-rainbow' : ''}
                            >
                                <img
                                    src={cardSrc}
                                    alt={card.name}
                                    className="w-full h-full object-cover rounded-xl"
                                />
                                {isHolo && flipped && (
                                    <div className="card-holo-shimmer" />
                                )}
                                {isSpecial && flipped && (
                                    <div
                                        className="absolute inset-0 rounded-xl animate-shine pointer-events-none"
                                        style={{ zIndex: 10 }}
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 3D spin overlay — 3 consecutive pulsing spins for legendary+ */}
                    {legendarySpinning && (
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                transformStyle: 'preserve-3d',
                            }}
                            className="animate-legendary-3d-spin"
                            onAnimationEnd={() => {
                                const positions = Array.from({
                                    length: SPARK_COUNT,
                                }).map((_, i) => {
                                    const angle =
                                        (i / SPARK_COUNT) * Math.PI * 2
                                    const dist = 110 + Math.random() * 90
                                    return {
                                        ex: Math.cos(angle) * dist,
                                        ey: Math.sin(angle) * dist,
                                        dur: 0.7 + Math.random() * 0.35,
                                    }
                                })
                                setSparks(positions)
                                setLegendarySpinning(false)
                                setHovering(true)
                                setTimeout(() => setSparks([]), 900)
                            }}
                        >
                            {/* front face — card art */}
                            <div
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    backfaceVisibility: 'hidden',
                                    WebkitBackfaceVisibility: 'hidden',
                                    borderRadius: '12px',
                                    boxShadow: glowStyle,
                                }}
                                className={cardIsRainbow ? 'glow-rainbow' : ''}
                            >
                                <img
                                    src={cardSrc}
                                    alt={card.name}
                                    className="w-full h-full object-cover rounded-xl"
                                />
                                {isHolo && (
                                    <div className="card-holo-shimmer" />
                                )}
                            </div>
                            {/* back face — card back image */}
                            <div
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    backfaceVisibility: 'hidden',
                                    WebkitBackfaceVisibility: 'hidden',
                                    transform: 'rotateY(180deg)',
                                    borderRadius: '12px',
                                }}
                            >
                                <img
                                    src="/assets/backside_card.png"
                                    alt=""
                                    className="w-full h-full object-cover rounded-xl"
                                />
                            </div>
                        </div>
                    )}

                    {/* Sparks burst at end of legendary spin */}
                    {sparks.length > 0 && (
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                pointerEvents: 'none',
                                zIndex: 20,
                            }}
                        >
                            {sparks.map((p, i) => (
                                <div
                                    key={i}
                                    className={`flip-card-spark${cardIsRainbow ? ' rainbow' : ''}`}
                                    style={
                                        {
                                            background: cardIsRainbow
                                                ? undefined
                                                : `rgba(${glowRgb}, 1)`,
                                            boxShadow: cardIsRainbow
                                                ? undefined
                                                : `0 0 10px 3px rgba(${glowRgb}, 0.85)`,
                                            animationDuration: `${p.dur}s`,
                                            '--ex': `${p.ex}px`,
                                            '--ey': `${p.ey}px`,
                                        } as React.CSSProperties
                                    }
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {flipped &&
                !confirmed &&
                typeof document !== 'undefined' &&
                createPortal(
                    <p
                        className="text-gray-500 text-xs animate-pulse"
                        style={{
                            position: 'fixed',
                            bottom: 76,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            whiteSpace: 'nowrap',
                            pointerEvents: 'none',
                            zIndex: 10003,
                            margin: 0,
                        }}
                    >
                        tap to continue
                    </p>,
                    document.body,
                )}
        </div>
    )
}
