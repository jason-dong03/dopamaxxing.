'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import {
    getDailyTrainerId,
    TRAINER_INFO,
    getTrainerPool,
    type TrainerId,
} from '@/lib/n-battle'
import { createClient } from '@/lib/supabase/client'

const BattleScreen = dynamic(
    () => import('@/components/dialogs/BattleScreen'),
    { ssr: false },
)

const TYPE_COLOR: Record<string, string> = {
    fire: '#f87171',
    water: '#60a5fa',
    grass: '#4ade80',
    electric: '#fbbf24',
    dark: '#a78bfa',
    dragon: '#818cf8',
    ghost: '#c084fc',
    steel: '#94a3b8',
    psychic: '#f472b4',
    rock: '#d97706',
    ice: '#67e8f9',
    fighting: '#fb923c',
    normal: '#9ca3af',
    poison: '#a78bfa',
    ground: '#d97706',
    flying: '#7dd3fc',
    bug: '#86efac',
    fairy: '#f9a8d4',
}

const BATTLE_RULES = [
    'Pick 5 cards from your collection as your team',
    'Speed determines turn order — faster cards attack first',
    'All cards in your party gain EXP when you win',
    'Earn enough EXP to level up your cards',
    'Type advantages deal 2× damage — use them wisely',
]

type LineupCard = {
    id: string
    card_level: number
    cards: {
        id: string
        name: string
        image_url: string | null
        rarity: string
    }
}

type UserCard = {
    id: string
    card_level: number
    cards: {
        id: string
        name: string
        image_url: string | null
        rarity: string
    }
}

