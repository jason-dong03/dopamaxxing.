'use client'

import { useState, useEffect } from 'react'
import EvolutionCutscene from './EvolutionCutscene'
import {
    isRainbow,
    rarityGlowRgb,
    rarityGlowShadow,
    rarityTextStyle,
    xpToNextLevel,
    conditionMultFunction,
    weightedCondition,
    tierBuyBack,
    type Rarity,
} from '@/lib/rarityConfig'
import { conditionFilter, centeringSkew } from '@/lib/cardAttributes'
import { NATURE_BY_NAME, NATURE_TIER_COLOR } from '@/lib/pokemon-stats'
import { TYPE_COLOR } from '@/lib/pokemon-types'
import PsaSlab from '@/components/card/PsaSlab'
import { Card3DViewer } from '@/components/card/Card3DViewer'
import FirstEditionBadge from '@/components/card/FirstEditionBadge'
import WearOverlay from '@/components/card/WearOverlay'
import { rarityClassName, cardImgSrc } from './utils'
import { baseName } from '@/lib/types/cards'
import { SellButton } from './SellButton'
import { GradeSection } from './GradeSection'
import type { UserCard } from '@/lib/types'
import { fmt } from '@/lib/utils'
import { cardBR, formatBR } from '@/lib/battlePower'
import React from 'react'
import { createPortal } from 'react-dom'

function ShowcaseButton({ uc }: { uc: UserCard }) {
    const [loading, setLoading] = useState(false)
    const [showcased, setShowcased] = useState(uc.is_showcased)

    async function toggle() {
        setLoading(true)
        const method = showcased ? 'DELETE' : 'POST'
        const res = await fetch(`/api/user-cards/${uc.id}/showcase`, { method })
        if (res.ok) setShowcased((s) => !s)
        setLoading(false)
    }

    return (
        <button
            onClick={toggle}
            disabled={loading}
            title={
                showcased ? 'Remove from showcase' : 'Set as profile showcase'
            }
            className="flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
            style={{
                cursor: loading ? 'wait' : 'pointer',
                background: 'none',
                border: 'none',
                padding: 0,
            }}
        >
            <span
                style={{
                    fontSize: '0.95rem',
                    lineHeight: 1,
                    color: showcased ? '#818cf8' : '#4b5563',
                    filter: showcased
                        ? 'drop-shadow(0 0 6px rgba(129,140,248,0.8))'
                        : 'none',
                    transition: 'filter 0.15s ease',
                }}
            >
                ◈
            </span>
            <span
                style={{
                    fontSize: '0.58rem',
                    color: showcased ? '#818cf8' : '#6b7280',
                }}
            >
                {showcased ? 'showcased' : 'showcase'}
            </span>
        </button>
    )
}

