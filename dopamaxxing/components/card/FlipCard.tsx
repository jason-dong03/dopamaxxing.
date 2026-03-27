'use client'

import { useState } from 'react'
import { rarityGlowRgb, isRainbow, rarityToOdds } from '@/lib/rarityConfig'

type Props = {
    card: {
        id: string
        name: string
        image_url: string
        rarity: string
    }
    onReveal: () => void
    onSpecialChange: (active: boolean, glowColor: string) => void
    onFlipped: () => void
    onConfirmed: () => void
}

const SPECIAL_RARITIES = [
    'Epic',
    'Mythical',
    'Legendary',
    'Divine',
    'Celestial',
    '???',
]

export default function FlipCard({
    card,
    onReveal,
    onSpecialChange,
    onFlipped,
    onConfirmed,
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
                    width: '260px',
                    height: '364px',
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
                                      ? 'transform 1200ms cubic-bezier(0.4, 0, 0.2, 1)'
                                      : 'transform 600ms ease-in-out'
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
                        />
                        {isSpecial && flipped && (
                            <div
                                className="absolute inset-0 rounded-xl animate-shine pointer-events-none"
                                style={{ zIndex: 10 }}
                            />
                        )}
                    </div>
                </div>
            </div>

            {flipped && !confirmed && (
                <p className="text-gray-500 text-xs animate-pulse mt-1">
                    tap to continue
                </p>
            )}
        </div>
    )
}
