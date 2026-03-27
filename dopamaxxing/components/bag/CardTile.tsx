'use client'

import {
    isRainbow,
    rarityGlowRgb,
    rarityGlowShadow,
    rarityTextStyle,
    type Rarity,
} from '@/lib/rarityConfig'
import { centeringSkew, conditionFilter } from '@/lib/cardAttributes'
import PsaSlab from '@/components/card/PsaSlab'
import FirstEditionBadge from '@/components/card/FirstEditionBadge'
import WearOverlay from '@/components/card/WearOverlay'
import { rarityClassName, cardImgSrc } from './utils'
import type { UserCard } from '@/lib/types'

export function CardTile({
    uc,
    isSelected,
    onClick,
    selectMode,
    isMultiSelected,
}: {
    uc: UserCard
    isSelected: boolean
    onClick: () => void
    selectMode?: boolean
    isMultiSelected?: boolean
}) {
    const rarity = uc.cards.rarity as Rarity
    const rainbow = isRainbow(rarity)
    const glowRgb = rarityGlowRgb(rarity)
    const baseShadow = isSelected
        ? rarityGlowShadow(rarity, 'md')
        : rarityGlowShadow(rarity, 'sm')

    const graded = uc.grade != null
    const isFirstEdition = uc.cards.set_id?.endsWith('-1ed') ?? false

    const attrVals = [
        uc.attr_centering,
        uc.attr_corners,
        uc.attr_edges,
        uc.attr_surface,
    ].filter((v): v is number => v != null)
    const overallCond = attrVals.length
        ? attrVals.reduce((s, v) => s + v, 0) / attrVals.length
        : null
    const tileCenterSkew =
        uc.grade === 1 ? undefined : centeringSkew(uc.attr_centering, uc.id)
    const tileCondFilter = conditionFilter(overallCond)

    return (
        <div
            onClick={onClick}
            className={`relative cursor-pointer${!graded ? ' rounded-lg overflow-hidden' : ''}${rainbow ? ' glow-rainbow' : ''}`}
            style={{
                transition: 'transform 110ms ease, box-shadow 110ms ease',
                boxShadow: graded
                    ? undefined
                    : rainbow
                      ? undefined
                      : baseShadow,
                outline: isSelected
                    ? `2px solid rgba(${glowRgb}, 0.7)`
                    : 'none',
                outlineOffset: '2px',
                minWidth: 0,
            }}
            onMouseEnter={(e) => {
                if (!isSelected) e.currentTarget.style.transform = 'scale(1.04)'
                if (!graded && !rainbow)
                    e.currentTarget.style.boxShadow = rarityGlowShadow(
                        rarity,
                        'md',
                    )
            }}
            onMouseLeave={(e) => {
                if (!isSelected) e.currentTarget.style.transform = 'scale(1)'
                if (!graded && !rainbow)
                    e.currentTarget.style.boxShadow = baseShadow
            }}
        >
            {graded ? (
                <PsaSlab
                    uc={uc}
                    rainbow={rainbow}
                    compact
                    wearOverlay={
                        <WearOverlay
                            ucId={uc.id}
                            overallCond={overallCond}
                            attrSurface={uc.attr_surface}
                            grade={uc.grade}
                        />
                    }
                    imgFilter={tileCondFilter}
                    imgTransform={tileCenterSkew}
                />
            ) : (
                <>
                    <img
                        src={cardImgSrc(uc)}
                        alt={uc.cards.name}
                        className="block"
                        style={{
                            width: '100%',
                            height: 'auto',
                            display: 'block',
                            filter: tileCondFilter,
                            transform: tileCenterSkew,
                        }}
                        loading="lazy"
                    />
                    <WearOverlay
                        ucId={uc.id}
                        overallCond={overallCond}
                        attrSurface={uc.attr_surface}
                        grade={uc.grade}
                    />
                </>
            )}
            {isFirstEdition && <FirstEditionBadge variant="tile" />}

            <div
                className={`absolute top-1 left-1 px-1 rounded font-bold ${rarityClassName(rarity)}`}
                style={{
                    fontSize: '0.48rem',
                    lineHeight: 1.7,
                    background: 'rgba(0,0,0,0.75)',
                    backdropFilter: 'blur(4px)',
                }}
            >
                {rainbow ? (
                    <span style={rarityTextStyle(rarity)}>
                        Rarity: {rarity}
                    </span>
                ) : (
                    <span style={{ color: `rgba(${glowRgb}, 1)` }}>
                        Rarity: {rarity}
                    </span>
                )}
            </div>

            {/* level badge */}
            <div
                className="absolute top-1 right-1 px-1 rounded font-mono font-bold"
                style={{
                    fontSize: '0.48rem',
                    lineHeight: 1.7,
                    background: 'rgba(0,0,0,0.75)',
                    backdropFilter: 'blur(4px)',
                    color: '#d1d5db',
                }}
            >
                Lv {uc.card_level}
            </div>

            {/* multi-select circle */}
            {selectMode && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: 6,
                        right: 6,
                        zIndex: 10,
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        border: `2px solid ${isMultiSelected ? '#a855f7' : 'rgba(255,255,255,0.55)'}`,
                        background: isMultiSelected
                            ? '#a855f7'
                            : 'rgba(0,0,0,0.55)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none',
                    }}
                >
                    {isMultiSelected && (
                        <svg
                            width="10"
                            height="10"
                            viewBox="0 0 10 10"
                            fill="none"
                        >
                            <path
                                d="M2 5l2.5 2.5L8 2.5"
                                stroke="white"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    )}
                </div>
            )}

            {/* hot badge */}
            {uc.is_hot && (
                <div
                    className="absolute bottom-1 left-1"
                    style={{ fontSize: '0.55rem' }}
                >
                    🔥
                </div>
            )}

            {/* favorite star */}
            {uc.is_favorited && (
                <div
                    className="absolute bottom-1 right-1 text-yellow-400"
                    style={{ fontSize: '0.48rem' }}
                >
                    ★
                </div>
            )}

            {/* rainbow shimmer */}
            {rainbow && (
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background:
                            'linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.09) 50%, transparent 60%)',
                        backgroundSize: '300% 100%',
                        animation: 'shine 2.5s linear infinite',
                    }}
                />
            )}
        </div>
    )
}
