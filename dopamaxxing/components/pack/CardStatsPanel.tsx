'use client'
import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import {
    BUYBACK_RANGE,
    conditionMultiplierRange,
    tierBuybackRateRange,
    weightedCondition,
} from '@/lib/rarityConfig'
import { NATURE_BY_NAME, NATURE_TIER_COLOR, RARITY_MULTIPLIER } from '@/lib/pokemon-stats'
import type { Card } from './utils'

type Props = {
    currentCard: Card
    isMobile: boolean
    condPanelTab: 'condition' | 'stats'
    setCondPanelTab: (tab: 'condition' | 'stats') => void
    bbTooltipPos: { x: number; y: number } | null
    setBbTooltipPos: (pos: { x: number; y: number } | null) => void
    // action button props
    bagCount: number | null
    bagCapacity: number
    currentCardIsNew: boolean
    animatingIndex: number | null
    shattering: boolean
    isFetchingCopies: boolean
    handleAddToBag: () => void
    handleAddToBagDuplicate: () => void
    handleFeedCard: () => void
    handleBuyback: () => void
}

export function CardStatsPanel({
    currentCard,
    isMobile,
    condPanelTab,
    setCondPanelTab,
    bbTooltipPos,
    setBbTooltipPos,
    bagCount,
    bagCapacity,
    currentCardIsNew,
    animatingIndex,
    shattering,
    isFetchingCopies,
    handleAddToBag,
    handleAddToBagDuplicate,
    handleFeedCard,
    handleBuyback,
}: Props) {
    const [hoveredBtn, setHoveredBtn] = useState<string | null>(null)
    const [statsTooltipPos, setStatsTooltipPos] = useState<{ x: number; y: number } | null>(null)

    const attrs = [
        { label: 'Centering', value: currentCard.attr_centering },
        { label: 'Corners',   value: currentCard.attr_corners },
        { label: 'Edges',     value: currentCard.attr_edges },
        { label: 'Surface',   value: currentCard.attr_surface },
    ].filter((a): a is { label: string; value: number } => a.value != null)

    const overall = attrs.length
        ? Math.round((attrs.reduce((s, a) => s + a.value, 0) / attrs.length) * 10) / 10
        : null

    function attrColor(v: number) {
        return v >= 8.5 ? '#4ade80' : v >= 6.5 ? '#fbbf24' : '#f87171'
    }
    const hasAttrs = attrs.length > 0

    const buybackAttrs =
        currentCard.attr_centering != null &&
        currentCard.attr_corners != null &&
        currentCard.attr_edges != null &&
        currentCard.attr_surface != null
            ? {
                  attr_centering: currentCard.attr_centering!,
                  attr_corners: currentCard.attr_corners!,
                  attr_edges: currentCard.attr_edges!,
                  attr_surface: currentCard.attr_surface!,
              }
            : null
    const bbCond = buybackAttrs ? weightedCondition(buybackAttrs) : null
    const [bbCondLo, bbCondHi] = bbCond != null
        ? conditionMultiplierRange(currentCard.rarity, bbCond)
        : [1.2, 1.6]
    const [bbRateLo, bbRateHi] = tierBuybackRateRange(currentCard.rarity)
    const [bbBaseLo, bbBaseHi] = BUYBACK_RANGE[currentCard.rarity] ?? [0.1, 0.4]
    const bbEstLo = parseFloat((bbBaseLo * bbCondLo * bbRateLo).toFixed(2))
    const bbEstHi = parseFloat((bbBaseHi * bbCondHi * bbRateHi).toFixed(2))

    const bagLeft = bagCount !== null ? bagCapacity - bagCount : null
    const bagFull = bagCount !== null && bagCount >= bagCapacity
    const actDisabled = animatingIndex !== null || shattering

    const iconBtnStyle = (color: string): React.CSSProperties => ({
        width: 34, height: 34, borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: actDisabled ? 'not-allowed' : 'pointer',
        border: `1px solid ${color}55`,
        background: `${color}12`,
        color: color,
        opacity: actDisabled ? 0.3 : 1,
        transition: 'all 120ms',
        flexShrink: 0,
        position: 'relative' as const,
    })

    return (
        <>
            {/* Buyback tooltip portal */}
            {bbTooltipPos && createPortal(
                <div style={{
                    position: 'fixed', top: bbTooltipPos.y, left: bbTooltipPos.x,
                    width: 220, background: 'rgba(15,15,20,0.97)',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
                    padding: '10px 12px', zIndex: 99999, pointerEvents: 'none',
                    fontSize: '0.62rem', lineHeight: 1.6, color: '#d1d5db',
                }}>
                    <div style={{ fontWeight: 700, color: '#f9fafb', marginBottom: 6, fontSize: '0.65rem' }}>
                        How buyback is calculated
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div>
                            <span style={{ color: '#9ca3af' }}>① Base ({currentCard.rarity}):</span>
                            <span style={{ color: '#fbbf24', marginLeft: 4 }}>${bbBaseLo.toFixed(2)} – ${bbBaseHi.toFixed(2)}</span>
                        </div>
                        <div>
                            <span style={{ color: '#9ca3af' }}>② Condition{bbCond != null ? ` (${bbCond.toFixed(1)})` : ''}:</span>
                            <span style={{ color: '#60a5fa', marginLeft: 4 }}>{bbCondLo.toFixed(2)}x – {bbCondHi.toFixed(2)}x</span>
                        </div>
                        <div>
                            <span style={{ color: '#9ca3af' }}>
                                ③ Buyback rate ({currentCard.rarity === 'Celestial' || currentCard.rarity === '???'
                                    ? 'Celestial+' : currentCard.rarity === 'Legendary' || currentCard.rarity === 'Divine'
                                    ? 'Legendary+' : 'sub-Legendary'}):
                            </span>
                            <span style={{ color: '#a78bfa', marginLeft: 4 }}>
                                {Math.round(bbRateLo * 100)}% – {Math.round(bbRateHi * 100)}%
                            </span>
                        </div>
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 2, paddingTop: 4 }}>
                            <span style={{ color: '#9ca3af' }}>Est. sell value:</span>
                            <span style={{ color: '#4ade80', marginLeft: 4, fontWeight: 700 }}>
                                ${bbEstLo.toFixed(2)} – ${bbEstHi.toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>,
                document.body,
            )}

            {/* Stats formula tooltip portal */}
            {statsTooltipPos && createPortal(
                <div style={{
                    position: 'fixed', top: statsTooltipPos.y, left: statsTooltipPos.x,
                    width: 210, background: 'rgba(15,15,20,0.97)',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
                    padding: '10px 12px', zIndex: 99999, pointerEvents: 'none',
                    fontSize: '0.62rem', lineHeight: 1.6, color: '#d1d5db',
                }}>
                    <div style={{ fontWeight: 700, color: '#f9fafb', marginBottom: 6, fontSize: '0.65rem' }}>How stats are calculated</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div>
                            <span style={{ color: '#9ca3af' }}>① Pokédex base stat</span>
                        </div>
                        <div>
                            <span style={{ color: '#9ca3af' }}>② × Rarity multiplier </span>
                            <span style={{ color: '#fbbf24' }}>×{(RARITY_MULTIPLIER[currentCard.rarity] ?? 1).toFixed(2)} ({currentCard.rarity})</span>
                        </div>
                        <div>
                            <span style={{ color: '#9ca3af' }}>③ × Variance </span>
                            <span style={{ color: '#60a5fa' }}>±15%</span>
                        </div>
                        {currentCard.preview_nature && (() => {
                            const tn = NATURE_BY_NAME[currentCard.preview_nature!]
                            const STAT_LABEL: Record<string, string> = { stat_atk: 'ATK', stat_def: 'DEF', stat_spatk: 'SP.ATK', stat_spdef: 'SP.DEF', stat_spd: 'SPD', stat_accuracy: 'ACC', stat_evasion: 'EVA' }
                            const mods = tn ? Object.entries(tn.modifiers) : []
                            return (
                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 2, paddingTop: 4 }}>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, flexWrap: 'wrap' }}>
                                        <span style={{ color: '#9ca3af' }}>④ Nature </span>
                                        <span style={{ color: '#c084fc' }}>{currentCard.preview_nature}</span>
                                    </div>
                                    {mods.length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 8px', marginTop: 3 }}>
                                            {mods.map(([key, mult]) => {
                                                const isBuff = mult > 1
                                                const pct = Math.round(Math.abs(mult - 1) * 100)
                                                return (
                                                    <span key={key} style={{ fontSize: '0.58rem', color: isBuff ? '#4ade80' : '#f87171', fontWeight: 700 }}>
                                                        {isBuff ? '+' : '-'}{STAT_LABEL[key] ?? key} {pct}%
                                                    </span>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            )
                        })()}
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 2, paddingTop: 4, color: '#6b7280', fontSize: '0.58rem' }}>
                            Cards without Pokédex data use flat rarity-based ranges instead.
                        </div>
                    </div>
                </div>,
                document.body,
            )}

            {/* panel */}
            <div
                className="pack-cond-panel"
                style={{
                    flex: isMobile ? undefined : 1,
                    background: overall != null && overall <= 1 ? 'rgba(30,5,5,0.95)' : 'var(--app-surface)',
                    border: overall != null && overall <= 1 ? '1px solid rgba(239,68,68,0.6)' : '1px solid var(--app-border)',
                    borderRadius: 10,
                    padding: isMobile ? '10px 12px' : '12px 14px',
                    display: 'flex', flexDirection: 'column', gap: 0,
                    overflow: 'hidden', position: 'relative',
                    minHeight: isMobile ? 180 : 200,
                    boxShadow: overall != null && overall <= 1 ? '0 0 18px rgba(239,68,68,0.25)' : undefined,
                }}
            >
                {/* Name + dex — inside panel at top */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
                    <p style={{
                        fontSize: '1rem', fontWeight: 600,
                        color: 'var(--app-text)', margin: 0,
                        lineHeight: 1.2, letterSpacing: '0.02em',
                    }}>
                        {currentCard.name}
                    </p>
                    <span style={{ fontSize: '0.62rem', color: 'var(--app-text-faint)', lineHeight: 1.2 }}>
                        #{currentCard.national_pokedex_number}
                    </span>
                </div>

                {/* Tab bar */}
                <div style={{ display: 'flex', gap: 2, marginBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 8 }}>
                    {(['condition', 'stats'] as const).map(t => (
                        <button key={t} onClick={() => setCondPanelTab(t)} style={{
                            fontSize: '0.55rem', fontWeight: 700,
                            padding: '3px 8px', borderRadius: 5,
                            background: condPanelTab === t ? 'rgba(255,255,255,0.08)' : 'transparent',
                            border: condPanelTab === t ? '1px solid rgba(255,255,255,0.15)' : '1px solid transparent',
                            color: condPanelTab === t ? '#e2e8f0' : '#4b5563',
                            cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase',
                            transition: 'all 120ms',
                        }}>{t}</button>
                    ))}
                </div>

                {/* Tab content — fixed min-height so panel doesn't shrink when switching tabs */}
                <div style={{ flex: 1, minHeight: isMobile ? 150 : 170, display: 'flex', flexDirection: 'column' }}>

                {/* Stats tab */}
                {condPanelTab === 'stats' && (() => {
                    const nat = currentCard.preview_nature ? NATURE_BY_NAME[currentCard.preview_nature] : null
                    const natColor = nat ? NATURE_TIER_COLOR[nat.tier] : '#94a3b8'
                    const ps = currentCard.preview_stats
                    const statRows = ps ? [
                        { l: 'ATK',    v: ps.stat_atk,   c: '#f87171' },
                        { l: 'DEF',    v: ps.stat_def,   c: '#60a5fa' },
                        { l: 'SP.ATK', v: ps.stat_spatk, c: '#c084fc' },
                        { l: 'SP.DEF', v: ps.stat_spdef, c: '#818cf8' },
                        { l: 'SPD',    v: ps.stat_spd,   c: '#4ade80' },
                    ] : []
                    const maxSt = Math.max(1, ...statRows.map(s => s.v))
                    if (!nat && statRows.length === 0) return (
                        <div style={{ fontSize: '0.62rem', color: '#4b5563', padding: '8px 0' }}>No stats available.</div>
                    )
                    return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {/* header row with (i) */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                {nat ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.5rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nature</span>
                                        <span style={{ fontSize: '0.62rem', fontWeight: 800, color: natColor, textShadow: `0 0 6px ${natColor}66` }}>{nat.name}</span>
                                        {nat.tier !== 'regular' && (
                                            <span style={{ fontSize: '0.42rem', fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: `${natColor}18`, border: `1px solid ${natColor}55`, color: natColor, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{nat.tier}</span>
                                        )}
                                        <span style={{ fontSize: '0.45rem', color: '#6b7280' }}>{nat.effect}</span>
                                    </div>
                                ) : <div />}
                                {/* (i) icon */}
                                <span
                                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 13, height: 13, borderRadius: '50%', border: '1px solid rgba(156,163,175,0.4)', color: 'var(--app-text-muted)', fontSize: '0.5rem', fontWeight: 700, cursor: 'default', userSelect: 'none', flexShrink: 0 }}
                                    onMouseEnter={(e) => {
                                        const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                                        setStatsTooltipPos({ x: r.left - 160, y: r.bottom + 6 })
                                    }}
                                    onMouseLeave={() => setStatsTooltipPos(null)}
                                >i</span>
                            </div>
                            {statRows.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                    {statRows.map(({ l, v, c }) => (
                                        <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                            <span style={{ fontSize: '0.48rem', color: '#6b7280', width: 34, textAlign: 'right', flexShrink: 0 }}>{l}</span>
                                            <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${(v / Math.max(maxSt, 160)) * 100}%`, background: c, borderRadius: 2 }} />
                                            </div>
                                            <span style={{ fontSize: '0.52rem', fontFamily: 'monospace', color: c, width: 24, textAlign: 'right', flexShrink: 0 }}>{v}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                })()}

                {/* Condition tab */}
                {condPanelTab === 'condition' && <>
                    {hasAttrs && overall != null && overall <= 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 80, position: 'relative' }}>
                            {['psa1-q1','psa1-q2','psa1-q3'].map((key, i) => (
                                <span key={key} className={`psa1-question psa1-q${i + 1}`} style={{
                                    position: 'absolute', fontSize: i === 1 ? '1.3rem' : '0.9rem',
                                    color: `rgba(239,68,68,${i === 1 ? 0.9 : 0.5})`,
                                    fontWeight: 900, userSelect: 'none', pointerEvents: 'none',
                                    left: `${20 + i * 28}%`, bottom: 0,
                                }}>?</span>
                            ))}
                            <span style={{ fontSize: '0.55rem', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#ef4444' }}>catastrophic damage</span>
                            <span style={{ fontSize: isMobile ? '1.6rem' : '2rem', fontWeight: 900, fontFamily: 'monospace', color: '#ef4444', textShadow: '0 0 12px rgba(239,68,68,0.8)', lineHeight: 1 }}>1.0</span>
                            <span style={{ fontSize: '0.52rem', color: 'rgba(239,68,68,0.7)', fontWeight: 600 }}>all attributes destroyed</span>
                        </div>
                    )}
                    {hasAttrs && !(overall != null && overall <= 1) && (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <span style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--app-text-muted)' }}>est condition</span>
                                    <span
                                        style={{
                                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                            width: 13, height: 13, borderRadius: '50%',
                                            border: '1px solid rgba(156,163,175,0.4)', color: 'var(--app-text-muted)',
                                            fontSize: '0.5rem', fontWeight: 700, cursor: 'default', userSelect: 'none', flexShrink: 0,
                                        }}
                                        onMouseEnter={(e) => {
                                            const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                                            setBbTooltipPos({ x: r.left, y: r.bottom + 6 })
                                        }}
                                        onMouseLeave={() => setBbTooltipPos(null)}
                                    >?</span>
                                </div>
                                {overall != null && (
                                    <span style={{
                                        fontSize: isMobile ? '0.95rem' : '1.1rem', fontWeight: 800,
                                        fontFamily: 'monospace', color: attrColor(overall),
                                        textShadow: `0 0 8px ${attrColor(overall)}80`,
                                    }}>{overall.toFixed(1)}</span>
                                )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, justifyContent: 'center' }}>
                                {attrs.map(({ label, value }) => (
                                    <div key={label} className="flex items-center gap-1.5">
                                        <span style={{ fontSize: isMobile ? '0.7rem' : '0.65rem', color: 'var(--app-text-muted)', width: 60, flexShrink: 0 }}>{label}</span>
                                        <div className="pack-cond-bar-track flex-1 rounded-full overflow-hidden" style={{ height: isMobile ? 6 : 5, background: 'rgba(255,255,255,0.05)' }}>
                                            <div className="h-full rounded-full" style={{ width: `${(value / 10) * 100}%`, background: attrColor(value), transition: 'width 600ms ease' }} />
                                        </div>
                                        <span style={{ fontSize: isMobile ? '0.78rem' : '0.78rem', fontWeight: 700, fontFamily: 'monospace', color: attrColor(value), width: 28, textAlign: 'right' as const }}>
                                            {value.toFixed(1)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* value + buyback */}
                    <div
                        className={hasAttrs ? 'pack-cond-divider' : ''}
                        style={{
                            marginTop: hasAttrs ? 7 : 0, paddingTop: hasAttrs ? 7 : 0,
                            borderTop: hasAttrs ? '1px solid rgba(255,255,255,0.06)' : 'none',
                            display: 'flex', flexDirection: 'column', gap: 3,
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.58rem', color: 'var(--app-text-faint)' }}>market value</span>
                            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#4ade80', fontFamily: 'monospace' }}>
                                ${currentCard.worth != null ? Number(currentCard.worth).toFixed(2) : '—'}
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '0.58rem', color: 'var(--app-text-faint)' }}>buyback</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                {currentCard.isHot && (
                                    <span style={{ fontSize: '0.5rem', fontWeight: 700, color: '#fb923c', background: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.3)', borderRadius: 4, padding: '0 4px', letterSpacing: '0.05em' }}>HOT 🔥</span>
                                )}
                                <span style={{ fontSize: '0.72rem', fontWeight: 600, fontFamily: 'monospace', color: currentCard.isHot ? '#fb923c' : '#eab308' }}>
                                    ${Number(currentCard.coins).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                </>}

                </div>{/* end tab content */}

                {/* Action icon buttons */}
                <div style={{
                    display: 'flex', gap: 8, alignItems: 'center',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    paddingTop: 10, marginTop: 10,
                    justifyContent: 'center',
                }}>
                    {bagFull ? (
                        <div style={{ fontSize: '0.62rem', color: '#f87171', textAlign: 'center', padding: '6px 0', flex: 1 }}>bag full</div>
                    ) : (
                        <div style={{ position: 'relative' }}>
                            <button
                                disabled={actDisabled}
                                onClick={currentCardIsNew ? handleAddToBag : handleAddToBagDuplicate}
                                onMouseEnter={() => setHoveredBtn('bag')}
                                onMouseLeave={() => setHoveredBtn(null)}
                                className="active:scale-95 transition-all"
                                style={iconBtnStyle('#818cf8')}
                            >
                                {/* shopping bag icon */}
                                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
                                </svg>
                            </button>
                            {hoveredBtn === 'bag' && (
                                <div style={{ position: 'absolute', bottom: '110%', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', background: 'rgba(10,10,20,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '4px 8px', fontSize: '0.6rem', color: '#e2e8f0', pointerEvents: 'none', zIndex: 100 }}>
                                    Add to Bag{bagLeft !== null ? ` (${bagLeft} slots left)` : ''}
                                </div>
                            )}
                        </div>
                    )}

                    {!currentCardIsNew && (
                        <div style={{ position: 'relative' }}>
                            <button
                                disabled={actDisabled || isFetchingCopies}
                                onClick={handleFeedCard}
                                onMouseEnter={() => setHoveredBtn('feed')}
                                onMouseLeave={() => setHoveredBtn(null)}
                                className="active:scale-95 transition-all"
                                style={iconBtnStyle('#fbbf24')}
                            >
                                {/* lightning bolt */}
                                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                                </svg>
                            </button>
                            {hoveredBtn === 'feed' && (
                                <div style={{ position: 'absolute', bottom: '110%', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', background: 'rgba(10,10,20,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '4px 8px', fontSize: '0.6rem', color: '#e2e8f0', pointerEvents: 'none', zIndex: 100 }}>
                                    {isFetchingCopies ? 'Loading…' : 'Feed'}
                                </div>
                            )}
                        </div>
                    )}

                    <div style={{ position: 'relative' }}>
                        <button
                            disabled={actDisabled}
                            onClick={handleBuyback}
                            onMouseEnter={() => setHoveredBtn('sell')}
                            onMouseLeave={() => setHoveredBtn(null)}
                            className="active:scale-95 transition-all"
                            style={iconBtnStyle('#4ade80')}
                        >
                            {/* dollar sign */}
                            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
                            </svg>
                        </button>
                        {hoveredBtn === 'sell' && (
                            <div style={{ position: 'absolute', bottom: '110%', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', background: 'rgba(10,10,20,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '4px 8px', fontSize: '0.6rem', color: '#e2e8f0', pointerEvents: 'none', zIndex: 100 }}>
                                Sell (${Number(currentCard.coins).toFixed(2)})
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}
