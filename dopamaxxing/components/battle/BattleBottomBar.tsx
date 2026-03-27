'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { BattleState, BattleCard } from '@/lib/n-battle'
import { StatusBadge } from './StatusBadge'
import { frontSprite } from './sprites'
import type { BattleMenu } from '@/hooks/useBattle'

const FONT = "'PokemonClassic', monospace"

const TYPE_COLORS: Record<string, string> = {
    fire: '#F08030', water: '#6890F0', grass: '#78C850', electric: '#F8D030',
    psychic: '#F85888', ice: '#98D8D8', dragon: '#7038F8', dark: '#705848',
    fairy: '#EE99AC', normal: '#A8A878', fighting: '#C03028', poison: '#A040A0',
    ground: '#E0C068', flying: '#A890F0', bug: '#A8B820', rock: '#B8A038',
    ghost: '#705898', steel: '#B8B8D0',
}

type Props = {
    battle: BattleState
    battleMenu: BattleMenu
    setBattleMenu: (m: BattleMenu) => void
    acting: boolean
    switchPhase: 'idle' | 'recall' | 'send'
    switchText: string
    battleText: string
    onAttack: (i: number) => void
    onSwitch: (i: number) => void
    onRun: () => void
    onUseItem: (item: string) => void
    cardPp: Record<string, number[]>
    bagFullHeals: number
    forcedSwitch: boolean
    waitingForAdvance: boolean
    onAdvance: () => void
}

