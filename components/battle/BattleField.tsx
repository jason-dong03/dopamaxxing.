'use client'

import { useState, useEffect } from 'react'
import type { BattleState } from '@/lib/n-battle'
import { statStageMult } from '@/lib/n-battle'
import { HpBar } from './HpBar'
import { TeamDots } from './TeamDots'
import { StatusBadge } from './StatusBadge'
import { backSprite, frontSprite } from './sprites'
import { baseName } from '@/lib/types/cards'
import { xpToNextLevel } from '@/lib/rarityConfig'

function useBreakpoint() {
    const [w, setW] = useState(
        typeof window !== 'undefined' ? window.innerWidth : 800,
    )
    useEffect(() => {
        const h = () => setW(window.innerWidth)
        window.addEventListener('resize', h)
        return () => window.removeEventListener('resize', h)
    }, [])
    return w < 640 ? 'mobile' : w < 1100 ? 'tablet' : 'desktop'
}

const SPRITE_POS = {
    mobile: {
        // ── Player sprite ──────────────────────────────
        playerLeft: '5%',
        playerBottom: '8%',
        // ── Enemy pokemon sprite ───────────────────────
        enemyTop: '45%',
        enemyRight: '16%',
        // ── Enemy trainer (recall animation) ──────────
        trainerBottom: '38%',
        trainerRight: '14%',
        trainerHeight: 'clamp(70px,25vw,130px)',
    },
    tablet: {
        playerLeft: '12%',
        playerBottom: '10%',
        enemyTop: '45%',
        enemyRight: '20%',
        trainerBottom: '38%',
        trainerRight: '20%',
        trainerHeight: 'clamp(70px,18vw,130px)',
    },
    desktop: {
        playerLeft: '21%',
        playerBottom: '8%',
        enemyTop: '47%',
        enemyRight: '28%',
        trainerBottom: '38%',
        trainerRight: '28%',
        trainerHeight: 'clamp(110px,15vw,180px)',
    },
} as const

type BattleFieldProps = {
    battle: BattleState
    playerLunge: boolean
    enemyLunge: boolean
    enemyHit: number | null
    playerHit: number | null
    isCriticalHit?: boolean
    switchPhase: 'idle' | 'recall' | 'send'
    sessionExp: Record<string, number>
    faintedSide?: 'player' | 'enemy' | null
    nSendingOut?: boolean
    nRecalling?: boolean
    trainerSprite?: string
}

const FONT = "'PokemonClassic', monospace"

function StatStages({
    atk,
    def,
    spd,
}: {
    atk?: number
    def?: number
    spd?: number
}) {
    const stages = [
        { label: 'ATK', val: atk ?? 0 },
        { label: 'DEF', val: def ?? 0 },
        { label: 'SPD', val: spd ?? 0 },
    ].filter((s) => s.val !== 0)
    if (stages.length === 0) return null
    return (
        <>
            {stages.map((s) => (
                <span
                    key={s.label}
                    style={{
                        fontSize: 'clamp(0.3rem,0.8vw,0.38rem)',
                        fontWeight: 700,
                        color: s.val > 0 ? '#11371f' : '#f87171',
                        background:
                            s.val > 0
                                ? 'rgba(120, 170, 138, 0.83)'
                                : 'rgba(78, 37, 37, 0.15)',
                        border: `1px solid ${s.val > 0 ? 'rgba(74,222,128,0.4)' : 'rgba(248,113,113,0.4)'}`,
                        borderRadius: 3,
                        padding: '0 3px',
                        lineHeight: 1.6,
                        flexShrink: 0,
                    }}
                >
                    {s.label}
                    {s.val > 0 ? '+' : ''}
                    {s.val} ×{statStageMult(s.val).toFixed(2)}
                </span>
            ))}
        </>
    )
}

