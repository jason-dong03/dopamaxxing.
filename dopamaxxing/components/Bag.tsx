'use client'

import { useState, useEffect, useRef } from 'react'
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

// ─── constants ────────────────────────────────────────────────────────────────
const FILTERS = ['All', ...RARITY_ORDER]

// ─── bag page ─────────────────────────────────────────────────────────────────
export default function BagPage({
    userCards: initialCards,
    coins: initialCoins = 0,
    bagCapacity: initialCapacity = 50,
}: {
    userCards: UserCard[]
    coins?: number
    bagCapacity?: number
}) {
    const router = useRouter()
    const [userCards, setUserCards] = useState(initialCards)
    const [coins, setCoins] = useState(initialCoins)
    const [bagCapacity, setBagCapacity] = useState(initialCapacity)
    const [expanding, setExpanding] = useState(false)
    const [expandMsg, setExpandMsg] = useState('')

    const [selectMode, setSelectMode] = useState(false)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [confirmAction, setConfirmAction] = useState<'sell' | 'grade' | null>(
        null,
    )
    const [batchProcessing, setBatchProcessing] = useState(false)
    const [filters, setFilters] = useState<Set<string>>(new Set(['All']))
    const [search, setSearch] = useState('')
    const [sort, setSort] = useState<
        'rarity' | 'level' | 'name' | 'price' | 'grade'
    >('rarity')
    const [selected, setSelected] = useState<UserCard | null>(null)
    const [isWide, setIsWide] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const headerRef = useRef<HTMLDivElement>(null)
    const [headerHeight, setHeaderHeight] = useState(0)

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
        if (headerRef.current) setHeaderHeight(headerRef.current.offsetHeight)
    }, [filters, search, sort])

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setSelected(null)
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [])

    const filtered = userCards
        .filter((uc) => filters.has('All') || filters.has(uc.cards.rarity))
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
        const GRADE_MULT: Record<number, number> = {
            10: 1.5,
            9: 1.35,
            8: 1.2,
            7: 1.1,
            6: 1.05,
            5: 1.0,
            4: 0.9,
            3: 0.8,
            2: 0.65,
            1: 0.5,
        }
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

        if (next) {
            // Only 1 favorite allowed — unfavorite all others first
            const {
                data: { user },
            } = await supabase.auth.getUser()
            await supabase
                .from('user_cards')
                .update({ is_favorited: false })
                .eq('user_id', user?.id ?? '')
                .neq('id', selected.id)
        }

        const { error } = await supabase
            .from('user_cards')
            .update({ is_favorited: next })
            .eq('id', selected.id)

        if (!error) {
            const updated = { ...selected, is_favorited: next }
            setUserCards((prev) =>
                prev.map((uc) => ({
                    ...uc,
                    is_favorited:
                        uc.id === selected.id
                            ? next
                            : next
                              ? false
                              : uc.is_favorited,
                })),
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
                        <div className="flex items-center justify-between mb-3">
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
                                                color: '#eab308',
                                            }}
                                        >
                                            🪙
                                        </span>
                                        <span
                                            style={{
                                                fontSize: '0.65rem',
                                                fontWeight: 600,
                                                color: '#eab308',
                                                fontFamily: 'monospace',
                                            }}
                                        >
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

                        {/* sort buttons */}
                        <div
                            className="flex gap-1.5 mb-2.5"
                            style={{
                                overflowX: 'auto',
                                flexWrap: 'nowrap',
                                paddingBottom: 2,
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
                                    className="capitalize transition-all px-3 py-1 rounded-full"
                                    style={{
                                        fontSize: '0.65rem',
                                        background:
                                            sort === s
                                                ? 'var(--pill-active-bg)'
                                                : 'transparent',
                                        border:
                                            sort === s
                                                ? '1px solid var(--pill-active-border)'
                                                : '1px solid var(--pill-border)',
                                        color:
                                            sort === s
                                                ? 'var(--app-text)'
                                                : 'var(--app-text-muted)',
                                    }}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>

                        {/* rarity filter pills + Select button */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                            }}
                        >
                            <div
                                className="flex gap-1.5 flex-1"
                                style={{
                                    overflowX: 'auto',
                                    flexWrap: 'nowrap',
                                    paddingBottom: 2,
                                }}
                            >
                                {FILTERS.map((f) => {
                                    const isActive = filters.has(f)
                                    const rainbow = isRainbow(f as Rarity)
                                    const glowRgb = rarityGlowRgb(f)
                                    function toggle() {
                                        setFilters((prev) => {
                                            const next = new Set(prev)
                                            if (f === 'All')
                                                return new Set(['All'])
                                            next.delete('All')
                                            if (next.has(f)) {
                                                next.delete(f)
                                                if (next.size === 0)
                                                    next.add('All')
                                            } else {
                                                next.add(f)
                                            }
                                            return next
                                        })
                                    }
                                    const isCelestial = f === 'Celestial'
                                    return (
                                        <button
                                            key={f}
                                            onClick={toggle}
                                            className="flex-shrink-0 px-3 py-1 rounded-full transition-all"
                                            style={{
                                                fontSize: '0.62rem',
                                                border: isCelestial
                                                    ? `1px solid rgba(180, 30, 30, ${isActive ? 0.55 : 0.25})`
                                                    : isActive &&
                                                        f !== 'All' &&
                                                        !rainbow
                                                      ? `1px solid rgba(${glowRgb}, 0.6)`
                                                      : isActive
                                                        ? '1px solid var(--pill-active-border)'
                                                        : '1px solid var(--pill-border)',
                                                background: isCelestial
                                                    ? isActive
                                                        ? 'linear-gradient(135deg, #0a0a0a 0%, #2c2c2c 45%, #c8c8c8 80%, #f0f0f0 100%)'
                                                        : 'linear-gradient(135deg, #0a0a0a 0%, #1c1c1c 60%, #707070 100%)'
                                                    : isActive &&
                                                        f !== 'All' &&
                                                        !rainbow
                                                      ? `rgba(${glowRgb}, 0.1)`
                                                      : isActive
                                                        ? 'var(--pill-active-bg)'
                                                        : 'transparent',
                                                color: isCelestial
                                                    ? '#e8e8e8'
                                                    : isActive &&
                                                        f !== 'All' &&
                                                        !rainbow
                                                      ? `rgba(${glowRgb}, 1)`
                                                      : isActive
                                                        ? 'var(--app-text)'
                                                        : 'var(--app-text-muted)',
                                            }}
                                        >
                                            {f}
                                        </button>
                                    )
                                })}
                            </div>
                            <button
                                onClick={handleExpandBag}
                                disabled={expanding}
                                style={{
                                    flexShrink: 0,
                                    fontSize: '0.62rem',
                                    fontWeight: 600,
                                    padding: '4px 10px',
                                    borderRadius: 20,
                                    border: '1px solid rgba(168,85,247,0.3)',
                                    background: 'rgba(168,85,247,0.08)',
                                    color: expanding
                                        ? 'var(--app-text-muted)'
                                        : '#c084fc',
                                    cursor: expanding
                                        ? 'not-allowed'
                                        : 'pointer',
                                    whiteSpace: 'nowrap',
                                    transition: 'all 150ms ease',
                                }}
                            >
                                {expandMsg ||
                                    (expanding ? (
                                        '…'
                                    ) : (
                                        <span>
                                            +10 Space ({bagCapacity}→
                                            <span style={{ color: '#4ade80' }}>
                                                {bagCapacity + 10}
                                            </span>
                                            ) · $ 20
                                        </span>
                                    ))}
                            </button>
                            <button
                                onClick={() => {
                                    setSelectMode((v) => !v)
                                    setSelectedIds(new Set())
                                }}
                                style={{
                                    flexShrink: 0,
                                    fontSize: '0.62rem',
                                    fontWeight: 600,
                                    padding: '4px 10px',
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
                        </div>

                        {/* quick-select rarity chips — only in select mode */}
                        {selectMode && (
                            <div
                                className="flex gap-1.5 mt-2"
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
                            {filtered.length === 0 ? (
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
                                    {filtered.map((uc) => (
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

                        {/* sidebar — desktop/tablet only */}
                        {!isWide && !isMobile && selected && (
                            <div
                                className="sidebar-anim scrollbar-none"
                                style={{
                                    width: 300,
                                    flexShrink: 0,
                                    position: 'fixed',
                                    top: headerHeight,
                                    bottom: 0,
                                    right: `max(0px, calc((100vw - 1200px) / 2))`,
                                    overflowY: 'auto',
                                    background: 'var(--sidebar-bg)',
                                    borderLeft:
                                        '1px solid var(--sidebar-border)',
                                    zIndex: 20,
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
                                        paddingBottom: 'max(80px, calc(80px + env(safe-area-inset-bottom, 0px)))',
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