export function BattleBottomBar({
    battle,
    battleMenu,
    setBattleMenu,
    acting,
    switchPhase,
    switchText,
    battleText,
    onAttack,
    onSwitch,
    onRun,
    onUseItem,
    cardPp,
    bagFullHeals,
    forcedSwitch,
    waitingForAdvance,
    onAdvance,
}: Props) {
    const uActive: BattleCard = battle.user_cards[battle.user_active_index]

    // ── Typewriter ─────────────────────────────────────────────────────────────
    const [typedText, setTypedText] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [fastType, setFastType] = useState(false)
    const typeRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const fullTextRef = useRef('')
    const fastTypeRef = useRef(false)

    const rawText = (battleMenu === 'main' || battleMenu === 'fight')
        ? (switchPhase !== 'idle' ? switchText : battleText)
        : ''

    useEffect(() => { fastTypeRef.current = fastType }, [fastType])

    const startTyping = (text: string, fast: boolean) => {
        if (typeRef.current) { clearInterval(typeRef.current); typeRef.current = null }
        if (!text) { setTypedText(''); setIsTyping(false); return }
        setIsTyping(true)
        let i = typedText.length  // resume from current position when speed changes
        const tick = () => {
            i++
            setTypedText(text.slice(0, i))
            if (i >= text.length) {
                if (typeRef.current) { clearInterval(typeRef.current); typeRef.current = null }
                setIsTyping(false)
            }
        }
        typeRef.current = setInterval(tick, fast ? 18 : 45)
    }

    useEffect(() => {
        if (rawText === fullTextRef.current) return
        fullTextRef.current = rawText
        if (typeRef.current) { clearInterval(typeRef.current); typeRef.current = null }
        if (!rawText) { setTypedText(''); setIsTyping(false); return }
        setTypedText('')
        startTyping(rawText, fastTypeRef.current)
        return () => { if (typeRef.current) { clearInterval(typeRef.current); typeRef.current = null } }
    }, [rawText]) // eslint-disable-line

    // Restart interval at new speed when toggled mid-type
    useEffect(() => {
        if (!isTyping || !fullTextRef.current) return
        startTyping(fullTextRef.current, fastType)
        return () => { if (typeRef.current) { clearInterval(typeRef.current); typeRef.current = null } }
    }, [fastType]) // eslint-disable-line

    function handleDialogueClick() {
        if (isTyping) {
            if (typeRef.current) { clearInterval(typeRef.current); typeRef.current = null }
            setTypedText(fullTextRef.current)
            setIsTyping(false)
        } else if (waitingForAdvance) {
            onAdvance()
        }
    }

    // ── Advance text on Enter / Space / Z ─────────────────────────────────────
    useEffect(() => {
        if (!waitingForAdvance && !isTyping) return
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'z' || e.key === 'Z') {
                e.preventDefault()
                handleDialogueClick()
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [waitingForAdvance, isTyping]) // eslint-disable-line

    // ── Keyboard nav for main menu (2×2 grid) ─────────────────────────────────
    const [selectedBtn, setSelectedBtn] = useState(0)

    const mainButtons = [
        { label: 'FIGHT',   action: () => setBattleMenu('fight'),   enabled: !acting },
        { label: 'BAG',     action: () => setBattleMenu('bag'),      enabled: !acting },
        { label: 'POKéMON', action: () => setBattleMenu('pokemon'), enabled: !acting },
        { label: 'RUN',     action: onRun,                           enabled: !acting },
    ]

    const triggerSelected = useCallback(() => {
        const btn = mainButtons[selectedBtn]
        if (btn.enabled) btn.action()
    }, [selectedBtn, acting, setBattleMenu, onRun]) // eslint-disable-line

    useEffect(() => {
        if (battleMenu !== 'main') return
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') { e.preventDefault(); setSelectedBtn(i => i % 2 === 0 ? i + 1 : i - 1) }
            if (e.key === 'ArrowLeft')  { e.preventDefault(); setSelectedBtn(i => i % 2 === 1 ? i - 1 : i + 1) }
            if (e.key === 'ArrowDown')  { e.preventDefault(); setSelectedBtn(i => i < 2 ? i + 2 : i - 2) }
            if (e.key === 'ArrowUp')    { e.preventDefault(); setSelectedBtn(i => i >= 2 ? i - 2 : i + 2) }
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); triggerSelected() }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [battleMenu, triggerSelected])

    // ── Keyboard nav for fight menu ────────────────────────────────────────────
    const [selectedAtk, setSelectedAtk] = useState(0)

    useEffect(() => {
        if (battleMenu !== 'fight') return
        const count = uActive.attacks.length
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') { e.preventDefault(); setSelectedAtk(i => (i + 1) % count) }
            if (e.key === 'ArrowLeft')  { e.preventDefault(); setSelectedAtk(i => (i - 1 + count) % count) }
            if (e.key === 'ArrowDown')  { e.preventDefault(); setSelectedAtk(i => i + 2 < count ? i + 2 : i) }
            if (e.key === 'ArrowUp')    { e.preventDefault(); setSelectedAtk(i => i - 2 >= 0 ? i - 2 : i) }
            if ((e.key === 'Enter' || e.key === ' ') && !acting) { e.preventDefault(); onAttack(selectedAtk) }
            if (e.key === 'Escape') { e.preventDefault(); setBattleMenu('main') }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [battleMenu, uActive.attacks.length, selectedAtk, acting, onAttack, setBattleMenu])

    // ── Pokemon screen ─────────────────────────────────────────────────────────
    if (battleMenu === 'pokemon') {
        return (
            <div style={{
                flexShrink: 0, background: '#0e1a0e', borderTop: '2px solid #1a2e1a',
                position: 'relative',
                maxHeight: 'clamp(180px,36vh,280px)',
                overflowY: 'auto',
            }}>
                {!forcedSwitch && (
                    <button
                        onClick={() => setBattleMenu('main')}
                        style={{
                            position: 'sticky', top: 0, float: 'right', zIndex: 2,
                            margin: '6px 8px 0 0',
                            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: 6, padding: '3px 10px', fontSize: '0.65rem', color: '#9ca3af', cursor: 'pointer',
                            fontFamily: FONT,
                        }}
                    >← Back</button>
                )}
                {forcedSwitch && (
                    <div style={{
                        position: 'sticky', top: 0, float: 'right', zIndex: 2,
                        margin: '6px 8px 0 0', padding: '3px 10px',
                        fontSize: '0.55rem', color: '#f87171', fontFamily: FONT,
                    }}>Choose a pokémon!</div>
                )}
                <div style={{ padding: '8px 10px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {battle.user_cards.map((card, i) => {
                        const isActive = i === battle.user_active_index
                        const fainted = card.hp <= 0
                        return (
                            <div
                                key={i}
                                onClick={() => !fainted && !isActive && onSwitch(i)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '5px 8px', borderRadius: 7,
                                    background: isActive ? 'rgba(74,222,128,0.1)' : fainted ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.04)',
                                    border: isActive ? '1px solid rgba(74,222,128,0.35)' : '1px solid rgba(255,255,255,0.06)',
                                    cursor: !fainted && !isActive ? 'pointer' : 'default',
                                    opacity: fainted ? 0.35 : 1,
                                }}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={frontSprite(card.name)}
                                    alt={card.name}
                                    style={{ width: 40, height: 40, imageRendering: 'pixelated', objectFit: 'contain', flexShrink: 0, opacity: fainted ? 0.3 : 1 }}
                                    onError={(e) => { (e.target as HTMLImageElement).src = card.image_url }}
                                />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: fainted ? '#374151' : '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {card.name}
                                        </span>
                                        {isActive && <span style={{ fontSize: '0.5rem', color: '#4ade80', fontWeight: 700 }}>●</span>}
                                        {fainted && <span style={{ fontSize: '0.5rem', color: '#f87171' }}>✕ fainted</span>}
                                        <StatusBadge status={card.statusEffect} />
                                    </div>
                                    <span style={{ fontSize: '0.58rem', color: '#6b7280' }}>
                                        {card.hp}/{card.maxHp} HP · Lv.{card.level}
                                    </span>
                                </div>
                                {!fainted && !isActive && (
                                    <span style={{ fontSize: '0.6rem', color: '#60a5fa', fontWeight: 600, flexShrink: 0 }}>Switch ›</span>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        )
    }

    if (battleMenu === 'bag') {
        const activeCard = battle.user_cards[battle.user_active_index]
        const hasStatus = activeCard.statusEffect !== 'none'
        return (
            <div style={{
                flexShrink: 0, background: '#0e1a0e', borderTop: '2px solid #1a2e1a',
                padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: FONT, fontSize: '0.6rem', color: '#9ca3af' }}>BAG</span>
                    <button
                        onClick={() => setBattleMenu('main')}
                        style={{
                            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: 6, padding: '2px 10px', fontSize: '0.6rem', color: '#9ca3af',
                            cursor: 'pointer', fontFamily: FONT,
                        }}
                    >← Back</button>
                </div>
                <div
                    onClick={() => {
                        if (!acting && bagFullHeals > 0 && hasStatus) onUseItem('full-heal')
                    }}
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 12px', borderRadius: 8,
                        background: bagFullHeals > 0 && hasStatus ? 'rgba(96,165,250,0.12)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${bagFullHeals > 0 && hasStatus ? 'rgba(96,165,250,0.4)' : 'rgba(255,255,255,0.08)'}`,
                        cursor: bagFullHeals > 0 && hasStatus && !acting ? 'pointer' : 'not-allowed',
                        opacity: bagFullHeals === 0 ? 0.4 : 1,
                    }}
                >
                    <div>
                        <div style={{ fontFamily: FONT, fontSize: '0.65rem', color: '#e2e8f0' }}>Full Heal</div>
                        <div style={{ fontFamily: FONT, fontSize: '0.5rem', color: '#6b7280', marginTop: 2 }}>
                            {hasStatus ? `Cures ${activeCard.name}'s ${activeCard.statusEffect}` : 'No status to cure'}
                        </div>
                    </div>
                    <span style={{ fontFamily: FONT, fontSize: '0.6rem', color: '#60a5fa' }}>×{bagFullHeals}</span>
                </div>
            </div>
        )
    }

    return (
        <div style={{
            flexShrink: 0, display: 'flex',
            minHeight: 'clamp(100px,18vh,140px)',
            background: '#000000',
            position: 'relative',
        }}>
            {/* Gold layer — spans behind both panels */}
            <div style={{
                position: 'absolute',
                top: 5, bottom: 5, left: 5, right: 5,
                background: 'linear-gradient(180deg, #c9a227 0%, #8b6914 100%)',
                borderRadius: 8,
                zIndex: 0,
            }} />

            {/* Navy text panel — absolute, spans full width behind right panel */}
            <div
                onClick={handleDialogueClick}
                style={{
                    position: 'absolute',
                    top: 10, bottom: 10, left: 12, right: 10,
                    background: '#0f172a',
                    border: '3px solid #ffffff',
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'flex-start',
                    padding: '10px 16px 8px 16px',
                    overflow: 'hidden',
                    zIndex: 1,
                    cursor: (isTyping || waitingForAdvance) ? 'pointer' : 'default',
                }}
            >
                {(battleMenu === 'main' || battleMenu === 'fight') && (
                    <p style={{
                        fontSize: 'clamp(0.72rem,2.2vw,0.95rem)',
                        color: '#ffffff',
                        margin: 0,
                        lineHeight: 2.2,
                        fontFamily: FONT,
                        whiteSpace: 'pre-line',
                    }}>
                        {typedText}
                    </p>
                )}
                {/* 2× speed toggle */}
                <button
                    onClick={(e) => { e.stopPropagation(); setFastType(f => !f) }}
                    style={{
                        position: 'absolute',
                        top: 5, right: 8,
                        background: fastType ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.08)',
                        border: `1px solid ${fastType ? 'rgba(74,222,128,0.5)' : 'rgba(255,255,255,0.2)'}`,
                        borderRadius: 4,
                        padding: '1px 5px',
                        fontSize: '0.42rem',
                        color: fastType ? '#4ade80' : '#9ca3af',
                        cursor: 'pointer',
                        fontFamily: FONT,
                        lineHeight: 1.6,
                    }}
                >2×</button>
                {waitingForAdvance && !isTyping && (
                    <span style={{
                        position: 'absolute',
                        bottom: 6,
                        right: 14,
                        fontSize: '0.6rem',
                        color: '#ffffff',
                        animation: 'n-advance-blink 0.7s step-end infinite',
                    }}>▼</span>
                )}
            </div>
            {/* Spacer to keep right panel in flex flow */}
            <div style={{ flex: 1 }} />

            {/* RIGHT — action buttons; expands to full width in fight mode */}
            <div style={
                battleMenu === 'fight'
                    ? {
                        position: 'absolute',
                        left: 5, right: 5, top: 5, bottom: 5,
                        background: '#ffffff',
                        border: '5px solid #5c2d7a',
                        borderRadius: 4,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        zIndex: 3,
                        padding: '6px 10px',
                        opacity: acting ? 0 : 1,
                        pointerEvents: acting ? 'none' : 'auto',
                        transition: 'opacity 180ms ease',
                    }
                    : {
                        width: '48%',
                        background: '#ffffff',
                        border: '5px solid #5c2d7a',
                        borderRadius: 4,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        position: 'relative',
                        zIndex: 2,
                        margin: '5px 5px 5px 0',
                        padding: '6px 10px',
                        opacity: acting ? 0 : 1,
                        pointerEvents: acting ? 'none' : 'auto',
                        transition: 'opacity 180ms ease',
                    }
            }>
                {battleMenu === 'main' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, height: '100%' }}>
                        {mainButtons.map((btn, i) => (
                            <button
                                key={btn.label}
                                onClick={() => { setSelectedBtn(i); if (btn.enabled) btn.action() }}
                                disabled={!btn.enabled}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 4,
                                    padding: 'clamp(6px,2vw,10px) clamp(4px,1.5vw,8px)',
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: btn.enabled ? 'pointer' : 'not-allowed',
                                    fontFamily: FONT,
                                    fontSize: 'clamp(0.54rem,1.8vw,0.72rem)',
                                    color: btn.enabled ? '#1a1a1a' : '#9ca3af',
                                    textAlign: 'center',
                                    transition: 'color 80ms',
                                    minHeight: 'clamp(28px,6vh,44px)',
                                }}
                            >
                                <span style={{
                                    display: 'inline-block',
                                    width: '0.7em',
                                    color: '#1a1a1a',
                                    visibility: selectedBtn === i ? 'visible' : 'hidden',
                                    flexShrink: 0,
                                }}>▶</span>
                                {btn.label}
                            </button>
                        ))}
                    </div>
                )}
                {battleMenu === 'fight' && (() => {
                    const selAtk = uActive.attacks[selectedAtk]
                    const currentPp = (cardPp[uActive.id] ?? [])[selectedAtk] ?? selAtk?.maxPp ?? 30
                    const maxPp = selAtk?.maxPp ?? 30
                    const typeName = (selAtk?.attackType ?? 'normal').toLowerCase()
                    const typeColor = TYPE_COLORS[typeName] ?? '#A8A878'
                    const ppLow = currentPp <= Math.ceil(maxPp / 4)
                    return (
                        <div style={{ display: 'flex', height: '100%', gap: 0 }}>
                            {/* Moves list — 2×2 grid, larger touch targets */}
                            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                                {uActive.attacks.map((atk, i) => (
                                    <button
                                        key={i}
                                        onClick={() => { setSelectedAtk(i); if (!acting) onAttack(i) }}
                                        disabled={acting}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 4,
                                            padding: 'clamp(6px,2vw,10px) clamp(6px,2vw,10px)',
                                            background: 'transparent', border: 'none',
                                            cursor: acting ? 'not-allowed' : 'pointer',
                                            fontFamily: FONT, fontSize: 'clamp(0.54rem,1.8vw,0.72rem)',
                                            color: acting ? '#9ca3af' : '#1a1a1a', textAlign: 'left',
                                            minHeight: 'clamp(28px,6vh,44px)',
                                        }}
                                    >
                                        <span style={{ width: '0.7em', flexShrink: 0, visibility: selectedAtk === i ? 'visible' : 'hidden' }}>▶</span>
                                        {atk.name}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setBattleMenu('main')}
                                    style={{
                                        gridColumn: '1 / -1', display: 'flex', alignItems: 'center',
                                        justifyContent: 'flex-end', background: 'transparent', border: 'none',
                                        cursor: 'pointer', fontFamily: FONT, fontSize: 'clamp(0.44rem,1.2vw,0.55rem)',
                                        color: '#6b7280', padding: '2px 8px',
                                    }}
                                >← BACK</button>
                            </div>
                            {/* PP + Type panel */}
                            <div style={{
                                width: 'clamp(70px,18vw,110px)', borderLeft: '2px solid #d1d5db', display: 'flex',
                                flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                                padding: 'clamp(4px,1.2vw,8px) clamp(6px,2vw,10px)',
                                flexShrink: 0,
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                    {selAtk?.damage > 0 ? (
                                        <>
                                            <span style={{ fontFamily: FONT, fontSize: 'clamp(0.44rem,1.4vw,0.56rem)', color: '#555' }}>PWR</span>
                                            <span style={{ fontFamily: FONT, fontSize: 'clamp(0.44rem,1.4vw,0.56rem)', color: '#333' }}>{selAtk.damage}</span>
                                        </>
                                    ) : (
                                        <>
                                            <span style={{ fontFamily: FONT, fontSize: 'clamp(0.44rem,1.4vw,0.56rem)', color: '#555' }}>ACC</span>
                                            <span style={{ fontFamily: FONT, fontSize: 'clamp(0.44rem,1.4vw,0.56rem)', color: '#333' }}>
                                                {selAtk?.moveAccuracy != null ? `${selAtk.moveAccuracy}%` : '—'}
                                            </span>
                                        </>
                                    )}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                    <span style={{ fontFamily: FONT, fontSize: 'clamp(0.44rem,1.4vw,0.56rem)', color: '#555' }}>PP</span>
                                    <span style={{ fontFamily: FONT, fontSize: 'clamp(0.44rem,1.4vw,0.56rem)', color: ppLow ? '#dc2626' : '#333' }}>
                                        {currentPp}/{maxPp}
                                    </span>
                                </div>
                                <div style={{
                                    background: typeColor, borderRadius: 4,
                                    padding: 'clamp(2px,0.5vw,3px) clamp(4px,1vw,8px)',
                                    fontFamily: FONT, fontSize: 'clamp(0.42rem,1.2vw,0.52rem)', color: '#fff',
                                    textShadow: '0 1px 2px rgba(0,0,0,0.5)', letterSpacing: '0.03em',
                                    width: '100%', textAlign: 'center',
                                }}>
                                    {typeName.slice(0, 8).toUpperCase()}
                                </div>
                            </div>
                        </div>
                    )
                })()}
            </div>
        </div>
    )
}
