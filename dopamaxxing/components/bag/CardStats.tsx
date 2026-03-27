'use client'

import { useState } from 'react'
import {
    isRainbow,
    rarityGlowRgb,
    rarityGlowShadow,
    rarityTextStyle,
    xpToNextLevel,
    type Rarity,
} from '@/lib/rarityConfig'
import { conditionFilter, centeringSkew } from '@/lib/cardAttributes'
import { NATURE_BY_NAME, NATURE_TIER_COLOR } from '@/lib/pokemon-stats'
import { TYPE_COLOR } from '@/lib/pokemon-moves'
import PsaSlab from '@/components/card/PsaSlab'
import FirstEditionBadge from '@/components/card/FirstEditionBadge'
import WearOverlay from '@/components/card/WearOverlay'
import { rarityClassName, cardImgSrc } from './utils'
import { SellButton } from './SellButton'
import { GradeSection } from './GradeSection'
import type { UserCard } from '@/lib/types'

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
    const [detailTab, setDetailTab] = useState<'overview' | 'pokemon'>('overview')
    const [learnSlot, setLearnSlot] = useState<{ moveIdx: number } | null>(null)
    const [learnLoading, setLearnLoading] = useState(false)

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

    // worth adjusted by PSA grade
    // Grade 6 = break-even; below 6 = negative delta; PSA 1 = ultra-rare collector premium
    const GRADE_MULTIPLIER: Record<number, number> = {
        10: 2.2,
        9: 1.7,
        8: 1.35,
        7: 1.15,
        6: 1.0,
        5: 0.85,
        4: 0.7,
        3: 0.55,
        2: 0.4,
        1: 4.5, // catastrophically rare — worth far more than raw
    }
    const worthMult = uc.grade != null ? (GRADE_MULTIPLIER[uc.grade] ?? 1) : 1
    const adjustedWorth = uc.worth * worthMult
    const worthDelta = adjustedWorth - uc.worth
    const fmtMoney = (n: number) =>
        n.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })
    const worthDisplay =
        uc.grade != null && Math.abs(worthDelta) >= 0.01
            ? `$${fmtMoney(adjustedWorth)} (${worthDelta > 0 ? '+' : '-'}$${fmtMoney(Math.abs(worthDelta))})`
            : `$${fmtMoney(Number(uc.worth))}`

    // colored stat rows
    const stats = [
        {
            label: 'pokédex',
            value: `#${String(uc.cards.national_pokedex_number).padStart(3, '0')}`,
            color: '#9ca3af',
        },
        { label: 'hp', value: uc.cards.hp, color: '#f87171' },
        { label: 'level', value: uc.card_level, color: '#60a5fa' },
        ...(overallCond != null
            ? [
                  {
                      label: 'overall condition',
                      value: overallCond.toFixed(1),
                      color: gradeColor(overallCond),
                  },
              ]
            : []),
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
                wearOverlay={cleanView ? undefined : (
                    <WearOverlay
                        ucId={uc.id}
                        overallCond={overallCond}
                        attrSurface={uc.attr_surface}
                        grade={uc.grade}
                        fading={wearFading}
                    />
                )}
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

    const imageBlock = (
        <div style={{ position: 'relative' }}>
            {cardOnly}
            {!cleanView && isFirstEdition && <FirstEditionBadge variant="detail" />}
        </div>
    )

    // ─── nature & combat stat helpers ─────────────────────────────────────────
    const natureObj = uc.nature ? NATURE_BY_NAME[uc.nature] ?? null : null
    const natureTierColor = natureObj ? NATURE_TIER_COLOR[natureObj.tier] : '#94a3b8'
    const hasPending = (uc.pending_moves?.length ?? 0) > 0

    const combatStats = [
        { key: 'stat_atk',      label: 'ATK',   color: '#f87171', val: uc.stat_atk },
        { key: 'stat_def',      label: 'DEF',   color: '#60a5fa', val: uc.stat_def },
        { key: 'stat_spatk',    label: 'SP.ATK',color: '#c084fc', val: uc.stat_spatk },
        { key: 'stat_spdef',    label: 'SP.DEF',color: '#818cf8', val: uc.stat_spdef },
        { key: 'stat_spd',      label: 'SPD',   color: '#4ade80', val: uc.stat_spd },
        { key: 'stat_accuracy', label: 'ACC',   color: '#fbbf24', val: uc.stat_accuracy },
        { key: 'stat_evasion',  label: 'EVA',   color: '#fb923c', val: uc.stat_evasion },
    ] as const
    const maxStat = Math.max(1, ...combatStats.map(s => s.val ?? 0))

    async function handleLearnMove(moveIdx: number, slotIdx: number) {
        setLearnLoading(true)
        try {
            await fetch('/api/learn-move', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userCardId: uc.id, moveIndex: moveIdx, slotIndex: slotIdx }),
            })
            // reload page to reflect updated moves
            window.location.reload()
        } finally {
            setLearnLoading(false)
            setLearnSlot(null)
        }
    }

    const infoBlock = (
        <div className="flex flex-col flex-1 min-w-0">
            {/* tab switcher */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 3 }}>
                {(['overview', 'pokemon'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setDetailTab(tab)}
                        style={{
                            flex: 1, padding: '4px 0', borderRadius: 6, fontSize: '0.58rem',
                            fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                            border: 'none', cursor: 'pointer', position: 'relative',
                            background: detailTab === tab ? 'rgba(255,255,255,0.1)' : 'transparent',
                            color: detailTab === tab ? '#e2e8f0' : '#6b7280',
                            transition: 'all 150ms',
                        }}
                    >
                        {tab === 'pokemon' ? 'stats' : tab}
                        {tab === 'pokemon' && hasPending && (
                            <span style={{
                                position: 'absolute', top: 2, right: 6,
                                width: 7, height: 7, borderRadius: '50%',
                                background: '#f59e0b', boxShadow: '0 0 5px rgba(245,158,11,0.8)',
                            }} />
                        )}
                    </button>
                ))}
            </div>

            {detailTab === 'overview' ? (<>
            {/* name + rarity */}
            <div className="mb-4">
                <button
                    onClick={onToggleFavorite}
                    className="flex items-center gap-2 mb-2 transition-all hover:scale-105 active:scale-95"
                    style={{ cursor: 'pointer' }}
                >
                    <span
                        style={{
                            fontSize: '1.15rem',
                            color: '#facc15',
                            filter: uc.is_favorited
                                ? 'drop-shadow(0 0 6px rgba(250,204,21,0.9))'
                                : 'none',
                            transition: 'filter 0.15s ease',
                            lineHeight: 1,
                        }}
                    >
                        {uc.is_favorited ? '★' : '☆'}
                    </span>
                    <span
                        style={{
                            fontSize: '0.62rem',
                            letterSpacing: '0.04em',
                            color: uc.is_favorited ? '#facc15' : '#d1d5db',
                            transition: 'color 0.15s ease',
                        }}
                    >
                        {uc.is_favorited ? 'showcased' : 'add to showcase'}
                    </span>
                </button>
                {uc.is_hot && (
                    <span
                        className="block mb-1"
                        style={{ fontSize: '0.6rem', color: '#fb923c' }}
                    >
                        🔥 hot market pull
                    </span>
                )}
                <h3
                    className="text-white font-bold leading-snug mb-1.5"
                    style={{
                        fontSize: mode === 'overlay' ? '1.3rem' : '0.95rem',
                    }}
                >
                    {uc.cards.name}
                </h3>
                <span
                    className={`font-bold uppercase tracking-widest ${rarityClassName(rarity)}`}
                    style={{ fontSize: '0.58rem', ...rarityTextStyle(rarity) }}
                >
                    {rarity}
                </span>
                <div className="flex items-center gap-1.5 mt-2">
                    <span style={{ fontSize: '0.55rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>raw value</span>
                    <span style={{ fontSize: mode === 'overlay' ? '1.05rem' : '0.88rem', fontWeight: 700, fontFamily: 'monospace', color: '#4ade80' }}>
                        {worthDisplay}
                    </span>
                </div>
            </div>

            {/* stat rows */}
            <div style={{ borderTop: `1px solid ${borderColor}` }}>
                {stats.map(({ label, value, color }) => (
                    <div
                        key={label}
                        className="flex justify-between items-center py-2.5"
                        style={{ borderBottom: `1px solid ${borderColor}` }}
                    >
                        <span
                            className="font-semibold uppercase tracking-widest text-gray-600"
                            style={{ fontSize: '0.58rem' }}
                        >
                            {label}
                        </span>
                        <span
                            className="font-mono font-bold"
                            style={{
                                fontSize:
                                    mode === 'overlay' ? '0.95rem' : '0.78rem',
                                color,
                            }}
                        >
                            {value}
                        </span>
                    </div>
                ))}

                {/* xp bar */}
                <div className="py-3">
                    <div className="flex justify-between mb-2">
                        <span
                            className="font-semibold uppercase tracking-widest text-gray-600"
                            style={{ fontSize: '0.58rem' }}
                        >
                            xp
                        </span>
                        <span
                            className="font-mono"
                            style={{ fontSize: '0.58rem', color: '#4ade80' }}
                        >
                            {uc.card_xp} / {xpNeeded}
                        </span>
                    </div>
                    <div
                        className="w-full rounded-full overflow-hidden"
                        style={{
                            height: 4,
                            background: 'rgba(255,255,255,0.05)',
                        }}
                    >
                        <div
                            className="h-full rounded-full"
                            style={{ width: `${xpPct}%`, background: barBg }}
                        />
                    </div>
                </div>

                {/* attributes — hidden in overlay (rendered below image instead) */}
                {mode !== 'overlay' && (
                    <div
                        className="py-3"
                        style={{ borderBottom: `1px solid ${borderColor}` }}
                    >
                        <span
                            className="font-semibold uppercase tracking-widest text-gray-600"
                            style={{ fontSize: '0.55rem' }}
                        >
                            Condition
                        </span>
                        <div className="mt-2 flex flex-col gap-1.5">
                            {[
                                {
                                    label: 'Centering',
                                    value: uc.attr_centering,
                                },
                                { label: 'Corners', value: uc.attr_corners },
                                { label: 'Edges', value: uc.attr_edges },
                                { label: 'Surface', value: uc.attr_surface },
                            ].map(({ label, value }) => (
                                <div
                                    key={label}
                                    className="flex items-center gap-2"
                                >
                                    <span
                                        style={{
                                            fontSize: '0.5rem',
                                            color: '#6b7280',
                                            width: 46,
                                            flexShrink: 0,
                                        }}
                                    >
                                        {label}
                                    </span>
                                    <div
                                        className="flex-1 rounded-full overflow-hidden"
                                        style={{
                                            height: 3,
                                            background:
                                                'rgba(255,255,255,0.05)',
                                        }}
                                    >
                                        <div
                                            className="h-full rounded-full"
                                            style={{
                                                width: `${((value ?? 7) / 10) * 100}%`,
                                                background:
                                                    (value ?? 7) >= 8.5
                                                        ? '#4ade80'
                                                        : (value ?? 7) >= 6.5
                                                          ? '#fbbf24'
                                                          : '#f87171',
                                                transition: 'width 600ms ease',
                                            }}
                                        />
                                    </div>
                                    <span
                                        style={{
                                            fontSize: '0.58rem',
                                            fontWeight: 600,
                                            color: '#9ca3af',
                                            width: 24,
                                            textAlign: 'right',
                                        }}
                                    >
                                        {(value ?? 7).toFixed(1)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* grade */}
                <GradeSection uc={uc} onGraded={onGraded} />

                {/* sell button */}
                <SellButton uc={uc} onSell={handleSellWithAnimation} />
            </div>
            </>) : (
            /* ─── Stats tab ────────────────────────────────────────────── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                {/* nature */}
                <div>
                    <div style={{ fontSize: '0.5rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Nature</div>
                    {natureObj ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: natureTierColor, textShadow: `0 0 8px ${natureTierColor}55` }}>
                                {natureObj.name}
                            </span>
                            <span style={{ fontSize: '0.52rem', color: '#6b7280', background: 'rgba(255,255,255,0.05)', border: `1px solid ${natureTierColor}33`, borderRadius: 4, padding: '2px 6px' }}>
                                {natureObj.effect}
                            </span>
                        </div>
                    ) : (
                        <span style={{ fontSize: '0.62rem', color: '#4b5563', fontStyle: 'italic' }}>No nature</span>
                    )}
                </div>

                {/* base stats */}
                <div>
                    <div style={{ fontSize: '0.5rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Base Stats</div>
                    {combatStats.some(s => s.val != null) ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {combatStats.map(({ label, color, val }) => (
                                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontSize: '0.48rem', color: '#6b7280', width: 38, flexShrink: 0, textAlign: 'right', letterSpacing: '0.04em' }}>{label}</span>
                                    <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${((val ?? 0) / Math.max(maxStat, 160)) * 100}%`, background: color, borderRadius: 3, transition: 'width 500ms ease' }} />
                                    </div>
                                    <span style={{ fontSize: '0.55rem', fontFamily: 'monospace', color, width: 26, textAlign: 'right', flexShrink: 0 }}>{val ?? '—'}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <span style={{ fontSize: '0.62rem', color: '#4b5563', fontStyle: 'italic' }}>Stats not yet rolled — re-add to bag to generate.</span>
                    )}
                </div>

                {/* moveset */}
                <div>
                    <div style={{ fontSize: '0.5rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Moves</div>
                    {(uc.moves?.length ?? 0) > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {(uc.moves ?? []).map((mv, i) => {
                                const typeColor = TYPE_COLOR[mv.type] ?? '#94a3b8'
                                return (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 7, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                        <span style={{ fontSize: '0.5rem', background: typeColor + '33', color: typeColor, border: `1px solid ${typeColor}44`, borderRadius: 4, padding: '1px 5px', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{mv.type}</span>
                                        <span style={{ flex: 1, fontSize: '0.65rem', fontWeight: 600, color: '#e2e8f0' }}>{mv.displayName}</span>
                                        {mv.power && <span style={{ fontSize: '0.55rem', fontFamily: 'monospace', color: '#f87171', flexShrink: 0 }}>{mv.power}</span>}
                                        <span style={{ fontSize: '0.48rem', color: '#6b7280', flexShrink: 0 }}>PP {mv.pp}</span>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <span style={{ fontSize: '0.62rem', color: '#4b5563', fontStyle: 'italic' }}>No moves — add to bag to learn moves.</span>
                    )}
                </div>

                {/* pending moves */}
                {hasPending && (
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                            <div style={{ fontSize: '0.5rem', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>New Move Available!</div>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b', flexShrink: 0, display: 'inline-block' }} />
                        </div>
                        {(uc.pending_moves ?? []).map((mv, moveIdx) => {
                            const typeColor = TYPE_COLOR[mv.type] ?? '#94a3b8'
                            return (
                                <div key={moveIdx} style={{ marginBottom: 8, padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.05)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                        <span style={{ fontSize: '0.5rem', background: typeColor + '33', color: typeColor, border: `1px solid ${typeColor}44`, borderRadius: 4, padding: '1px 5px', textTransform: 'uppercase' }}>{mv.type}</span>
                                        <span style={{ flex: 1, fontSize: '0.7rem', fontWeight: 700, color: '#fbbf24' }}>{mv.displayName}</span>
                                        {mv.power && <span style={{ fontSize: '0.6rem', fontFamily: 'monospace', color: '#f87171' }}>{mv.power} dmg</span>}
                                    </div>
                                    {mv.effect && <p style={{ fontSize: '0.52rem', color: '#9ca3af', margin: '0 0 8px', lineHeight: 1.4 }}>{mv.effect}</p>}
                                    {learnSlot?.moveIdx === moveIdx ? (
                                        <div>
                                            <div style={{ fontSize: '0.5rem', color: '#9ca3af', marginBottom: 5 }}>Replace which move?</div>
                                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                                {(uc.moves ?? []).map((existing, slotIdx) => (
                                                    <button key={slotIdx} disabled={learnLoading} onClick={() => handleLearnMove(moveIdx, slotIdx)}
                                                        style={{ fontSize: '0.52rem', padding: '3px 8px', borderRadius: 5, border: '1px solid rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.1)', color: '#fbbf24', cursor: 'pointer' }}>
                                                        {existing.displayName}
                                                    </button>
                                                ))}
                                                {(uc.moves?.length ?? 0) < 4 && (
                                                    <button disabled={learnLoading} onClick={() => handleLearnMove(moveIdx, uc.moves?.length ?? 0)}
                                                        style={{ fontSize: '0.52rem', padding: '3px 8px', borderRadius: 5, border: '1px solid rgba(74,222,128,0.4)', background: 'rgba(74,222,128,0.1)', color: '#4ade80', cursor: 'pointer' }}>
                                                        Add (open slot)
                                                    </button>
                                                )}
                                                <button onClick={() => setLearnSlot(null)}
                                                    style={{ fontSize: '0.52rem', padding: '3px 8px', borderRadius: 5, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#6b7280', cursor: 'pointer' }}>
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button onClick={() => setLearnSlot({ moveIdx })}
                                            style={{ fontSize: '0.55rem', padding: '4px 12px', borderRadius: 6, border: '1px solid rgba(245,158,11,0.5)', background: 'rgba(245,158,11,0.12)', color: '#f59e0b', cursor: 'pointer', fontWeight: 600 }}>
                                            Learn Move
                                        </button>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* sell button at bottom */}
                <SellButton uc={uc} onSell={handleSellWithAnimation} />
            </div>
            )}
        </div>
    )

    if (mode === 'overlay') {
        const conditionBlock = (
            <div
                className="mt-4 pt-3"
                style={{ borderTop: `1px solid ${borderColor}` }}
            >
                <span
                    className="font-semibold uppercase tracking-widest text-gray-500"
                    style={{ fontSize: '0.65rem' }}
                >
                    Condition
                </span>
                <div className="mt-2 flex flex-col gap-2">
                    {[
                        { label: 'Centering', value: uc.attr_centering },
                        { label: 'Corners', value: uc.attr_corners },
                        { label: 'Edges', value: uc.attr_edges },
                        { label: 'Surface', value: uc.attr_surface },
                    ].map(({ label, value }) => (
                        <div key={label} className="flex items-center gap-2">
                            <span
                                style={{
                                    fontSize: '0.65rem',
                                    color: '#6b7280',
                                    width: 60,
                                    flexShrink: 0,
                                }}
                            >
                                {label}
                            </span>
                            <div
                                className="flex-1 rounded-full overflow-hidden"
                                style={{
                                    height: 5,
                                    background: 'rgba(255,255,255,0.05)',
                                }}
                            >
                                <div
                                    className="h-full rounded-full"
                                    style={{
                                        width: `${((value ?? 7) / 10) * 100}%`,
                                        background:
                                            (value ?? 7) >= 8.5
                                                ? '#4ade80'
                                                : (value ?? 7) >= 6.5
                                                  ? '#fbbf24'
                                                  : '#f87171',
                                        transition: 'width 600ms ease',
                                    }}
                                />
                            </div>
                            <span
                                style={{
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    color: '#9ca3af',
                                    width: 28,
                                    textAlign: 'right',
                                }}
                            >
                                {(value ?? 7).toFixed(1)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        )
        return (
            <div style={{ width: '100%' }}>
                {/* toolbar: ○/◎ toggle + ✕ close in one row */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => setCleanView(v => !v)}
                            onMouseEnter={() => setShowCleanTooltip(true)}
                            onMouseLeave={() => setShowCleanTooltip(false)}
                            className="transition-colors"
                            style={{
                                fontSize: '0.85rem',
                                color: cleanView ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)',
                                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                            }}
                        >
                            {cleanView ? '◎' : '○'}
                        </button>
                        {showCleanTooltip && (
                            <div style={{
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
                            }}>
                                {cleanView ? 'Show card details' : 'Hide UI — card only'}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-600 hover:text-white transition-colors"
                        style={{ fontSize: '1rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                        ✕
                    </button>
                </div>

                {cleanView ? (
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <div style={{ width: 350 }}>
                            {imageBlock}
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-8 w-full">
                        <div style={{ width: 240, flexShrink: 0 }}>
                            {imageBlock}
                            {conditionBlock}
                        </div>
                        {infoBlock}
                    </div>
                )}
            </div>
        )
    }

    // sidebar mode — compact layout so sell button is never cut off
    return (
        <div className="flex flex-col">
            <div
                className="flex items-center justify-between px-4 pt-3 pb-2"
                style={{ borderBottom: `1px solid ${borderColor}` }}
            >
                <span
                    className="text-gray-700 uppercase tracking-widest"
                    style={{ fontSize: '0.55rem' }}
                >
                    card info
                </span>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setCleanView(v => !v)}
                        title={cleanView ? 'Show details' : 'Clean view'}
                        className="transition-colors"
                        style={{
                            fontSize: '0.75rem',
                            color: cleanView ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)',
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
            <div className="px-2 pt-1.5 pb-1">
                {uc.grade != null ? (
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
                                fading={wearFading}
                            />
                        }
                        imgFilter={condFilter}
                        imgTransform={centerSkew}
                    />
                ) : (
                    <img
                        src={cardImgSrc(uc)}
                        alt={uc.cards.name}
                        className={rainbow ? 'glow-rainbow' : ''}
                        style={{
                            width: '100%',
                            display: 'block',
                            borderRadius: 8,
                            objectFit: 'contain',
                            maxHeight: 120,
                            boxShadow: rainbow
                                ? undefined
                                : rarityGlowShadow(rarity, 'sm'),
                        }}
                    />
                )}
            </div>
            <div className="px-2 pb-2 flex flex-col">
                {/* name + tags */}
                <div className="mb-1">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        {uc.is_hot && (
                            <span
                                style={{
                                    fontSize: '0.55rem',
                                    color: '#fb923c',
                                }}
                            >
                                🔥
                            </span>
                        )}
                        <span
                            className={`font-bold uppercase tracking-widest ${rarityClassName(rarity)}`}
                            style={{
                                fontSize: '0.52rem',
                                ...rarityTextStyle(rarity),
                            }}
                        >
                            {rarity}
                        </span>
                    </div>
                    <h3
                        className="text-white font-bold leading-snug"
                        style={{ fontSize: '0.76rem' }}
                    >
                        {uc.cards.name}
                    </h3>
                </div>
                {/* compact stat rows */}
                <div style={{ borderTop: `1px solid ${borderColor}` }}>
                    {stats.map(({ label, value, color }) => (
                        <div
                            key={label}
                            className="flex justify-between items-center"
                            style={{ borderBottom: `1px solid ${borderColor}`, padding: '3px 0' }}
                        >
                            <span
                                className="font-semibold uppercase tracking-widest text-gray-600"
                                style={{ fontSize: '0.5rem' }}
                            >
                                {label}
                            </span>
                            <span
                                className="font-mono font-bold"
                                style={{ fontSize: '0.68rem', color }}
                            >
                                {value}
                            </span>
                        </div>
                    ))}
                    {/* xp bar */}
                    <div style={{ padding: '5px 0' }}>
                        <div className="flex justify-between mb-0.5">
                            <span
                                className="font-semibold uppercase tracking-widest text-gray-600"
                                style={{ fontSize: '0.5rem' }}
                            >
                                xp
                            </span>
                            <span
                                className="font-mono"
                                style={{
                                    fontSize: '0.58rem',
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
                    {/* attributes */}
                    <div
                        style={{ borderBottom: `1px solid ${borderColor}`, padding: '5px 0' }}
                    >
                        <span
                            className="font-semibold uppercase tracking-widest text-gray-600"
                            style={{ fontSize: '0.5rem' }}
                        >
                            Condition
                        </span>
                        <div className="mt-1 flex flex-col gap-0.5">
                            {[
                                {
                                    label: 'Centering',
                                    value: uc.attr_centering,
                                },
                                { label: 'Corners', value: uc.attr_corners },
                                { label: 'Edges', value: uc.attr_edges },
                                { label: 'Surface', value: uc.attr_surface },
                            ].map(({ label, value }) => (
                                <div
                                    key={label}
                                    className="flex items-center gap-2"
                                >
                                    <span
                                        style={{
                                            fontSize: '0.5rem',
                                            color: '#6b7280',
                                            width: 46,
                                            flexShrink: 0,
                                        }}
                                    >
                                        {label}
                                    </span>
                                    <div
                                        className="flex-1 rounded-full overflow-hidden"
                                        style={{
                                            height: 3,
                                            background:
                                                'rgba(255,255,255,0.05)',
                                        }}
                                    >
                                        <div
                                            className="h-full rounded-full"
                                            style={{
                                                width: `${((value ?? 7) / 10) * 100}%`,
                                                background:
                                                    (value ?? 7) >= 8.5
                                                        ? '#4ade80'
                                                        : (value ?? 7) >= 6.5
                                                          ? '#fbbf24'
                                                          : '#f87171',
                                                transition: 'width 600ms ease',
                                            }}
                                        />
                                    </div>
                                    <span
                                        style={{
                                            fontSize: '0.58rem',
                                            fontWeight: 600,
                                            color: '#9ca3af',
                                            width: 24,
                                            textAlign: 'right',
                                        }}
                                    >
                                        {(value ?? 7).toFixed(1)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* grade */}
                    <GradeSection uc={uc} onGraded={onGraded} />

                    <SellButton uc={uc} onSell={handleSellWithAnimation} />
                    <button
                        onClick={onToggleFavorite}
                        className="w-full rounded-lg font-semibold transition-all active:scale-95 hover:scale-[1.02] mt-1"
                        style={{
                            padding: '4px 0',
                            fontSize: '0.58rem',
                            letterSpacing: '0.06em',
                            cursor: 'pointer',
                            background: uc.is_favorited
                                ? 'rgba(250,204,21,0.08)'
                                : 'rgba(255,255,255,0.04)',
                            border: uc.is_favorited
                                ? '1px solid rgba(250,204,21,0.35)'
                                : '1px solid rgba(255,255,255,0.08)',
                            color: uc.is_favorited ? '#facc15' : '#9ca3af',
                        }}
                    >
                        {uc.is_favorited
                            ? '★ remove from showcase'
                            : '☆ add to showcase'}
                    </button>
                </div>
            </div>
        </div>
    )
}
