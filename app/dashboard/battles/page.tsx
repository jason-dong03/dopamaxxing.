'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
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

type SavedLineup = {
    id: string
    name: string
    slots: string[]
    cards: LineupCard[]
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
    const [lineupPickerOpen, setLineupPickerOpen] = useState(false)
    const [pickedLineupIds, setPickedLineupIds] = useState<string[]>([])
    const [trainerId, setTrainerId] = useState<TrainerId>('n')
    const [battlesWon, setBattlesWon] = useState<number | null>(null)
    const [lastWonAt, setLastWonAt] = useState<string | null>(null)
    const [cooldownLeft, setCooldownLeft] = useState(0)
    const [lineups, setLineups] = useState<SavedLineup[]>([])
    const [showRules, setShowRules] = useState(false)
    const [userLevel, setUserLevel] = useState<number | null>(null)
    const [shopOpen, setShopOpen] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => { setMounted(true) }, [])

    // Lineup setup modal
    const [setupOpen, setSetupOpen] = useState(false)
    const [editingLineupId, setEditingLineupId] = useState<string | null>(null)
    const [lineupName, setLineupName] = useState('My Lineup')
    const [allCards, setAllCards] = useState<UserCard[]>([])
    const [selected, setSelected] = useState<string[]>([])
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)
    const supabase = createClient()

    const fetchLineups = useCallback(() => {
        fetch('/api/battle-lineup')
            .then((r) => r.json())
            .then((d) => {
                if (Array.isArray(d.lineups)) setLineups(d.lineups)
            })
            .catch(() => {})
    }, [])

    useEffect(() => {
        setTrainerId(getDailyTrainerId())
        fetch('/api/n-battle/stats')
            .then((r) => r.json())
            .then((d) => {
                if (d.battlesWon != null) setBattlesWon(d.battlesWon)
                if (d.lastWonAt) setLastWonAt(d.lastWonAt)
            })
            .catch(() => {})
        fetchLineups()
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) return
            supabase
                .from('profiles')
                .select('level')
                .eq('id', user.id)
                .single()
                .then(({ data }) => {
                    if (data?.level) setUserLevel(data.level)
                })
        })
    }, [fetchLineups])

    // ── Cooldown ticker ───────────────────────────────────────────────────────
    useEffect(() => {
        function tick() {
            if (!lastWonAt) { setCooldownLeft(0); return }
            const ms = 24 * 60 * 60 * 1000 - (Date.now() - new Date(lastWonAt).getTime())
            setCooldownLeft(Math.max(0, ms))
        }
        tick()
        const id = setInterval(tick, 1000)
        return () => clearInterval(id)
    }, [lastWonAt])

    function fmtCooldown(ms: number) {
        const h = Math.floor(ms / 3_600_000)
        const m = Math.floor((ms % 3_600_000) / 60_000)
        const s = Math.floor((ms % 60_000) / 1000)
        return `${h}h ${m}m ${s}s`
    }

    const onCooldown = cooldownLeft > 0

    async function openSetup(existing?: SavedLineup) {
        setEditingLineupId(existing?.id ?? null)
        setLineupName(existing?.name ?? 'My Lineup')
        setSelected(existing?.slots ?? [])
        setSetupOpen(true)
        const {
            data: { user },
        } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase
            .from('user_cards')
            .select('id, card_level, cards!inner(id, name, image_url, rarity)')
            .eq('user_id', user.id)
            .order('card_level', { ascending: false })
            .limit(100)
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
        setSaveError(null)
        try {
            let res: Response
            if (editingLineupId) {
                res = await fetch(`/api/battle-lineup/${editingLineupId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: lineupName, slots: selected }),
                })
            } else {
                res = await fetch('/api/battle-lineup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: lineupName, slots: selected }),
                })
            }
            if (res.ok) {
                const cards = selected
                    .map((id) => allCards.find((c) => c.id === id))
                    .filter((c): c is UserCard => !!c)
                if (editingLineupId) {
                    setLineups((prev) =>
                        prev.map((l) =>
                            l.id === editingLineupId
                                ? {
                                      ...l,
                                      name: lineupName,
                                      slots: selected,
                                      cards,
                                  }
                                : l,
                        ),
                    )
                } else {
                    const body = await res.json()
                    setLineups((prev) => [
                        ...prev,
                        body.lineup ?? {
                            id: crypto.randomUUID(),
                            name: lineupName,
                            slots: selected,
                            cards,
                        },
                    ])
                }
                setSetupOpen(false)
            } else {
                const body = await res.json().catch(() => ({}))
                setSaveError(body.error ?? 'Failed to save lineup')
            }
        } catch {
            setSaveError('Network error — please try again')
        } finally {
            setSaving(false)
        }
    }

    async function deleteLineup(id: string) {
        await fetch(`/api/battle-lineup/${id}`, { method: 'DELETE' })
        setLineups((prev) => prev.filter((l) => l.id !== id))
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
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 20,
                }}
            >
                <h1
                    style={{
                        fontSize: '1.1rem',
                        fontWeight: 800,
                        color: '#e2e8f0',
                        margin: 0,
                    }}
                >
                    Battles
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                        onClick={() => setShopOpen(true)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            background: '#0d0d1f',
                            border: '1px solid rgba(99,102,241,0.45)',
                            borderRadius: 20, padding: '4px 11px',
                            cursor: 'pointer', transition: 'background 150ms ease',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#151530'}
                        onMouseLeave={e => e.currentTarget.style.background = '#0d0d1f'}
                    >
                        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                        </svg>
                        <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#818cf8' }}>Shop</span>
                    </button>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '3px 9px',
                            background: 'rgba(74,222,128,0.08)',
                            border: '1px solid rgba(74,222,128,0.2)',
                            borderRadius: 6,
                        }}
                    >
                        <span
                            style={{
                                fontSize: '0.56rem',
                                color: '#4b5563',
                                fontWeight: 600,
                            }}
                        >
                            Won
                        </span>
                        <span
                            style={{
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                color: '#4ade80',
                            }}
                        >
                            {battlesWon ?? '—'}
                        </span>
                    </div>
                </div>
            </div>

            {/* My Team */}

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
                        alignItems: 'center',
                        gap: 8,
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
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 9px',
                            background: 'rgba(251,146,60,0.08)',
                            border: '1px solid rgba(251,146,60,0.2)',
                            borderRadius: 6,
                        }}
                    >
                        <span
                            style={{
                                fontSize: '0.56rem',
                                color: '#4b5563',
                                fontWeight: 600,
                            }}
                        >
                            EXP/Win
                        </span>
                        <span
                            style={{
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                color: '#fb923c',
                            }}
                        >
                            5–15%
                        </span>
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
                            onClick={() => { if (!onCooldown) setLineupPickerOpen(true) }}
                            disabled={onCooldown}
                            style={{
                                padding: '10px 32px',
                                borderRadius: 10,
                                fontSize: onCooldown ? '0.65rem' : '0.82rem',
                                fontWeight: 700,
                                background: onCooldown ? 'rgba(255,255,255,0.03)' : `${trainer.color}1a`,
                                border: `1px solid ${onCooldown ? 'rgba(255,255,255,0.08)' : trainer.color + '55'}`,
                                color: onCooldown ? '#4b5563' : trainer.color,
                                cursor: onCooldown ? 'not-allowed' : 'pointer',
                                transition: 'all 150ms',
                            }}
                        >
                            {onCooldown ? `Next battle in ${fmtCooldown(cooldownLeft)}` : 'Battle Now →'}
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
            <div
                style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: 14,
                    padding: '16px 18px 20px',
                    marginBottom: 20,
                    position: 'relative',
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
                    <div
                        style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: '#e2e8f0',
                        }}
                    >
                        My Lineups
                    </div>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                        }}
                    >
                        <button
                            onClick={() => openSetup()}
                            style={{
                                fontSize: '0.6rem',
                                fontWeight: 700,
                                padding: '4px 10px',
                                borderRadius: 6,
                                border: '1px solid rgba(99,102,241,0.35)',
                                background: 'rgba(99,102,241,0.1)',
                                color: '#818cf8',
                                cursor: 'pointer',
                            }}
                        >
                            + New
                        </button>
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

                {lineups.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                        <p
                            style={{
                                fontSize: '0.72rem',
                                color: '#374151',
                                margin: '0 0 12px',
                            }}
                        >
                            No lineups saved yet.
                        </p>
                        <button
                            onClick={() => openSetup()}
                            style={{
                                padding: '9px 22px',
                                borderRadius: 10,
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background: 'rgba(99,102,241,0.12)',
                                border: '1px solid rgba(99,102,241,0.35)',
                                color: '#818cf8',
                                cursor: 'pointer',
                            }}
                        >
                            + Create Lineup
                        </button>
                    </div>
                ) : (
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 14,
                        }}
                    >
                        {lineups.map((lu) => (
                            <div key={lu.id}>
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        marginBottom: 10,
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: '0.68rem',
                                            fontWeight: 700,
                                            color: '#e2e8f0',
                                        }}
                                    >
                                        {lu.name}
                                        <span
                                            style={{
                                                fontSize: '0.58rem',
                                                fontWeight: 500,
                                                color:
                                                    lu.cards.length < 5
                                                        ? '#f87171'
                                                        : '#4b5563',
                                                marginLeft: 6,
                                            }}
                                        >
                                            ({lu.cards.length}/5)
                                        </span>
                                    </span>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button
                                            onClick={() => openSetup(lu)}
                                            style={{
                                                fontSize: '0.58rem',
                                                padding: '3px 9px',
                                                borderRadius: 5,
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                background:
                                                    'rgba(255,255,255,0.04)',
                                                color: '#9ca3af',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => deleteLineup(lu.id)}
                                            style={{
                                                fontSize: '0.58rem',
                                                padding: '3px 9px',
                                                borderRadius: 5,
                                                border: '1px solid rgba(248,113,113,0.2)',
                                                background:
                                                    'rgba(248,113,113,0.06)',
                                                color: '#f87171',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(5, 1fr)',
                                        gap: 10,
                                    }}
                                >
                                    {lu.cards.map((uc: LineupCard) => (
                                        <div
                                            key={uc.id}
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: 5,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: '100%',
                                                    aspectRatio: '2/3',
                                                    borderRadius: 8,
                                                    overflow: 'hidden',
                                                    background:
                                                        'rgba(255,255,255,0.04)',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    position: 'relative',
                                                }}
                                            >
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={
                                                        uc.cards.image_url ?? ''
                                                    }
                                                    alt={uc.cards.name}
                                                    style={{
                                                        position: 'absolute',
                                                        inset: 0,
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover',
                                                    }}
                                                />
                                            </div>
                                            <span
                                                style={{
                                                    fontSize: '0.52rem',
                                                    color: '#9ca3af',
                                                    textAlign: 'center',
                                                    width: '100%',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {uc.cards.name}
                                            </span>
                                            <span
                                                style={{
                                                    fontSize: '0.48rem',
                                                    color: '#6b7280',
                                                }}
                                            >
                                                Lv.{uc.card_level ?? 1}
                                            </span>
                                        </div>
                                    ))}
                                </div>
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
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 16px',
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#0e0e16',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 16,
                            width: '100%',
                            maxWidth: 480,
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
                                    {editingLineupId
                                        ? 'Edit Lineup'
                                        : 'New Lineup'}
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
                            <input
                                value={lineupName}
                                onChange={(e) => setLineupName(e.target.value)}
                                placeholder="Lineup name"
                                style={{
                                    width: '100%',
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: 6,
                                    padding: '5px 8px',
                                    fontSize: '0.68rem',
                                    color: '#e2e8f0',
                                    marginTop: 6,
                                    boxSizing: 'border-box',
                                    outline: 'none',
                                }}
                            />
                            <p
                                style={{
                                    fontSize: '0.65rem',
                                    color: '#4b5563',
                                    margin: '4px 0 0',
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
                                                        position: 'relative',
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
                                                            position:
                                                                'absolute',
                                                            inset: 0,
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
                            {saveError && (
                                <div
                                    style={{
                                        fontSize: '0.65rem',
                                        color: '#f87171',
                                        marginBottom: 8,
                                        textAlign: 'center',
                                    }}
                                >
                                    {saveError}
                                </div>
                            )}
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
                                    : editingLineupId
                                      ? `Update Lineup (${selected.length}/5)`
                                      : `Save Lineup (${selected.length}/5)`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Lineup picker */}
            {lineupPickerOpen && (
                <div
                    onClick={() => setLineupPickerOpen(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        background: 'rgba(0,0,0,0.7)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 16px',
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#0e0e16',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 16,
                            width: '100%',
                            maxWidth: 480,
                            maxHeight: '85vh',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                        }}
                    >
                        <div
                            style={{
                                padding: '16px 18px 12px',
                                borderBottom:
                                    '1px solid rgba(255,255,255,0.06)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}
                        >
                            <span
                                style={{
                                    fontSize: '0.88rem',
                                    fontWeight: 700,
                                    color: '#e2e8f0',
                                }}
                            >
                                Choose Your Lineup
                            </span>
                            <button
                                onClick={() => setLineupPickerOpen(false)}
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
                        <div
                            style={{
                                overflowY: 'auto',
                                padding: '12px 16px 16px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 10,
                            }}
                        >
                            {lineups.map((lu) => (
                                <button
                                    key={lu.id}
                                    onClick={() => {
                                        setPickedLineupIds(lu.slots)
                                        setLineupPickerOpen(false)
                                        setBattleOpen(true)
                                    }}
                                    style={{
                                        background: 'rgba(255,255,255,0.02)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: 12,
                                        padding: '12px 14px',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        transition: 'border-color 120ms',
                                    }}
                                    onMouseEnter={(e) =>
                                        (e.currentTarget.style.borderColor =
                                            'rgba(129,140,248,0.5)')
                                    }
                                    onMouseLeave={(e) =>
                                        (e.currentTarget.style.borderColor =
                                            'rgba(255,255,255,0.08)')
                                    }
                                >
                                    <div
                                        style={{
                                            fontSize: '0.7rem',
                                            fontWeight: 700,
                                            color: '#e2e8f0',
                                            marginBottom: 10,
                                        }}
                                    >
                                        {lu.name}
                                    </div>
                                    <div
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns:
                                                'repeat(5, 1fr)',
                                            gap: 8,
                                        }}
                                    >
                                        {lu.cards.map((uc: LineupCard) => (
                                            <div
                                                key={uc.id}
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    gap: 4,
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: '100%',
                                                        aspectRatio: '2/3',
                                                        borderRadius: 6,
                                                        overflow: 'hidden',
                                                        background:
                                                            'rgba(255,255,255,0.04)',
                                                        position: 'relative',
                                                    }}
                                                >
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={
                                                            uc.cards
                                                                .image_url ?? ''
                                                        }
                                                        alt={uc.cards.name}
                                                        style={{
                                                            position:
                                                                'absolute',
                                                            inset: 0,
                                                            width: '100%',
                                                            height: '100%',
                                                            objectFit: 'cover',
                                                        }}
                                                    />
                                                </div>
                                                <span
                                                    style={{
                                                        fontSize: '0.44rem',
                                                        color: '#9ca3af',
                                                        textAlign: 'center',
                                                        width: '100%',
                                                        overflow: 'hidden',
                                                        textOverflow:
                                                            'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    {uc.cards.name}
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize: '0.42rem',
                                                        color: '#6b7280',
                                                    }}
                                                >
                                                    Lv.{uc.card_level ?? 1}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </button>
                            ))}
                            <button
                                onClick={() => {
                                    setLineupPickerOpen(false)
                                    openSetup()
                                }}
                                style={{
                                    padding: '12px',
                                    borderRadius: 12,
                                    border: '1px dashed rgba(255,255,255,0.12)',
                                    background: 'transparent',
                                    color: '#6b7280',
                                    fontSize: '0.72rem',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                }}
                            >
                                + Create another lineup
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {battleOpen && (
                <BattleScreen
                    trainerId={trainerId}
                    skipToCardSelect={
                        trainerId !== 'n' || pickedLineupIds.length > 0
                    }
                    preSelectedIds={
                        pickedLineupIds.length > 0 ? pickedLineupIds : undefined
                    }
                    onClose={() => {
                        setBattleOpen(false)
                        setPickedLineupIds([])
                    }}
                    onBattleWon={() => {
                        setBattleOpen(false)
                        setPickedLineupIds([])
                        setBattlesWon((prev) => (prev ?? 0) + 1)
                        setLastWonAt(new Date().toISOString())
                    }}
                />
            )}

            {/* shop overlay */}
            {mounted && shopOpen && createPortal(
                <div
                    onClick={() => setShopOpen(false)}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
                        display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start',
                        padding: '80px 0 0 16px',
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: '#0e0e16',
                            border: '1px solid rgba(99,102,241,0.3)',
                            borderRadius: 16, width: 'min(320px, calc(100vw - 32px))',
                            overflow: 'hidden',
                        }}
                    >
                        <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                            </svg>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#818cf8' }}>Shop</span>
                            <button onClick={() => setShopOpen(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1 }}>×</button>
                        </div>
                        <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>🛒</div>
                            <p style={{ fontSize: '0.72rem', color: '#4b5563' }}>Shop coming soon — buy battle items with coins.</p>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}
