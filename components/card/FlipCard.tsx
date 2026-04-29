'use client'

import { useState } from 'react'
import { rarityGlowRgb, isRainbow } from '@/lib/rarityConfig'
import WearOverlay from '@/components/card/WearOverlay'
import { conditionFilter } from '@/lib/cardAttributes'

type Props = {
    card: {
        id: string
        name: string
        image_url: string
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
    const [showSparks, setShowSparks] = useState(false)

    const glowRgb = rarityGlowRgb(card.rarity)
    const cardIsRainbow = isRainbow(card.rarity)
    const isSpecial = SPECIAL_RARITIES.includes(card.rarity)
    const isHolo = HOLO_RARITIES.includes(card.rarity)
    const isLegendaryPlus = LEGENDARY_PLUS.includes(card.rarity)

    const overallCond = (() => {
        const vals = [
            card.attr_centering,
            card.attr_corners,
            card.attr_edges,
            card.attr_surface,
        ].filter((v): v is number => v != null)
        return vals.length
            ? vals.reduce((s, v) => s + v, 0) / vals.length
            : null
    })()
    const condFilterVal = conditionFilter(overallCond)

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
        <div className="flex flex-col items-center gap-2">
            {flash && (
                <div
                    className="fixed inset-0 pointer-events-none animate-flash"
                    style={{ zIndex: 60 }}
                />
            )}
            <div
                onClick={handleClick}
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
                                    src={card.image_url}
                                    alt={card.name}
                                    className="w-full h-full object-cover rounded-xl"
                                    style={{
                                        filter: flipped ? condFilterVal : undefined,
                                    }}
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
                                {flipped && (
                                    <WearOverlay
                                        ucId={card.id}
                                        overallCond={overallCond}
                                        attrSurface={card.attr_surface ?? null}
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
                                setShowSparks(true)
                                setLegendarySpinning(false)
                                setHovering(true)
                                setTimeout(() => setShowSparks(false), 900)
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
                                    src={card.image_url}
                                    alt={card.name}
                                    className="w-full h-full object-cover rounded-xl"
                                    style={{ filter: condFilterVal }}
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
                    {showSparks && (
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                pointerEvents: 'none',
                                zIndex: 20,
                            }}
                        >
                            {Array.from({ length: SPARK_COUNT }).map((_, i) => {
                                const angle = (i / SPARK_COUNT) * Math.PI * 2
                                const dist = 110 + Math.random() * 90
                                const ex = Math.cos(angle) * dist
                                const ey = Math.sin(angle) * dist
                                const dur = 0.7 + Math.random() * 0.35
                                return (
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
                                                animationDuration: `${dur}s`,
                                                '--ex': `${ex}px`,
                                                '--ey': `${ey}px`,
                                            } as React.CSSProperties
                                        }
                                    />
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {flipped && !confirmed && (
                <p className="text-gray-500 text-xs animate-pulse mt-4">
                    tap to continue
                </p>
            )}
        </div>
    )
}
