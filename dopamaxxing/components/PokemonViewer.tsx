'use client'

import { useState } from 'react'
import { rarityGlowRgb, isRainbow, type Rarity } from '@/lib/rarityConfig'
import {
    getPokemonShowdownSpriteUrl,
    getPokemonAnimatedSpriteUrl,
    getPokemonSpriteUrl,
} from '@/lib/pokemonModels'

type Props = {
    pokemonName: string
    rarity: string
    cardImageUrl: string
    dexNumber: number | null
}

// Sprite vertical position as % from container bottom (increase = higher)
const SPRITE_BOTTOM_PCT = 20

export default function PokemonViewer({
    pokemonName,
    rarity,
    cardImageUrl,
    dexNumber,
}: Props) {
    const [spriteStage, setSpriteStage] = useState(0)

    const rainbow = isRainbow(rarity as Rarity)
    const glowRgb = rarityGlowRgb(rarity)

    const spriteSources = [
        getPokemonShowdownSpriteUrl(pokemonName),
        ...(dexNumber != null ? [getPokemonAnimatedSpriteUrl(dexNumber), getPokemonSpriteUrl(dexNumber)] : []),
        cardImageUrl,
    ]
    const activeSpriteUrl =
        spriteSources[Math.min(spriteStage, spriteSources.length - 1)]

    return (
        <div
            className="relative w-full h-full overflow-hidden rounded-2xl"
            style={{ background: 'var(--pack-card-inner)' }}
        >
            {/* Card art backdrop — full card with padding */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage: `url(${cardImageUrl})`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    filter: 'brightness(0.82)',
                    zIndex: 0,
                }}
            />
            {/* Edge vignette */}
            <div
                className="absolute inset-0"
                style={{
                    background:
                        'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)',
                    zIndex: 1,
                }}
            />

            {/* Sprite — centered, pinned from bottom */}
            <img
                src={activeSpriteUrl}
                alt={pokemonName}
                className={rainbow ? 'rainbow-sprite-glow' : undefined}
                style={{
                    position: 'absolute',
                    bottom: `${SPRITE_BOTTOM_PCT}%`,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    imageRendering: 'pixelated',
                    height: 180,
                    width: 'auto',
                    zIndex: 2,
                    pointerEvents: 'none',
                    ...(rainbow
                        ? {}
                        : { filter: `drop-shadow(0 0 14px rgba(${glowRgb}, 0.9)) drop-shadow(0 0 28px rgba(${glowRgb}, 0.5))` }),
                }}
                onError={() => {
                    if (spriteStage < spriteSources.length - 1)
                        setSpriteStage((s) => s + 1)
                }}
            />
        </div>
    )
}