export default function BattlesPage() {
    const [battleOpen, setBattleOpen] = useState(false)
    const [trainerId, setTrainerId] = useState<TrainerId>('n')
    const [battlesWon, setBattlesWon] = useState<number | null>(null)
    const [lineup, setLineup] = useState<LineupCard[]>([])
    const [showRules, setShowRules] = useState(false)
    const [userLevel, setUserLevel] = useState<number | null>(null)

    // Lineup setup modal
    const [setupOpen, setSetupOpen] = useState(false)
    const [allCards, setAllCards] = useState<UserCard[]>([])
    const [selected, setSelected] = useState<string[]>([])
    const [saving, setSaving] = useState(false)
    const supabase = createClient()

    const fetchLineup = useCallback(() => {
        fetch('/api/battle-lineup')
            .then((r) => r.json())
            .then((d) => {
                if (Array.isArray(d.cards)) setLineup(d.cards)
            })
            .catch(() => {})
    }, [])

    useEffect(() => {
        setTrainerId(getDailyTrainerId())
        fetch('/api/n-battle/stats')
            .then((r) => r.json())
            .then((d) => {
                if (d.battlesWon != null) setBattlesWon(d.battlesWon)
            })
            .catch(() => {})
        fetchLineup()
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) return
            supabase.from('profiles').select('level').eq('id', user.id).single()
                .then(({ data }) => { if (data?.level) setUserLevel(data.level) })
        })
    }, [fetchLineup])

    async function openSetup() {
        setSetupOpen(true)
        setSelected(lineup.map((c) => c.id))
        const {
            data: { user },
        } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase
            .from('user_cards')
            .select('id, card_level, cards!inner(id, name, image_url, rarity)')
            .eq('user_id', user.id)
            .order('card_level', { ascending: false })
            .limit(60)
        setAllCards((data ?? []) as unknown as UserCard[])
    }

    function toggleCard(id: string) {
        setSelected((prev) =>
            prev.includes(id)
                ? prev.filter((x) => x !== id)
                : prev.length < 5
                  ? [...prev, id]
                  : prev,
        )
    }

    async function saveLineup() {
        if (selected.length === 0) return
        setSaving(true)
        await fetch('/api/battle-lineup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lineup: selected }),
        })
        setSaving(false)
        setSetupOpen(false)
        fetchLineup()
    }

    const trainer = TRAINER_INFO[trainerId]
    const trainerPool = getTrainerPool(trainerId, userLevel ?? undefined)

    return (
        <div
            style={{
                minHeight: '100vh',
                padding: '24px 16px 100px',
                maxWidth: 640,
                margin: '0 auto',
            }}
        >
            <h1
                style={{
                    fontSize: '1.1rem',
                    fontWeight: 800,
                    color: '#e2e8f0',
                    margin: '0 0 4px',
                }}
            >
                Battles
            </h1>
            <p
                style={{
                    fontSize: '0.72rem',
                    color: '#4b5563',
                    margin: '0 0 24px',
                }}
            >
                Challenge a trainer daily to earn EXP and level up your cards.
            </p>

            {/* Daily trainer card */}
            <div
                style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${trainer.color}44`,
                    borderRadius: 16,
                    padding: '20px 20px 24px',
                    marginBottom: 20,
                    boxShadow: `0 0 40px ${trainer.color}10`,
                }}
            >
                {/* Daily badge */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        marginBottom: 16,
                    }}
                >
                    <div
                        style={{
                            background: `${trainer.color}22`,
                            border: `1px solid ${trainer.color}44`,
                            borderRadius: 6,
                            padding: '3px 10px',
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            color: trainer.color,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                        }}
                    >
                        Daily Challenge
                    </div>
                </div>

                {/* Centered trainer layout */}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 12,
                    }}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={trainer.sprite}
                        alt={trainer.name}
                        style={{
                            height: 112,
                            imageRendering: 'pixelated',
                            filter: `drop-shadow(0 0 20px ${trainer.color}66)`,
                        }}
                        onError={(e) => {
                            ;(e.target as HTMLImageElement).style.display =
                                'none'
                        }}
                    />
                    <div style={{ textAlign: 'center' }}>
                        <div
                            style={{
                                fontSize: '1.3rem',
                                fontWeight: 800,
                                color: '#e2e8f0',
                                marginBottom: 2,
                            }}
                        >
                            {trainer.name}
                        </div>
                        <div
                            style={{
                                fontSize: '0.72rem',
                                color: '#6b7280',
                                marginBottom: 12,
                            }}
                        >
                            {trainer.title}
                        </div>
                        {/* Type badges */}
                        <div
                            style={{
                                display: 'flex',
                                gap: 5,
                                flexWrap: 'wrap',
                                justifyContent: 'center',
                                marginBottom: 16,
                            }}
                        >
                            {trainer.types.map((t) => (
                                <span
                                    key={t}
                                    style={{
                                        fontSize: '0.6rem',
                                        fontWeight: 700,
                                        padding: '2px 8px',
                                        borderRadius: 4,
                                        background: `${TYPE_COLOR[t] ?? '#94a3b8'}22`,
                                        border: `1px solid ${TYPE_COLOR[t] ?? '#94a3b8'}44`,
                                        color: TYPE_COLOR[t] ?? '#94a3b8',
                                        textTransform: 'capitalize',
                                    }}
                                >
                                    {t}
                                </span>
                            ))}
                        </div>
                        <button
                            onClick={() => setBattleOpen(true)}
                            style={{
                                padding: '10px 32px',
                                borderRadius: 10,
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                background: `${trainer.color}1a`,
                                border: `1px solid ${trainer.color}55`,
                                color: trainer.color,
                                cursor: 'pointer',
                                transition: 'all 150ms',
                            }}
                        >
                            Battle Now →
                        </button>
                    </div>
                </div>

                {/* Trainer's pokemon pool */}
                <div
                    style={{
                        marginTop: 20,
                        borderTop: `1px solid ${trainer.color}22`,
                        paddingTop: 16,
                    }}
                >
                    <div
                        style={{
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            color: '#4b5563',
                            marginBottom: 12,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            textAlign: 'center',
                        }}
                    >
                        {trainer.name}&apos;s Pokémon
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 4,
                        }}
                    >
                        {trainerPool.map((p) => (
                            <div
                                key={p.name}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 4,
                                    flex: 1,
                                    minWidth: 0,
                                }}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={p.image_url}
                                    alt={p.name}
                                    style={{
                                        width: 52,
                                        height: 52,
                                        imageRendering: 'pixelated',
                                        objectFit: 'contain',
                                    }}
                                    onError={(e) => {
                                        ;(
                                            e.target as HTMLImageElement
                                        ).style.opacity = '0.2'
                                    }}
                                />
                                <span
                                    style={{
                                        fontSize: '0.5rem',
                                        color: '#6b7280',
                                        textAlign: 'center',
                                        wordBreak: 'break-word',
                                    }}
                                >
                                    {p.name}
                                </span>
                                <span
                                    style={{
                                        fontSize: '0.44rem',
                                        color: '#374151',
                                    }}
                                >
                                    Lv.{p.level}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                <div
                    style={{
                        flex: 1,
                        background: 'rgba(255,255,255,0.025)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 12,
                        padding: '14px 16px',
                    }}
                >
                    <div
                        style={{
                            fontSize: '0.62rem',
                            color: '#4b5563',
                            fontWeight: 600,
                            marginBottom: 4,
                        }}
                    >
                        Battles Won
                    </div>
                    <div
                        style={{
                            fontSize: '1.4rem',
                            fontWeight: 800,
                            color: '#4ade80',
                        }}
                    >
                        {battlesWon ?? '—'}
                    </div>
                </div>
                <div
                    style={{
                        flex: 1,
                        background: 'rgba(255,255,255,0.025)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 12,
                        padding: '14px 16px',
                    }}
                >
                    <div
                        style={{
                            fontSize: '0.62rem',
                            color: '#4b5563',
                            fontWeight: 600,
                            marginBottom: 4,
                        }}
                    >
                        EXP per Win
                    </div>
                    <div
                        style={{
                            fontSize: '1.4rem',
                            fontWeight: 800,
                            color: '#fb923c',
                        }}
                    >
                        5 - 15% of current level
                    </div>
                </div>
            </div>

            {/* My Team */}
            <div
                style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: 12,
                    padding: '14px 16px',
                    position: 'relative',
                }}
            >
                {/* Header */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 12,
                    }}
                >
                    <div
                        style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: '#e2e8f0',
                        }}
                    >
                        My Team
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                        }}
                    >
                        {lineup.length > 0 && (
                            <button
                                onClick={openSetup}
                                style={{
                                    fontSize: '0.6rem',
                                    fontWeight: 700,
                                    padding: '3px 9px',
                                    borderRadius: 6,
                                    border: '1px solid rgba(255,255,255,0.12)',
                                    background: 'rgba(255,255,255,0.05)',
                                    color: '#9ca3af',
                                    cursor: 'pointer',
                                }}
                            >
                                Edit
                            </button>
                        )}
                        {/* Circular 'i' icon */}
                        <div
                            style={{
                                position: 'relative',
                                display: 'inline-block',
                            }}
                        >
                            <div
                                onMouseEnter={() => setShowRules(true)}
                                onMouseLeave={() => setShowRules(false)}
                                style={{
                                    width: 18,
                                    height: 18,
                                    borderRadius: '50%',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.6rem',
                                    color: '#6b7280',
                                    cursor: 'default',
                                    fontStyle: 'italic',
                                    fontWeight: 700,
                                }}
                            >
                                i
                            </div>
                            {showRules && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        right: 0,
                                        bottom: '120%',
                                        background: '#1e1e2e',
                                        border: '1px solid rgba(255,255,255,0.12)',
                                        borderRadius: 10,
                                        padding: '10px 14px',
                                        width: 240,
                                        zIndex: 10,
                                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: '0.62rem',
                                            fontWeight: 700,
                                            color: '#e2e8f0',
                                            marginBottom: 8,
                                        }}
                                    >
                                        How Battles Work
                                    </div>
                                    {BATTLE_RULES.map((rule, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                display: 'flex',
                                                gap: 6,
                                                alignItems: 'flex-start',
                                                marginBottom: 5,
                                            }}
                                        >
                                            <span
                                                style={{
                                                    color: '#4ade80',
                                                    fontSize: '0.58rem',
                                                    marginTop: 2,
                                                    flexShrink: 0,
                                                }}
                                            >
                                                ▸
                                            </span>
                                            <span
                                                style={{
                                                    fontSize: '0.62rem',
                                                    color: '#9ca3af',
                                                    lineHeight: 1.5,
                                                }}
                                            >
                                                {rule}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Saved lineup or empty state */}
                {lineup.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '16px 0' }}>
                        <p
                            style={{
                                fontSize: '0.72rem',
                                color: '#374151',
                                margin: '0 0 12px',
                            }}
                        >
                            No preset team saved yet.
                        </p>
                        <button
                            onClick={openSetup}
                            style={{
                                padding: '9px 22px',
                                borderRadius: 10,
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background: 'rgba(99,102,241,0.12)',
                                border: '1px solid rgba(99,102,241,0.35)',
                                color: '#818cf8',
                                cursor: 'pointer',
                                transition: 'all 150ms',
                            }}
                        >
                            + Setup Lineup
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {lineup.map((uc, i) => (
                            <div
                                key={uc.id}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 3,
                                }}
                            >
                                <div
                                    style={{
                                        width: 54,
                                        height: 72,
                                        borderRadius: 6,
                                        overflow: 'hidden',
                                        background: 'rgba(255,255,255,0.04)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        flexShrink: 0,
                                    }}
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={uc.cards.image_url ?? ''}
                                        alt={uc.cards.name}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                        }}
                                    />
                                </div>
                                <span
                                    style={{
                                        fontSize: '0.5rem',
                                        color: '#6b7280',
                                        textAlign: 'center',
                                        maxWidth: 54,
                                    }}
                                >
                                    {uc.cards.name}
                                </span>
                                <span
                                    style={{
                                        fontSize: '0.44rem',
                                        color: '#374151',
                                    }}
                                >
                                    Lv.{uc.card_level ?? 1}
                                </span>
                                <span
                                    style={{
                                        fontSize: '0.42rem',
                                        color: '#374151',
                                    }}
                                >
                                    #{i + 1}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Lineup setup modal */}
            {setupOpen && (
                <div
                    onClick={() => setSetupOpen(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        background: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#0e0e16',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '16px 16px 0 0',
                            width: '100%',
                            maxWidth: 640,
                            maxHeight: '80vh',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        {/* Header */}
                        <div
                            style={{
                                padding: '16px 16px 12px',
                                borderBottom:
                                    '1px solid rgba(255,255,255,0.06)',
                                flexShrink: 0,
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: 4,
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: '0.85rem',
                                        fontWeight: 700,
                                        color: '#e2e8f0',
                                    }}
                                >
                                    Setup Lineup
                                </span>
                                <button
                                    onClick={() => setSetupOpen(false)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#6b7280',
                                        cursor: 'pointer',
                                        fontSize: '1.1rem',
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                            <p
                                style={{
                                    fontSize: '0.65rem',
                                    color: '#4b5563',
                                    margin: 0,
                                }}
                            >
                                Select up to 5 cards · {selected.length}/5
                                chosen
                            </p>
                        </div>

                        {/* Card grid */}
                        <div
                            style={{ overflowY: 'auto', padding: 12, flex: 1 }}
                        >
                            {allCards.length === 0 ? (
                                <p
                                    style={{
                                        fontSize: '0.72rem',
                                        color: '#4b5563',
                                        textAlign: 'center',
                                        padding: '24px 0',
                                    }}
                                >
                                    Loading cards…
                                </p>
                            ) : (
                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(4, 1fr)',
                                        gap: 8,
                                    }}
                                >
                                    {allCards.map((card) => {
                                        const isSelected = selected.includes(
                                            card.id,
                                        )
                                        const slot = isSelected
                                            ? selected.indexOf(card.id) + 1
                                            : null
                                        return (
                                            <div
                                                key={card.id}
                                                onClick={() =>
                                                    toggleCard(card.id)
                                                }
                                                style={{
                                                    position: 'relative',
                                                    cursor: 'pointer',
                                                    borderRadius: 8,
                                                    overflow: 'hidden',
                                                    border: isSelected
                                                        ? '2px solid #818cf8'
                                                        : '2px solid rgba(255,255,255,0.06)',
                                                    opacity:
                                                        !isSelected &&
                                                        selected.length >= 5
                                                            ? 0.4
                                                            : 1,
                                                    transition: 'all 120ms',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        aspectRatio: '2/3',
                                                        background:
                                                            'rgba(255,255,255,0.04)',
                                                    }}
                                                >
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={
                                                            card.cards
                                                                .image_url ?? ''
                                                        }
                                                        alt={card.cards.name}
                                                        style={{
                                                            width: '100%',
                                                            height: '100%',
                                                            objectFit: 'cover',
                                                        }}
                                                    />
                                                </div>
                                                {slot !== null && (
                                                    <div
                                                        style={{
                                                            position:
                                                                'absolute',
                                                            top: 4,
                                                            right: 4,
                                                            background:
                                                                '#818cf8',
                                                            color: '#fff',
                                                            borderRadius: '50%',
                                                            width: 18,
                                                            height: 18,
                                                            display: 'flex',
                                                            alignItems:
                                                                'center',
                                                            justifyContent:
                                                                'center',
                                                            fontSize: '0.6rem',
                                                            fontWeight: 800,
                                                        }}
                                                    >
                                                        {slot}
                                                    </div>
                                                )}
                                                <div
                                                    style={{
                                                        padding: '4px 4px 5px',
                                                        background:
                                                            'rgba(0,0,0,0.6)',
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            fontSize: '0.48rem',
                                                            color: '#9ca3af',
                                                            overflow: 'hidden',
                                                            textOverflow:
                                                                'ellipsis',
                                                            whiteSpace:
                                                                'nowrap',
                                                        }}
                                                    >
                                                        {card.cards.name}
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontSize: '0.44rem',
                                                            color: '#4b5563',
                                                        }}
                                                    >
                                                        Lv.
                                                        {card.card_level ?? 1}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div
                            style={{
                                padding: '12px 16px',
                                borderTop: '1px solid rgba(255,255,255,0.06)',
                                flexShrink: 0,
                            }}
                        >
                            <button
                                onClick={saveLineup}
                                disabled={selected.length === 0 || saving}
                                style={{
                                    width: '100%',
                                    padding: '12px 0',
                                    borderRadius: 10,
                                    fontSize: '0.82rem',
                                    fontWeight: 700,
                                    background:
                                        selected.length > 0
                                            ? 'rgba(99,102,241,0.2)'
                                            : 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${selected.length > 0 ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.06)'}`,
                                    color:
                                        selected.length > 0
                                            ? '#818cf8'
                                            : '#374151',
                                    cursor:
                                        selected.length > 0 && !saving
                                            ? 'pointer'
                                            : 'not-allowed',
                                    transition: 'all 150ms',
                                }}
                            >
                                {saving
                                    ? 'Saving…'
                                    : `Save Lineup (${selected.length} card${selected.length !== 1 ? 's' : ''})`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {battleOpen && (
                <BattleScreen
                    trainerId={trainerId}
                    skipToCardSelect={trainerId !== 'n'}
                    onClose={() => setBattleOpen(false)}
                    onBattleWon={() => {
                        setBattleOpen(false)
                        setBattlesWon((prev) => (prev ?? 0) + 1)
                    }}
                />
            )}
        </div>
    )
}
