'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
    CATEGORY_META,
    getProgress,
    type Quest,
    type AllMetrics,
} from '@/lib/quests'
import type { OwnedCard } from '@/lib/types'
import { IconStar, IconClock, IconCheck, IconSpinner } from './Icons'
import { TimerPanel } from './TimerPanel'
import { formatCooldown } from './utils'

type Metrics = AllMetrics

export function QuestCard({
    quest,
    completed,
    onCooldown,
    cooldownMs,
    hasEverCompleted,
    reward,
    metrics,
    isExpanded,
    notes,
    claiming,
    ownedCards,
    onExpand,
    onNotesChange,
    onClaim,
    onAutoClaim,
    onPhraseVerify,
    onReplayDialogue,
    onChallenge,
    onGiveCard,
}: {
    quest: Quest
    completed: boolean
    onCooldown: boolean
    cooldownMs: number
    hasEverCompleted: boolean
    reward?: { coins: number; xp: number }
    metrics: Metrics
    isExpanded: boolean
    notes: string
    claiming: boolean
    ownedCards: OwnedCard[]
    onExpand: () => void
    onNotesChange: (v: string) => void
    onClaim: () => void
    onAutoClaim: () => void
    onPhraseVerify?: (phrase: string) => Promise<'ok' | 'wrong' | 'error'>
    onReplayDialogue?: () => void
    onChallenge?: () => void
    onGiveCard?: () => void
}) {
    const [timerDone, setTimerDone] = useState(false)
    const [phraseInput, setPhraseInput] = useState('')
    const [phraseStatus, setPhraseStatus] = useState<
        'idle' | 'checking' | 'wrong' | 'error'
    >('idle')
    const [giveConfirming, setGiveConfirming] = useState(false)
    const meta = CATEGORY_META[quest.category]

    const isAuto = quest.quest_type === 'auto'
    const isSelfReport = quest.quest_type === 'self_report'
    const hasTimed = !!quest.timed_minutes
    const displayCoins = isSelfReport
        ? Math.max(1, Math.round(quest.coin_reward * 0.2))
        : quest.coin_reward
    const displayXP = isSelfReport
        ? Math.max(1, Math.round(quest.xp_reward * 0.2))
        : quest.xp_reward
    const isRepeatable = !!quest.cooldown_hours
    const progress = isAuto ? getProgress(quest, metrics) : 0
    const isReady = isAuto && progress >= 1 && !completed
    const dimmed = completed || onCooldown
    const cooldownLabel = isRepeatable
        ? quest.cooldown_hours === 24
            ? 'DAILY'
            : 'WEEKLY'
        : null

    return (
        <div
            style={{
                background: 'var(--app-surface)',
                border: dimmed
                    ? `1px solid var(--app-border)`
                    : isReady
                      ? `1px solid ${meta.color}40`
                      : `1px solid var(--app-border-2)`,
                borderRadius: 14,
                padding: '16px 18px',
                transition: 'all 200ms ease',
                opacity: completed ? 0.5 : 1,
                position: 'relative',
                cursor: completed || onCooldown ? 'default' : 'pointer',
            }}
            onClick={() => {
                if (!completed && !onCooldown) onExpand()
            }}
        >
            {/* main row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                {/* type icon */}
                <div
                    style={{
                        width: 38,
                        height: 38,
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 10,
                        background: completed
                            ? 'var(--app-surface-2)'
                            : onCooldown
                              ? 'rgba(251,191,36,0.08)'
                              : `${meta.color}14`,
                        filter: dimmed ? 'grayscale(0.5)' : 'none',
                    }}
                >
                    {completed ? (
                        <IconCheck size={17} color="var(--app-text-ghost)" />
                    ) : onCooldown ? (
                        <IconClock size={17} color="#fbbf24" />
                    ) : isRepeatable ? (
                        <IconClock size={17} color={meta.color} />
                    ) : (
                        <IconStar size={17} color={meta.color} />
                    )}
                </div>

                {/* content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    {/* title + badges */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 7,
                            flexWrap: 'wrap',
                            marginBottom: 4,
                        }}
                    >
                        <span
                            style={{
                                fontSize: '0.92rem',
                                fontWeight: 700,
                                color: dimmed
                                    ? 'var(--app-text-muted)'
                                    : 'var(--app-text)',
                                letterSpacing: '-0.01em',
                            }}
                        >
                            {quest.name}
                        </span>

                        {isSelfReport && (
                            <span
                                style={{
                                    fontSize: '0.55rem',
                                    fontWeight: 700,
                                    letterSpacing: '0.1em',
                                    textTransform: 'uppercase',
                                    color: '#f472b4',
                                    background: '#f472b418',
                                    border: '1px solid #f472b440',
                                    borderRadius: 4,
                                    padding: '2px 6px',
                                }}
                            >
                                special
                            </span>
                        )}

                        {/* daily / weekly */}
                        {cooldownLabel && (
                            <span
                                style={{
                                    fontSize: '0.52rem',
                                    fontWeight: 700,
                                    letterSpacing: '0.1em',
                                    textTransform: 'uppercase',
                                    color: '#fbbf24',
                                    background: '#fbbf2418',
                                    border: '1px solid #fbbf2440',
                                    borderRadius: 4,
                                    padding: '2px 6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 3,
                                }}
                            >
                                <IconClock size={9} color="#fbbf24" />
                                {cooldownLabel}
                            </span>
                        )}
                    </div>

                    {/* description */}
                    <p
                        style={{
                            fontSize: '0.78rem',
                            color: dimmed
                                ? 'var(--app-text-faint)'
                                : 'var(--app-text-muted)',
                            margin: '0 0 10px',
                            lineHeight: 1.5,
                        }}
                    >
                        {quest.description}
                    </p>

                    {/* cooldown bar for repeatable quests that have been completed */}
                    {isRepeatable && hasEverCompleted && !completed && (
                        <div style={{ marginBottom: 10 }}>
                            {onCooldown ? (
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                    }}
                                >
                                    <div
                                        style={{
                                            flex: 1,
                                            height: 4,
                                            borderRadius: 2,
                                            background: 'var(--app-border)',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        <div
                                            style={{
                                                height: '100%',
                                                width: `${100 - Math.round((cooldownMs / (quest.cooldown_hours! * 3_600_000)) * 100)}%`,
                                                background: '#fbbf24',
                                                borderRadius: 2,
                                                transition: 'width 1s ease',
                                            }}
                                        />
                                    </div>
                                    <span
                                        style={{
                                            fontSize: '0.68rem',
                                            color: '#fbbf24',
                                            fontWeight: 600,
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {formatCooldown(cooldownMs)} left
                                    </span>
                                </div>
                            ) : (
                                <span
                                    style={{
                                        fontSize: '0.68rem',
                                        color: '#34d399',
                                        fontWeight: 600,
                                    }}
                                >
                                    Ready to claim again
                                </span>
                            )}
                        </div>
                    )}

                    {/* auto quest progress bar */}
                    {isAuto &&
                        quest.requirement_metric &&
                        !completed &&
                        quest.slug !== 'n-ch-4' && (
                            <div style={{ marginBottom: 10 }}>
                                <div
                                    style={{
                                        height: 4,
                                        borderRadius: 2,
                                        background: 'var(--app-border-2)',
                                        overflow: 'hidden',
                                        marginBottom: 4,
                                    }}
                                >
                                    <div
                                        style={{
                                            height: '100%',
                                            width: `${Math.round(progress * 100)}%`,
                                            background: isReady
                                                ? meta.color
                                                : `${meta.color}80`,
                                            borderRadius: 2,
                                            transition: 'width 600ms ease',
                                        }}
                                    />
                                </div>
                                <p
                                    style={{
                                        fontSize: '0.68rem',
                                        color: 'var(--app-text-muted)',
                                    }}
                                >
                                    {Math.min(
                                        metrics[quest.requirement_metric] ?? 0,
                                        quest.requirement_target ?? 0,
                                    )}
                                    {' / '}
                                    {quest.requirement_target}
                                </p>
                            </div>
                        )}

                    {/* n-ch-4 dual progress bars: sell + feed */}
                    {isAuto &&
                        quest.slug === 'n-ch-4' &&
                        !completed &&
                        (() => {
                            const target = quest.requirement_target ?? 100
                            const sold = Math.min(
                                metrics.cards_sold ?? 0,
                                target,
                            )
                            const fed = Math.min(metrics.cards_fed ?? 0, target)
                            const soldPct = Math.round((sold / target) * 100)
                            const fedPct = Math.round((fed / target) * 100)
                            return (
                                <div
                                    style={{
                                        marginBottom: 10,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 7,
                                    }}
                                >
                                    {[
                                        {
                                            label: 'Sold',
                                            value: sold,
                                            pct: soldPct,
                                            color: '#fb923c',
                                        },
                                        {
                                            label: 'Fed',
                                            value: fed,
                                            pct: fedPct,
                                            color: '#34d399',
                                        },
                                    ].map(({ label, value, pct, color }) => (
                                        <div key={label}>
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    justifyContent:
                                                        'space-between',
                                                    marginBottom: 3,
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        fontSize: '0.62rem',
                                                        fontWeight: 600,
                                                        color: 'var(--app-text-muted)',
                                                        letterSpacing: '0.04em',
                                                    }}
                                                >
                                                    {label}
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize: '0.62rem',
                                                        color: 'var(--app-text-muted)',
                                                    }}
                                                >
                                                    {value} / {target}
                                                </span>
                                            </div>
                                            <div
                                                style={{
                                                    height: 4,
                                                    borderRadius: 2,
                                                    background:
                                                        'var(--app-border-2)',
                                                    overflow: 'hidden',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        height: '100%',
                                                        width: `${pct}%`,
                                                        background:
                                                            pct >= 100
                                                                ? color
                                                                : `${color}80`,
                                                        borderRadius: 2,
                                                        transition:
                                                            'width 600ms ease',
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        })()}

                    {/* combo requirements */}
                    {isExpanded &&
                        isAuto &&
                        (() => {
                            const LEG = new Set([
                                'Legendary',
                                'Divine',
                                'Celestial',
                                '???',
                            ])
                            type Req = {
                                label: string
                                match: (c: OwnedCard) => boolean
                            }
                            const COMBOS: Partial<Record<string, Req[]>> = {
                                has_n_combo: [
                                    {
                                        label: 'Reshiram ex',
                                        match: (c) =>
                                            c.name.toLowerCase() ===
                                            'reshiram ex',
                                    },
                                    {
                                        label: 'Zekrom ex',
                                        match: (c) =>
                                            c.name.toLowerCase() ===
                                            'zekrom ex',
                                    },
                                ],
                                has_n_legendary_combo: [
                                    {
                                        label: 'Reshiram ex — White Flare (Legendary/Divine)',
                                        match: (c) =>
                                            c.name === 'Reshiram ex' &&
                                            LEG.has(c.rarity) &&
                                            c.set_id === 'sv10.5w',
                                    },
                                    {
                                        label: 'Zekrom ex — Black Bolt (Legendary/Divine)',
                                        match: (c) =>
                                            c.name === 'Zekrom ex' &&
                                            LEG.has(c.rarity) &&
                                            c.set_id === 'sv10.5b',
                                    },
                                ],
                                has_creation_trio: [
                                    {
                                        label: 'Dialga VMAX',
                                        match: (c) =>
                                            c.name
                                                .toLowerCase()
                                                .includes('dialga') &&
                                            c.name
                                                .toLowerCase()
                                                .includes('vmax'),
                                    },
                                    {
                                        label: 'Palkia VMAX',
                                        match: (c) =>
                                            c.name
                                                .toLowerCase()
                                                .includes('palkia') &&
                                            c.name
                                                .toLowerCase()
                                                .includes('vmax'),
                                    },
                                    {
                                        label: 'Giratina VMAX',
                                        match: (c) =>
                                            c.name
                                                .toLowerCase()
                                                .includes('giratina') &&
                                            c.name
                                                .toLowerCase()
                                                .includes('vmax'),
                                    },
                                ],
                                has_mew_mewtwo: [
                                    {
                                        label: 'Mew (Legendary+)',
                                        match: (c) =>
                                            LEG.has(c.rarity) &&
                                            c.name
                                                .toLowerCase()
                                                .includes('mew') &&
                                            !c.name
                                                .toLowerCase()
                                                .includes('mewtwo'),
                                    },
                                    {
                                        label: 'Mewtwo (Legendary+)',
                                        match: (c) =>
                                            LEG.has(c.rarity) &&
                                            c.name
                                                .toLowerCase()
                                                .includes('mewtwo'),
                                    },
                                ],
                            }
                            const reqs = COMBOS[quest.requirement_metric ?? '']
                            if (!reqs) return null
                            return (
                                <div style={{ marginBottom: 10 }}>
                                    {reqs.map((req, i) => {
                                        const found = ownedCards.find(req.match)
                                        return (
                                            <div
                                                key={i}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 7,
                                                    padding: '4px 0',
                                                    fontSize: '0.7rem',
                                                    color: found
                                                        ? '#4ade80'
                                                        : 'var(--app-text-ghost)',
                                                    borderBottom:
                                                        i < reqs.length - 1
                                                            ? '1px solid var(--app-border)'
                                                            : undefined,
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        fontSize: '0.75rem',
                                                    }}
                                                >
                                                    {found ? '✓' : '✗'}
                                                </span>
                                                {found ? (
                                                    <span>
                                                        <span
                                                            style={{
                                                                color: 'var(--app-text-muted)',
                                                            }}
                                                        >
                                                            {found.set_id}{' '}
                                                            —{' '}
                                                        </span>
                                                        {found.name}{' '}
                                                        <span
                                                            style={{
                                                                color: 'var(--app-text-ghost)',
                                                            }}
                                                        >
                                                            ({found.rarity})
                                                        </span>
                                                    </span>
                                                ) : (
                                                    <span
                                                        style={{
                                                            fontStyle: 'italic',
                                                        }}
                                                    >
                                                        {req.label}
                                                    </span>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )
                        })()}

                    {/* reward row */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            flexWrap: 'wrap',
                        }}
                    >
                        <span
                            style={{
                                fontSize: '0.72rem',
                                color: '#ca8a04',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 3,
                            }}
                        >
                            $ <strong>{displayCoins}</strong>
                        </span>
                        <span
                            className="quest-xp-text"
                            style={{
                                fontSize: '0.72rem',
                                color: '#4ade80',
                                fontWeight: 600,
                            }}
                        >
                            +{displayXP} XP
                        </span>
                        {quest.title_reward && (
                            <span
                                style={{
                                    fontSize: '0.62rem',
                                    fontWeight: 700,
                                    padding: '2px 7px',
                                    borderRadius: 5,
                                    background: 'rgba(250,204,21,0.12)',
                                    border: '1px solid rgba(250,204,21,0.35)',
                                    color: '#fbbf24',
                                    letterSpacing: '0.03em',
                                }}
                            >
                                🎖️ {quest.title_reward}
                            </span>
                        )}
                        {quest.is_hidden && (
                            <span
                                style={{
                                    fontSize: '0.58rem',
                                    fontWeight: 700,
                                    padding: '2px 6px',
                                    borderRadius: 5,
                                    background: 'rgba(168,85,247,0.1)',
                                    border: '1px solid rgba(168,85,247,0.3)',
                                    color: '#a855f7',
                                }}
                            >
                                ✦ SECRET
                            </span>
                        )}
                        {isSelfReport && (
                            <span
                                style={{
                                    fontSize: '0.62rem',
                                    color: 'var(--app-text-ghost)',
                                    fontStyle: 'italic',
                                }}
                            >
                                (self-report, 1/5 rate)
                            </span>
                        )}
                    </div>
                </div>

                {/* action button */}
                <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        flexShrink: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: 6,
                    }}
                >
                    {completed ? (
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-end',
                                gap: 5,
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    color: 'var(--app-text-ghost)',
                                    fontSize: '0.7rem',
                                }}
                            >
                                <IconCheck
                                    size={14}
                                    color="var(--app-text-ghost)"
                                />
                                Done
                            </div>
                            {onReplayDialogue && (
                                <button
                                    onClick={onReplayDialogue}
                                    style={{
                                        padding: '4px 10px',
                                        borderRadius: 6,
                                        fontSize: '0.65rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        background: 'rgba(74,222,128,0.08)',
                                        border: '1px solid rgba(74,222,128,0.25)',
                                        color: '#4ade80',
                                    }}
                                >
                                    ▶ Replay
                                </button>
                            )}
                        </div>
                    ) : onCooldown ? (
                        <div
                            style={{
                                padding: '6px 12px',
                                borderRadius: 8,
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                color: '#fbbf24',
                                background: 'rgba(251,191,36,0.08)',
                                border: '1px solid rgba(251,191,36,0.2)',
                                whiteSpace: 'nowrap',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 5,
                            }}
                        >
                            <IconClock size={12} color="#fbbf24" />
                            {formatCooldown(cooldownMs)}
                        </div>
                    ) : isAuto && onPhraseVerify ? (
                        <button
                            onClick={onExpand}
                            style={{
                                padding: '6px 14px',
                                borderRadius: 8,
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                background: isExpanded
                                    ? `${meta.color}22`
                                    : 'var(--app-surface-2)',
                                border: isExpanded
                                    ? `1px solid ${meta.color}50`
                                    : '1px solid var(--app-border-2)',
                                color: isExpanded
                                    ? meta.color
                                    : 'var(--app-text-secondary)',
                            }}
                        >
                            {isExpanded ? 'Close' : 'Enter Phrase'}
                        </button>
                    ) : isAuto && onGiveCard && !isReady ? (
                        !giveConfirming ? (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setGiveConfirming(true)
                                }}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: 8,
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    background: 'rgba(248,113,113,0.12)',
                                    border: '1px solid rgba(248,113,113,0.4)',
                                    color: '#f87171',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 5,
                                }}
                            >
                                🎴 Give to N
                            </button>
                        ) : (
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <span
                                    style={{
                                        fontSize: '0.66rem',
                                        color: '#f87171',
                                        fontStyle: 'italic',
                                    }}
                                >
                                    Give your most prized card?
                                </span>
                                <button
                                    onClick={() => {
                                        onGiveCard()
                                        setGiveConfirming(false)
                                    }}
                                    style={{
                                        padding: '4px 10px',
                                        borderRadius: 6,
                                        fontSize: '0.68rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        background: 'rgba(248,113,113,0.2)',
                                        border: '1px solid rgba(248,113,113,0.5)',
                                        color: '#f87171',
                                    }}
                                >
                                    Yes
                                </button>
                                <button
                                    onClick={() => setGiveConfirming(false)}
                                    style={{
                                        padding: '4px 10px',
                                        borderRadius: 6,
                                        fontSize: '0.68rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        background: 'var(--app-surface-2)',
                                        border: '1px solid var(--app-border)',
                                        color: 'var(--app-text-muted)',
                                    }}
                                >
                                    No
                                </button>
                            </div>
                        )
                    ) : isAuto && onChallenge && !isReady ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                onChallenge()
                            }}
                            style={{
                                padding: '6px 14px',
                                borderRadius: 8,
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                background: 'rgba(248,113,113,0.12)',
                                border: '1px solid rgba(248,113,113,0.4)',
                                color: '#f87171',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 5,
                            }}
                        >
                            Challenge N
                        </button>
                    ) : isAuto ? (
                        <button
                            onClick={onAutoClaim}
                            disabled={!isReady || claiming}
                            style={{
                                padding: '6px 14px',
                                borderRadius: 8,
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                cursor:
                                    isReady && !claiming
                                        ? 'pointer'
                                        : 'not-allowed',
                                background: isReady
                                    ? `${meta.color}22`
                                    : 'var(--app-surface-2)',
                                border: claiming
                                    ? `1px solid ${meta.color}80`
                                    : isReady
                                      ? `1px solid ${meta.color}50`
                                      : '1px solid var(--app-border)',
                                color: isReady
                                    ? meta.color
                                    : 'var(--app-text-ghost)',
                                transition: 'all 200ms',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 5,
                                animation: claiming
                                    ? 'subtle-pulse 0.9s ease-in-out infinite'
                                    : undefined,
                            }}
                        >
                            {claiming ? (
                                <>
                                    <IconSpinner size={12} color={meta.color} />{' '}
                                    Claiming…
                                </>
                            ) : isReady ? (
                                <>
                                    <IconCheck size={13} color={meta.color} />{' '}
                                    Claim
                                </>
                            ) : (
                                'In Progress'
                            )}
                        </button>
                    ) : (
                        <button
                            onClick={onExpand}
                            style={{
                                padding: '6px 14px',
                                borderRadius: 8,
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                background: isExpanded
                                    ? `${meta.color}22`
                                    : 'var(--app-surface-2)',
                                border: isExpanded
                                    ? `1px solid ${meta.color}50`
                                    : '1px solid var(--app-border-2)',
                                color: isExpanded
                                    ? meta.color
                                    : 'var(--app-text-secondary)',
                                transition: 'all 200ms',
                            }}
                        >
                            {isExpanded ? 'Cancel' : 'Complete'}
                        </button>
                    )}

                    {/* claimed flash */}
                    {reward && !completed && !onCooldown && (
                        <span style={{ fontSize: '0.62rem', color: '#ca8a04' }}>
                            +{reward.coins}$
                        </span>
                    )}
                </div>
            </div>

            {/* self-report expand panel */}
            {isExpanded && !completed && !onCooldown && (
                <div
                    style={{
                        marginTop: 14,
                        paddingTop: 14,
                        borderTop: '1px solid var(--app-border)',
                    }}
                >
                    {quest.verification_hint && (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 8,
                                marginBottom: 12,
                                padding: '8px 12px',
                                background: 'rgba(251,146,60,0.06)',
                                border: '1px solid rgba(251,146,60,0.2)',
                                borderRadius: 10,
                            }}
                        >
                            <svg
                                width={14}
                                height={14}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#fb923c"
                                strokeWidth={2}
                                strokeLinecap="round"
                                style={{ flexShrink: 0, marginTop: 1 }}
                            >
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            <div>
                                <p
                                    style={{
                                        fontSize: '0.72rem',
                                        color: '#fb923c',
                                        fontWeight: 600,
                                        margin: '0 0 3px',
                                    }}
                                >
                                    {quest.verification_hint}
                                </p>
                                {quest.verification_suggestion && (
                                    <p
                                        style={{
                                            fontSize: '0.68rem',
                                            color: 'var(--app-text-muted)',
                                            margin: 0,
                                            lineHeight: 1.5,
                                        }}
                                    >
                                        {quest.verification_suggestion}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* phrase input for liberator-phrase quest */}
                    {isAuto && onPhraseVerify && !completed && isExpanded && (
                        <div
                            style={{ marginTop: 12 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div
                                style={{
                                    fontSize: '0.72rem',
                                    color: 'var(--app-text-muted)',
                                    marginBottom: 6,
                                }}
                            >
                                Enter the secret phrase:
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input
                                    value={phraseInput}
                                    onChange={(e) => {
                                        setPhraseInput(e.target.value)
                                        setPhraseStatus('idle')
                                    }}
                                    onKeyDown={async (e) => {
                                        if (
                                            e.key === 'Enter' &&
                                            phraseInput.trim() &&
                                            phraseStatus !== 'checking'
                                        ) {
                                            setPhraseStatus('checking')
                                            const result = await onPhraseVerify(
                                                phraseInput.trim(),
                                            )
                                            if (result !== 'ok')
                                                setPhraseStatus(result)
                                        }
                                    }}
                                    placeholder="Type the phrase..."
                                    style={{
                                        flex: 1,
                                        padding: '6px 10px',
                                        borderRadius: 8,
                                        background: 'var(--app-surface-2)',
                                        border:
                                            phraseStatus === 'wrong'
                                                ? '1px solid #f87171'
                                                : '1px solid var(--app-border)',
                                        color: 'var(--app-text)',
                                        fontSize: '0.8rem',
                                        outline: 'none',
                                    }}
                                />
                                <button
                                    disabled={
                                        !phraseInput.trim() ||
                                        phraseStatus === 'checking'
                                    }
                                    onClick={async () => {
                                        setPhraseStatus('checking')
                                        const result = await onPhraseVerify(
                                            phraseInput.trim(),
                                        )
                                        if (result !== 'ok')
                                            setPhraseStatus(result)
                                    }}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: 8,
                                        fontSize: '0.72rem',
                                        fontWeight: 600,
                                        cursor:
                                            phraseInput.trim() &&
                                            phraseStatus !== 'checking'
                                                ? 'pointer'
                                                : 'not-allowed',
                                        background: `${meta.color}22`,
                                        border: `1px solid ${meta.color}50`,
                                        color: meta.color,
                                    }}
                                >
                                    {phraseStatus === 'checking'
                                        ? '...'
                                        : 'Verify'}
                                </button>
                            </div>
                            {phraseStatus === 'wrong' && (
                                <p
                                    style={{
                                        fontSize: '0.68rem',
                                        color: '#f87171',
                                        margin: '5px 0 0',
                                    }}
                                >
                                    That's not it. Try again.
                                </p>
                            )}
                            {phraseStatus === 'error' && (
                                <p
                                    style={{
                                        fontSize: '0.68rem',
                                        color: '#f87171',
                                        margin: '5px 0 0',
                                    }}
                                >
                                    Something went wrong. Try again.
                                </p>
                            )}
                        </div>
                    )}

                    {/* auto quests: info only — no claim form, but show action CTA if applicable */}
                    {isAuto ? (
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginTop: 4,
                                gap: 8,
                            }}
                        >
                            {quest.slug === 'tutorial-complete' && (
                                <Link
                                    href="/dashboard/settings?action=tutorial"
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 5,
                                        padding: '6px 14px',
                                        borderRadius: 8,
                                        fontSize: '0.72rem',
                                        fontWeight: 600,
                                        background: 'rgba(0, 0, 0, 0.1)',
                                        border: '1px solid rgba(255, 255, 255, 0.3)',
                                        color: '#fc9f36',
                                        textDecoration: 'none',
                                    }}
                                >
                                    ▶ Replay Tutorial
                                </Link>
                            )}
                            {(quest.slug === 'link-discord' ||
                                quest.requirement_metric ===
                                    'discord_connected') && (
                                <Link
                                    href="/dashboard/settings?action=discord"
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 5,
                                        padding: '6px 14px',
                                        borderRadius: 8,
                                        fontSize: '0.72rem',
                                        fontWeight: 600,
                                        background: 'rgba(88,101,242,0.1)',
                                        border: '1px solid rgba(88,101,242,0.35)',
                                        color: '#818cf8',
                                        textDecoration: 'none',
                                    }}
                                >
                                    🔗 Link Discord →
                                </Link>
                            )}
                            {(quest.slug === 'first-supporter' ||
                                quest.slug?.includes('supporter')) && (
                                <Link
                                    href="/dashboard/shop"
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 5,
                                        padding: '6px 14px',
                                        borderRadius: 8,
                                        fontSize: '0.72rem',
                                        fontWeight: 600,
                                        background: 'rgba(234,179,8,0.1)',
                                        border: '1px solid rgba(234,179,8,0.35)',
                                        color: '#fbbf24',
                                        textDecoration: 'none',
                                    }}
                                >
                                    💰 Top Up →
                                </Link>
                            )}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onExpand()
                                }}
                                style={{
                                    marginLeft: 'auto',
                                    padding: '5px 12px',
                                    borderRadius: 8,
                                    fontSize: '0.7rem',
                                    cursor: 'pointer',
                                    background: 'transparent',
                                    border: '1px solid var(--app-border)',
                                    color: 'var(--app-text-muted)',
                                }}
                            >
                                Close
                            </button>
                        </div>
                    ) : (
                        <>
                            {hasTimed ? (
                                <TimerPanel
                                    targetMinutes={quest.timed_minutes!}
                                    onComplete={() => setTimerDone(true)}
                                />
                            ) : (
                                <textarea
                                    value={notes}
                                    onChange={(e) =>
                                        onNotesChange(e.target.value)
                                    }
                                    onClick={(e) => e.stopPropagation()}
                                    placeholder="Optional: add notes, proof, or what you did..."
                                    rows={2}
                                    style={{
                                        width: '100%',
                                        background: 'var(--app-surface)',
                                        border: '1px solid var(--app-border-2)',
                                        borderRadius: 8,
                                        padding: '9px 12px',
                                        fontSize: '0.75rem',
                                        color: 'var(--app-text)',
                                        resize: 'none',
                                        outline: 'none',
                                        boxSizing: 'border-box',
                                        marginBottom: 10,
                                    }}
                                />
                            )}

                            <div
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'flex-end',
                                    gap: 8,
                                    marginTop: hasTimed ? 10 : 0,
                                }}
                            >
                                <button
                                    onClick={onExpand}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: 8,
                                        fontSize: '0.72rem',
                                        cursor: 'pointer',
                                        background: 'transparent',
                                        border: '1px solid var(--app-border)',
                                        color: 'var(--app-text-muted)',
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={onClaim}
                                    disabled={
                                        claiming || (hasTimed && !timerDone)
                                    }
                                    style={{
                                        padding: '6px 16px',
                                        borderRadius: 8,
                                        fontSize: '0.72rem',
                                        fontWeight: 600,
                                        cursor:
                                            claiming || (hasTimed && !timerDone)
                                                ? 'not-allowed'
                                                : 'pointer',
                                        background: `${meta.color}22`,
                                        border: claiming
                                            ? `1px solid ${meta.color}90`
                                            : `1px solid ${meta.color}50`,
                                        color: meta.color,
                                        opacity:
                                            !claiming && hasTimed && !timerDone
                                                ? 0.35
                                                : 1,
                                        transition:
                                            'opacity 200ms, border-color 200ms',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        animation: claiming
                                            ? 'subtle-pulse 0.9s ease-in-out infinite'
                                            : undefined,
                                    }}
                                >
                                    {claiming ? (
                                        <>
                                            <IconSpinner
                                                size={12}
                                                color={meta.color}
                                            />{' '}
                                            Claiming…
                                        </>
                                    ) : hasTimed && !timerDone ? (
                                        'Complete Timer First'
                                    ) : (
                                        <>
                                            <IconCheck
                                                size={13}
                                                color={meta.color}
                                            />{' '}
                                            Claim Reward
                                        </>
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
