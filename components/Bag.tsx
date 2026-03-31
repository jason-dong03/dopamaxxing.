'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
    RARITY_ORDER,
    isRainbow,
    rarityGlowRgb,
    rarityGlowShadow,
    type Rarity,
} from '@/lib/rarityConfig'
import type { UserCard } from '@/lib/types'
import { CardTile } from '@/components/bag/CardTile'
import { CardStats } from '@/components/bag/CardStats'
import { ITEM_MAP, type ItemId } from '@/lib/items'
import { TYPE_COLOR } from '@/lib/pokemon-types'
import { GRADE_MULT } from '@/lib/gradeWorth'

// ─── constants ────────────────────────────────────────────────────────────────
const FILTERS = ['All', ...RARITY_ORDER]

// ─── bag page ─────────────────────────────────────────────────────────────────
export default function BagPage({
    userCards: initialCards,
    coins: initialCoins = 0,
    bagCapacity: initialCapacity = 50,
    userItems,
}: {
    userCards: UserCard[]
    coins?: number
    bagCapacity?: number
    userItems?: Array<{ id: string; item_id: string; quantity: number }>
}) {
    const router = useRouter()
    const [userCards, setUserCards] = useState(initialCards)
    const [coins, setCoins] = useState(initialCoins)
    const [bagCapacity, setBagCapacity] = useState(initialCapacity)
    const [expanding, setExpanding] = useState(false)
    const [expandMsg, setExpandMsg] = useState('')
    const [expandConfirm, setExpandConfirm] = useState(false)

    const [selectMode, setSelectMode] = useState(false)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    function dispatchSelectMode(active: boolean) {
        window.dispatchEvent(
            new CustomEvent('bag-select-mode', { detail: { active } }),
        )
    }
    const [confirmAction, setConfirmAction] = useState<'sell' | 'grade' | null>(
        null,
    )
    const [batchProcessing, setBatchProcessing] = useState(false)
    const [filters, setFilters] = useState<Set<string>>(new Set(['All']))
    const [favoritesOnly, setFavoritesOnly] = useState(false)
    const [typeFilter, setTypeFilter] = useState<string | null>(null)
    const [setFilter, setSetFilter] = useState<string | null>(null)
    const [search, setSearch] = useState('')
    const [sort, setSort] = useState<
        'rarity' | 'level' | 'name' | 'price' | 'grade'
    >('rarity')
    const [selected, setSelected] = useState<UserCard | null>(null)
    const [selectedCol, setSelectedCol] = useState(0)
    const [isWide, setIsWide] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const [activeTab, setActiveTab] = useState<'cards' | 'misc'>('cards')
    const headerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const check = () => {
            setIsWide(window.innerWidth >= 1280)
            setIsMobile(window.innerWidth < 640)
        }
        check()
        window.addEventListener('resize', check)
        return () => window.removeEventListener('resize', check)
    }, [])

    // Refresh coins from DB on mount to ensure accuracy
    useEffect(() => {
        const supabase = createClient()
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) return
            supabase
                .from('profiles')
                .select('coins')
                .eq('id', user.id)
                .single()
                .then(({ data }) => {
                    if (data?.coins != null) setCoins(Number(data.coins))
                })
        })
    }, [])

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setSelected(null)
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [])

    const allTypes = Array.from(
        new Set(
            userCards
                .map((uc) => uc.cards.pokemon_type)
                .filter(Boolean) as string[],
        ),
    ).sort()
    const setNameMap = Object.fromEntries(
        userCards
            .filter((uc) => uc.cards.set_id && uc.cards.sets?.name)
            .map((uc) => [uc.cards.set_id, uc.cards.sets.name]),
    )

    const allSets = Array.from(
        new Set(
            userCards.map((uc) => uc.cards.set_id).filter(Boolean) as string[],
        ),
    ).sort()

    const filtered = userCards
        .filter((uc) => filters.has('All') || filters.has(uc.cards.rarity))
        .filter((uc) => !favoritesOnly || uc.is_favorited)
        .filter((uc) => !typeFilter || uc.cards.pokemon_type === typeFilter)
        .filter((uc) => !setFilter || uc.cards.set_id === setFilter)
        .filter((uc) =>
            uc.cards.name.toLowerCase().includes(search.toLowerCase()),
        )
        .sort((a, b) => {
            if (sort === 'rarity')
                return (
                    RARITY_ORDER.indexOf(a.cards.rarity as Rarity) -
                    RARITY_ORDER.indexOf(b.cards.rarity as Rarity)
                )
            if (sort === 'level') return b.card_level - a.card_level
            if (sort === 'price') return b.worth - a.worth
            if (sort === 'grade') return (b.grade ?? -1) - (a.grade ?? -1)
            return a.cards.name.localeCompare(b.cards.name)
        })

    async function handleSell(): Promise<void> {
        if (!selected) return

        const mult =
            selected.grade != null ? (GRADE_MULT[selected.grade] ?? 1) : 1
        const saleAmount = Math.round(selected.worth * mult)
        const soldId = selected.id
        await fetch('/api/buyback-card', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                card_buyback_amount: saleAmount,
                user_card_id: soldId,
            }),
        })
        setUserCards((prev) => prev.filter((uc) => uc.id !== soldId))
        setCoins((prev) => prev + saleAmount)
        setSelected(null)
    }

    async function handleBulkSell(): Promise<void> {
        const toSell = filtered.filter((uc) => selectedIds.has(uc.id))
        if (!toSell.length) return
        setBatchProcessing(true)
        setConfirmAction(null)
        const actions = toSell.map((uc) => ({
            type: 'sell' as const,
            coins: uc.worth,
            user_card_id: uc.id,
        }))
        const totalCoins = toSell.reduce((s, uc) => s + uc.worth, 0)
        try {
            await fetch('/api/batch-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ actions }),
            })
            const soldIds = new Set(toSell.map((uc) => uc.id))
            setUserCards((prev) => prev.filter((uc) => !soldIds.has(uc.id)))
            setCoins((prev) => prev + totalCoins)
            setSelected(null)
            setSelectedIds(new Set())
            setSelectMode(false)
            dispatchSelectMode(false)
            router.refresh()
        } finally {
            setBatchProcessing(false)
        }
    }

    async function handleBulkGrade(): Promise<void> {
        const toGrade = filtered.filter((uc) => selectedIds.has(uc.id))
        if (!toGrade.length) return
        setBatchProcessing(true)
        setConfirmAction(null)
        try {
            const results = await Promise.all(
                toGrade.map((uc) =>
                    fetch('/api/grade-card', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userCardId: uc.id }),
                    }).then((r) => r.json()),
                ),
            )
            // zip by index since grade-card doesn't echo back userCardId
            setUserCards((prev) =>
                prev.map((uc) => {
                    const idx = toGrade.findIndex((g) => g.id === uc.id)
                    if (idx === -1) return uc
                    const result = results[idx]
                    if (!result?.grade) return uc
                    return {
                        ...uc,
                        grade: result.grade,
                        grade_count: (uc.grade_count ?? 0) + 1,
                    }
                }),
            )
            setCoins((prev) => {
                const totalCost = toGrade.reduce(
                    (s, uc) => s + 100 * Math.pow(2, uc.grade_count ?? 0),
                    0,
                )
                return prev - totalCost
            })
            setSelectedIds(new Set())
            setSelectMode(false)
            dispatchSelectMode(false)
            router.refresh()
        } finally {
            setBatchProcessing(false)
        }
    }

    function handleGraded(grade: number) {
        if (!selected) return
        const updated = {
            ...selected,
            grade,
            grade_count: (selected.grade_count ?? 0) + 1,
        }
        setSelected(updated)
        setUserCards((prev) =>
            prev.map((uc) =>
                uc.id === selected.id
                    ? { ...uc, grade, grade_count: (uc.grade_count ?? 0) + 1 }
                    : uc,
            ),
        )
    }

    async function handleExpandBag() {
        if (expanding) return
        setExpanding(true)
        setExpandMsg('')
        const res = await fetch('/api/expand-bag', { method: 'POST' })
        const data = await res.json()
        if (res.ok) {
            setBagCapacity(data.capacity)
            setCoins((prev) => prev - data.cost)
            setExpandMsg(`+${data.slots} slots!`)
            setTimeout(() => setExpandMsg(''), 2500)
        } else if (res.status === 402) {
            setExpandMsg(`need $ ${Number(data.need).toLocaleString()}`)
            setTimeout(() => setExpandMsg(''), 2500)
        } else {
            setExpandMsg('failed')
            setTimeout(() => setExpandMsg(''), 2000)
        }
        setExpanding(false)
    }

    async function handleToggleFavorite() {
        if (!selected) return
        const next = !selected.is_favorited
        const supabase = createClient()

        const { error } = await supabase
            .from('user_cards')
            .update({ is_favorited: next })
            .eq('id', selected.id)

        if (!error) {
            const updated = { ...selected, is_favorited: next }
            setUserCards((prev) =>
                prev.map((uc) =>
                    uc.id === selected.id ? { ...uc, is_favorited: next } : uc,
                ),
            )
            setSelected(updated)
        }
    }

    return (
        <>
            <div
                className="min-h-screen pb-24"
                style={{
                    background: 'var(--app-bg)',
                    color: 'var(--app-text)',
                }}
            >
                <div className="mx-auto" style={{ maxWidth: 1200 }}>
                    {/* sticky header */}
                    <div
                        ref={headerRef}
                        className="sticky top-0 z-30 px-4 pt-4 pb-3"
                        style={{
                            background: 'var(--sticky-header-bg)',
                            backdropFilter: 'blur(16px)',
                            borderBottom: '1px solid var(--app-border)',
                        }}
                    >
                        {/* title + coins row */}
                        <div className="flex items-center justify-between mb-2">
                            <h1
                                className="font-bold text-lg tracking-tight"
                                style={{ color: 'var(--app-text)' }}
                            >
                                Bag
                            </h1>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: isMobile ? 5 : 8,
                                    flexWrap: 'nowrap',
                                }}
                            >
                                {/* coins */}
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: isMobile ? 3 : 5,
                                    }}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 3,
                                            background: 'rgba(234,179,8,0.08)',
                                            border: '1px solid rgba(234,179,8,0.15)',
                                            borderRadius: 20,
                                            padding: isMobile
                                                ? '2px 6px'
                                                : '2px 8px',
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontSize: '0.65rem',
                                                fontWeight: 600,
                                                color: '#eab308',
                                                fontFamily: 'monospace',
                                            }}
                                        >
                                            $
                                            {Number(coins).toLocaleString(
                                                undefined,
                                                {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                },
                                            )}
                                        </span>
                                    </div>
                                    <a
                                        href="/dashboard/shop"
                                        title="Add Coins"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: 18,
                                            height: 18,
                                            borderRadius: '50%',
                                            background: 'rgba(234,179,8,0.12)',
                                            border: '1px solid rgba(234,179,8,0.3)',
                                            color: '#eab308',
                                            fontSize: '0.8rem',
                                            fontWeight: 700,
                                            textDecoration: 'none',
                                            lineHeight: 1,
                                            flexShrink: 0,
                                        }}
                                    >
                                        +
                                    </a>
                                </div>

                                {/* bag capacity */}
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: isMobile ? 3 : 6,
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: '0.62rem',
                                            fontWeight: 600,
                                            fontFamily: 'monospace',
                                            color:
                                                userCards.length >= bagCapacity
                                                    ? '#f87171'
                                                    : 'var(--app-text-muted)',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {userCards.length}/{bagCapacity}
                                    </span>
                                    {!isMobile && (
                                        <div
                                            style={{
                                                width: 48,
                                                height: 3,
                                                background:
                                                    'rgba(255,255,255,0.07)',
                                                borderRadius: 2,
                                                overflow: 'hidden',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    height: '100%',
                                                    borderRadius: 2,
                                                    width: `${Math.min(100, (userCards.length / bagCapacity) * 100)}%`,
                                                    background:
                                                        userCards.length >=
                                                        bagCapacity
                                                            ? '#f87171'
                                                            : '#4ade80',
                                                    transition:
                                                        'width 400ms ease',
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* tabs + action buttons row */}
                        <div
                            className="flex items-center mb-3"
                            style={{ gap: 6 }}
                        >
                            {(['cards', 'misc'] as const).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    style={{
                                        fontSize: '0.65rem',
                                        fontWeight: 600,
                                        padding: '3px 12px',
                                        borderRadius: 20,
                                        border:
                                            activeTab === tab
                                                ? '1px solid rgba(74,222,128,0.4)'
                                                : '1px solid rgba(255,255,255,0.1)',
                                        background:
                                            activeTab === tab
                                                ? 'rgba(74,222,128,0.1)'
                                                : 'rgba(255,255,255,0.04)',
                                        color:
                                            activeTab === tab
                                                ? '#4ade80'
                                                : 'var(--app-text-muted)',
                                        cursor: 'pointer',
                                        transition: 'all 150ms ease',
                                        flexShrink: 0,
                                    }}
                                >
                                    {tab === 'cards' ? 'Cards' : 'Misc'}
                                </button>
                            ))}

                            <div style={{ flex: 1 }} />

                            {activeTab === 'cards' && (
                                <>
                                    {/* +Space with confirmation popover */}
                                    <div
                                        style={{
                                            position: 'relative',
                                            flexShrink: 0,
                                        }}
                                    >
                                        <button
                                            onClick={() =>
                                                !expanding &&
                                                setExpandConfirm((v) => !v)
                                            }
                                            disabled={expanding}
                                            style={{
                                                fontSize: '0.62rem',
                                                fontWeight: 600,
                                                padding: '3px 9px',
                                                borderRadius: 20,
                                                border: '1px solid rgba(74,222,128,0.35)',
                                                background:
                                                    'rgba(74,222,128,0.08)',
                                                color: expanding
                                                    ? 'var(--app-text-muted)'
                                                    : '#4ade80',
                                                cursor: expanding
                                                    ? 'not-allowed'
                                                    : 'pointer',
                                                whiteSpace: 'nowrap',
                                                transition: 'all 150ms ease',
                                            }}
                                        >
                                            {expandMsg ||
                                                (expanding ? '…' : '+Space')}
                                        </button>
                                        {expandConfirm && !expandMsg && (
                                            <>
                                                <div
                                                    onClick={() =>
                                                        setExpandConfirm(false)
                                                    }
                                                    style={{
                                                        position: 'fixed',
                                                        inset: 0,
                                                        zIndex: 49,
                                                    }}
                                                />
                                                <div
                                                    style={{
                                                        position: 'absolute',
                                                        top: 'calc(100% + 8px)',
                                                        right: 0,
                                                        zIndex: 50,
                                                        background: '#0e0e16',
                                                        border: '1px solid rgba(74,222,128,0.25)',
                                                        borderRadius: 12,
                                                        padding: '12px 14px',
                                                        minWidth: 180,
                                                        boxShadow:
                                                            '0 8px 24px rgba(0,0,0,0.5)',
                                                    }}
                                                >
                                                    <p
                                                        style={{
                                                            fontSize: '0.65rem',
                                                            color: 'var(--app-text-muted)',
                                                            margin: '0 0 6px',
                                                        }}
                                                    >
                                                        Expand bag space
                                                    </p>
                                                    <p
                                                        style={{
                                                            fontSize: '0.78rem',
                                                            fontWeight: 700,
                                                            color: 'var(--app-text)',
                                                            margin: '0 0 4px',
                                                        }}
                                                    >
                                                        {bagCapacity} →{' '}
                                                        {bagCapacity + 10} slots
                                                    </p>
                                                    <p
                                                        style={{
                                                            fontSize: '0.65rem',
                                                            color: '#eab308',
                                                            margin: '0 0 12px',
                                                        }}
                                                    >
                                                        costs $20.00
                                                    </p>
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            gap: 6,
                                                        }}
                                                    >
                                                        <button
                                                            onClick={() =>
                                                                setExpandConfirm(
                                                                    false,
                                                                )
                                                            }
                                                            style={{
                                                                flex: 1,
                                                                padding:
                                                                    '5px 0',
                                                                borderRadius: 8,
                                                                border: '1px solid rgba(255,255,255,0.1)',
                                                                background:
                                                                    'transparent',
                                                                color: 'var(--app-text-muted)',
                                                                fontSize:
                                                                    '0.62rem',
                                                                fontWeight: 600,
                                                                cursor: 'pointer',
                                                            }}
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setExpandConfirm(
                                                                    false,
                                                                )
                                                                handleExpandBag()
                                                            }}
                                                            style={{
                                                                flex: 1,
                                                                padding:
                                                                    '5px 0',
                                                                borderRadius: 8,
                                                                border: '1px solid rgba(74,222,128,0.4)',
                                                                background:
                                                                    'rgba(74,222,128,0.12)',
                                                                color: '#4ade80',
                                                                fontSize:
                                                                    '0.62rem',
                                                                fontWeight: 700,
                                                                cursor: 'pointer',
                                                            }}
                                                        >
                                                            Confirm
                                                        </button>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => {
                                            const next = !selectMode
                                            setSelectMode(next)
                                            dispatchSelectMode(next)
                                            setSelectedIds(new Set())
                                        }}
                                        style={{
                                            flexShrink: 0,
                                            fontSize: '0.62rem',
                                            fontWeight: 600,
                                            padding: '3px 9px',
                                            borderRadius: 20,
                                            border: selectMode
                                                ? '1px solid rgba(168,85,247,0.5)'
                                                : '1px solid var(--pill-border)',
                                            background: selectMode
                                                ? 'rgba(168,85,247,0.12)'
                                                : 'transparent',
                                            color: selectMode
                                                ? '#c084fc'
                                                : 'var(--app-text-muted)',
                                            cursor: 'pointer',
                                            transition: 'all 150ms ease',
                                        }}
                                    >
                                        {selectMode ? 'Done' : 'Select'}
                                    </button>
                                </>
                            )}
                        </div>

                        {activeTab === 'cards' && (
                            <input
                                type="text"
                                placeholder="search..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full rounded-lg px-3 py-2 outline-none transition-colors mb-3"
                                style={{
                                    background: 'var(--input-bg)',
                                    border: '1px solid var(--input-border)',
                                    fontSize: '0.8rem',
                                    color: 'var(--app-text)',
                                }}
                                onFocus={(e) =>
                                    (e.currentTarget.style.borderColor =
                                        'var(--input-border-focus)')
                                }
                                onBlur={(e) =>
                                    (e.currentTarget.style.borderColor =
                                        'var(--input-border)')
                                }
                            />
                        )}

                        {/* filter + sort row */}
                        {activeTab === 'cards' && (
                            <div
                                className="flex items-center gap-2 mb-3"
                                style={{ flexWrap: 'wrap' }}
                            >
                                {/* favorites toggle */}
                                <button
                                    onClick={() => setFavoritesOnly((f) => !f)}
                                    style={{
                                        flexShrink: 0,
                                        width: 30,
                                        height: 30,
                                        borderRadius: 8,
                                        border: favoritesOnly
                                            ? '1px solid rgba(234,179,8,0.6)'
                                            : '1px solid var(--input-border)',
                                        background: favoritesOnly
                                            ? 'rgba(234,179,8,0.12)'
                                            : 'var(--input-bg)',
                                        color: favoritesOnly
                                            ? '#eab308'
                                            : 'var(--app-text-muted)',
                                        fontSize: '0.72rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 150ms',
                                    }}
                                    title="Favorites only"
                                >
                                    ★
                                </button>

                                {/* rarity dropdown */}
                                <select
                                    value={
                                        filters.has('All')
                                            ? 'All'
                                            : (Array.from(filters)[0] ?? 'All')
                                    }
                                    onChange={(e) => {
                                        const v = e.target.value
                                        setFilters(
                                            v === 'All'
                                                ? new Set(['All'])
                                                : new Set([v]),
                                        )
                                    }}
                                    style={{
                                        background: 'var(--input-bg)',
                                        border: filters.has('All')
                                            ? '1px solid var(--input-border)'
                                            : '1px solid rgba(255,255,255,0.3)',
                                        borderRadius: 8,
                                        padding: '5px 8px',
                                        fontSize: '0.65rem',
                                        color: 'var(--app-text)',
                                        cursor: 'pointer',
                                        outline: 'none',
                                        flexShrink: 0,
                                        colorScheme: 'dark',
                                    }}
                                >
                                    {FILTERS.map((f) => (
                                        <option key={f} value={f}>
                                            {f}
                                        </option>
                                    ))}
                                </select>

                                {/* set dropdown*/}
                                {allSets.length > 0 && (
                                    <select
                                        value={setFilter ?? ''}
                                        onChange={(e) =>
                                            setSetFilter(e.target.value || null)
                                        }
                                        style={{
                                            background: 'var(--input-bg)',
                                            border: setFilter
                                                ? '1px solid rgba(255,255,255,0.3)'
                                                : '1px solid var(--input-border)',
                                            borderRadius: 8,
                                            padding: '5px 8px',
                                            fontSize: '0.65rem',
                                            color: 'var(--app-text)',
                                            cursor: 'pointer',
                                            outline: 'none',
                                            flexShrink: 0,
                                            colorScheme: 'dark',
                                        }}
                                    >
                                        <option value="">All sets</option>
                                        {allSets.map((s) => (
                                            <option key={s} value={s}>
                                                {setNameMap[s] ?? s}
                                            </option>
                                        ))}
                                    </select>
                                )}
                                {/* type dropdown */}
                                {allTypes.length > 0 && (
                                    <select
                                        value={typeFilter ?? ''}
                                        onChange={(e) =>
                                            setTypeFilter(
                                                e.target.value || null,
                                            )
                                        }
                                        style={{
                                            background: 'var(--input-bg)',
                                            border: typeFilter
                                                ? `1px solid ${TYPE_COLOR[typeFilter] ?? 'rgba(255,255,255,0.3)'}`
                                                : '1px solid var(--input-border)',
                                            borderRadius: 8,
                                            padding: '5px 8px',
                                            fontSize: '0.65rem',
                                            color: typeFilter
                                                ? (TYPE_COLOR[typeFilter] ??
                                                  'var(--app-text)')
                                                : 'var(--app-text)',
                                            cursor: 'pointer',
                                            outline: 'none',
                                            flexShrink: 0,
                                            colorScheme: 'dark',
                                        }}
                                    >
                                        <option value="">All types</option>
                                        {allTypes.map((t) => (
                                            <option key={t} value={t}>
                                                {t}
                                            </option>
                                        ))}
                                    </select>
                                )}

                                <div style={{ flex: 1 }} />

                                {/* sort pills */}
                                <div
                                    className="flex gap-1 scrollbar-none"
                                    style={{
                                        overflowX: 'auto',
                                        flexWrap: 'nowrap',
                                    }}
                                >
                                    {(
                                        [
                                            'rarity',
                                            'level',
                                            'name',
                                            'price',
                                            'grade',
                                        ] as const
                                    ).map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => setSort(s)}
                                            className="capitalize transition-all"
                                            style={{
                                                flexShrink: 0,
                                                fontSize: '0.6rem',
                                                padding: '4px 9px',
                                                borderRadius: 6,
                                                border:
                                                    sort === s
                                                        ? '1px solid var(--pill-active-border)'
                                                        : '1px solid var(--pill-border)',
                                                background:
                                                    sort === s
                                                        ? 'var(--pill-active-bg)'
                                                        : 'transparent',
                                                color:
                                                    sort === s
                                                        ? 'var(--app-text)'
                                                        : 'var(--app-text-muted)',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* quick-select rarity chips — only in select mode */}
                        {activeTab === 'cards' && selectMode && (
                            <div
                                className="flex gap-1.5 mt-2 scrollbar-none"
                                style={{
                                    overflowX: 'auto',
                                    flexWrap: 'nowrap',
                                    paddingBottom: 2,
                                }}
                            >
                                <button
                                    onClick={() =>
                                        setSelectedIds(
                                            new Set(
                                                filtered
                                                    .filter(
                                                        (uc) =>
                                                            !uc.is_favorited,
                                                    )
                                                    .map((uc) => uc.id),
                                            ),
                                        )
                                    }
                                    style={{
                                        flexShrink: 0,
                                        fontSize: '0.6rem',
                                        fontWeight: 600,
                                        padding: '3px 9px',
                                        borderRadius: 20,
                                        border: '1px solid rgba(255,255,255,0.15)',
                                        background: 'rgba(255,255,255,0.06)',
                                        color: 'var(--app-text-muted)',
                                        cursor: 'pointer',
                                    }}
                                >
                                    All Visible
                                </button>
                                {RARITY_ORDER.map((rarity) => {
                                    const count = filtered.filter(
                                        (uc) =>
                                            uc.cards.rarity === rarity &&
                                            !uc.is_favorited,
                                    ).length
                                    if (!count) return null
                                    const glowRgb = rarityGlowRgb(rarity)
                                    const rarityCards = filtered.filter(
                                        (uc) =>
                                            uc.cards.rarity === rarity &&
                                            !uc.is_favorited,
                                    )
                                    const allSelected =
                                        rarityCards.length > 0 &&
                                        rarityCards.every((uc) =>
                                            selectedIds.has(uc.id),
                                        )
                                    return (
                                        <button
                                            key={rarity}
                                            onClick={() =>
                                                setSelectedIds((prev) => {
                                                    const next = new Set(prev)
                                                    if (allSelected) {
                                                        rarityCards.forEach(
                                                            (uc) =>
                                                                next.delete(
                                                                    uc.id,
                                                                ),
                                                        )
                                                    } else {
                                                        rarityCards.forEach(
                                                            (uc) =>
                                                                next.add(uc.id),
                                                        )
                                                    }
                                                    return next
                                                })
                                            }
                                            style={{
                                                flexShrink: 0,
                                                fontSize: '0.6rem',
                                                fontWeight: 600,
                                                padding: '3px 9px',
                                                borderRadius: 20,
                                                border: `1px solid rgba(${glowRgb},${allSelected ? 0.9 : 0.4})`,
                                                background: allSelected
                                                    ? `rgba(${glowRgb},0.22)`
                                                    : `rgba(${glowRgb},0.08)`,
                                                color: `rgba(${glowRgb},1)`,
                                                cursor: 'pointer',
                                                boxShadow: allSelected
                                                    ? `0 0 8px rgba(${glowRgb},0.35)`
                                                    : 'none',
                                                transition:
                                                    'background 150ms ease, border 150ms ease, box-shadow 150ms ease',
                                            }}
                                        >
                                            All {rarity} ({count})
                                        </button>
                                    )
                                })}
                                {selectedIds.size > 0 && (
                                    <button
                                        onClick={() =>
                                            setSelectedIds(new Set())
                                        }
                                        style={{
                                            flexShrink: 0,
                                            fontSize: '0.6rem',
                                            fontWeight: 600,
                                            padding: '3px 9px',
                                            borderRadius: 20,
                                            border: '1px solid rgba(239,68,68,0.3)',
                                            background: 'rgba(239,68,68,0.06)',
                                            color: '#f87171',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* grid + sidebar */}
                    <div className="flex relative">
                        <div
                            className="flex-1 px-3 pt-4 pb-6"
                            style={{ minWidth: 0 }}
                        >
                            {activeTab === 'misc' ? (
                                <div
                                    style={{
                                        padding: '16px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 12,
                                    }}
                                >
                                    {(userItems ?? []).length === 0 ? (
                                        <p
                                            style={{
                                                color: '#4b5563',
                                                fontSize: '0.82rem',
                                                textAlign: 'center',
                                                padding: '48px 0',
                                            }}
                                        >
                                            No misc items yet.
                                        </p>
                                    ) : (
                                        (userItems ?? []).map((item) => {
                                            const def =
                                                ITEM_MAP[item.item_id as ItemId]
                                            if (!def) return null
                                            return (
                                                <div
                                                    key={item.id}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 14,
                                                        background:
                                                            'rgba(255,255,255,0.03)',
                                                        border:
                                                            item.item_id ===
                                                            'n-crown'
                                                                ? '1px solid rgba(250,204,21,0.25)'
                                                                : '1px solid rgba(255,255,255,0.07)',
                                                        borderRadius: 12,
                                                        padding: '12px 16px',
                                                    }}
                                                >
                                                    {def.icon.startsWith(
                                                        '/',
                                                    ) ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img
                                                            src={def.icon}
                                                            alt={def.name}
                                                            style={{
                                                                width: 40,
                                                                height: 40,
                                                                objectFit:
                                                                    'contain',
                                                                flexShrink: 0,
                                                            }}
                                                        />
                                                    ) : (
                                                        <span
                                                            style={{
                                                                fontSize:
                                                                    '1.8rem',
                                                            }}
                                                        >
                                                            {def.icon}
                                                        </span>
                                                    )}
                                                    <div
                                                        style={{
                                                            flex: 1,
                                                            minWidth: 0,
                                                        }}
                                                    >
                                                        <p
                                                            style={{
                                                                margin: 0,
                                                                fontSize:
                                                                    '0.82rem',
                                                                fontWeight: 700,
                                                                color: '#e2e8f0',
                                                            }}
                                                        >
                                                            {def.name}
                                                        </p>
                                                        <p
                                                            style={{
                                                                margin: '3px 0 0',
                                                                fontSize:
                                                                    '0.68rem',
                                                                color: '#6b7280',
                                                                lineHeight: 1.5,
                                                            }}
                                                        >
                                                            {def.description}
                                                        </p>
                                                    </div>
                                                    {item.item_id ===
                                                        'n-crown' && (
                                                        <a
                                                            href="/dashboard/n-crown"
                                                            style={{
                                                                padding:
                                                                    '6px 14px',
                                                                borderRadius: 8,
                                                                fontSize:
                                                                    '0.7rem',
                                                                fontWeight: 700,
                                                                background:
                                                                    'rgba(250,204,21,0.1)',
                                                                border: '1px solid rgba(250,204,21,0.35)',
                                                                color: '#facc15',
                                                                textDecoration:
                                                                    'none',
                                                                whiteSpace:
                                                                    'nowrap',
                                                            }}
                                                        >
                                                            Inspect
                                                        </a>
                                                    )}
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            ) : filtered.length === 0 ? (
                                <div className="flex items-center justify-center mt-24">
                                    <p className="text-gray-800 text-sm">
                                        no cards found
                                    </p>
                                </div>
                            ) : (
                                <div
                                    className="grid gap-3"
                                    style={{
                                        gridTemplateColumns: isMobile
                                            ? 'repeat(2, 1fr)'
                                            : 'repeat(5, 1fr)',
                                        alignItems: 'center',
                                    }}
                                >
                                    {filtered.map((uc, i) => (
                                        <CardTile
                                            key={uc.id}
                                            uc={uc}
                                            isSelected={
                                                !selectMode &&
                                                selected?.id === uc.id
                                            }
                                            selectMode={selectMode}
                                            isMultiSelected={selectedIds.has(
                                                uc.id,
                                            )}
                                            onClick={() => {
                                                if (selectMode) {
                                                    setSelectedIds((prev) => {
                                                        const next = new Set(
                                                            prev,
                                                        )
                                                        if (next.has(uc.id))
                                                            next.delete(uc.id)
                                                        else next.add(uc.id)
                                                        return next
                                                    })
                                                } else {
                                                    const col = i % 5
                                                    setSelectedCol(col)
                                                    setSelected((prev) =>
                                                        prev?.id === uc.id
                                                            ? null
                                                            : uc,
                                                    )
                                                }
                                            }}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* sidebar — desktop/tablet only, portalled to body so it overlays everything */}
                        {!isWide &&
                            !isMobile &&
                            selected &&
                            createPortal(
                                <div
                                    className="sidebar-anim scrollbar-none"
                                    style={{
                                        width: 300,
                                        position: 'fixed',
                                        top: 0,
                                        bottom: 0,
                                        ...(selectedCol <= 2
                                            ? {
                                                  right: `max(0px, calc((100vw - 1200px) / 2))`,
                                                  borderLeft:
                                                      '1px solid var(--sidebar-border)',
                                              }
                                            : {
                                                  left: `max(0px, calc((100vw - 1200px) / 2))`,
                                                  borderRight:
                                                      '1px solid var(--sidebar-border)',
                                              }),
                                        overflowY: 'auto',
                                        background: 'var(--sidebar-bg)',
                                        zIndex: 100,
                                        paddingBottom: 24,
                                    }}
                                >
                                    <CardStats
                                        uc={selected}
                                        onClose={() => setSelected(null)}
                                        onSell={handleSell}
                                        onToggleFavorite={handleToggleFavorite}
                                        onGraded={handleGraded}
                                        mode="sidebar"
                                    />
                                </div>,
                                document.body,
                            )}

                        {/* bottom sheet — mobile only */}
                        {isMobile && selected && (
                            <>
                                {/* backdrop */}
                                <div
                                    className="fixed inset-0 z-30"
                                    style={{
                                        background: 'rgba(0,0,0,0.5)',
                                        backdropFilter: 'blur(4px)',
                                    }}
                                    onClick={() => setSelected(null)}
                                />
                                <div
                                    className="sidebar-anim scrollbar-none fixed left-0 right-0 bottom-0 z-40 rounded-t-2xl"
                                    style={{
                                        maxHeight: '88vh',
                                        overflowY: 'scroll',
                                        WebkitOverflowScrolling: 'touch',
                                        overscrollBehavior: 'contain',
                                        background: 'var(--sidebar-bg)',
                                        borderTop:
                                            '1px solid var(--sidebar-border)',
                                        paddingBottom:
                                            'max(80px, calc(80px + env(safe-area-inset-bottom, 0px)))',
                                    }}
                                >
                                    <CardStats
                                        uc={selected}
                                        onClose={() => setSelected(null)}
                                        onSell={handleSell}
                                        onToggleFavorite={handleToggleFavorite}
                                        onGraded={handleGraded}
                                        mode="sidebar"
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* fullscreen overlay */}
            {isWide && selected && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-8"
                    style={{
                        background: 'rgba(0,0,0,0.9)',
                        backdropFilter: 'blur(20px)',
                    }}
                    onClick={() => setSelected(null)}
                >
                    <div
                        className={`overlay-anim relative w-full rounded-2xl${isRainbow(selected.cards.rarity) ? ' glow-rainbow' : ''}`}
                        style={{
                            maxWidth: 680,
                            maxHeight: 'calc(100vh - 4rem)',
                            overflowY: 'auto',
                            background: 'rgba(10,10,16,0.99)',
                            border: isRainbow(selected.cards.rarity)
                                ? '1px solid transparent'
                                : `1px solid rgba(${rarityGlowRgb(selected.cards.rarity)}, 0.25)`,
                            boxShadow: isRainbow(selected.cards.rarity)
                                ? undefined
                                : rarityGlowShadow(
                                      selected.cards.rarity as Rarity,
                                      'lg',
                                  ),
                            padding: '2rem',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <CardStats
                            uc={selected}
                            onClose={() => setSelected(null)}
                            onSell={handleSell}
                            onToggleFavorite={handleToggleFavorite}
                            onGraded={handleGraded}
                            mode="overlay"
                        />
                    </div>
                </div>
            )}

            {/* ── select mode action bar ── */}
            {selectMode && selectedIds.size > 0 && (
                <div
                    style={{
                        position: 'fixed',
                        bottom: 64,
                        left: 0,
                        right: 0,
                        zIndex: 60,
                        padding: '10px 16px',
                        background: 'var(--sticky-header-bg)',
                        backdropFilter: 'blur(14px)',
                        borderTop: '1px solid var(--app-border)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                    }}
                >
                    <span
                        style={{
                            position: 'absolute',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            color: 'var(--app-text)',
                            pointerEvents: 'none',
                        }}
                    >
                        {selectedIds.size} selected
                    </span>
                    <div style={{ flex: 1 }} />
                    <button
                        onClick={() => setConfirmAction('sell')}
                        style={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            padding: '6px 12px',
                            borderRadius: 10,
                            border: '1px solid rgba(239,68,68,0.3)',
                            background: 'rgba(239,68,68,0.1)',
                            color: '#f87171',
                            cursor: 'pointer',
                        }}
                    >
                        Sell Selected
                    </button>
                    <button
                        onClick={() => setConfirmAction('grade')}
                        style={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            padding: '6px 12px',
                            borderRadius: 10,
                            border: '1px solid rgba(99,102,241,0.3)',
                            background: 'rgba(99,102,241,0.1)',
                            color: '#818cf8',
                            cursor: 'pointer',
                        }}
                    >
                        Grade Selected
                    </button>
                    <button
                        onClick={() => {
                            setSelectedIds(new Set())
                            setSelectMode(false)
                            dispatchSelectMode(false)
                        }}
                        style={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            padding: '6px 12px',
                            borderRadius: 10,
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: 'transparent',
                            color: 'var(--app-text-muted)',
                            cursor: 'pointer',
                        }}
                    >
                        Cancel
                    </button>
                </div>
            )}

            {/* ── confirm modal ── */}
            {confirmAction &&
                (() => {
                    const cards = filtered.filter((uc) =>
                        selectedIds.has(uc.id),
                    )
                    const isSell = confirmAction === 'sell'
                    const totalCoins = isSell
                        ? cards.reduce((s, uc) => s + uc.worth, 0)
                        : cards.reduce(
                              (s, uc) =>
                                  s + 100 * Math.pow(2, uc.grade_count ?? 0),
                              0,
                          )
                    return (
                        <div
                            style={{
                                position: 'fixed',
                                inset: 0,
                                zIndex: 200,
                                background:
                                    'var(--modal-backdrop, rgba(0,0,0,0.7))',
                                backdropFilter: 'blur(8px)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '0 20px',
                            }}
                            onClick={() => setConfirmAction(null)}
                        >
                            <div
                                style={{
                                    background: 'var(--app-surface-2, #18181b)',
                                    border: '1px solid var(--app-border)',
                                    borderRadius: 20,
                                    padding: '28px 24px',
                                    maxWidth: 380,
                                    width: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 16,
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <h3
                                    style={{
                                        margin: 0,
                                        fontSize: '1rem',
                                        fontWeight: 700,
                                        color: 'var(--app-text)',
                                    }}
                                >
                                    {isSell
                                        ? 'Sell Selected Cards'
                                        : 'Grade Selected Cards'}
                                </h3>
                                <p
                                    style={{
                                        margin: 0,
                                        fontSize: '0.8rem',
                                        color: 'var(--app-text-muted)',
                                        lineHeight: 1.6,
                                    }}
                                >
                                    {isSell
                                        ? `Sell ${cards.length} card${cards.length !== 1 ? 's' : ''} for a total of`
                                        : `Grade ${cards.length} card${cards.length !== 1 ? 's' : ''} for a total cost of`}
                                    <br />
                                    <span
                                        style={{
                                            fontSize: '1.1rem',
                                            fontWeight: 700,
                                            color: isSell
                                                ? '#4ade80'
                                                : '#f87171',
                                        }}
                                    >
                                        {`${isSell ? '+' : '-'}$ ${totalCoins.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                    </span>
                                </p>
                                {!isSell && (
                                    <p
                                        style={{
                                            margin: 0,
                                            fontSize: '0.7rem',
                                            color: 'var(--app-text-muted)',
                                            background: 'var(--input-bg)',
                                            borderRadius: 8,
                                            padding: '8px 12px',
                                            lineHeight: 1.5,
                                        }}
                                    >
                                        Cost per card: $100 × 2^(grade count).
                                        Results include the human factor grader
                                        variance.
                                    </p>
                                )}
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                        onClick={() => setConfirmAction(null)}
                                        style={{
                                            flex: 1,
                                            padding: '10px 0',
                                            borderRadius: 10,
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            background: 'transparent',
                                            color: 'var(--app-text-muted)',
                                            fontSize: '0.8rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={
                                            isSell
                                                ? handleBulkSell
                                                : handleBulkGrade
                                        }
                                        disabled={batchProcessing}
                                        style={{
                                            flex: 2,
                                            padding: '10px 0',
                                            borderRadius: 10,
                                            border: 'none',
                                            background: isSell
                                                ? 'rgba(239,68,68,0.15)'
                                                : 'rgba(99,102,241,0.15)',
                                            color: isSell
                                                ? '#f87171'
                                                : '#818cf8',
                                            fontSize: '0.8rem',
                                            fontWeight: 700,
                                            cursor: batchProcessing
                                                ? 'not-allowed'
                                                : 'pointer',
                                        }}
                                    >
                                        {batchProcessing
                                            ? 'Processing…'
                                            : isSell
                                              ? 'Confirm Sell'
                                              : 'Confirm Grade'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                })()}
        </>
    )
}
