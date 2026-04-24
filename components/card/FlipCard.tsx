'use client'

import { useState } from 'react'
import { rarityGlowRgb, isRainbow, rarityToOdds } from '@/lib/rarityConfig'
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

    const glowRgb = rarityGlowRgb(card.rarity)
    const cardIsRainbow = isRainbow(card.rarity)
    const isSpecial = SPECIAL_RARITIES.includes(card.rarity)
    const isHolo = HOLO_RARITIES.includes(card.rarity)

    const overallCond = (() => {
        const vals = [card.attr_centering, card.attr_corners, card.attr_edges, card.attr_surface]
            .filter((v): v is number => v != null)
        return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null
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
                <div
                    style={{
                        width: '100%',
                        height: '100%',
                        position: 'relative',
                        transformStyle: 'preserve-3d',
                        transition:
                            popped || hovering
                                ? 'none'
                                : flipped
                                  ? isSpecial
                                      ? 'transform 1100ms cubic-bezier(0.4, 0, 0.2, 1)'
                                      : 'transform 500ms ease-in-out'
                                  : undefined,
                        transform: flipped
                            ? 'rotateY(180deg)'
                            : 'rotateY(0deg)',
                    }}
                    className={
                        hovering
                            ? 'animate-card-hover'
                            : popped
                              ? 'animate-card-pop'
                              : ''
                    }
                    onAnimationEnd={() => {
                        if (popped && !hovering) {
                            setPopped(false)
                            setHovering(true)
                        }
                    }}
                >
                    {/* Front - card back */}
                    <div
                        style={{
                            position: 'absolute',
                            width: '100%',
                            height: '100%',
                            backfaceVisibility: 'hidden',
                            borderRadius: '12px',
                        }}
                    >
                        <img
                            src="/packs/card-back.jpg"
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
                            style={{ filter: flipped ? condFilterVal : undefined }}
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

            {flipped && !confirmed && (
                <p className="text-gray-500 text-xs animate-pulse mt-4">
                    tap to continue
                </p>
            )}
        </div>
    )
}
