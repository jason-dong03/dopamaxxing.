'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'

import {
    PRE_BATTLE_LINES,
    VICTORY_QUOTE,
    DEFEAT_QUOTE,
} from '@/content/n-battle/dialogue'
import { buildRevealTeam } from '@/content/n-battle/team'
import type { TeamRevealEntry } from '@/content/n-battle/team'

import { TeamRevealPhase } from '@/components/battle/TeamRevealPhase'
import { CardSelectPhase } from '@/components/battle/CardSelectPhase'
import { BattleField } from '@/components/battle/BattleField'
import { BattleBottomBar } from '@/components/battle/BattleBottomBar'
import { useBattle } from '@/hooks/useBattle'

export default function NBattleScreen({
    onClose,
    onBattleWon,
    trainerId,
    skipToCardSelect,
}: {
    onClose: () => void
    onBattleWon: () => void
    trainerId?: string
    skipToCardSelect?: boolean
}) {
    const [mounted, setMounted] = useState(false)
    useEffect(() => {
        setMounted(true)
    }, [])

    // ── Pre-dialogue state ────────────────────────────────────────────────────
    const [dialogueIdx, setDialogueIdx] = useState(0)
    const [displayed, setDisplayed] = useState('')
    const [isTyping, setIsTyping] = useState(true)
    const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null)

    // ── Team reveal state ─────────────────────────────────────────────────────
    const [revealTeam, setRevealTeam] = useState<TeamRevealEntry[]>([])
    const [revealPhase, setRevealPhase] = useState<
        'idle' | 'silhouette' | 'done'
    >('idle')
    const revealTimers = useRef<ReturnType<typeof setTimeout>[]>([])

    // ── Battle logic (shared hook) ────────────────────────────────────────────
    const battle = useBattle({
        trainerId,
        startPhase: skipToCardSelect ? 'card-select' : 'pre-dialogue',
    })

    // ── Build reveal team once on mount ───────────────────────────────────────
    useEffect(() => {
        setRevealTeam(buildRevealTeam())
    }, [])

    // ── If skipping to card-select, load cards immediately ───────────────────
    useEffect(() => {
        if (skipToCardSelect) battle.proceedToCardSelect()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // ── Typewriter ────────────────────────────────────────────────────────────
    const currentLine = PRE_BATTLE_LINES[dialogueIdx]
    useEffect(() => {
        if (battle.phase !== 'pre-dialogue') return
        setDisplayed('')
        setIsTyping(true)
        let i = 0
        typewriterRef.current = setInterval(() => {
            i++
            setDisplayed(currentLine.slice(0, i))
            if (i >= currentLine.length) {
                clearInterval(typewriterRef.current!)
                typewriterRef.current = null
                setIsTyping(false)
            }
        }, 26)
        return () => {
            if (typewriterRef.current) {
                clearInterval(typewriterRef.current)
                typewriterRef.current = null
            }
        }
    }, [currentLine, battle.phase])

    const advanceDialogue = useCallback(() => {
        if (isTyping) {
            clearInterval(typewriterRef.current!)
            typewriterRef.current = null
            setDisplayed(currentLine)
            setIsTyping(false)
            return
        }
        if (dialogueIdx < PRE_BATTLE_LINES.length - 1) {
            setDialogueIdx((i) => i + 1)
        } else {
            battle.setPhase('team-reveal')
        }
    }, [isTyping, dialogueIdx, currentLine, battle])

    useEffect(() => {
        if (battle.phase !== 'pre-dialogue') return
        function onKey(e: KeyboardEvent) {
            if (['Space', 'Enter', 'ArrowRight'].includes(e.code)) {
                e.preventDefault()
                advanceDialogue()
            }
            if (e.code === 'Escape') onClose()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [battle.phase, advanceDialogue, onClose])

    // ── Team reveal timers ────────────────────────────────────────────────────
    useEffect(() => {
        if (battle.phase !== 'team-reveal') return
        const t1 = setTimeout(() => setRevealPhase('silhouette'), 600)
        const t2 = setTimeout(() => setRevealPhase('done'), 2400)
        revealTimers.current = [t1, t2]
        return () => revealTimers.current.forEach(clearTimeout)
    }, [battle.phase])

    if (!mounted) return null

    // ── PRE-DIALOGUE ──────────────────────────────────────────────────────────
    if (battle.phase === 'pre-dialogue') {
        return createPortal(
            <div
                onClick={advanceDialogue}
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 99998,
                    cursor: 'pointer',
                    userSelect: 'none',
                    background: `linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.82) 70%, rgba(0,0,0,0.96) 100%), url('/assets/pokemon-fight.jpg') center/cover no-repeat`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    padding: '0 0 max(32px,env(safe-area-inset-bottom,32px))',
                }}
            >
                {/* N sprite */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: 'clamp(150px,24vh,200px)',
                        left: '50%',
                        transform: 'translateX(-50%)',
                    }}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/trainers/N-masters.gif"
                        alt="N"
                        style={{
                            height: 'clamp(110px,18vh,220px)',
                            imageRendering: 'pixelated',
                            filter: 'drop-shadow(0 0 24px rgba(74,222,128,0.4))',
                        }}
                        onError={(e) => {
                            ;(e.target as HTMLImageElement).style.display =
                                'none'
                        }}
                    />
                </div>

                {/* Dialogue box */}
                <div
                    style={{
                        width: 'calc(100% - 24px)',
                        maxWidth: 640,
                        background:
                            'linear-gradient(160deg,#0c1810 0%,#080f08 100%)',
                        border: '1px solid rgba(74,222,128,0.35)',
                        borderRadius: 16,
                        padding:
                            'clamp(14px,3vw,20px) clamp(14px,3vw,18px) 16px',
                        position: 'relative',
                        boxShadow:
                            '0 0 60px rgba(74,222,128,0.12), 0 24px 60px rgba(0,0,0,0.8)',
                    }}
                >
                    {/* N label */}
                    <div
                        style={{
                            position: 'absolute',
                            top: -14,
                            left: 20,
                            background:
                                'linear-gradient(135deg,#16a34a,#15803d)',
                            borderRadius: 6,
                            padding: '3px 14px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            color: '#fff',
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            boxShadow: '0 2px 12px rgba(22,163,74,0.5)',
                        }}
                    >
                        N
                    </div>

                    <p
                        style={{
                            fontSize: 'clamp(0.82rem,2.5vw,0.9rem)',
                            lineHeight: 1.7,
                            color: '#e2e8f0',
                            margin: '6px 0 12px',
                            minHeight: '3.4rem',
                            fontStyle:
                                currentLine === '...' ? 'italic' : 'normal',
                        }}
                    >
                        {displayed}
                        {isTyping && (
                            <span
                                style={{
                                    display: 'inline-block',
                                    width: 2,
                                    height: '0.9em',
                                    background: '#4ade80',
                                    marginLeft: 2,
                                    verticalAlign: 'text-bottom',
                                    animation:
                                        'n-cursor-blink 0.6s step-end infinite',
                                }}
                            />
                        )}
                    </p>

                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        <div style={{ display: 'flex', gap: 4 }}>
                            {PRE_BATTLE_LINES.map((_, i) => (
                                <div
                                    key={i}
                                    style={{
                                        width: i === dialogueIdx ? 14 : 5,
                                        height: 5,
                                        borderRadius: 3,
                                        background:
                                            i === dialogueIdx
                                                ? '#4ade80'
                                                : i < dialogueIdx
                                                  ? 'rgba(74,222,128,0.4)'
                                                  : 'rgba(255,255,255,0.08)',
                                        transition: 'all 200ms ease',
                                    }}
                                />
                            ))}
                        </div>
                        <span
                            style={{
                                fontSize: '0.65rem',
                                color: isTyping
                                    ? 'transparent'
                                    : 'rgba(74,222,128,0.7)',
                                transition: 'color 200ms',
                                letterSpacing: '0.04em',
                            }}
                        >
                            {dialogueIdx === PRE_BATTLE_LINES.length - 1
                                ? 'click to battle'
                                : 'click to continue'}{' '}
                            ›
                        </span>
                    </div>
                </div>

                {/* Skip button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onClose()
                    }}
                    style={{
                        position: 'absolute',
                        top: 20,
                        right: 20,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 8,
                        padding: '5px 12px',
                        fontSize: '0.68rem',
                        color: '#374151',
                        cursor: 'pointer',
                    }}
                >
                    Skip
                </button>

                <style>{`@keyframes n-cursor-blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
            </div>,
            document.body,
        )
    }

    // ── TEAM REVEAL ───────────────────────────────────────────────────────────
    if (battle.phase === 'team-reveal') {
        return createPortal(
            <TeamRevealPhase
                team={revealTeam}
                revealPhase={revealPhase}
                onProceed={battle.proceedToCardSelect}
            />,
            document.body,
        )
    }

    // ── CARD SELECT ───────────────────────────────────────────────────────────
    if (battle.phase === 'card-select') {
        return createPortal(
            <CardSelectPhase
                cards={battle.cards}
                selected={battle.selected}
                loadingCards={battle.loadingCards}
                acting={battle.acting}
                sortBy={battle.sortBy}
                setSortBy={battle.setSortBy}
                rarityFilter={battle.rarityFilter}
                setRarityFilter={battle.setRarityFilter}
                onToggleCard={battle.toggleCard}
                onStartBattle={battle.startBattle}
                onClose={onClose}
            />,
            document.body,
        )
    }

    // ── BATTLE ────────────────────────────────────────────────────────────────
    if (battle.phase === 'battle' && battle.battle) {
        return createPortal(
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 99998,
                    background: `url('/assets/pokemon-fight.jpg') center 30%/cover no-repeat`,
                    backgroundColor: '#0a0f08',
                    display: 'flex',
                    flexDirection: 'column',
                    fontFamily: 'inherit',
                }}
            >
                {/* Overlay */}
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background:
                            'linear-gradient(to bottom, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.22) 100%)',
                        pointerEvents: 'none',
                    }}
                />

                <BattleField
                    battle={battle.battle}
                    playerLunge={battle.playerLunge}
                    enemyLunge={battle.enemyLunge}
                    enemyHit={battle.enemyHit}
                    playerHit={battle.playerHit}
                    switchPhase={battle.switchPhase}
                    sessionExp={battle.sessionExp}
                    faintedSide={battle.faintedSide}
                    nSendingOut={battle.nSendingOut}
                    nRecalling={battle.nRecalling}
                    trainerSprite={battle.trainerSprite}
                />

                <BattleBottomBar
                    battle={battle.battle}
                    battleMenu={battle.battleMenu}
                    setBattleMenu={battle.setBattleMenu}
                    acting={battle.acting}
                    switchPhase={battle.switchPhase}
                    switchText={battle.switchText}
                    battleText={battle.getBattleText()}
                    onAttack={battle.doAttack}
                    onSwitch={battle.doSwitch}
                    onRun={onClose}
                    onUseItem={battle.doUseItem}
                    cardPp={battle.cardPp}
                    bagFullHeals={battle.bagFullHeals}
                    forcedSwitch={battle.forcedSwitch}
                    waitingForAdvance={battle.waitingForAdvance}
                    onAdvance={battle.advanceText}
                />

                <style>{`
                    @keyframes n-advance-blink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
                    @keyframes n-recall {
                        0%   { transform: scale(1) translateY(0);    filter: brightness(1);               opacity: 1; }
                        40%  { transform: scale(0.4) translateY(6%); filter: brightness(8) saturate(0);  opacity: 0.8; }
                        100% { transform: scale(0)  translateY(14%); filter: brightness(10) saturate(0); opacity: 0; }
                    }
                    @keyframes n-send-out {
                        0%   { transform: scale(0);    filter: brightness(8) saturate(0);   opacity: 0; }
                        50%  { transform: scale(0.65); filter: brightness(3) saturate(0.3); opacity: 0.7; }
                        85%  { transform: scale(1.08); filter: brightness(1.3);             opacity: 1; }
                        100% { transform: scale(1);    filter: brightness(1);               opacity: 1; }
                    }
                    @keyframes n-player-lunge {
                        0%   { transform: translateX(0)    scaleX(1);    }
                        35%  { transform: translateX(42px) scaleX(1.06); }
                        65%  { transform: translateX(18px) scaleX(0.98); }
                        100% { transform: translateX(0)    scaleX(1);    }
                    }
                    @keyframes n-enemy-lunge {
                        0%   { transform: translateX(0)     scaleX(1);    }
                        35%  { transform: translateX(-42px) scaleX(1.06); }
                        65%  { transform: translateX(-18px) scaleX(0.98); }
                        100% { transform: translateX(0)     scaleX(1);    }
                    }
                    @keyframes n-damage-float {
                        0%   { opacity: 1;   transform: translateX(-50%) translateY(0)     scale(1.2);  }
                        20%  { opacity: 1;   transform: translateX(-50%) translateY(-18px) scale(1.4);  }
                        60%  { opacity: 0.9; transform: translateX(-50%) translateY(-52px) scale(1.05); }
                        100% { opacity: 0;   transform: translateX(-50%) translateY(-80px) scale(0.8);  }
                    }
                    @keyframes n-faint {
                        0%   { transform: scale(1);    filter: brightness(1);              opacity: 1; }
                        20%  { transform: scale(1.05); filter: brightness(10) saturate(0); opacity: 1; }
                        50%  { transform: scale(0.7);  filter: brightness(5) saturate(0);  opacity: 0.7; }
                        100% { transform: scale(0) translateY(20%); filter: brightness(3) saturate(0); opacity: 0; }
                    }
                    @keyframes n-trainer-recall {
                        0%   { opacity: 0; transform: translateX(30px) scale(0.85); }
                        18%  { opacity: 1; transform: translateX(0)    scale(1); }
                        80%  { opacity: 1; transform: translateX(0)    scale(1); }
                        100% { opacity: 0; transform: translateX(-20px) scale(0.9); }
                    }
                    @keyframes n-pokeball-throw {
                        0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.5) rotate(0deg); }
                        20%  { opacity: 1; transform: translate(-50%, -80%) scale(1.2) rotate(180deg); }
                        60%  { opacity: 1; transform: translate(-50%, -50%) scale(1) rotate(360deg); }
                        80%  { opacity: 1; transform: translate(-50%, -40%) scale(0.8) rotate(400deg); }
                        100% { opacity: 0; transform: translate(-50%, -30%) scale(0) rotate(440deg); }
                    }
                `}</style>
            </div>,
            document.body,
        )
    }

    // ── WON ───────────────────────────────────────────────────────────────────
    if (battle.phase === 'won') {
        const evoCandidate = battle.evolveCandidates[0] ?? null

        if (evoCandidate) {
            return createPortal(
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 99999,
                    background: 'rgba(0,0,0,0.97)',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', padding: 24,
                }}>
                    <div style={{ textAlign: 'center', maxWidth: 460, width: '100%' }}>
                        <p style={{ fontSize: '0.7rem', color: '#facc15', letterSpacing: '0.1em', margin: '0 0 16px' }}>
                            EVOLUTION READY
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, marginBottom: 24 }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '0.65rem', color: '#6b7280', marginBottom: 4 }}>{evoCandidate.cardName}</div>
                                <div style={{ fontSize: '0.6rem', color: '#4b5563' }}>Lv.{evoCandidate.newLevel}</div>
                            </div>
                            <span style={{ fontSize: '1.5rem', color: '#facc15' }}>→</span>
                            <div style={{ textAlign: 'center' }}>
                                {evoCandidate.evolution.image_url && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={evoCandidate.evolution.image_url}
                                        alt={evoCandidate.evolution.name}
                                        style={{ height: 80, imageRendering: 'pixelated', display: 'block', margin: '0 auto 4px' }}
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                    />
                                )}
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e2e8f0' }}>{evoCandidate.evolution.name}</div>
                                <div style={{ fontSize: '0.6rem', color: '#6b7280' }}>{evoCandidate.evolution.rarity}</div>
                            </div>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '0 0 20px' }}>
                            {evoCandidate.cardName} can evolve into {evoCandidate.evolution.name}!
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                            <button
                                onClick={() => battle.doEvolve(evoCandidate.userCardId, true)}
                                style={{
                                    padding: '10px 24px', borderRadius: 10, fontSize: '0.8rem', fontWeight: 700,
                                    background: 'rgba(250,204,21,0.15)', border: '1px solid rgba(250,204,21,0.5)',
                                    color: '#facc15', cursor: 'pointer',
                                }}
                            >
                                Evolve — Keep Lv.{evoCandidate.newLevel}
                            </button>
                            <button
                                onClick={() => battle.doEvolve(evoCandidate.userCardId, false)}
                                style={{
                                    padding: '10px 24px', borderRadius: 10, fontSize: '0.8rem', fontWeight: 700,
                                    background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.3)',
                                    color: '#60a5fa', cursor: 'pointer',
                                }}
                            >
                                Evolve — Start Fresh (Lv.1)
                            </button>
                            <button
                                onClick={() => battle.dismissEvolve(evoCandidate.userCardId)}
                                style={{
                                    padding: '8px 24px', borderRadius: 10, fontSize: '0.75rem',
                                    background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                                    color: '#6b7280', cursor: 'pointer',
                                }}
                            >
                                Skip
                            </button>
                        </div>
                    </div>
                </div>,
                document.body,
            )
        }

        return createPortal(
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 99999,
                    background: 'rgba(0,0,0,0.97)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 24,
                }}
            >
                <div
                    style={{
                        textAlign: 'center',
                        maxWidth: 420,
                        width: '100%',
                    }}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/trainers/N-masters.gif"
                        alt="N"
                        style={{
                            display: 'block',
                            margin: '0 auto 20px',
                            height: 120,
                            imageRendering: 'pixelated',
                            filter: 'drop-shadow(0 0 32px rgba(74,222,128,0.5))',
                        }}
                        onError={(e) => {
                            ;(e.target as HTMLImageElement).style.display =
                                'none'
                        }}
                    />
                    <h2
                        style={{
                            fontSize: '1.4rem',
                            fontWeight: 800,
                            color: '#4ade80',
                            margin: '0 0 12px',
                            letterSpacing: '-0.02em',
                        }}
                    >
                        Victory.
                    </h2>
                    <p
                        style={{
                            fontSize: 'clamp(0.82rem,2.5vw,0.9rem)',
                            color: '#9ca3af',
                            lineHeight: 1.7,
                            margin: '0 0 32px',
                        }}
                    >
                        {VICTORY_QUOTE}
                    </p>
                    <button
                        onClick={() => {
                            onBattleWon()
                            onClose()
                        }}
                        style={{
                            padding: '12px 40px',
                            borderRadius: 12,
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            background: 'rgba(74,222,128,0.15)',
                            border: '1px solid rgba(74,222,128,0.5)',
                            color: '#4ade80',
                            cursor: 'pointer',
                        }}
                    >
                        Claim Reward →
                    </button>
                </div>
            </div>,
            document.body,
        )
    }

    // ── LOST ──────────────────────────────────────────────────────────────────
    if (battle.phase === 'lost') {
        return createPortal(
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 99999,
                    background: 'rgba(0,0,0,0.97)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 24,
                }}
            >
                <div style={{ textAlign: 'center', maxWidth: 420 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/trainers/N-masters.gif"
                        alt="N"
                        style={{
                            display: 'block',
                            margin: '0 auto 20px',
                            height: 120,
                            imageRendering: 'pixelated',
                            opacity: 0.7,
                        }}
                        onError={(e) => {
                            ;(e.target as HTMLImageElement).style.display =
                                'none'
                        }}
                    />
                    <h2
                        style={{
                            fontSize: '1.2rem',
                            fontWeight: 700,
                            color: '#f87171',
                            margin: '0 0 12px',
                        }}
                    >
                        Defeated.
                    </h2>
                    <p
                        style={{
                            fontSize: 'clamp(0.78rem,2.5vw,0.85rem)',
                            color: '#6b7280',
                            lineHeight: 1.7,
                            margin: '0 0 32px',
                        }}
                    >
                        {DEFEAT_QUOTE}
                    </p>
                    <div
                        style={{
                            display: 'flex',
                            gap: 12,
                            justifyContent: 'center',
                        }}
                    >
                        <button
                            onClick={onClose}
                            style={{
                                padding: '10px 20px',
                                borderRadius: 10,
                                fontSize: '0.78rem',
                                background: 'transparent',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: '#6b7280',
                                cursor: 'pointer',
                            }}
                        >
                            Leave
                        </button>
                        <button
                            onClick={battle.retry}
                            style={{
                                padding: '10px 28px',
                                borderRadius: 10,
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                background: 'rgba(248,113,113,0.12)',
                                border: '1px solid rgba(248,113,113,0.4)',
                                color: '#f87171',
                                cursor: 'pointer',
                            }}
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>,
            document.body,
        )
    }

    return null
}