export function CardStats({
    uc,
    onClose,
    onSell,
    onToggleFavorite,
    onGraded,
    mode,
}: {
    uc: UserCard
    onClose: () => void
    onSell: () => Promise<void>
    onToggleFavorite: () => void
    onGraded: (grade: number) => void
    mode: 'sidebar' | 'overlay'
}) {
    const [wearFading, setWearFading] = useState(false)
    const [cleanView, setCleanView] = useState(false)
    const [showCleanTooltip, setShowCleanTooltip] = useState(false)
    const [detailTab, setDetailTab] = useState<
        'overview' | 'condition' | 'pokemon'
    >('overview')
    const [learnSlot, setLearnSlot] = useState<{ moveIdx: number } | null>(null)
    const [learnLoading, setLearnLoading] = useState(false)
    const [summaryOpen, setSummaryOpen] = useState(true)
    const [refreshLoading, setRefreshLoading] = useState(false)
    const [refreshResult, setRefreshResult] = useState<{
        poolSize: number
        hasChoice: boolean
    } | null>(null)
    const [evolutionCards, setEvolutionCards] = useState<
        Array<{
            id: string
            name: string
            image_url: string
            image_url_hi?: string | null
            rarity: string
        }>
    >([])
    const [showEvolutionTooltip, setShowEvolutionTooltip] = useState(false)
    const [showEvolutionCutscene, setShowEvolutionCutscene] = useState(false)
    const [pendingOpen, setPendingOpen] = useState(false)
    const [worthTooltipPos, setWorthTooltipPos] = useState<{
        x: number
        y: number
    } | null>(null)

    useEffect(() => {
        const name = baseName(uc.cards.name)
        fetch(`/api/cards/evolution?name=${encodeURIComponent(name)}`)
            .then((r) => (r.ok ? r.json() : { cards: [] }))
            .then((data) => setEvolutionCards(data.cards ?? []))
            .catch(() => {})
    }, [uc.cards.name])

    async function handleSellWithAnimation(): Promise<void> {
        setWearFading(true)
        await new Promise((resolve) => setTimeout(resolve, 350))
        await onSell()
    }

    const rarity = uc.cards.rarity as Rarity
    const rainbow = isRainbow(rarity)
    const glowRgb = rarityGlowRgb(rarity)
    const xpNeeded = xpToNextLevel(rarity, uc.card_level)
    const xpPct = Math.min(100, (uc.card_xp / xpNeeded) * 100)
    const borderColor = rainbow
        ? 'rgba(168,85,247,0.2)'
        : `rgba(${glowRgb}, 0.18)`
    const barBg = rainbow
        ? 'linear-gradient(90deg,#f87171,#facc15,#4ade80,#60a5fa,#a855f7)'
        : `rgba(${glowRgb}, 0.9)`

    // overall attr condition
    const attrVals = [
        uc.attr_centering,
        uc.attr_corners,
        uc.attr_edges,
        uc.attr_surface,
    ].filter((v): v is number => v != null)
    const overallCond = attrVals.length
        ? attrVals.reduce((s, v) => s + v, 0) / attrVals.length
        : null
    const gradeColor = (g: number) =>
        g >= 8.5 ? '#4ade80' : g >= 6.5 ? '#fbbf24' : '#f87171'

    const tierRate = tierBuyBack(uc.cards.rarity as string)
    const condAttrs = {
        attr_centering: uc.attr_centering ?? 0,
        attr_corners: uc.attr_corners ?? 0,
        attr_edges: uc.attr_edges ?? 0,
        attr_surface: uc.attr_surface ?? 0,
    }
    const condMult = conditionMultFunction(weightedCondition(condAttrs))
    const isGraded = uc.grade != null
    const rawWorth = uc.cards.market_price_usd ?? 0
    // Worth = market price, multiplied by condition only after grading (no tier rate)
    const cardWorth = isGraded ? rawWorth * condMult : rawWorth
    // Sell = worth × tier rate (computed fresh, not from stale uc.worth)
    const computedSellAmount = parseFloat((cardWorth * tierRate).toFixed(2))
    const worthDelta = cardWorth - rawWorth
    const worthDisplay =
        isGraded && worthDelta !== 0
            ? `$${fmt(cardWorth)} (${worthDelta > 0 ? '+' : '-'}$${fmt(Math.abs(worthDelta))})`
            : `$${fmt(cardWorth)}`

    // per-card battle rating
    const thisBP = cardBR({
        card_level: uc.card_level,
        rarity: rarity,
        stat_atk:      (uc as any).stat_atk      ?? null,
        stat_def:      (uc as any).stat_def      ?? null,
        stat_spatk:    (uc as any).stat_spatk    ?? null,
        stat_spdef:    (uc as any).stat_spdef    ?? null,
        stat_spd:      (uc as any).stat_spd      ?? null,
        stat_accuracy: (uc as any).stat_accuracy ?? null,
        stat_evasion:  (uc as any).stat_evasion  ?? null,
        nature_tier:   (uc as any).nature_tier   ?? null,
    })


    // colored stat rows
    const stats = [
        {
            label: 'pokédex',
            value: `#${String(uc.cards.national_pokedex_number).padStart(3, '0')}`,
            color: '#9ca3af',
            isLevel: false,
        },
        { label: 'hp', value: uc.cards.hp, color: '#f87171', isLevel: false },
        {
            label: 'level',
            value: uc.card_level,
            color: '#60a5fa',
            isLevel: true,
        },
    ]

    const isFirstEdition = uc.cards.set_id?.endsWith('-1ed') ?? false

    const condFilter = conditionFilter(overallCond)
    const centerSkew =
        uc.grade === 1 ? undefined : centeringSkew(uc.attr_centering, uc.id)

    const cardOnly =
        uc.grade != null ? (
            <PsaSlab
                uc={uc}
                rainbow={rainbow}
                wearOverlay={
                    cleanView ? undefined : (
                        <WearOverlay
                            ucId={uc.id}
                            overallCond={overallCond}
                            attrSurface={uc.attr_surface}
                            grade={uc.grade}
                            fading={wearFading}
                        />
                    )
                }
                imgFilter={condFilter}
                imgTransform={centerSkew}
            />
        ) : (
            <div
                style={{
                    position: 'relative',
                    display: 'inline-block',
                    width: '100%',
                    overflow: 'hidden',
                    borderRadius: 8,
                }}
            >
                <img
                    src={cardImgSrc(uc)}
                    alt={uc.cards.name}
                    className={rainbow ? 'glow-rainbow' : ''}
                    style={{
                        width: '100%',
                        display: 'block',
                        borderRadius: 8,
                        objectFit: 'contain',
                        boxShadow: rainbow
                            ? undefined
                            : rarityGlowShadow(rarity, 'sm'),
                        filter: condFilter,
                        transform: centerSkew,
                        transformOrigin: 'center center',
                    }}
                />
                {!cleanView && (
                    <WearOverlay
                        ucId={uc.id}
                        overallCond={overallCond}
                        attrSurface={uc.attr_surface}
                        grade={uc.grade}
                        fading={wearFading}
                    />
                )}
            </div>
        )

    const hasPending = (uc.pending_moves?.length ?? 0) > 0

    const imageBlock = (
        <button
            onClick={() => {
                if (!cleanView) setCleanView(true)
            }}
            title="Open clean view"
            style={{
                position: 'relative',
                display: 'block',
                width: '100%',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                textAlign: 'inherit',
            }}
        >
            {cardOnly}
            {!cleanView && isFirstEdition && (
                <FirstEditionBadge variant="detail" />
            )}
            {hasPending && (
                <span
                    style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: '#f97316',
                        pointerEvents: 'none',
                        boxShadow: '0 0 6px rgba(249,115,22,0.9)',
                        animation: 'pendingPulse 1.5s ease-in-out infinite',
                        zIndex: 10,
                    }}
                />
            )}
        </button>
    )

    // ─── nature & combat stat helpers ─────────────────────────────────────────
    const natureObj = uc.nature ? (NATURE_BY_NAME[uc.nature] ?? null) : null
    const natureTierColor = natureObj
        ? NATURE_TIER_COLOR[natureObj.tier]
        : '#94a3b8'
    const moveSlotsUsed = uc.moves?.length ?? 0
    const isMoveSlotFree = moveSlotsUsed < 4

    const combatStats = [
        { key: 'stat_atk', label: 'ATK', color: '#f87171', val: uc.stat_atk },
        { key: 'stat_def', label: 'DEF', color: '#60a5fa', val: uc.stat_def },
        {
            key: 'stat_spatk',
            label: 'SP.ATK',
            color: '#c084fc',
            val: uc.stat_spatk,
        },
        {
            key: 'stat_spdef',
            label: 'SP.DEF',
            color: '#818cf8',
            val: uc.stat_spdef,
        },
        { key: 'stat_spd', label: 'SPD', color: '#4ade80', val: uc.stat_spd },
        {
            key: 'stat_accuracy',
            label: 'ACC',
            color: '#fbbf24',
            val: uc.stat_accuracy,
        },
        {
            key: 'stat_evasion',
            label: 'EVA',
            color: '#fb923c',
            val: uc.stat_evasion,
        },
    ] as const
    const maxStat = Math.max(1, ...combatStats.map((s) => s.val ?? 0))

    async function handleRefreshMoves() {
        setRefreshLoading(true)
        setRefreshResult(null)
        try {
            const res = await fetch(`/api/user-cards/${uc.id}/refresh-moves`, {
                method: 'POST',
            })
            const json = await res.json()
            if (res.ok) {
                setRefreshResult({
                    poolSize: json.poolSize ?? 0,
                    hasChoice: json.hasChoice ?? false,
                })
                window.location.reload()
            }
        } finally {
            setRefreshLoading(false)
        }
    }

    async function handleLearnMove(moveIdx: number, slotIdx: number) {
        setLearnLoading(true)
        try {
            await fetch('/api/learn-move', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userCardId: uc.id,
                    moveIndex: moveIdx,
                    slotIndex: slotIdx,
                }),
            })
            // reload page to reflect updated moves
            window.location.reload()
        } finally {
            setLearnLoading(false)
            setLearnSlot(null)
        }
    }
    const summaryBlock = (
        <div
            style={{
                marginBottom: 14,
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.03)',
                overflow: 'hidden',
            }}
        >
            <button
                onClick={() => setSummaryOpen((v) => !v)}
                style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    padding: '10px 12px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                }}
            >
                <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            flexWrap: 'wrap',
                            marginBottom: 3,
                        }}
                    >
                        {uc.is_hot && (
                            <span
                                style={{
                                    fontSize: '0.62rem',
                                    color: '#fb923c',
                                    lineHeight: 1,
                                }}
                            >
                                🔥
                            </span>
                        )}

                        <span
                            style={{
                                fontSize:
                                    mode === 'overlay' ? '1rem' : '0.8rem',
                                fontWeight: 700,
                                color: '#fff',
                                lineHeight: 1.2,
                            }}
                        >
                            {baseName(uc.cards.name)}
                        </span>

                        <span
                            className={`font-bold uppercase tracking-widest ${rarityClassName(rarity)}`}
                            style={{
                                fontSize: '0.48rem',
                                ...rarityTextStyle(rarity),
                            }}
                        >
                            {rarity}
                        </span>
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            flexWrap: 'wrap',
                        }}
                    >
                        <span
                            style={{
                                fontSize: '0.56rem',
                                color: '#9ca3af',
                                fontFamily: 'monospace',
                            }}
                        >
                            #
                            {String(
                                uc.cards.national_pokedex_number ?? 0,
                            ).padStart(3, '0')}
                        </span>

                        <span
                            style={{
                                fontSize: '0.56rem',
                                color: '#60a5fa',
                                fontFamily: 'monospace',
                                fontWeight: 700,
                            }}
                        >
                            Lv. {uc.card_level}
                        </span>

                        <span
                            style={{
                                fontSize: '0.56rem',
                                color: '#eab308',
                                fontFamily: 'monospace',
                            }}
                        >
                            ${Number(uc.cards.market_price_usd ?? 0).toFixed(2)}
                        </span>

                        {uc.grade != null && (
                            <span
                                style={{
                                    fontSize: '0.56rem',
                                    color: '#f87171',
                                    fontFamily: 'monospace',
                                    fontWeight: 700,
                                }}
                            >
                                PSA {uc.grade}
                            </span>
                        )}
                        <span
                            style={{
                                fontSize: '0.56rem',
                                color: '#facc15',
                                fontFamily: 'monospace',
                                fontWeight: 700,
                            }}
                            title={`Battle Rating: ${thisBP.toLocaleString()}`}
                        >
                            {formatBR(thisBP)} BR
                        </span>
                    </div>
                </div>

                <span
                    style={{
                        fontSize: '0.72rem',
                        color: '#9ca3af',
                        flexShrink: 0,
                    }}
                >
                    {summaryOpen ? '▲' : '▼'}
                </span>
            </button>
        </div>
    )

    const infoBlock = (
        <div
            className="flex flex-col flex-1 min-w-0 overflow-y-auto"
            style={{ minHeight: 320 }}
        >
            {summaryBlock}
            {/* tab switcher */}
            <div
                style={{
                    display: 'flex',
                    gap: 4,
                    marginBottom: 16,
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: 8,
                    padding: 3,
                }}
            >
                {(['overview', 'condition', 'pokemon'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setDetailTab(tab)}
                        style={{
                            flex: 1,
                            padding: '4px 0',
                            borderRadius: 6,
                            fontSize: '0.58rem',
                            fontWeight: 700,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            border: 'none',
                            cursor: 'pointer',
                            position: 'relative',
                            background:
                                detailTab === tab
                                    ? 'rgba(255,255,255,0.1)'
                                    : 'transparent',
                            color: detailTab === tab ? '#e2e8f0' : '#6b7280',
                            transition: 'all 150ms',
                        }}
                    >
                        {tab === 'pokemon' ? 'stats' : tab}
                        {tab === 'pokemon' && hasPending && (
                            <span
                                style={{
                                    position: 'absolute',
                                    top: 2,
                                    right: 6,
                                    width: 7,
                                    height: 7,
                                    borderRadius: '50%',
                                    background: '#f97316',
                                    boxShadow: '0 0 5px rgba(249,115,22,0.8)',
                                    animation:
                                        'pendingPulse 1.5s ease-in-out infinite',
                                }}
                            />
                        )}
                    </button>
                ))}
            </div>

            {detailTab === 'overview' && (
                <>
                    {/* name + rarity */}
                    {!summaryOpen && (
                        <div className="mb-4">
                            <div className="flex items-center gap-3 mb-2">
                                {/* favorites toggle */}
                                <button
                                    onClick={onToggleFavorite}
                                    className="flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
                                    style={{ cursor: 'pointer' }}
                                    title={
                                        uc.is_favorited
                                            ? 'Remove from favorites'
                                            : 'Add to favorites'
                                    }
                                >
                                    <span
                                        style={{
                                            fontSize: '1rem',
                                            color: '#facc15',
                                            lineHeight: 1,
                                            filter: uc.is_favorited
                                                ? 'drop-shadow(0 0 6px rgba(250,204,21,0.9))'
                                                : 'none',
                                            transition: 'filter 0.15s ease',
                                        }}
                                    >
                                        {uc.is_favorited ? '★' : '☆'}
                                    </span>
                                    <span
                                        style={{
                                            fontSize: '0.58rem',
                                            color: uc.is_favorited
                                                ? '#facc15'
                                                : '#6b7280',
                                        }}
                                    >
                                        {uc.is_favorited
                                            ? 'favorited'
                                            : 'favorite'}
                                    </span>
                                </button>
                                {/* showcase toggle (1 per user) */}
                                <ShowcaseButton uc={uc} />
                            </div>
                            {uc.is_hot && (
                                <span
                                    className="block mb-1"
                                    style={{
                                        fontSize: '0.6rem',
                                        color: '#fb923c',
                                    }}
                                >
                                    🔥 hot market pull
                                </span>
                            )}
                            <h3
                                className="text-white font-bold leading-snug mb-1.5"
                                style={{
                                    fontSize:
                                        mode === 'overlay'
                                            ? '1.3rem'
                                            : '0.95rem',
                                }}
                            >
                                {baseName(uc.cards.name)}
                            </h3>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span
                                    className={`font-bold uppercase tracking-widest ${rarityClassName(rarity)}`}
                                    style={{
                                        fontSize: '0.58rem',
                                        ...rarityTextStyle(rarity),
                                    }}
                                >
                                    {rarity}
                                </span>
                                {uc.cards.pokemon_type && (
                                    <span
                                        style={{
                                            fontSize: '0.55rem',
                                            fontWeight: 700,
                                            textTransform: 'capitalize',
                                            color: '#fff',
                                            background:
                                                TYPE_COLOR[
                                                    uc.cards.pokemon_type
                                                ] ?? '#6b7280',
                                            borderRadius: 4,
                                            padding: '1px 6px',
                                            letterSpacing: '0.04em',
                                        }}
                                    >
                                        {uc.cards.pokemon_type}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-2">
                                <span
                                    style={{
                                        fontSize: '0.4rem',
                                        color: '#6b7280',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                    }}
                                >
                                    raw value
                                </span>
                                <span
                                    style={{
                                        fontSize:
                                            mode === 'overlay'
                                                ? '0.75rem'
                                                : '0.58rem',
                                        fontWeight: 700,
                                        fontFamily: 'monospace',
                                        color: '#dedc4a',
                                    }}
                                >
                                    ${fmt(Number(uc.cards.market_price_usd))}
                                </span>
                                <span
                                    style={{
                                        fontSize: '0.4rem',
                                        color: '#6b7280',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                    }}
                                >
                                    worth:
                                </span>
                                <span
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: 12,
                                        height: 12,
                                        borderRadius: '50%',
                                        border: '1px solid #4b5563',
                                        color: '#9ca3af',
                                        fontSize: '0.45rem',
                                        fontWeight: 700,
                                        cursor: 'default',
                                        flexShrink: 0,
                                    }}
                                    onMouseEnter={(e) => {
                                        const r = (
                                            e.currentTarget as HTMLElement
                                        ).getBoundingClientRect()
                                        setWorthTooltipPos({
                                            x: r.left,
                                            y: r.bottom + 6,
                                        })
                                    }}
                                    onMouseLeave={() =>
                                        setWorthTooltipPos(null)
                                    }
                                >
                                    ?
                                </span>
                                <span
                                    style={{
                                        fontSize:
                                            mode === 'overlay'
                                                ? '0.75rem'
                                                : '0.58rem',
                                        fontWeight: 700,
                                        fontFamily: 'monospace',
                                        color:
                                            worthDelta > 0
                                                ? '#4ade80'
                                                : '#de4a4a',
                                    }}
                                >
                                    {worthDisplay}
                                </span>
                            </div>
                        </div>
                    )}
                    {/* stat rows */}
                    <div style={{ borderTop: `1px solid ${borderColor}` }}>
                        {stats.map(({ label, value, color, isLevel }) => (
                            <div
                                key={label}
                                className="flex justify-between items-center"
                                style={{
                                    borderBottom: `1px solid ${borderColor}`,
                                    padding: '5px 0',
                                }}
                            >
                                <span
                                    className="font-semibold uppercase tracking-widest text-gray-600"
                                    style={{ fontSize: '0.55rem' }}
                                >
                                    {label}
                                </span>
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                    }}
                                >
                                    {isLevel && evolutionCards.length > 0 && (
                                        <div style={{ position: 'relative' }}>
                                            <button
                                                onMouseEnter={() =>
                                                    setShowEvolutionTooltip(
                                                        true,
                                                    )
                                                }
                                                onMouseLeave={() =>
                                                    setShowEvolutionTooltip(
                                                        false,
                                                    )
                                                }
                                                onClick={() =>
                                                    setShowEvolutionCutscene(
                                                        true,
                                                    )
                                                }
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    width: 20,
                                                    height: 20,
                                                    borderRadius: '50%',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    padding: 0,
                                                    animation:
                                                        'evolutionPulse 2s ease-in-out infinite',
                                                }}
                                            >
                                                <svg
                                                    width="16"
                                                    height="16"
                                                    viewBox="0 0 16 16"
                                                    fill="none"
                                                >
                                                    <circle
                                                        cx="8"
                                                        cy="8"
                                                        r="7"
                                                        stroke="#34d399"
                                                        strokeWidth="1.5"
                                                        style={{
                                                            filter: 'drop-shadow(0 0 4px #34d39988)',
                                                        }}
                                                    />
                                                    <path
                                                        d="M8 11V5M5.5 7.5L8 5l2.5 2.5"
                                                        stroke="#34d399"
                                                        strokeWidth="1.5"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    />
                                                </svg>
                                            </button>
                                            {showEvolutionTooltip && (
                                                <div
                                                    style={{
                                                        position: 'absolute',
                                                        bottom: '130%',
                                                        right: 0,
                                                        background: '#111',
                                                        border: '1px solid #333',
                                                        borderRadius: 6,
                                                        padding: '4px 8px',
                                                        fontSize: '0.6rem',
                                                        color: '#94a3b8',
                                                        whiteSpace: 'nowrap',
                                                        pointerEvents: 'none',
                                                        zIndex: 50,
                                                    }}
                                                >
                                                    whats this..?
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <span
                                        className="font-mono font-bold"
                                        style={{
                                            fontSize:
                                                mode === 'overlay'
                                                    ? '0.88rem'
                                                    : '0.75rem',
                                            color,
                                        }}
                                    >
                                        {value}
                                    </span>
                                </div>
                            </div>
                        ))}

                        {/* xp bar */}
                        <div style={{ padding: '6px 0' }}>
                            <div
                                className="flex justify-between"
                                style={{ marginBottom: 4 }}
                            >
                                <span
                                    className="font-semibold uppercase tracking-widest text-gray-600"
                                    style={{ fontSize: '0.55rem' }}
                                >
                                    xp
                                </span>
                                <span
                                    className="font-mono"
                                    style={{
                                        fontSize: '0.55rem',
                                        color: '#4ade80',
                                    }}
                                >
                                    {uc.card_xp} / {xpNeeded}
                                </span>
                            </div>
                            <div
                                className="w-full rounded-full overflow-hidden"
                                style={{
                                    height: 3,
                                    background: 'rgba(255,255,255,0.05)',
                                }}
                            >
                                <div
                                    className="h-full rounded-full"
                                    style={{
                                        width: `${xpPct}%`,
                                        background: barBg,
                                    }}
                                />
                            </div>
                        </div>

                        {/* grade */}
                        <GradeSection uc={uc} onGraded={onGraded} />

                        {/* sell button */}
                        <SellButton
                            uc={uc}
                            sellAmount={computedSellAmount}
                            onSell={handleSellWithAnimation}
                        />
                    </div>
                </>
            )}

            {detailTab === 'condition' && (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 14,
                        padding: '4px 0',
                    }}
                >
                    {overallCond != null && (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 12px',
                                borderRadius: 8,
                                background: `${gradeColor(overallCond)}12`,
                                border: `1px solid ${gradeColor(overallCond)}33`,
                            }}
                        >
                            <span
                                style={{
                                    fontSize: '0.52rem',
                                    fontWeight: 700,
                                    color: '#6b7280',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.08em',
                                }}
                            >
                                Overall
                            </span>
                            <span
                                style={{
                                    fontSize: '1.4rem',
                                    fontWeight: 800,
                                    fontFamily: 'monospace',
                                    color: gradeColor(overallCond),
                                    textShadow: `0 0 12px ${gradeColor(overallCond)}66`,
                                }}
                            >
                                {overallCond.toFixed(1)}
                                <span
                                    style={{
                                        fontSize: '0.55rem',
                                        color: '#6b7280',
                                        marginLeft: 3,
                                    }}
                                >
                                    /10
                                </span>
                            </span>
                        </div>
                    )}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10,
                        }}
                    >
                        {[
                            { label: 'Centering', value: uc.attr_centering },
                            { label: 'Corners', value: uc.attr_corners },
                            { label: 'Edges', value: uc.attr_edges },
                            { label: 'Surface', value: uc.attr_surface },
                        ].map(({ label, value }) => {
                            const v = value ?? 7
                            const color =
                                v >= 8.5
                                    ? '#4ade80'
                                    : v >= 6.5
                                      ? '#fbbf24'
                                      : '#f87171'
                            return (
                                <div key={label}>
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            marginBottom: 5,
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontSize: '0.52rem',
                                                color: '#6b7280',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.06em',
                                            }}
                                        >
                                            {label}
                                        </span>
                                        <span
                                            style={{
                                                fontSize: '0.62rem',
                                                fontWeight: 700,
                                                fontFamily: 'monospace',
                                                color,
                                            }}
                                        >
                                            {v.toFixed(1)}
                                        </span>
                                    </div>
                                    <div
                                        style={{
                                            height: 6,
                                            borderRadius: 4,
                                            background:
                                                'rgba(255,255,255,0.05)',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        <div
                                            style={{
                                                height: '100%',
                                                width: `${(v / 10) * 100}%`,
                                                background: color,
                                                borderRadius: 4,
                                                transition: 'width 600ms ease',
                                                boxShadow: `0 0 6px ${color}66`,
                                            }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {detailTab === 'pokemon' && (
                /* ─── Stats tab ────────────────────────────────────────────── */
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                    }}
                >
                    {/* nature */}
                    <div>
                        <div
                            style={{
                                fontSize: '0.5rem',
                                color: '#6b7280',
                                textTransform: 'uppercase',
                                letterSpacing: '0.07em',
                                marginBottom: 4,
                            }}
                        >
                            Nature
                        </div>
                        {natureObj ? (
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: '0.78rem',
                                        fontWeight: 800,
                                        color: natureTierColor,
                                        textShadow: `0 0 8px ${natureTierColor}55`,
                                    }}
                                >
                                    {natureObj.name}
                                </span>
                                <span
                                    style={{
                                        fontSize: '0.52rem',
                                        color: '#6b7280',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: `1px solid ${natureTierColor}33`,
                                        borderRadius: 4,
                                        padding: '2px 6px',
                                    }}
                                >
                                    {natureObj.effect}
                                </span>
                            </div>
                        ) : (
                            <span
                                style={{
                                    fontSize: '0.62rem',
                                    color: '#4b5563',
                                    fontStyle: 'italic',
                                }}
                            >
                                No nature
                            </span>
                        )}
                    </div>

                    {/* base stats */}
                    <div>
                        <div
                            style={{
                                fontSize: '0.5rem',
                                color: '#6b7280',
                                textTransform: 'uppercase',
                                letterSpacing: '0.07em',
                                marginBottom: 5,
                            }}
                        >
                            Base Stats
                        </div>
                        {combatStats.some((s) => s.val != null) ? (
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 4,
                                }}
                            >
                                {combatStats.map(({ label, color, val }) => (
                                    <div
                                        key={label}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontSize: '0.48rem',
                                                color: '#6b7280',
                                                width: 38,
                                                flexShrink: 0,
                                                textAlign: 'right',
                                                letterSpacing: '0.04em',
                                            }}
                                        >
                                            {label}
                                        </span>
                                        <div
                                            style={{
                                                flex: 1,
                                                height: 5,
                                                borderRadius: 3,
                                                background:
                                                    'rgba(255,255,255,0.06)',
                                                overflow: 'hidden',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    height: '100%',
                                                    width: `${((val ?? 0) / Math.max(maxStat, 160)) * 100}%`,
                                                    background: color,
                                                    borderRadius: 3,
                                                    transition:
                                                        'width 500ms ease',
                                                }}
                                            />
                                        </div>
                                        <span
                                            style={{
                                                fontSize: '0.55rem',
                                                fontFamily: 'monospace',
                                                color,
                                                width: 26,
                                                textAlign: 'right',
                                                flexShrink: 0,
                                            }}
                                        >
                                            {val ?? '—'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <span
                                style={{
                                    fontSize: '0.62rem',
                                    color: '#4b5563',
                                    fontStyle: 'italic',
                                }}
                            >
                                Stats not yet rolled — re-add to bag to
                                generate.
                            </span>
                        )}
                    </div>

                    {/* moveset */}
                    <div>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: 5,
                            }}
                        >
                            <div
                                style={{
                                    fontSize: '0.5rem',
                                    color: '#6b7280',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.07em',
                                }}
                            >
                                Moves
                            </div>
                            {hasPending && (
                                <div
                                    style={{
                                        position: 'relative',
                                        marginRight: 6,
                                    }}
                                >
                                    <button
                                        onClick={() =>
                                            setPendingOpen((v) => !v)
                                        }
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 3,
                                            fontSize: '0.48rem',
                                            fontWeight: 700,
                                            letterSpacing: '0.04em',
                                            padding: '2px 10px',
                                            borderRadius: 5,
                                            background: pendingOpen
                                                ? 'rgba(249,115,22,0.15)'
                                                : 'rgba(249,115,22,0.08)',
                                            border: '1px solid rgba(249,115,22,0.4)',
                                            color: '#fdba74',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        learn
                                    </button>
                                    <span
                                        style={{
                                            position: 'absolute',
                                            top: -3,
                                            right: -3,
                                            width: 8,
                                            height: 8,
                                            borderRadius: '50%',
                                            background: '#f97316',
                                            pointerEvents: 'none',
                                            boxShadow:
                                                '0 0 5px rgba(249,115,22,0.8)',
                                            animation:
                                                'pendingPulse 1.5s ease-in-out infinite',
                                        }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Always show 4 slots */}
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 4,
                            }}
                        >
                            {Array.from({ length: 4 }).map((_, i) => {
                                const mv = uc.moves?.[i]
                                if (mv) {
                                    const typeColor =
                                        TYPE_COLOR[mv.type] ?? '#94a3b8'
                                    return (
                                        <div
                                            key={i}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                padding: '5px 8px',
                                                borderRadius: 7,
                                                background:
                                                    'rgba(255,255,255,0.04)',
                                                border: '1px solid rgba(255,255,255,0.07)',
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: '0.5rem',
                                                    background:
                                                        typeColor + '33',
                                                    color: typeColor,
                                                    border: `1px solid ${typeColor}44`,
                                                    borderRadius: 4,
                                                    padding: '1px 5px',
                                                    flexShrink: 0,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.04em',
                                                }}
                                            >
                                                {mv.type}
                                            </span>
                                            <span
                                                style={{
                                                    flex: 1,
                                                    fontSize: '0.65rem',
                                                    fontWeight: 600,
                                                    color: '#e2e8f0',
                                                }}
                                            >
                                                {mv.displayName}
                                            </span>
                                            {mv.power && (
                                                <span
                                                    style={{
                                                        fontSize: '0.55rem',
                                                        fontFamily: 'monospace',
                                                        color: '#f87171',
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    {mv.power}
                                                </span>
                                            )}
                                            <span
                                                style={{
                                                    fontSize: '0.48rem',
                                                    color: '#6b7280',
                                                    flexShrink: 0,
                                                }}
                                            >
                                                PP {mv.pp}
                                            </span>
                                        </div>
                                    )
                                }
                                return (
                                    <div
                                        key={i}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            padding: '5px 8px',
                                            borderRadius: 7,
                                            background:
                                                'rgba(255,255,255,0.02)',
                                            border: '1px solid rgba(255,255,255,0.04)',
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontSize: '0.58rem',
                                                color: '#374151',
                                                fontStyle: 'italic',
                                            }}
                                        >
                                            — empty slot —
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* sell button at bottom */}
                    <SellButton
                        uc={uc}
                        sellAmount={uc.worth}
                        onSell={handleSellWithAnimation}
                    />
                </div>
            )}
        </div>
    )

    const evolutionCutscene =
        showEvolutionCutscene && evolutionCards.length > 0 ? (
            <EvolutionCutscene
                userCardId={uc.id}
                pokemonName={baseName(uc.cards.name)}
                cards={evolutionCards}
                onComplete={() => {
                    setShowEvolutionCutscene(false)
                    window.location.reload()
                }}
                onCancel={() => setShowEvolutionCutscene(false)}
            />
        ) : null

    const worthTooltip =
        worthTooltipPos && typeof document !== 'undefined'
            ? createPortal(
                  <div
                      style={{
                          position: 'fixed',
                          top: worthTooltipPos.y,
                          left: worthTooltipPos.x,
                          width: 220,
                          background: 'rgba(15,15,20,0.97)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 8,
                          padding: '10px 12px',
                          zIndex: 99999,
                          pointerEvents: 'none',
                          fontSize: '0.62rem',
                          lineHeight: 1.6,
                          color: '#d1d5db',
                      }}
                  >
                      <div
                          style={{
                              fontWeight: 700,
                              color: '#f9fafb',
                              marginBottom: 6,
                              fontSize: '0.65rem',
                          }}
                      >
                          Card worth
                      </div>
                      <div
                          style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 4,
                          }}
                      >
                          <div>
                              <span style={{ color: '#9ca3af' }}>
                                  Market price:
                              </span>
                              <span style={{ color: '#fbbf24', marginLeft: 4 }}>
                                  ${fmt(Number(uc.cards.market_price_usd))}
                              </span>
                          </div>
                          {isGraded && (
                              <div>
                                  <span style={{ color: '#9ca3af' }}>
                                      Condition mult:
                                  </span>
                                  <span
                                      style={{
                                          color: '#60a5fa',
                                          marginLeft: 4,
                                      }}
                                  >
                                      {condMult.toFixed(2)}×
                                  </span>
                              </div>
                          )}
                          <div
                              style={{
                                  borderTop: '1px solid rgba(255,255,255,0.08)',
                                  marginTop: 2,
                                  paddingTop: 4,
                              }}
                          >
                              <span style={{ color: '#9ca3af' }}>Worth:</span>
                              <span
                                  style={{
                                      color: '#4ade80',
                                      marginLeft: 4,
                                      fontWeight: 700,
                                  }}
                              >
                                  ${fmt(cardWorth)}
                              </span>
                          </div>
                      </div>
                  </div>,
                  document.body,
              )
            : null

    const learnOverlay =
        pendingOpen && typeof document !== 'undefined'
            ? createPortal(
                  <div
                      style={{
                          position: 'fixed',
                          inset: 0,
                          zIndex: 99998,
                          background: 'rgba(0,0,0,0.75)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 16,
                      }}
                      onClick={(e) => {
                          if (e.target === e.currentTarget)
                              setPendingOpen(false)
                      }}
                  >
                      <div
                          style={{
                              background: 'rgba(12,12,18,0.98)',
                              border: '1px solid rgba(239,68,68,0.3)',
                              borderRadius: 12,
                              padding: '18px 20px',
                              width: '100%',
                              maxWidth: 420,
                              maxHeight: '80vh',
                              overflowY: 'auto',
                          }}
                      >
                          <div
                              style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  marginBottom: 14,
                              }}
                          >
                              <div>
                                  <div
                                      style={{
                                          fontSize: '0.65rem',
                                          fontWeight: 700,
                                          color: '#f9fafb',
                                          marginBottom: 2,
                                      }}
                                  >
                                      New moves available
                                  </div>
                                  <div
                                      style={{
                                          fontSize: '0.52rem',
                                          color: '#6b7280',
                                      }}
                                  >
                                      {uc.cards.name} can learn{' '}
                                      {(uc.pending_moves ?? []).length} new move
                                      {(uc.pending_moves ?? []).length !== 1
                                          ? 's'
                                          : ''}
                                  </div>
                              </div>
                              <button
                                  onClick={() => setPendingOpen(false)}
                                  style={{
                                      background: 'none',
                                      border: 'none',
                                      color: '#6b7280',
                                      fontSize: '1rem',
                                      cursor: 'pointer',
                                      padding: 4,
                                  }}
                              >
                                  ✕
                              </button>
                          </div>
                          <div
                              style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 10,
                              }}
                          >
                              {(uc.pending_moves ?? []).map((mv, moveIdx) => {
                                  const typeColor =
                                      TYPE_COLOR[mv.type] ?? '#94a3b8'
                                  return (
                                      <div
                                          key={moveIdx}
                                          style={{
                                              padding: '10px 12px',
                                              borderRadius: 9,
                                              border: '1px solid rgba(239,68,68,0.25)',
                                              background:
                                                  'rgba(239,68,68,0.04)',
                                          }}
                                      >
                                          <div
                                              style={{
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  gap: 8,
                                                  marginBottom: 4,
                                              }}
                                          >
                                              <span
                                                  style={{
                                                      fontSize: '0.5rem',
                                                      background:
                                                          typeColor + '33',
                                                      color: typeColor,
                                                      border: `1px solid ${typeColor}44`,
                                                      borderRadius: 4,
                                                      padding: '1px 5px',
                                                      textTransform:
                                                          'uppercase',
                                                      flexShrink: 0,
                                                  }}
                                              >
                                                  {mv.type}
                                              </span>
                                              <span
                                                  style={{
                                                      flex: 1,
                                                      fontSize: '0.72rem',
                                                      fontWeight: 700,
                                                      color: '#fca5a5',
                                                  }}
                                              >
                                                  {mv.displayName}
                                              </span>
                                              {mv.power && (
                                                  <span
                                                      style={{
                                                          fontSize: '0.6rem',
                                                          fontFamily:
                                                              'monospace',
                                                          color: '#f87171',
                                                          flexShrink: 0,
                                                      }}
                                                  >
                                                      {mv.power}
                                                  </span>
                                              )}
                                              <span
                                                  style={{
                                                      fontSize: '0.52rem',
                                                      fontWeight: 700,
                                                      color: isMoveSlotFree
                                                          ? '#4ade80'
                                                          : '#f59e0b',
                                                      background: isMoveSlotFree
                                                          ? 'rgba(74,222,128,0.08)'
                                                          : 'rgba(245,158,11,0.08)',
                                                      border: `1px solid ${isMoveSlotFree ? 'rgba(74,222,128,0.3)' : 'rgba(245,158,11,0.3)'}`,
                                                      borderRadius: 4,
                                                      padding: '1px 5px',
                                                      flexShrink: 0,
                                                  }}
                                              >
                                                  {isMoveSlotFree
                                                      ? 'Free'
                                                      : '100 coins'}
                                              </span>
                                          </div>
                                          {mv.effect && (
                                              <p
                                                  style={{
                                                      fontSize: '0.52rem',
                                                      color: '#9ca3af',
                                                      margin: '0 0 8px',
                                                      lineHeight: 1.4,
                                                  }}
                                              >
                                                  {mv.effect}
                                              </p>
                                          )}
                                          {learnSlot?.moveIdx === moveIdx ? (
                                              <div>
                                                  <div
                                                      style={{
                                                          fontSize: '0.5rem',
                                                          color: '#9ca3af',
                                                          marginBottom: 5,
                                                      }}
                                                  >
                                                      Replace which move?{' '}
                                                      <span
                                                          style={{
                                                              color: '#f59e0b',
                                                          }}
                                                      >
                                                          (costs 100 coins)
                                                      </span>
                                                  </div>
                                                  <div
                                                      style={{
                                                          display: 'flex',
                                                          gap: 4,
                                                          flexWrap: 'wrap',
                                                      }}
                                                  >
                                                      {(uc.moves ?? []).map(
                                                          (
                                                              existing,
                                                              slotIdx,
                                                          ) => (
                                                              <button
                                                                  key={slotIdx}
                                                                  disabled={
                                                                      learnLoading
                                                                  }
                                                                  onClick={() =>
                                                                      handleLearnMove(
                                                                          moveIdx,
                                                                          slotIdx,
                                                                      )
                                                                  }
                                                                  style={{
                                                                      fontSize:
                                                                          '0.52rem',
                                                                      padding:
                                                                          '3px 8px',
                                                                      borderRadius: 5,
                                                                      border: '1px solid rgba(239,68,68,0.4)',
                                                                      background:
                                                                          'rgba(239,68,68,0.1)',
                                                                      color: '#fca5a5',
                                                                      cursor: 'pointer',
                                                                  }}
                                                              >
                                                                  {
                                                                      existing.displayName
                                                                  }
                                                              </button>
                                                          ),
                                                      )}
                                                      <button
                                                          onClick={() =>
                                                              setLearnSlot(null)
                                                          }
                                                          style={{
                                                              fontSize:
                                                                  '0.52rem',
                                                              padding:
                                                                  '3px 8px',
                                                              borderRadius: 5,
                                                              border: '1px solid rgba(255,255,255,0.1)',
                                                              background:
                                                                  'transparent',
                                                              color: '#6b7280',
                                                              cursor: 'pointer',
                                                          }}
                                                      >
                                                          Cancel
                                                      </button>
                                                  </div>
                                              </div>
                                          ) : (
                                              <div
                                                  style={{
                                                      display: 'flex',
                                                      gap: 6,
                                                  }}
                                              >
                                                  <button
                                                      disabled={learnLoading}
                                                      onClick={() =>
                                                          isMoveSlotFree
                                                              ? handleLearnMove(
                                                                    moveIdx,
                                                                    moveSlotsUsed,
                                                                )
                                                              : setLearnSlot({
                                                                    moveIdx,
                                                                })
                                                      }
                                                      style={{
                                                          fontSize: '0.55rem',
                                                          padding: '4px 14px',
                                                          borderRadius: 6,
                                                          border: '1px solid rgba(239,68,68,0.4)',
                                                          background:
                                                              'rgba(239,68,68,0.1)',
                                                          color: '#fca5a5',
                                                          cursor: 'pointer',
                                                          fontWeight: 600,
                                                      }}
                                                  >
                                                      {learnLoading
                                                          ? '...'
                                                          : 'Learn Move'}
                                                  </button>
                                                  <button
                                                      onClick={() =>
                                                          setPendingOpen(false)
                                                      }
                                                      style={{
                                                          fontSize: '0.52rem',
                                                          padding: '4px 8px',
                                                          borderRadius: 6,
                                                          border: '1px solid rgba(255,255,255,0.08)',
                                                          background:
                                                              'transparent',
                                                          color: '#4b5563',
                                                          cursor: 'pointer',
                                                      }}
                                                  >
                                                      Skip
                                                  </button>
                                              </div>
                                          )}
                                      </div>
                                  )
                              })}
                          </div>
                      </div>
                  </div>,
                  document.body,
              )
            : null

    if (mode === 'overlay') {
        return (
            <div style={{ width: '100%' }}>
                {worthTooltip}
                {learnOverlay}
                {evolutionCutscene}
                {/* toolbar: ○/◎ toggle + ✕ close in one row */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        gap: 10,
                        marginBottom: 12,
                    }}
                >
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => setCleanView((v) => !v)}
                            onMouseEnter={() => setShowCleanTooltip(true)}
                            onMouseLeave={() => setShowCleanTooltip(false)}
                            className="transition-colors"
                            style={{
                                fontSize: '0.85rem',
                                color: cleanView
                                    ? 'rgba(255,255,255,0.9)'
                                    : 'rgba(255,255,255,0.35)',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 0,
                            }}
                        >
                            {cleanView ? '◎' : '○'}
                        </button>
                        {showCleanTooltip && (
                            <div
                                style={{
                                    position: 'absolute',
                                    bottom: '130%',
                                    right: 0,
                                    background: '#000',
                                    border: '1px solid #333',
                                    borderRadius: 6,
                                    padding: '5px 9px',
                                    fontSize: '0.65rem',
                                    color: 'rgba(255,255,255,0.8)',
                                    whiteSpace: 'nowrap',
                                    pointerEvents: 'none',
                                    zIndex: 100,
                                }}
                            >
                                {cleanView
                                    ? 'Show card details'
                                    : 'Hide UI — card only'}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-600 hover:text-white transition-colors"
                        style={{
                            fontSize: '1rem',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                        }}
                    >
                        ✕
                    </button>
                </div>

                {cleanView ? (
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'center',
                            padding: '8px 0',
                        }}
                    >
                        <Card3DViewer uc={uc} width={260} />
                    </div>
                ) : (
                    <div
                        className="flex w-full"
                        style={{
                            gap: 'clamp(12px, 3vw, 32px)',
                            alignItems: 'flex-start',
                        }}
                    >
                        <div
                            style={{
                                width: 'clamp(200px, 42%, 280px)',
                                flexShrink: 0,
                            }}
                        >
                            {imageBlock}
                        </div>
                        {infoBlock}
                    </div>
                )}
            </div>
        )
    }

    // sidebar mode — compact layout
    return (
        <div className="flex flex-col">
            {worthTooltip}
            {learnOverlay}
            {evolutionCutscene}

            {/* 3D viewer modal — pops over everything when clean view is active */}
            {cleanView &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 99997,
                            background: 'rgba(0,0,0,0.92)',
                            backdropFilter: 'blur(22px)',
                            WebkitBackdropFilter: 'blur(22px)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 12,
                        }}
                        onClick={() => setCleanView(false)}
                    >
                        <div onClick={(e) => e.stopPropagation()}>
                            <Card3DViewer uc={uc} width={300} />
                        </div>
                        <p
                            style={{
                                fontSize: '0.5rem',
                                color: 'rgba(255,255,255,0.22)',
                                letterSpacing: '0.1em',
                                pointerEvents: 'none',
                                marginTop: 4,
                            }}
                        >
                            TAP OUTSIDE TO DISMISS
                        </p>
                    </div>,
                    document.body,
                )}

            {/* close row */}
            <div
                className="flex items-center justify-between px-3 pt-1.5 pb-1"
                style={{ borderBottom: `1px solid ${borderColor}` }}
            >
                <span
                    className="text-white-700 uppercase tracking-widest"
                    style={{ fontSize: '0.5rem' }}
                >
                    card info
                </span>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setCleanView((v) => !v)}
                        title={cleanView ? 'Show details' : 'Clean view'}
                        className="transition-colors"
                        style={{
                            fontSize: '0.72rem',
                            color: cleanView
                                ? 'rgba(255,255,255,0.9)'
                                : 'rgba(255,255,255,0.3)',
                        }}
                    >
                        {cleanView ? '◎' : '○'}
                    </button>
                    <button
                        onClick={onClose}
                        className="text-gray-700 hover:text-white transition-colors"
                        style={{ fontSize: '0.9rem' }}
                    >
                        ✕
                    </button>
                </div>
            </div>

            {/* card image */}
            <div
                style={{
                    padding: '6px 12px 6px',
                    borderBottom: `1px solid ${borderColor}`,
                }}
            >
                <div
                    style={{
                        maxWidth: 190,
                        margin: '0 auto',
                        position: 'relative',
                    }}
                >
                    <button
                        onClick={() => {
                            if (!cleanView) setCleanView(true)
                        }}
                        title="Open clean view"
                        style={{
                            maxWidth: 190,
                            margin: '0 auto',
                            position: 'relative',
                            display: 'block',
                            width: '100%',
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                        }}
                    >
                        <img
                            src={cardImgSrc(uc)}
                            alt={uc.cards.name}
                            className={rainbow ? 'glow-rainbow' : ''}
                            style={{
                                width: '100%',
                                height: 'auto',
                                display: 'block',
                                borderRadius: 8,
                                boxShadow: rainbow
                                    ? undefined
                                    : rarityGlowShadow(rarity, 'sm'),
                                filter: condFilter,
                                transform: centerSkew,
                            }}
                        />
                    </button>
                    {uc.grade != null && (
                        <span
                            style={{
                                position: 'absolute',
                                bottom: 6,
                                right: 6,
                                fontSize: '0.52rem',
                                fontWeight: 800,
                                fontFamily: 'monospace',
                                background: '#bf1e2e',
                                color: '#fff',
                                borderRadius: 3,
                                padding: '1px 5px',
                                lineHeight: 1,
                            }}
                        >
                            PSA {uc.grade}
                        </span>
                    )}
                </div>
                {/* name + meta below image */}
                <div style={{ marginTop: 8 }}>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            flexWrap: 'wrap',
                            marginBottom: 3,
                        }}
                    >
                        {uc.is_hot && (
                            <span
                                style={{
                                    fontSize: '0.58rem',
                                    color: '#fb923c',
                                    lineHeight: 1,
                                }}
                            >
                                🔥
                            </span>
                        )}

                        <h3
                            className="text-white font-bold"
                            style={{
                                fontSize: '0.82rem',
                                lineHeight: 1.2,
                                margin: 0,
                            }}
                        >
                            {baseName(uc.cards.name)}
                        </h3>

                        <span
                            className={`font-bold uppercase tracking-widest ${rarityClassName(rarity)}`}
                            style={{
                                fontSize: '0.48rem',
                                ...rarityTextStyle(rarity),
                            }}
                        >
                            {rarity}
                        </span>
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'baseline',
                            justifyContent: 'space-between',
                        }}
                    >
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                            <span
                                style={{
                                    fontSize: '0.55rem',
                                    color: '#facc15',
                                    fontFamily: 'monospace',
                                    fontWeight: 700,
                                }}
                                title={`Battle Rating: ${thisBP.toLocaleString()}`}
                            >
                                {formatBR(thisBP)} BR
                            </span>
                            <span
                                style={{
                                    fontSize: '0.55rem',
                                    color: '#eab308',
                                    fontFamily: 'monospace',
                                }}
                            >
                                raw: $
                                {Number(uc.cards.market_price_usd ?? 0).toFixed(
                                    2,
                                )}
                            </span>
                            <span
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 3,
                                    fontSize: '0.55rem',
                                    color:
                                        worthDelta > 0 ? '#4ade80' : '#de4a4a',
                                    fontFamily: 'monospace',
                                }}
                            >
                                worth: {worthDisplay}
                                <span
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: 12,
                                        height: 12,
                                        borderRadius: '50%',
                                        border: '1px solid #4b5563',
                                        color: '#9ca3af',
                                        fontSize: '0.45rem',
                                        fontWeight: 700,
                                        cursor: 'default',
                                        flexShrink: 0,
                                        fontFamily: 'sans-serif',
                                    }}
                                    onMouseEnter={(e) => {
                                        const r = (
                                            e.currentTarget as HTMLElement
                                        ).getBoundingClientRect()
                                        setWorthTooltipPos({
                                            x: r.left,
                                            y: r.bottom + 6,
                                        })
                                    }}
                                    onMouseLeave={() =>
                                        setWorthTooltipPos(null)
                                    }
                                >
                                    ?
                                </span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {!cleanView && (
                <>
                    {/* tab switcher */}
                    <div
                        style={{
                            display: 'flex',
                            gap: 3,
                            margin: '6px 10px',
                            background: 'rgba(255,255,255,0.04)',
                            borderRadius: 7,
                            padding: 3,
                        }}
                    >
                        {(['overview', 'condition', 'pokemon'] as const).map(
                            (tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setDetailTab(tab)}
                                    style={{
                                        flex: 1,
                                        padding: '3px 0',
                                        borderRadius: 5,
                                        fontSize: '0.55rem',
                                        fontWeight: 700,
                                        letterSpacing: '0.06em',
                                        textTransform: 'uppercase',
                                        border: 'none',
                                        cursor: 'pointer',
                                        position: 'relative',
                                        background:
                                            detailTab === tab
                                                ? 'rgba(255,255,255,0.1)'
                                                : 'transparent',
                                        color:
                                            detailTab === tab
                                                ? '#e2e8f0'
                                                : '#6b7280',
                                        transition: 'all 150ms',
                                    }}
                                >
                                    {tab === 'pokemon' ? 'stats' : tab}
                                    {tab === 'pokemon' && hasPending && (
                                        <span
                                            style={{
                                                position: 'absolute',
                                                top: 2,
                                                right: 6,
                                                width: 6,
                                                height: 6,
                                                borderRadius: '50%',
                                                background: '#f97316',
                                                boxShadow:
                                                    '0 0 5px rgba(249,115,22,0.8)',
                                                animation:
                                                    'pendingPulse 1.5s ease-in-out infinite',
                                            }}
                                        />
                                    )}
                                </button>
                            ),
                        )}
                    </div>

                    <div style={{ padding: '0 10px' }}>
                        {detailTab === 'overview' && (
                            <>
                                {/* stat rows — exclude market/level since shown in header */}
                                <div
                                    style={{
                                        borderTop: `1px solid ${borderColor}`,
                                    }}
                                >
                                    {stats
                                        .filter(
                                            (s) =>
                                                !['MARKET', 'LEVEL'].includes(
                                                    s.label,
                                                ),
                                        )
                                        .map(
                                            ({
                                                label,
                                                value,
                                                color,
                                                isLevel,
                                            }) => (
                                                <div
                                                    key={label}
                                                    className="flex justify-between items-center"
                                                    style={{
                                                        borderBottom: `1px solid ${borderColor}`,
                                                        padding: '3px 0',
                                                    }}
                                                >
                                                    <span
                                                        className="font-semibold uppercase tracking-widest text-gray-600"
                                                        style={{
                                                            fontSize: '0.48rem',
                                                        }}
                                                    >
                                                        {label}
                                                    </span>
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            alignItems:
                                                                'center',
                                                            gap: 4,
                                                        }}
                                                    >
                                                        {isLevel &&
                                                            evolutionCards.length >
                                                                0 && (
                                                                <div
                                                                    style={{
                                                                        position:
                                                                            'relative',
                                                                    }}
                                                                >
                                                                    <button
                                                                        onMouseEnter={() =>
                                                                            setShowEvolutionTooltip(
                                                                                true,
                                                                            )
                                                                        }
                                                                        onMouseLeave={() =>
                                                                            setShowEvolutionTooltip(
                                                                                false,
                                                                            )
                                                                        }
                                                                        onClick={() =>
                                                                            setShowEvolutionCutscene(
                                                                                true,
                                                                            )
                                                                        }
                                                                        style={{
                                                                            display:
                                                                                'flex',
                                                                            alignItems:
                                                                                'center',
                                                                            justifyContent:
                                                                                'center',
                                                                            width: 14,
                                                                            height: 14,
                                                                            background:
                                                                                'transparent',
                                                                            border: 'none',
                                                                            cursor: 'pointer',
                                                                            padding: 0,
                                                                            animation:
                                                                                'evolutionPulse 2s ease-in-out infinite',
                                                                        }}
                                                                    >
                                                                        <svg
                                                                            width="12"
                                                                            height="12"
                                                                            viewBox="0 0 16 16"
                                                                            fill="none"
                                                                        >
                                                                            <circle
                                                                                cx="8"
                                                                                cy="8"
                                                                                r="7"
                                                                                stroke="#34d399"
                                                                                strokeWidth="1.5"
                                                                                style={{
                                                                                    filter: 'drop-shadow(0 0 3px #34d39988)',
                                                                                }}
                                                                            />
                                                                            <path
                                                                                d="M8 11V5M5.5 7.5L8 5l2.5 2.5"
                                                                                stroke="#34d399"
                                                                                strokeWidth="1.5"
                                                                                strokeLinecap="round"
                                                                                strokeLinejoin="round"
                                                                            />
                                                                        </svg>
                                                                    </button>
                                                                    {showEvolutionTooltip && (
                                                                        <div
                                                                            style={{
                                                                                position:
                                                                                    'absolute',
                                                                                bottom: '130%',
                                                                                right: 0,
                                                                                background:
                                                                                    '#111',
                                                                                border: '1px solid #333',
                                                                                borderRadius: 6,
                                                                                padding:
                                                                                    '3px 7px',
                                                                                fontSize:
                                                                                    '0.55rem',
                                                                                color: '#94a3b8',
                                                                                whiteSpace:
                                                                                    'nowrap',
                                                                                pointerEvents:
                                                                                    'none',
                                                                                zIndex: 50,
                                                                            }}
                                                                        >
                                                                            whats
                                                                            this..?
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        <span
                                                            className="font-mono font-bold"
                                                            style={{
                                                                fontSize:
                                                                    '0.65rem',
                                                                color,
                                                            }}
                                                        >
                                                            {value}
                                                        </span>
                                                    </div>
                                                </div>
                                            ),
                                        )}
                                    {/* xp bar */}
                                    <div style={{ padding: '4px 0' }}>
                                        <div className="flex justify-between mb-0.5">
                                            <span
                                                className="font-semibold uppercase tracking-widest text-gray-600"
                                                style={{ fontSize: '0.48rem' }}
                                            >
                                                xp
                                            </span>
                                            <span
                                                className="font-mono"
                                                style={{
                                                    fontSize: '0.55rem',
                                                    color: '#4ade80',
                                                }}
                                            >
                                                {uc.card_xp} / {xpNeeded}
                                            </span>
                                        </div>
                                        <div
                                            className="w-full rounded-full overflow-hidden"
                                            style={{
                                                height: 3,
                                                background:
                                                    'rgba(255,255,255,0.05)',
                                            }}
                                        >
                                            <div
                                                className="h-full rounded-full"
                                                style={{
                                                    width: `${xpPct}%`,
                                                    background: barBg,
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* grade */}
                                <GradeSection uc={uc} onGraded={onGraded} />

                                <SellButton
                                    uc={uc}
                                    sellAmount={computedSellAmount}
                                    onSell={handleSellWithAnimation}
                                />

                                {/* favorite + showcase inline */}
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        marginTop: 10,
                                    }}
                                >
                                    <button
                                        onClick={onToggleFavorite}
                                        title={uc.is_favorited ? 'Remove from favorites' : 'Add to favorites'}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: 30,
                                            height: 30,
                                            borderRadius: 8,
                                            flexShrink: 0,
                                            cursor: 'pointer',
                                            fontSize: '1rem',
                                            background: uc.is_favorited
                                                ? 'rgba(250,204,21,0.08)'
                                                : 'rgba(255,255,255,0.04)',
                                            border: uc.is_favorited
                                                ? '1px solid rgba(250,204,21,0.3)'
                                                : '1px solid rgba(255,255,255,0.08)',
                                            color: uc.is_favorited ? '#facc15' : '#4b5563',
                                            filter: uc.is_favorited
                                                ? 'drop-shadow(0 0 5px rgba(250,204,21,0.7))'
                                                : 'none',
                                            transition: 'all 150ms',
                                        }}
                                    >
                                        {uc.is_favorited ? '★' : '☆'}
                                    </button>
                                    <div style={{ flex: 1 }}>
                                        <ShowcaseButton uc={uc} />
                                    </div>
                                </div>
                            </>
                        )}

                        {detailTab === 'condition' && (
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 14,
                                    padding: '4px 0',
                                }}
                            >
                                {overallCond != null && (
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '10px 14px',
                                            borderRadius: 8,
                                            background: `${gradeColor(overallCond)}12`,
                                            border: `1px solid ${gradeColor(overallCond)}33`,
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontSize: '0.52rem',
                                                fontWeight: 700,
                                                color: '#6b7280',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.08em',
                                            }}
                                        >
                                            Overall
                                        </span>
                                        <span
                                            style={{
                                                fontSize: '1.6rem',
                                                fontWeight: 800,
                                                fontFamily: 'monospace',
                                                color: gradeColor(overallCond),
                                                textShadow: `0 0 14px ${gradeColor(overallCond)}66`,
                                            }}
                                        >
                                            {overallCond.toFixed(1)}
                                            <span
                                                style={{
                                                    fontSize: '0.6rem',
                                                    color: '#6b7280',
                                                    marginLeft: 3,
                                                }}
                                            >
                                                /10
                                            </span>
                                        </span>
                                    </div>
                                )}
                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 12,
                                    }}
                                >
                                    {[
                                        {
                                            label: 'Centering',
                                            value: uc.attr_centering,
                                        },
                                        {
                                            label: 'Corners',
                                            value: uc.attr_corners,
                                        },
                                        {
                                            label: 'Edges',
                                            value: uc.attr_edges,
                                        },
                                        {
                                            label: 'Surface',
                                            value: uc.attr_surface,
                                        },
                                    ].map(({ label, value }) => {
                                        const v = value ?? 7
                                        const color =
                                            v >= 8.5
                                                ? '#4ade80'
                                                : v >= 6.5
                                                  ? '#fbbf24'
                                                  : '#f87171'
                                        return (
                                            <div key={label}>
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        justifyContent:
                                                            'space-between',
                                                        marginBottom: 6,
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            fontSize: '0.54rem',
                                                            color: '#6b7280',
                                                            textTransform:
                                                                'uppercase',
                                                            letterSpacing:
                                                                '0.06em',
                                                        }}
                                                    >
                                                        {label}
                                                    </span>
                                                    <span
                                                        style={{
                                                            fontSize: '0.65rem',
                                                            fontWeight: 700,
                                                            fontFamily:
                                                                'monospace',
                                                            color,
                                                        }}
                                                    >
                                                        {v.toFixed(1)}
                                                    </span>
                                                </div>
                                                <div
                                                    style={{
                                                        height: 7,
                                                        borderRadius: 4,
                                                        background:
                                                            'rgba(255,255,255,0.05)',
                                                        overflow: 'hidden',
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            height: '100%',
                                                            width: `${(v / 10) * 100}%`,
                                                            background: color,
                                                            borderRadius: 4,
                                                            transition:
                                                                'width 600ms ease',
                                                            boxShadow: `0 0 6px ${color}66`,
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {detailTab === 'pokemon' && (
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 10,
                                }}
                            >
                                {/* nature */}
                                <div>
                                    <div
                                        style={{
                                            fontSize: '0.5rem',
                                            color: '#6b7280',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.07em',
                                            marginBottom: 4,
                                        }}
                                    >
                                        Nature
                                    </div>
                                    {natureObj ? (
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: '0.78rem',
                                                    fontWeight: 800,
                                                    color: natureTierColor,
                                                    textShadow: `0 0 8px ${natureTierColor}55`,
                                                }}
                                            >
                                                {natureObj.name}
                                            </span>
                                            <span
                                                style={{
                                                    fontSize: '0.52rem',
                                                    color: '#6b7280',
                                                    background:
                                                        'rgba(255,255,255,0.05)',
                                                    border: `1px solid ${natureTierColor}33`,
                                                    borderRadius: 4,
                                                    padding: '2px 6px',
                                                }}
                                            >
                                                {natureObj.effect}
                                            </span>
                                        </div>
                                    ) : (
                                        <span
                                            style={{
                                                fontSize: '0.62rem',
                                                color: '#4b5563',
                                                fontStyle: 'italic',
                                            }}
                                        >
                                            No nature
                                        </span>
                                    )}
                                </div>
                                {/* base stats */}
                                <div>
                                    <div
                                        style={{
                                            fontSize: '0.5rem',
                                            color: '#6b7280',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.07em',
                                            marginBottom: 5,
                                        }}
                                    >
                                        Base Stats
                                    </div>

                                    {combatStats.some((s) => s.val != null) ? (
                                        <div
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns:
                                                    'auto auto auto auto',
                                                gap: '4px 10px',
                                                alignItems: 'center',
                                                fontSize: '0.58rem',
                                            }}
                                        >
                                            {combatStats.map(
                                                ({ label, val }) => (
                                                    <React.Fragment key={label}>
                                                        <span
                                                            style={{
                                                                color: '#6b7280',
                                                                textAlign:
                                                                    'right',
                                                                letterSpacing:
                                                                    '0.04em',
                                                            }}
                                                        >
                                                            {label}
                                                        </span>
                                                        <span
                                                            style={{
                                                                fontFamily:
                                                                    'monospace',
                                                                color: '#e5e7eb',
                                                                minWidth: 20,
                                                            }}
                                                        >
                                                            {val ?? '—'}
                                                        </span>
                                                    </React.Fragment>
                                                ),
                                            )}
                                        </div>
                                    ) : (
                                        <span
                                            style={{
                                                fontSize: '0.62rem',
                                                color: '#4b5563',
                                                fontStyle: 'italic',
                                            }}
                                        >
                                            Stats not yet rolled.
                                        </span>
                                    )}
                                </div>
                                {/* moves */}
                                <div>
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            marginBottom: 5,
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: '0.5rem',
                                                color: '#6b7280',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.07em',
                                            }}
                                        >
                                            Moves
                                        </div>
                                        {hasPending && (
                                            <div
                                                style={{
                                                    position: 'relative',
                                                    marginRight: 6,
                                                }}
                                            >
                                                <button
                                                    onClick={() =>
                                                        setPendingOpen(
                                                            (v) => !v,
                                                        )
                                                    }
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 2,
                                                        fontSize: '0.45rem',
                                                        fontWeight: 700,
                                                        letterSpacing: '0.04em',
                                                        padding: '2px 8px',
                                                        borderRadius: 4,
                                                        background: pendingOpen
                                                            ? 'rgba(249,115,22,0.15)'
                                                            : 'rgba(249,115,22,0.08)',
                                                        border: '1px solid rgba(249,115,22,0.4)',
                                                        color: '#fdba74',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    learn
                                                </button>
                                                <span
                                                    style={{
                                                        position: 'absolute',
                                                        top: -3,
                                                        right: -3,
                                                        width: 7,
                                                        height: 7,
                                                        borderRadius: '50%',
                                                        background: '#f97316',
                                                        pointerEvents: 'none',
                                                        boxShadow:
                                                            '0 0 5px rgba(249,115,22,0.8)',
                                                        animation:
                                                            'pendingPulse 1.5s ease-in-out infinite',
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <div
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 1fr',
                                            gap: 4,
                                        }}
                                    >
                                        {Array.from({ length: 4 }).map(
                                            (_, i) => {
                                                const mv = uc.moves?.[i]
                                                if (mv) {
                                                    const typeColor =
                                                        TYPE_COLOR[mv.type] ??
                                                        '#94a3b8'
                                                    return (
                                                        <div
                                                            key={i}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems:
                                                                    'center',
                                                                gap: 6,
                                                                padding:
                                                                    '4px 7px',
                                                                borderRadius: 7,
                                                                background:
                                                                    'rgba(255,255,255,0.04)',
                                                                border: '1px solid rgba(255,255,255,0.07)',
                                                            }}
                                                        >
                                                            <span
                                                                style={{
                                                                    fontSize:
                                                                        '0.45rem',
                                                                    background:
                                                                        typeColor +
                                                                        '33',
                                                                    color: typeColor,
                                                                    border: `1px solid ${typeColor}44`,
                                                                    borderRadius: 4,
                                                                    padding:
                                                                        '1px 4px',
                                                                    flexShrink: 0,
                                                                    textTransform:
                                                                        'uppercase',
                                                                }}
                                                            >
                                                                {mv.type}
                                                            </span>
                                                            <span
                                                                style={{
                                                                    flex: 1,
                                                                    fontSize:
                                                                        '0.4rem',
                                                                    fontWeight: 600,
                                                                    color: '#e2e8f0',
                                                                }}
                                                            >
                                                                {mv.displayName}
                                                            </span>
                                                            {mv.power && (
                                                                <span
                                                                    style={{
                                                                        fontSize:
                                                                            '0.5rem',
                                                                        fontFamily:
                                                                            'monospace',
                                                                        color: '#f87171',
                                                                        flexShrink: 0,
                                                                    }}
                                                                >
                                                                    {mv.power}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )
                                                }
                                                return (
                                                    <div
                                                        key={i}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems:
                                                                'center',
                                                            padding: '4px 7px',
                                                            borderRadius: 7,
                                                            background:
                                                                'rgba(255,255,255,0.02)',
                                                            border: '1px solid rgba(255,255,255,0.04)',
                                                        }}
                                                    >
                                                        <span
                                                            style={{
                                                                fontSize:
                                                                    '0.55rem',
                                                                color: '#374151',
                                                                fontStyle:
                                                                    'italic',
                                                            }}
                                                        >
                                                            — empty slot —
                                                        </span>
                                                    </div>
                                                )
                                            },
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}