export function BattleField({
    battle,
    playerLunge,
    enemyLunge,
    enemyHit,
    playerHit,
    isCriticalHit,
    switchPhase,
    sessionExp,
    faintedSide,
    nSendingOut,
    nRecalling,
    trainerSprite,
}: BattleFieldProps) {
    const spritePos = SPRITE_POS[useBreakpoint()]
    const uActive = battle.user_cards[battle.user_active_index]
    const nActive = battle.n_cards[battle.n_active_index]
    const baseExp = uActive.exp ?? 0
    const expGained = sessionExp[uActive.id] ?? 0
    const expNeeded = Math.max(1, xpToNextLevel(uActive.rarity, uActive.level))
    const expPct = Math.min(100, ((baseExp + expGained) / expNeeded) * 100)

    return (
        <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
            {/* Grass gradient */}
            <div
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '52%',
                    background:
                        'linear-gradient(to bottom, transparent 0%, rgba(20,55,20,0.18) 55%, rgba(10,35,10,0.38) 100%)',
                    pointerEvents: 'none',
                }}
            />

            {/* Enemy's pokemon info panel — top-left */}
            <div
                style={{
                    position: 'absolute',
                    top: '10%',
                    left: '10%',
                    width: '60%',
                    maxWidth: 290,
                    fontFamily: FONT,
                    overflow: 'visible',
                }}
            >
                {/* Cream info panel */}
                <div
                    style={{
                        position: 'relative',
                        zIndex: 1,
                        background:
                            'linear-gradient(180deg, #f0e8c8 0%, #d8d0a8 100%)',
                        borderRadius: 8,
                        padding:
                            'clamp(6px,1.4vw,10px) clamp(10px,2.5vw,16px) 6px',
                        border: '5px solid #222222',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'baseline',
                            justifyContent: 'space-between',
                            marginBottom: 5,
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 3,
                                minWidth: 0,
                                flex: 1,
                            }}
                        >
                            <span
                                style={{
                                    fontSize: 'clamp(0.55rem,1.8vw,0.68rem)',
                                    color: '#282828',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    textTransform: 'uppercase',
                                }}
                            >
                                {baseName(nActive.name)}
                            </span>
                            <StatusBadge status={nActive.statusEffect} />
                        </div>
                        <span
                            style={{
                                fontSize: 'clamp(0.44rem,1.2vw,0.56rem)',
                                color: '#282828',
                                flexShrink: 0,
                            }}
                        >
                            Lv{nActive.level}
                        </span>
                    </div>
                    {/* HP row — right-aligned with Lv text */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: 6,
                            marginBottom: 3,
                        }}
                    >
                        <span
                            style={{
                                fontSize: '0.5rem',
                                color: '#f8a800',
                                textShadow: '1px 1px 0 #785800',
                                flexShrink: 0,
                            }}
                        >
                            HP
                        </span>
                        <div
                            style={{
                                background: '#484848',
                                borderRadius: 4,
                                padding: '3px 4px',
                                width: 150,
                            }}
                        >
                            <HpBar hp={nActive.hp} maxHp={nActive.maxHp} />
                        </div>
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        <TeamDots
                            cards={battle.n_cards}
                            activeIndex={battle.n_active_index}
                        />
                    </div>
                    {/* Stat stage overlay — top-right corner overlapping border */}
                    <div
                        style={{
                            position: 'absolute',
                            top: -14,
                            right: -14,
                            display: 'flex',
                            flexDirection: 'row',
                            gap: 2,
                            zIndex: 10,
                        }}
                    >
                        <StatStages
                            atk={nActive.attackStage}
                            def={nActive.defenseStage}
                            spd={nActive.speedStage}
                        />
                    </div>
                </div>
                {/* Black strip — behind panel, protrudes from bottom-right */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: -10,
                        left: 20,
                        right: -20,
                        overflow: 'hidden',
                        borderRadius: '0 0 0 64px',
                        zIndex: 0,
                    }}
                >
                    <div
                        style={{
                            background: '#383838',
                            clipPath: 'polygon(0 0, 92% 0, 100% 100%, 0 100%)',
                            padding: '18px clamp(10px,2.5vw,16px) 1px',
                            paddingRight: 'calc(10% + 8px)',
                        }}
                    />
                </div>
            </div>

            {/* N trainer sprite — slides in during recall animation */}
            {nRecalling && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: spritePos.trainerBottom,
                        right: spritePos.trainerRight,
                        zIndex: 6,
                        animation: 'n-trainer-recall 0.7s ease-out forwards',
                        pointerEvents: 'none',
                    }}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={trainerSprite ?? '/trainers/N-masters.gif'}
                        alt="Trainer"
                        style={{
                            height: spritePos.trainerHeight,
                            imageRendering: 'pixelated',
                            filter: 'drop-shadow(0 0 18px rgba(74,222,128,0.5))',
                        }}
                        onError={(e) => {
                            ;(e.target as HTMLImageElement).style.display =
                                'none'
                        }}
                    />
                </div>
            )}

            {/* Enemy's pokemon sprite — upper-right */}
            <div
                style={{
                    position: 'absolute',
                    top: spritePos.enemyTop,
                    right: spritePos.enemyRight,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                {enemyHit !== null && (
                    <div
                        style={{
                            position: 'absolute',
                            top: '-18px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            animation: 'n-damage-float 1.8s ease-out forwards',
                            fontSize: isCriticalHit
                                ? 'clamp(1.2rem,3.5vw,1.6rem)'
                                : 'clamp(0.85rem,2.5vw,1.1rem)',
                            fontWeight: 900,
                            color: isCriticalHit ? '#facc15' : '#f87171',
                            textShadow: isCriticalHit
                                ? '0 0 12px rgba(250,204,21,1), 0 0 24px rgba(250,204,21,0.6), 0 1px 3px rgba(0,0,0,0.9)'
                                : '0 0 8px rgba(248,113,113,0.9), 0 1px 3px rgba(0,0,0,0.8)',
                            pointerEvents: 'none',
                            whiteSpace: 'nowrap',
                            fontFamily: FONT,
                            zIndex: 10,
                        }}
                    >
                        -{enemyHit}
                    </div>
                )}
                {nSendingOut && (
                    <div
                        style={{
                            position: 'absolute',
                            top: '40%',
                            left: '50%',
                            fontSize: 'clamp(1.6rem,4vw,2.8rem)',
                            animation:
                                'n-pokeball-throw 0.8s ease-out forwards',
                            pointerEvents: 'none',
                            zIndex: 5,
                        }}
                    >
                        ⚾
                    </div>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    key={`${nActive.id}-${!!nSendingOut}`}
                    src={
                        enemyLunge
                            ? frontSprite(nActive.name)
                            : nActive.image_url
                    }
                    alt={nActive.name}
                    style={{
                        width: 'auto',
                        height: 'auto',
                        maxWidth: 'clamp(100px,16vw,200px)',
                        maxHeight: 'clamp(100px,16vw,200px)',
                        imageRendering: 'pixelated',
                        filter:
                            enemyHit !== null
                                ? 'drop-shadow(0 0 14px rgba(248,113,113,1)) brightness(0.45) sepia(1) hue-rotate(-20deg)'
                                : 'drop-shadow(0 4px 16px rgba(248,113,113,0.4))',
                        animation:
                            faintedSide === 'enemy'
                                ? 'n-faint 1.1s ease-in forwards'
                                : enemyLunge
                                  ? 'n-enemy-lunge 0.55s ease-out both'
                                  : nSendingOut
                                    ? 'n-send-out 0.65s ease-out both'
                                    : 'none',
                        transition: 'filter 0.1s',
                    }}
                    onError={(e) => {
                        ;(e.target as HTMLImageElement).src = nActive.image_url
                    }}
                />
                {/* Shadow */}
                <div
                    style={{
                        width: '70%',
                        height: 10,
                        background: 'rgba(30,80,30,0.55)',
                        borderRadius: '50%',
                        filter: 'blur(4px)',
                        marginTop: 2,
                        pointerEvents: 'none',
                    }}
                />
            </div>

            {/* Player pokemon sprite — lower-left */}
            <div
                style={{
                    position: 'absolute',
                    bottom: spritePos.playerBottom,
                    left: spritePos.playerLeft,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                {playerHit !== null && (
                    <div
                        style={{
                            position: 'absolute',
                            top: '-18px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            animation: 'n-damage-float 1.8s ease-out forwards',
                            fontSize: isCriticalHit
                                ? 'clamp(1.2rem,3.5vw,1.6rem)'
                                : 'clamp(0.85rem,2.5vw,1.1rem)',
                            fontWeight: 900,
                            color: isCriticalHit ? '#facc15' : '#f87171',
                            textShadow: isCriticalHit
                                ? '0 0 12px rgba(250,204,21,1), 0 0 24px rgba(250,204,21,0.6), 0 1px 3px rgba(0,0,0,0.9)'
                                : '0 0 8px rgba(248,113,113,0.9), 0 1px 3px rgba(0,0,0,0.8)',
                            pointerEvents: 'none',
                            whiteSpace: 'nowrap',
                            fontFamily: FONT,
                            zIndex: 10,
                        }}
                    >
                        -{playerHit}
                    </div>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    key={uActive.id}
                    src={
                        playerLunge
                            ? backSprite(uActive.name)
                            : backSprite(uActive.name)
                    }
                    alt={uActive.name}
                    style={{
                        width: ['reshiram ex', 'zekrom ex'].includes(
                            uActive.name.toLowerCase(),
                        )
                            ? 'clamp(225px,35vw,550px)'
                            : 'clamp(112px,10vw,275px)',
                        height: 'auto',
                        imageRendering: 'pixelated',
                        filter:
                            playerHit !== null
                                ? 'drop-shadow(0 0 14px rgba(248,113,113,1)) brightness(0.45) sepia(1) hue-rotate(-20deg)'
                                : 'drop-shadow(0 6px 20px rgba(74,222,128,0.35))',
                        animation:
                            faintedSide === 'player'
                                ? 'n-faint 1.1s ease-in forwards'
                                : switchPhase === 'recall'
                                  ? 'n-recall 0.6s ease-in forwards'
                                  : switchPhase === 'send'
                                    ? 'n-send-out 0.65s ease-out both'
                                    : playerLunge
                                      ? 'n-player-lunge 0.55s ease-out both'
                                      : 'none',
                        transition: 'filter 0.1s',
                    }}
                    onError={(e) => {
                        ;(e.target as HTMLImageElement).src = uActive.image_url
                    }}
                />
                {/* Shadow */}
                <div
                    style={{
                        width: '75%',
                        height: 14,
                        background: 'rgba(30,80,30,0.6)',
                        borderRadius: '50%',
                        filter: 'blur(5px)',
                        marginTop: 3,
                        pointerEvents: 'none',
                    }}
                />
            </div>

            {/* Player pokemon info panel — bottom-right */}
            <div
                style={{
                    position: 'absolute',
                    bottom: '8%',
                    right: '10%',
                    width: '46%',
                    maxWidth: 290,
                    fontFamily: FONT,
                    overflow: 'visible',
                }}
            >
                {/* Cream info panel */}
                <div
                    style={{
                        position: 'relative',
                        zIndex: 1,
                        background:
                            'linear-gradient(180deg, #f0e8c8 0%, #d8d0a8 100%)',
                        borderRadius: 8,
                        padding:
                            'clamp(6px,1.4vw,10px) clamp(10px,2.5vw,16px) 6px',
                        border: '5px solid #222222',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'baseline',
                            justifyContent: 'space-between',
                            marginBottom: 5,
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 3,
                                minWidth: 0,
                                flex: 1,
                            }}
                        >
                            <span
                                style={{
                                    fontSize: 'clamp(0.55rem,1.8vw,0.68rem)',
                                    color: '#282828',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    textTransform: 'uppercase',
                                }}
                            >
                                {baseName(uActive.name)}
                            </span>
                            <StatusBadge status={uActive.statusEffect} />
                        </div>
                        <span
                            style={{
                                fontSize: 'clamp(0.44rem,1.2vw,0.56rem)',
                                color: '#282828',
                                flexShrink: 0,
                            }}
                        >
                            Lv{uActive.level}
                        </span>
                    </div>
                    {/* HP row — right-aligned with Lv text */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: 6,
                            marginBottom: 3,
                        }}
                    >
                        <span
                            style={{
                                fontSize: '0.5rem',
                                color: '#f8a800',
                                textShadow: '1px 1px 0 #785800',
                                flexShrink: 0,
                            }}
                        >
                            HP
                        </span>
                        <div
                            style={{
                                background: '#484848',
                                borderRadius: 4,
                                padding: '3px 4px',
                                width: 150,
                            }}
                        >
                            <HpBar hp={uActive.hp} maxHp={uActive.maxHp} />
                        </div>
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        <TeamDots
                            cards={battle.user_cards}
                            activeIndex={battle.user_active_index}
                        />
                        <span
                            style={{
                                fontSize: 'clamp(0.42rem,1.1vw,0.52rem)',
                                color: '#282828',
                            }}
                        >
                            {uActive.hp}/ {uActive.maxHp}
                        </span>
                    </div>
                    {/* Stat stage overlay — top-right corner overlapping border */}
                    <div
                        style={{
                            position: 'absolute',
                            top: -10,
                            right: 35,
                            display: 'flex',
                            flexDirection: 'row',
                            gap: 2,
                            zIndex: 10,
                        }}
                    >
                        <StatStages
                            atk={uActive.attackStage}
                            def={uActive.defenseStage}
                            spd={uActive.speedStage}
                        />
                    </div>
                </div>
                {/* Black strip — behind panel, protrudes from bottom-left */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: -14,
                        left: -20,
                        right: -7,
                        overflow: 'hidden',
                        borderRadius: '0 0 8px 0',
                        zIndex: 0,
                    }}
                >
                    <div
                        style={{
                            background: '#383838',
                            clipPath:
                                'polygon(10% 0, 100% 0, 100% 100%, 0 100%)',
                            padding: '18px clamp(10px,2.5vw,16px) 4px',
                            paddingLeft: 'calc(10% + 8px)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                        }}
                    >
                        <span
                            style={{
                                fontSize: '0.42rem',
                                color: '#f8a800',
                                textShadow: '1px 1px 0 #785800',
                                flexShrink: 0,
                            }}
                        >
                            EXP
                        </span>
                        <div
                            style={{
                                flex: 1,
                                height: 8,
                                background: expPct > 0 ? '#303030' : '#d8d0a8',
                                borderRadius: 4,
                                overflow: 'hidden',
                                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.6)',
                            }}
                        >
                            <div
                                style={{
                                    height: '100%',
                                    width: `${expPct}%`,
                                    background:
                                        'linear-gradient(180deg, #58d0f8 0%, #3898d0 100%)',
                                    borderRadius: 4,
                                    transition: 'width 1200ms ease-out',
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
