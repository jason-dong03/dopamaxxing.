'use client'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useIsMobile } from '@/lib/useIsMobile'
import { createClient } from '@/lib/supabase/client'
import { useProfile } from '@/lib/userStore'
import { PACKS, type Pack } from '@/lib/packs'
import PackOpening from './PackOpening'
import CrateOpening from './CrateOpening'
import BlackMarket from './BlackMarket'
import {
    RARITY_ORDER,
    RARITY_COLOR,
    rarityTextStyle,
    rarityTextClass,
    rarityGlowClass,
    isRainbow,
} from '@/lib/rarityConfig'

// module-level cache — survives tab switches, cleared on page reload
const _cache: {
    stock: Record<string, number>
    discounts: Record<string, number>
    nextRefreshStandard: string | null
    nextRefreshSpecial: string | null
    nextRefreshBox: string | null
    allPacks: Pack[]
    bagCount: number | null
    bagCapacity: number
    userLevel: number
    isAdmin: boolean
} = {
    stock: {},
    discounts: {},
    nextRefreshStandard: null,
    nextRefreshSpecial: null,
    nextRefreshBox: null,
    allPacks: PACKS,
    bagCount: null,
    bagCapacity: 50,
    userLevel: 1,
    isAdmin: false,
}

export default function PackSelector({ coins: _unusedCoins }: { coins?: number }) {
    const { profile } = useProfile()
    // null = not yet initialized. Once profile loads we set it once and own it locally.
    const [coins, setCoins] = useState<number | null>(null)
    const coinsSeeded = useRef(false)
    useEffect(() => {
        if (!coinsSeeded.current && profile?.coins != null) {
            setCoins(profile.coins)
            coinsSeeded.current = true
        }
    }, [profile?.coins])
    const effectiveCoins = coins ?? 0
    const [selectedPack, setSelectedPack] = useState<Pack | null>(null)
    const [selectedCount, setSelectedCount] = useState<number>(1)
    const savedScrollY = useRef(0)
    const pendingScrollRestore = useRef(false)
    const scrollContainerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (selectedPack !== null || !pendingScrollRestore.current) return
        pendingScrollRestore.current = false
        const y = savedScrollY.current
        const id = setTimeout(() => {
            if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = y
        }, 120)
        return () => clearTimeout(id)
    }, [selectedPack])
    const [hoveredId, setHoveredId] = useState<string | null>(null)
    const [previewPack, setPreviewPack] = useState<Pack | null>(null)
    const [bagCount, setBagCount] = useState<number | null>(() => _cache.bagCount)
    const [bagCapacity, setBagCapacity] = useState<number>(() => _cache.bagCapacity)
    const [isAdmin, setIsAdmin] = useState(() => _cache.isAdmin)
    const [allPacks, setAllPacks] = useState<Pack[]>(() => _cache.allPacks)
    const [userLevel, setUserLevel] = useState<number>(() => _cache.userLevel)

    // Hydrate from DB — replaces static fallback once loaded; re-append test packs
    useEffect(() => {
        fetch('/api/packs')
            .then((r) => (r.ok ? r.json() : null))
            .then((json) => {
                if (json?.packs?.length) {
                    const testPacks = PACKS.filter((p) => p.test)
                    const merged = [...json.packs, ...testPacks]
                    setAllPacks(merged)
                    _cache.allPacks = merged
                }
            })
            .catch(() => {})
    }, [])
    const [activeTab, setActiveTab] = useState<
        'classic' | 'special' | 'crates' | 'test'
    >('classic')
    const [stock, setStock] = useState<Record<string, number>>(() => _cache.stock)
    const [discounts, setDiscounts] = useState<Record<string, number>>(() => _cache.discounts)
    const [nextRefreshStandard, setNextRefreshStandard] = useState<string | null>(() => _cache.nextRefreshStandard)
    const [nextRefreshSpecial, setNextRefreshSpecial] = useState<string | null>(() => _cache.nextRefreshSpecial)
    const [nextRefreshBox, setNextRefreshBox] = useState<string | null>(() => _cache.nextRefreshBox)

    const refreshStock = useCallback(() => {
        fetch('/api/shop/stock')
            .then((r) => (r.ok ? r.json() : null))
            .then((json) => {
                if (!json?.stock) return
                setStock(json.stock)
                _cache.stock = json.stock
                if (json.discounts) { setDiscounts(json.discounts); _cache.discounts = json.discounts }
                if (json.next_refresh_standard) { setNextRefreshStandard(json.next_refresh_standard); _cache.nextRefreshStandard = json.next_refresh_standard }
                if (json.next_refresh_special) { setNextRefreshSpecial(json.next_refresh_special); _cache.nextRefreshSpecial = json.next_refresh_special }
                if (json.next_refresh_box) { setNextRefreshBox(json.next_refresh_box); _cache.nextRefreshBox = json.next_refresh_box }
            })
            .catch(() => {})
    }, [])

    const refreshBag = useCallback(() => {
        const supabase = createClient()
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) return
            supabase
                .from('user_cards')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .then(({ count }) => {
                    const c = count ?? 0
                    setBagCount(c)
                    _cache.bagCount = c
                })
        })
    }, [])

    useEffect(() => {
        const supabase = createClient()
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) return
            Promise.all([
                supabase
                    .from('user_cards')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', user.id),
                supabase
                    .from('profiles')
                    .select('bag_capacity,level, is_admin')
                    .eq('id', user.id)
                    .single(),
            ]).then(([countRes, profileRes]) => {
                const count = countRes.count ?? 0
                const capacity = profileRes.data?.bag_capacity ?? 50
                const level = profileRes.data?.level ?? 1
                const admin = !!(profileRes.data as any)?.is_admin
                setBagCount(count)
                setBagCapacity(capacity)
                setUserLevel(level)
                setIsAdmin(admin)
                _cache.bagCount = count
                _cache.bagCapacity = capacity
                _cache.userLevel = level
                _cache.isAdmin = admin
                if (!admin) refreshStock()
            })
        })
    }, [refreshStock])

    // Independent auto-refresh timers per group
    useEffect(() => {
        if (!nextRefreshStandard) return
        const diff = Math.max(
            0,
            new Date(nextRefreshStandard).getTime() - Date.now(),
        )
        const id = setTimeout(() => {
            setNextRefreshStandard(
                new Date(Date.now() + 5 * 60 * 1000).toISOString(),
            )
            refreshStock()
        }, diff)
        return () => clearTimeout(id)
    }, [nextRefreshStandard, refreshStock])

    useEffect(() => {
        if (!nextRefreshSpecial) return
        const diff = Math.max(
            0,
            new Date(nextRefreshSpecial).getTime() - Date.now(),
        )
        const id = setTimeout(() => {
            setNextRefreshSpecial(
                new Date(Date.now() + 8 * 60 * 1000).toISOString(),
            )
            refreshStock()
        }, diff)
        return () => clearTimeout(id)
    }, [nextRefreshSpecial, refreshStock])

    useEffect(() => {
        if (!nextRefreshBox) return
        const diff = Math.max(
            0,
            new Date(nextRefreshBox).getTime() - Date.now(),
        )
        const id = setTimeout(() => {
            setNextRefreshBox(
                new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            )
            refreshStock()
        }, diff)
        return () => clearTimeout(id)
    }, [nextRefreshBox, refreshStock])

    if (selectedPack) {
        const usePackOpening =
            selectedPack.aspect === 'pack' || !!selectedPack.theme_pokedex_ids

        return usePackOpening ? (
            typeof document !== 'undefined' ? createPortal(
                <PackOpening
                    pack={selectedPack}
                    count={selectedCount}
                    stock={isAdmin ? 999 : (stock[selectedPack.id] ?? 0)}
                    discount={discounts[selectedPack.id] ?? 0}
                    isAdmin={isAdmin}
                    free={!!(isAdmin && selectedPack.test)}
                    onBack={() => {
                        setSelectedPack(null)
                        setSelectedCount(1)
                        refreshStock()
                        refreshBag()
                    }}
                    onPackOpened={(packId, countOpened) => {
                        setStock((prev) => ({
                            ...prev,
                            [packId]: Math.max(
                                0,
                                (prev[packId] ?? 0) - countOpened,
                            ),
                        }))
                    }}
                />,
                document.body,
            ) : null
        ) : (
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                <CrateOpening
                    pack={selectedPack}
                    isAdmin={isAdmin}
                    onBack={() => {
                        setSelectedPack(null)
                        setSelectedCount(1)
                        if (!isAdmin) refreshStock()
                        refreshBag()
                    }}
                />
            </div>
        )
    }

    const isDev = process.env.NODE_ENV === 'development'
    const showTest = isDev || isAdmin
    const packs = allPacks.filter(
        (p) =>
            p.aspect === 'pack' &&
            !p.theme_pokedex_ids &&
            !p.special &&
            !p.test,
    )
    const specialPacks = allPacks.filter(
        (p) =>
            p.aspect === 'pack' &&
            (!!p.theme_pokedex_ids || !!p.special) &&
            !p.test,
    )
    const boxes = allPacks.filter(
        (p) => p.aspect === 'box' && (showTest || !p.test),
    )

    const bagFull = bagCount !== null && bagCount >= bagCapacity

    return (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            {/* ── fixed header: bag warning + black market + tabs ── */}
            <div style={{ flexShrink: 0, width: '100%', maxWidth: 700, margin: '0 auto', padding: '14px 16px 0' }}>
                {bagFull && (
                    <div
                        style={{
                            marginBottom: 12,
                            padding: '10px 16px',
                            borderRadius: 10,
                            background: 'rgba(239,68,68,0.08)',
                            border: '1px solid rgba(239,68,68,0.35)',
                            color: '#ef4444',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                        }}
                    >
                        <span>🎒</span>
                        <span>
                            Your bag is full ({bagCount}/{bagCapacity}). Sell or
                            feed cards to open more packs.
                        </span>
                    </div>
                )}

                <BlackMarket
                    coins={effectiveCoins}
                    onCoinsChange={(delta) => setCoins(prev => (prev ?? 0) + delta)}
                    userLevel={userLevel}
                />

                <PackTabs
                    activeTab={activeTab}
                    onChange={setActiveTab}
                    isAdmin={isAdmin}
                    counts={{
                        classic: packs.filter(p => isAdmin || !p.level_required || userLevel >= p.level_required).length,
                        special: specialPacks.filter(p => isAdmin || !p.level_required || userLevel >= p.level_required).length,
                        crates: boxes.filter(p => isAdmin || !p.level_required || userLevel >= p.level_required).length,
                    }}
                />
            </div>

            {/* ── scrollable pack list ── */}
            <div
                ref={scrollContainerRef}
                style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 16px 24px' }}
            >
                <div style={{ width: '100%', maxWidth: 700, margin: '0 auto' }}>
                    {activeTab === 'classic' && packs.length > 0 && (
                        <PackShopList
                            data-tutorial="packs"
                            title="classic packs"
                            packs={packs}
                            coins={effectiveCoins}
                            bagFull={bagFull}
                            stock={stock}
                            discounts={discounts}
                            isAdmin={isAdmin}
                            userLevel={userLevel}
                            nextRefreshAt={isAdmin ? null : nextRefreshStandard}
                            onStockExpired={refreshStock}
                            hoveredId={hoveredId}
                            onHover={setHoveredId}
                            onSelect={(p) => {
                                savedScrollY.current = scrollContainerRef.current?.scrollTop ?? 0
                                pendingScrollRestore.current = true
                                setSelectedCount(1)
                                setSelectedPack(p)
                            }}
                            onPreview={setPreviewPack}
                        />
                    )}

                    {activeTab === 'special' && specialPacks.length > 0 && (
                        <PackShopList
                            title="special packs"
                            gold
                            packs={specialPacks}
                            coins={effectiveCoins}
                            bagFull={bagFull}
                            stock={stock}
                            discounts={discounts}
                            isAdmin={isAdmin}
                            userLevel={userLevel}
                            nextRefreshAt={isAdmin ? null : nextRefreshSpecial}
                            onStockExpired={refreshStock}
                            hoveredId={hoveredId}
                            onHover={setHoveredId}
                            onSelect={(p) => {
                                savedScrollY.current = scrollContainerRef.current?.scrollTop ?? 0
                                pendingScrollRestore.current = true
                                setSelectedCount(1)
                                setSelectedPack(p)
                            }}
                            onPreview={setPreviewPack}
                        />
                    )}

                    {activeTab === 'crates' && boxes.length > 0 && (
                        <PackShopList
                            title="crates"
                            gold
                            packs={boxes}
                            coins={effectiveCoins}
                            bagFull={bagFull}
                            stock={stock}
                            discounts={discounts}
                            isAdmin={isAdmin}
                            userLevel={userLevel}
                            nextRefreshAt={isAdmin ? null : nextRefreshBox}
                            onStockExpired={refreshStock}
                            hoveredId={hoveredId}
                            onHover={setHoveredId}
                            onSelect={(p) => {
                                savedScrollY.current = scrollContainerRef.current?.scrollTop ?? 0
                                pendingScrollRestore.current = true
                                setSelectedCount(1)
                                setSelectedPack(p)
                            }}
                            onPreview={setPreviewPack}
                        />
                    )}

                    {activeTab === 'test' && isAdmin && (
                        <PackShopList
                            title="admin test packs"
                            packs={PACKS.filter(p => p.test)}
                            coins={effectiveCoins}
                            bagFull={false}
                            stock={{}}
                            discounts={{}}
                            isAdmin={isAdmin}
                            userLevel={userLevel}
                            nextRefreshAt={null}
                            hoveredId={hoveredId}
                            onHover={setHoveredId}
                            onSelect={(p) => {
                                savedScrollY.current = scrollContainerRef.current?.scrollTop ?? 0
                                pendingScrollRestore.current = true
                                setSelectedCount(1)
                                setSelectedPack(p)
                            }}
                            onPreview={setPreviewPack}
                        />
                    )}
                </div>
            </div>

            {previewPack && (
                <CardListModal
                    pack={previewPack}
                    onClose={() => setPreviewPack(null)}
                />
            )}
        </div>
    )
}

function PackTabs({
    activeTab,
    onChange,
    isAdmin,
    counts,
}: {
    activeTab: 'classic' | 'special' | 'crates' | 'test'
    onChange: (tab: 'classic' | 'special' | 'crates' | 'test') => void
    isAdmin?: boolean
    counts: { classic: number; special: number; crates: number }
}) {
    const tabs: { id: 'classic' | 'special' | 'crates' | 'test'; label: string; count: number; adminOnly?: boolean }[] = [
        { id: 'classic', label: 'classic packs', count: counts.classic },
        { id: 'special', label: 'special packs', count: counts.special },
        { id: 'crates', label: 'crates', count: counts.crates },
        ...(isAdmin ? [{ id: 'test' as const, label: '✦ test', count: 0, adminOnly: true }] : []),
    ]

    return (
        <div
            style={{
                width: '100%',
                maxWidth: 660,
                margin: '0 auto 18px',
                display: 'flex',
                justifyContent: 'center',
            }}
        >
            <div
                style={{
                    display: 'inline-flex',
                    gap: 8,
                    padding: 6,
                    borderRadius: 16,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--app-border-2)',
                    boxShadow: '0 10px 28px rgba(0,0,0,0.16)',
                    flexWrap: 'wrap',
                }}
            >
                {tabs.map((tab) => {
                    const active = activeTab === tab.id
                    const isTest = tab.id === 'test'
                    return (
                        <button
                            key={tab.id}
                            onClick={() => onChange(tab.id)}
                            style={{
                                border: isTest ? '1px solid rgba(168,85,247,0.35)' : 'none',
                                cursor: 'pointer',
                                borderRadius: 12,
                                padding:
                                    'clamp(6px, 1.6vw, 10px) clamp(8px, 2vw, 14px)',
                                background: active
                                    ? isTest ? 'rgba(168,85,247,0.18)' : 'rgba(255,255,255,0.08)'
                                    : isTest ? 'rgba(168,85,247,0.06)' : 'transparent',
                                color: active
                                    ? isTest ? '#d8b4fe' : 'var(--app-text)'
                                    : isTest ? '#a855f7' : 'var(--app-text-secondary)',
                                fontWeight: active ? 700 : 600,
                                fontSize: 'clamp(0.58rem, 1.8vw, 0.72rem)',
                                letterSpacing: '0.06em',
                                textTransform: 'uppercase',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                transition: 'all 180ms ease',
                            }}
                        >
                            <span>{tab.label}</span>
                            {tab.count > 0 && (
                                <span style={{
                                    fontSize: '0.55rem',
                                    fontWeight: 700,
                                    background: active ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)',
                                    color: active ? 'var(--app-text)' : 'var(--app-text-muted)',
                                    borderRadius: 8,
                                    padding: '1px 6px',
                                    minWidth: 18,
                                    textAlign: 'center',
                                }}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

function PackShopList({
    title,
    gold,
    packs,
    coins,
    bagFull,
    stock,
    discounts,
    isAdmin,
    userLevel,
    nextRefreshAt,
    onStockExpired,
    hoveredId,
    onHover,
    onSelect,
    onPreview,
    ...rest
}: {
    title: string
    gold?: boolean
    packs: Pack[]
    coins: number
    bagFull: boolean
    stock: Record<string, number>
    discounts: Record<string, number>
    isAdmin?: boolean
    userLevel: number
    nextRefreshAt: string | null
    onStockExpired?: () => void
    hoveredId: string | null
    onHover: (id: string | null) => void
    onSelect: (pack: Pack) => void
    onPreview: (pack: Pack) => void
    [key: string]: unknown
}) {
    const lineColor = gold ? 'rgba(234,179,8,0.18)' : 'var(--app-border-2)'
    const textColor = gold ? '#92400e' : 'var(--app-text-secondary)'
    const isMobile = useIsMobile()

    return (
        <section style={{ marginBottom: 0 }} {...rest}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    marginBottom: 18,
                }}
            >
                <div style={{ height: 1, flex: 1, background: lineColor }} />
                <span
                    style={{
                        fontSize: '0.56rem',
                        letterSpacing: '0.24em',
                        textTransform: 'uppercase',
                        color: textColor,
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                    }}
                >
                    {title}
                </span>
                <div style={{ height: 1, flex: 1, background: lineColor }} />
            </div>

            {isMobile ? (
                <>
                    {nextRefreshAt && (
                        <div style={{ marginBottom: 8 }}>
                            <StockCountdown
                                nextRefreshAt={nextRefreshAt}
                                onExpired={onStockExpired}
                            />
                        </div>
                    )}
                    <MobilePackCarousel
                        tabKey={title}
                        packs={packs}
                        coins={coins}
                        bagFull={bagFull}
                        gold={gold}
                        stock={stock}
                        discounts={discounts}
                        isAdmin={isAdmin}
                        userLevel={userLevel}
                        hoveredId={hoveredId}
                        onHover={onHover}
                        onSelect={onSelect}
                        onPreview={onPreview}
                    />
                </>
            ) : (
                <div
                    style={{
                        width: '100%',
                        maxWidth: 660,
                        margin: '0 auto',
                        borderRadius: 18,
                        border: `1px solid ${gold ? 'rgba(234,179,8,0.20)' : 'var(--app-border-2)'}`,
                        background: gold
                            ? 'linear-gradient(180deg, rgba(234,179,8,0.06), rgba(255,255,255,0.02))'
                            : 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015))',
                        boxShadow: '0 18px 50px rgba(0,0,0,0.22)',
                        padding: 14,
                    }}
                >
                    <div
                        style={{
                            maxHeight: '62vh',
                            overflowY: 'auto',
                            overflowX: 'hidden',
                            scrollbarWidth: 'none',
                            msOverflowStyle: 'none',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10,
                        }}
                    >
                        <style>{`
                            .pack-shop-scroll::-webkit-scrollbar {
                                display: none;
                            }
                        `}</style>

                        <div
                            className="pack-shop-scroll"
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 10,
                            }}
                            onMouseLeave={() => onHover(null)}
                        >
                            {nextRefreshAt && (
                                <StockCountdown
                                    nextRefreshAt={nextRefreshAt}
                                    onExpired={onStockExpired}
                                />
                            )}
                            {packs.map((pack) => (
                                <ShopPackRow
                                    key={pack.id}
                                    pack={pack}
                                    hovered={hoveredId === pack.id}
                                    coins={coins}
                                    bagFull={bagFull}
                                    gold={gold}
                                    stock={stock[pack.id] ?? 0}
                                    discount={discounts[pack.id] ?? 0}
                                    isAdmin={isAdmin}
                                    userLevel={userLevel}
                                    onHover={onHover}
                                    onSelect={() => onSelect(pack)}
                                    onPreview={onPreview}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </section>
    )
}

function MobilePackCarousel({
    tabKey,
    packs,
    coins,
    bagFull,
    gold,
    stock,
    discounts,
    isAdmin,
    userLevel,
    hoveredId,
    onHover,
    onSelect,
    onPreview,
}: {
    tabKey: string
    packs: Pack[]
    coins: number
    bagFull: boolean
    gold?: boolean
    stock: Record<string, number>
    discounts: Record<string, number>
    isAdmin?: boolean
    userLevel: number
    hoveredId: string | null
    onHover: (id: string | null) => void
    onSelect: (pack: Pack) => void
    onPreview: (pack: Pack) => void
}) {
    const containerRef = useRef<HTMLDivElement>(null)
    const storageKey = `pack-carousel-idx:${tabKey}`
    const [currentIndex, setCurrentIndex] = useState(() => {
        if (typeof window === 'undefined') return 0
        const saved = sessionStorage.getItem(storageKey)
        const n = saved ? parseInt(saved, 10) : 0
        return Number.isFinite(n) && n >= 0 ? Math.min(n, Math.max(0, packs.length - 1)) : 0
    })

    // restore scroll position on mount / when pack count changes
    useEffect(() => {
        const el = containerRef.current
        if (!el) return
        const child = el.children[currentIndex] as HTMLElement | undefined
        if (child) {
            el.scrollTo({ left: child.offsetLeft, behavior: 'auto' })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [packs.length])

    function handleScroll() {
        const el = containerRef.current
        if (!el) return
        const slideWidth = el.offsetWidth
        const idx = Math.round(el.scrollLeft / slideWidth)
        if (idx !== currentIndex && idx >= 0 && idx < packs.length) {
            setCurrentIndex(idx)
            sessionStorage.setItem(storageKey, String(idx))
        }
    }

    function jumpTo(idx: number) {
        const el = containerRef.current
        if (!el) return
        const child = el.children[idx] as HTMLElement | undefined
        if (child) el.scrollTo({ left: child.offsetLeft, behavior: 'smooth' })
    }

    return (
        <div
            style={{
                width: '100%',
                maxWidth: 660,
                margin: '0 auto',
                borderRadius: 18,
                border: `1px solid ${gold ? 'rgba(234,179,8,0.20)' : 'var(--app-border-2)'}`,
                background: gold
                    ? 'linear-gradient(180deg, rgba(234,179,8,0.06), rgba(255,255,255,0.02))'
                    : 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015))',
                boxShadow: '0 18px 50px rgba(0,0,0,0.22)',
                padding: '8px 0 8px',
                position: 'relative',
            }}
        >
            <style>{`
                .mobile-pack-carousel::-webkit-scrollbar { display: none; }
            `}</style>
            <div
                ref={containerRef}
                className="mobile-pack-carousel"
                onScroll={handleScroll}
                style={{
                    display: 'flex',
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    scrollSnapType: 'x mandatory',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    WebkitOverflowScrolling: 'touch',
                }}
            >
                {packs.map((pack) => (
                    <div
                        key={pack.id}
                        style={{
                            flex: '0 0 100%',
                            scrollSnapAlign: 'center',
                            scrollSnapStop: 'always',
                            padding: '0 10px',
                            boxSizing: 'border-box',
                        }}
                    >
                        <MobilePackCard
                            pack={pack}
                            coins={coins}
                            bagFull={bagFull}
                            gold={gold}
                            stock={stock[pack.id] ?? 0}
                            discount={discounts[pack.id] ?? 0}
                            isAdmin={isAdmin}
                            userLevel={userLevel}
                            onSelect={() => {
                                // remember the pack the user opened so we restore here
                                const idx = packs.findIndex((p) => p.id === pack.id)
                                if (idx >= 0)
                                    sessionStorage.setItem(storageKey, String(idx))
                                onSelect(pack)
                            }}
                            onPreview={onPreview}
                        />
                    </div>
                ))}
            </div>
            {/* dot indicator */}
            {packs.length > 1 && (
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: 6,
                        marginTop: 8,
                    }}
                >
                    {packs.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => jumpTo(i)}
                            aria-label={`pack ${i + 1}`}
                            style={{
                                width: i === currentIndex ? 18 : 6,
                                height: 6,
                                borderRadius: 3,
                                border: 'none',
                                padding: 0,
                                background:
                                    i === currentIndex
                                        ? 'rgba(255,255,255,0.85)'
                                        : 'rgba(255,255,255,0.22)',
                                transition: 'all 220ms ease',
                                cursor: 'pointer',
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

function MobilePackCard({
    pack,
    coins,
    bagFull,
    gold,
    stock,
    discount,
    isAdmin,
    userLevel,
    onSelect,
    onPreview,
}: {
    pack: Pack
    coins: number
    bagFull: boolean
    gold?: boolean
    stock: number
    discount: number
    isAdmin?: boolean
    userLevel: number
    onSelect: () => void
    onPreview: (pack: Pack) => void
}) {
    const discountedCost = parseFloat((pack.cost * (1 - discount)).toFixed(2))
    const canAfford = isAdmin || (coins ?? 0) >= discountedCost
    const hasStock = isAdmin || stock > 0
    const isLevelGated =
        !isAdmin && !!pack.level_required && userLevel < pack.level_required
    const disabled = bagFull || !canAfford || !hasStock || isLevelGated
    const borderColor = gold
        ? 'rgba(234,179,8,0.22)'
        : 'rgba(255,255,255,0.08)'

    return (
        <div
            style={{
                position: 'relative',
                opacity: disabled ? 0.55 : 1,
                transition: 'opacity 300ms',
            }}
        >
            <div
                role="button"
                tabIndex={disabled ? -1 : 0}
                onClick={() => {
                    if (!disabled) onSelect()
                }}
                onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && !disabled)
                        onSelect()
                }}
                style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.02)',
                    border: `1px solid ${borderColor}`,
                    borderRadius: 18,
                    padding: '10px 12px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    transition: 'all 220ms ease',
                    boxShadow: '0 10px 28px rgba(0,0,0,0.22)',
                    position: 'relative',
                }}
            >
                {/* large pack image — fills majority of card */}
                <div
                    style={{
                        width: '100%',
                        flex: '1 1 auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4px 6px 6px',
                    }}
                >
                    <img
                        src={pack.image}
                        alt={pack.name}
                        style={{
                            width: 'auto',
                            maxWidth: '100%',
                            height: 'auto',
                            maxHeight: 'min(38vh, 320px)',
                            objectFit: 'contain',
                            filter: bagFull
                                ? 'drop-shadow(0 0 6px rgba(228,228,228,0.12))'
                                : 'drop-shadow(0 0 22px rgba(228,228,228,0.30))',
                        }}
                    />
                </div>

                {/* metadata stacked below */}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 4,
                        marginTop: 4,
                        paddingTop: 8,
                        borderTop: '1px solid rgba(255,255,255,0.06)',
                    }}
                >
                    <ThemeLabel pack={pack} />
                    <div
                        style={{
                            fontSize: '1rem',
                            fontWeight: 700,
                            color: 'var(--app-text)',
                            lineHeight: 1.2,
                            textAlign: 'center',
                        }}
                    >
                        {pack.name}
                    </div>
                    {pack.description && (
                        <div
                            style={{
                                fontSize: '0.7rem',
                                color: 'var(--app-text-muted)',
                                lineHeight: 1.4,
                                textAlign: 'center',
                                maxWidth: 320,
                            }}
                        >
                            {pack.description}
                        </div>
                    )}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            marginTop: 4,
                            flexWrap: 'wrap',
                            justifyContent: 'center',
                        }}
                    >
                        {discount > 0 && (
                            <span
                                style={{
                                    fontSize: '0.6rem',
                                    fontWeight: 800,
                                    background: '#22c55e',
                                    color: '#000',
                                    borderRadius: 4,
                                    padding: '2px 6px',
                                    letterSpacing: '0.04em',
                                }}
                            >
                                -{Math.round(discount * 100)}% OFF
                            </span>
                        )}
                        <div
                            style={{
                                fontSize: '0.92rem',
                                fontWeight: 700,
                                color: canAfford ? '#4ade80' : '#ef4444',
                            }}
                        >
                            Cost $
                            {discountedCost.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}
                        </div>
                        {discount > 0 && (
                            <span
                                style={{
                                    fontSize: '0.7rem',
                                    color: 'var(--app-text-muted)',
                                    textDecoration: 'line-through',
                                }}
                            >
                                ${Number(pack.cost).toFixed(2)}
                            </span>
                        )}
                    </div>
                    {!isAdmin && (
                        <div
                            style={{
                                fontSize: isLevelGated ? '0.72rem' : '0.82rem',
                                fontWeight: 700,
                                color: isLevelGated
                                    ? '#ef4444'
                                    : stock > 0
                                      ? '#ffffff'
                                      : '#ef4444',
                                marginTop: 2,
                            }}
                        >
                            {isLevelGated
                                ? `🔒 Unlocks at level ${pack.level_required}`
                                : stock > 0
                                  ? `x${stock} in stock`
                                  : 'out of stock'}
                        </div>
                    )}
                </div>
            </div>

            {/* preview button — top right */}
            <div style={{ position: 'absolute', top: 10, right: 10 }}>
                <CardListBtn onClick={() => onPreview(pack)} />
            </div>
        </div>
    )
}

function StockCountdown({
    nextRefreshAt,
    onExpired,
}: {
    nextRefreshAt: string
    onExpired?: () => void
}) {
    const [remaining, setRemaining] = useState('')
    const [refreshing, setRefreshing] = useState(false)

    useEffect(() => {
        setRefreshing(false)
        function update() {
            const diff = new Date(nextRefreshAt).getTime() - Date.now()
            if (diff <= 0) {
                setRefreshing(true)
                setRemaining('restocking…')
                return true // expired
            }
            const m = Math.floor(diff / 60000)
            const s = Math.floor((diff % 60000) / 1000)
            setRemaining(`restocks in ${m}:${String(s).padStart(2, '0')}`)
            return false
        }
        if (update()) {
            // Already expired on mount — trigger refresh and set a safety reset
            onExpired?.()
            const safety = setTimeout(() => {
                setRefreshing(false)
                setRemaining('')
            }, 10000)
            return () => clearTimeout(safety)
        }
        const id = setInterval(() => {
            if (update()) {
                clearInterval(id)
                onExpired?.()
                // Safety: if parent doesn't push new nextRefreshAt within 10s, clear the "restocking…" label
                setTimeout(() => {
                    setRefreshing(false)
                    setRemaining('')
                }, 10000)
            }
        }, 1000)
        return () => clearInterval(id)
    }, [nextRefreshAt, onExpired])

    return (
        <div
            style={{
                textAlign: 'right',
                fontSize: '0.58rem',
                color: refreshing ? '#fb923c' : '#ffffff',
                letterSpacing: '0.04em',
                paddingRight: 4,
                paddingBottom: 2,
                transition: 'color 300ms',
            }}
        >
            {remaining}
        </div>
    )
}

function ShopPackRow({
    pack,
    hovered,
    coins,
    bagFull,
    gold,
    stock,
    discount,
    isAdmin,
    userLevel,
    onHover,
    onSelect,
    onPreview,
}: {
    pack: Pack
    hovered: boolean
    coins: number
    bagFull: boolean
    gold?: boolean
    stock: number
    discount: number
    isAdmin?: boolean
    userLevel: number
    onHover: (id: string | null) => void
    onSelect: () => void
    onPreview: (pack: Pack) => void
}) {
    const discountedCost = parseFloat((pack.cost * (1 - discount)).toFixed(2))
    const canAfford = isAdmin || (coins ?? 0) >= discountedCost
    const hasStock = isAdmin || stock > 0
    const isLevelGated = !isAdmin && !!pack.level_required && userLevel < pack.level_required
    const disabled = bagFull || !canAfford || !hasStock || isLevelGated
    const borderColor = gold ? 'rgba(234,179,8,0.22)' : 'rgba(255,255,255,0.08)'
    const hoverBorderColor = gold
        ? 'rgba(234,179,8,0.42)'
        : 'rgba(255,255,255,0.16)'

    return (
        <div
            style={{
                position: 'relative',
                opacity: disabled ? 0.45 : 1,
                transition: 'opacity 300ms',
            }}
            onMouseEnter={() => onHover(pack.id)}
            onMouseLeave={() => onHover(null)}
        >
            <div
                role="button"
                tabIndex={disabled ? -1 : 0}
                onClick={() => {
                    if (!disabled) onSelect()
                }}
                onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && !disabled)
                        onSelect()
                }}
                style={{
                    width: '100%',
                    background:
                        hovered && !disabled
                            ? 'rgba(255,255,255,0.045)'
                            : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${hovered && !disabled ? hoverBorderColor : borderColor}`,
                    borderRadius: 16,
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'stretch',
                    gap: 12,
                    textAlign: 'left',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    transition: 'all 220ms ease',
                    boxShadow:
                        hovered && !disabled
                            ? '0 10px 24px rgba(0,0,0,0.16)'
                            : 'none',
                    minHeight: 100,
                    position: 'relative',
                }}
            >
                <div
                    style={{
                        width: 84,
                        minWidth: 84,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        alignSelf: 'center',
                    }}
                >
                    <img
                        src={pack.image}
                        alt={pack.name}
                        style={{
                            width: '100%',
                            height: 'auto',
                            maxHeight: 118,
                            objectFit: 'contain',
                            filter:
                                hovered && !bagFull
                                    ? 'drop-shadow(0 0 18px rgba(228,228,228,0.35))'
                                    : 'drop-shadow(0 0 6px rgba(228,228,228,0.12))',
                            transition:
                                'filter 220ms ease, transform 220ms ease',
                            transform:
                                hovered && !bagFull
                                    ? 'scale(1.04)'
                                    : 'scale(1)',
                        }}
                    />
                </div>

                <div
                    style={{
                        flex: 1,
                        minWidth: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        justifyContent: 'center',
                        alignItems: 'flex-start',
                        paddingTop: 2,
                    }}
                >
                    <ThemeLabel pack={pack} />

                    <div
                        style={{
                            fontSize: '0.93rem',
                            fontWeight: 700,
                            color:
                                hovered && !bagFull
                                    ? 'var(--app-text)'
                                    : 'var(--app-text-secondary)',
                            lineHeight: 1.2,
                            textAlign: 'left',
                        }}
                    >
                        {pack.name}
                    </div>

                    <div
                        style={{
                            fontSize: '0.67rem',
                            color: 'var(--app-text-muted)',
                            lineHeight: 1.35,
                            maxWidth: 420,
                            textAlign: 'left',
                        }}
                    >
                        {pack.description}
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 7,
                            marginTop: 4,
                            flexWrap: 'wrap',
                        }}
                    >
                        {discount > 0 && (
                            <span
                                style={{
                                    fontSize: '0.58rem',
                                    fontWeight: 800,
                                    background: '#22c55e',
                                    color: '#000',
                                    borderRadius: 4,
                                    padding: '1px 5px',
                                    letterSpacing: '0.04em',
                                }}
                            >
                                -{Math.round(discount * 100)}% OFF
                            </span>
                        )}
                        <div
                            style={{
                                fontSize: '0.84rem',
                                fontWeight: 700,
                                color: canAfford ? '#4ade80' : '#ef4444',
                            }}
                        >
                            Cost $
                            {discountedCost.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}
                        </div>
                        {discount > 0 && (
                            <span
                                style={{
                                    fontSize: '0.67rem',
                                    color: 'var(--app-text-muted)',
                                    textDecoration: 'line-through',
                                }}
                            >
                                ${Number(pack.cost).toFixed(2)}
                            </span>
                        )}
                    </div>
                </div>
                {/* stock count — bottom right */}
                {!isAdmin && (
                    <div
                        style={{
                            position: 'absolute',
                            bottom: 10,
                            right: 14,
                            fontSize: isLevelGated ? '0.7rem' : '0.9rem',
                            fontWeight: 700,
                            color: isLevelGated ? '#ef4444' : stock > 0 ? '#ffffff' : '#ef4444',
                        }}
                    >
                        {isLevelGated
                            ? `🔒 Unlocks at level ${pack.level_required}`
                            : stock > 0
                              ? `x${stock}`
                              : 'out of stock'}
                    </div>
                )}
            </div>

            <div style={{ position: 'absolute', top: 10, right: 10 }}>
                <CardListBtn onClick={() => onPreview(pack)} />
            </div>
        </div>
    )
}

function ThemeLabel({ pack }: { pack: Pack }) {
    if (!pack.theme_label) return null
    const color = pack.theme_label_color ?? '#c084fc'
    return (
        <div
            style={{
                display: 'inline-flex',
                alignSelf: 'flex-start',
                width: 'fit-content',
                maxWidth: '100%',
                alignItems: 'center',
                background: `${color}1a`,
                border: `1px solid ${color}55`,
                borderRadius: 4,
                padding: '1px 7px',
                marginBottom: 4,
                fontSize: '0.45rem',
                color,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                fontWeight: 700,
                whiteSpace: 'nowrap',
            }}
        >
            {pack.theme_label}
        </div>
    )
}

// ─── card list icon button ────────────────────────────────────────────────────
function CardListBtn({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ')
                    onClick(e as unknown as React.MouseEvent)
            }}
            title="Preview card list"
            style={{
                position: 'absolute',
                top: 6,
                right: 6,
                width: 24,
                height: 24,
                borderRadius: 6,
                background: 'rgba(0,0,0,0.45)',
                border: '1px solid rgba(255,255,255,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.75)',
                fontSize: '0.7rem',
                backdropFilter: 'blur(4px)',
            }}
        >
            <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
        </div>
    )
}

// ─── act 9 inscription fragments ─────────────────────────────────────────────
const WF_FRAGMENTS = [
    {
        text: 'The bonds between you',
        top: '7%',
        left: '5%',
        rotate: -11,
        delay: 0,
    },
    {
        text: 'and your Pokémon —',
        top: '24%',
        right: '4%',
        rotate: 9,
        delay: 1.4,
    },
    { text: "they're real.", top: '48%', left: '8%', rotate: -5, delay: 2.8 },
    {
        text: "I can't deny it",
        bottom: '22%',
        right: '6%',
        rotate: 7,
        delay: 0.7,
    },
    { text: 'anymore.', bottom: '9%', left: '12%', rotate: -8, delay: 2.1 },
] as const

const BB_FRAGMENTS = [
    {
        text: "I'm going to release",
        top: '9%',
        left: '6%',
        rotate: 8,
        delay: 0.5,
    },
    {
        text: 'my dragon back',
        top: '27%',
        right: '5%',
        rotate: -10,
        delay: 1.8,
    },
    { text: 'to the sky.', top: '50%', left: '7%', rotate: 5, delay: 3.1 },
    {
        text: 'They deserve to be free.',
        bottom: '24%',
        right: '4%',
        rotate: -7,
        delay: 1.1,
    },
    { text: 'As do I.', bottom: '8%', left: '14%', rotate: 6, delay: 2.4 },
] as const

function PackInscriptions({ packId }: { packId: string }) {
    const isWF = packId === 'sv10.5w'
    const isBB = packId === 'sv10.5b'
    if (!isWF && !isBB) return null

    const fragments = isWF ? WF_FRAGMENTS : BB_FRAGMENTS
    const color = isWF ? 'rgba(255,200,100,' : 'rgba(100,160,255,'

    return (
        <>
            {fragments.map((f, i) => (
                <div
                    key={i}
                    style={{
                        position: 'absolute',
                        ...((f as any).top !== undefined
                            ? { top: (f as any).top }
                            : {}),
                        ...((f as any).bottom !== undefined
                            ? { bottom: (f as any).bottom }
                            : {}),
                        ...((f as any).left !== undefined
                            ? { left: (f as any).left }
                            : {}),
                        ...((f as any).right !== undefined
                            ? { right: (f as any).right }
                            : {}),
                        fontSize: '0.38rem',
                        fontStyle: 'italic',
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                        color: `${color}0.55)`,
                        textShadow: `0 0 8px ${color}0.4), 0 0 20px ${color}0.2)`,
                        transform: `rotate(${f.rotate}deg)`,
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                        userSelect: 'none',
                        animation: `pack-inscription-pulse 4s ease-in-out ${f.delay}s infinite`,
                        zIndex: 1,
                    }}
                >
                    {f.text}
                </div>
            ))}
            <style>{`
                @keyframes pack-inscription-pulse {
                    0%, 100% { opacity: 0.18; }
                    50% { opacity: 0.55; }
                }
            `}</style>
        </>
    )
}

// ─── pack card (portrait grid) ────────────────────────────────────────────────
function PackCard({
    pack,
    hovered,
    canAfford,
    bagFull,
    onHover,
    onSelect,
    onPreview,
}: {
    pack: Pack
    hovered: boolean
    canAfford: boolean
    bagFull: boolean
    onHover: (id: string | null) => void
    onSelect: (pack: Pack) => void
    onPreview: (pack: Pack) => void
}) {
    return (
        <div
            style={{
                position: 'relative',
                opacity: bagFull ? 0.45 : 1,
                transition: 'opacity 300ms',
            }}
        >
            <button
                onClick={() => {
                    if (!bagFull) onSelect(pack)
                }}
                onMouseEnter={() => onHover(pack.id)}
                onMouseLeave={() => onHover(null)}
                disabled={bagFull}
                style={{
                    background: 'none',
                    border: 'none',
                    cursor: bagFull ? 'not-allowed' : 'pointer',
                    padding: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                }}
            >
                <div
                    style={{
                        width: '100%',
                        borderRadius: 12,
                        padding: 2,
                        background:
                            hovered && !bagFull
                                ? 'var(--pack-frame-hover)'
                                : 'var(--pack-frame)',
                        transition: 'all 350ms cubic-bezier(0.34,1.56,0.64,1)',
                        transform:
                            hovered && !bagFull ? 'translateY(-12px)' : 'none',
                        boxShadow:
                            hovered && !bagFull
                                ? 'var(--pack-shadow-hover)'
                                : 'var(--pack-shadow)',
                        position: 'relative',
                    }}
                >
                    <div
                        style={{
                            borderRadius: 10,
                            background: 'var(--pack-card-inner)',
                            aspectRatio: '2/3',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            padding: 6,
                            position: 'relative',
                        }}
                    >
                        <PackInscriptions packId={pack.id} />
                        <img
                            src={pack.image}
                            alt={pack.name}
                            style={{
                                maxWidth: '100%',
                                maxHeight: '100%',
                                width: 'auto',
                                height: 'auto',
                                objectFit: 'contain',
                                filter:
                                    hovered && !bagFull
                                        ? 'drop-shadow(0 0 20px rgba(228,228,228,0.6))'
                                        : 'drop-shadow(0 0 6px rgba(228,228,228,0.12))',
                                transition: 'filter 350ms ease',
                                position: 'relative',
                                zIndex: 2,
                            }}
                        />
                    </div>
                </div>

                <div style={{ textAlign: 'center', width: '100%' }}>
                    <ThemeLabel pack={pack} />
                    <p
                        style={{
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            color:
                                hovered && !bagFull
                                    ? 'var(--app-text)'
                                    : 'var(--app-text-secondary)',
                            letterSpacing: '0.02em',
                            transition: 'color 300ms',
                            margin: 0,
                        }}
                    >
                        {pack.name}
                    </p>
                    <p
                        style={{
                            fontSize: '0.6rem',
                            color: 'var(--app-text-muted)',
                            marginTop: 3,
                        }}
                    >
                        {pack.description}
                    </p>
                    <p
                        style={{
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            color: canAfford ? '#4ade80' : '#ef4444',
                            margin: '4px 0 0',
                        }}
                    >
                        $
                        {Number(pack.cost).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        })}
                    </p>
                </div>
            </button>
            <CardListBtn onClick={() => onPreview(pack)} />
        </div>
    )
}

// ─── box pack card ────────────────────────────────────────────────────────────
function BoxPackCard({
    pack,
    hovered,
    canAfford,
    bagFull,
    onHover,
    onSelect,
    onPreview,
}: {
    pack: Pack
    hovered: boolean
    canAfford: boolean
    bagFull: boolean
    onHover: (id: string | null) => void
    onSelect: (pack: Pack) => void
    onPreview: (pack: Pack) => void
}) {
    return (
        <div
            style={{
                position: 'relative',
                width: 260,
                flexShrink: 0,
                opacity: bagFull ? 0.45 : 1,
                transition: 'opacity 300ms',
            }}
        >
            <button
                onClick={() => {
                    if (!bagFull) onSelect(pack)
                }}
                onMouseEnter={() => onHover(pack.id)}
                onMouseLeave={() => onHover(null)}
                disabled={bagFull}
                style={{
                    background: 'none',
                    border: 'none',
                    cursor: bagFull ? 'not-allowed' : 'pointer',
                    padding: 0,
                    width: '100%',
                }}
            >
                <div
                    style={{
                        width: '100%',
                        borderRadius: 12,
                        padding: 2,
                        background: hovered
                            ? 'linear-gradient(160deg, rgba(234,179,8,0.5), rgba(234,179,8,0.1), rgba(234,179,8,0.3))'
                            : 'linear-gradient(160deg, rgba(234,179,8,0.2), rgba(234,179,8,0.04))',
                        transition: 'all 350ms cubic-bezier(0.34,1.56,0.64,1)',
                        transform: hovered ? 'translateY(-8px)' : 'none',
                        boxShadow: hovered
                            ? 'var(--box-pack-shadow-hover)'
                            : 'var(--box-pack-shadow)',
                    }}
                >
                    <div
                        style={{
                            borderRadius: 10,
                            background: 'var(--pack-card-inner)',
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            overflow: 'hidden',
                            padding: 12,
                            gap: 12,
                        }}
                    >
                        <img
                            src={pack.image}
                            alt={pack.name}
                            style={{
                                width: 56,
                                height: 84,
                                objectFit: 'contain',
                                flexShrink: 0,
                                filter: hovered
                                    ? 'drop-shadow(0 0 14px rgba(234,179,8,0.9))'
                                    : 'drop-shadow(0 0 6px rgba(234,179,8,0.35))',
                                transition: 'filter 350ms ease',
                            }}
                        />
                        <div style={{ flex: 1, textAlign: 'left' }}>
                            <ThemeLabel pack={pack} />
                            <p
                                style={{
                                    fontSize: '0.82rem',
                                    fontWeight: 600,
                                    margin: '4px 0 3px',
                                    color: hovered
                                        ? '#fde68a'
                                        : 'var(--app-text)',
                                    transition: 'color 300ms',
                                    lineHeight: 1.2,
                                }}
                            >
                                {pack.name}
                            </p>
                            <p
                                style={{
                                    fontSize: '0.6rem',
                                    color: 'var(--app-text-muted)',
                                    margin: '0 0 6px',
                                    lineHeight: 1.4,
                                }}
                            >
                                {pack.description}
                            </p>
                            <p
                                style={{
                                    fontSize: '0.65rem',
                                    fontWeight: 600,
                                    color: canAfford ? '#4ade80' : '#ef4444',
                                    margin: 0,
                                }}
                            >
                                $
                                {Number(pack.cost).toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
                            </p>
                        </div>
                    </div>
                </div>
            </button>
            <button
                onClick={() => onPreview(pack)}
                title="Preview card list"
                style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 26,
                    height: 26,
                    borderRadius: 7,
                    background: 'rgba(0,0,0,0.45)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'rgba(255,255,255,0.75)',
                    backdropFilter: 'blur(4px)',
                }}
            >
                <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <line x1="8" y1="6" x2="21" y2="6" />
                    <line x1="8" y1="12" x2="21" y2="12" />
                    <line x1="8" y1="18" x2="21" y2="18" />
                    <line x1="3" y1="6" x2="3.01" y2="6" />
                    <line x1="3" y1="12" x2="3.01" y2="12" />
                    <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
            </button>
        </div>
    )
}

// ─── card list modal ──────────────────────────────────────────────────────────
type CardPreview = {
    id: string
    name: string
    rarity: string
    hp: number | null
    market_price_usd: number | null
    image_url: string | null
}

function CardListModal({ pack, onClose }: { pack: Pack; onClose: () => void }) {
    const [cards, setCards] = useState<CardPreview[]>([])
    const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set())
    const [loading, setLoading] = useState(true)
    const [artView, setArtView] = useState(false)
    const [expanded, setExpanded] = useState(false)

    const fetchCards = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch(
                `/api/pack-cards?id=${encodeURIComponent(pack.id)}`,
            )
            const data = await res.json()
            const sorted = (data.cards ?? []).sort(
                (a: CardPreview, b: CardPreview) => {
                    const ra = RARITY_ORDER.indexOf(a.rarity as never)
                    const rb = RARITY_ORDER.indexOf(b.rarity as never)
                    if (ra !== rb) return rb - ra
                    return a.name.localeCompare(b.name)
                },
            )
            setCards(sorted)
            setOwnedIds(new Set(data.ownedCardIds ?? []))
        } catch {
        } finally {
            setLoading(false)
        }
    }, [pack.id])

    useEffect(() => {
        fetchCards()
    }, [fetchCards])

    useEffect(() => {
        window.dispatchEvent(
            new CustomEvent('pack-opening-active', {
                detail: { active: true },
            }),
        )
        return () => {
            window.dispatchEvent(
                new CustomEvent('pack-opening-active', {
                    detail: { active: false },
                }),
            )
        }
    }, [])

    const grouped = cards.reduce<Record<string, CardPreview[]>>((acc, c) => {
        ;(acc[c.rarity] ??= []).push(c)
        return acc
    }, {})

    const COLLAPSED_ROWS = 12

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'var(--modal-backdrop)',
                zIndex: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px 8px',
                backdropFilter: 'blur(6px)',
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'var(--modal-bg)',
                    border: '1px solid var(--app-border-2)',
                    borderRadius: 16,
                    width: '100%',
                    maxWidth: 680,
                    maxHeight: '92vh',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '12px 14px',
                        borderBottom: '1px solid var(--app-border)',
                        flexShrink: 0,
                    }}
                >
                    <img
                        src={pack.image}
                        alt={pack.name}
                        style={{
                            width: 28,
                            height: 42,
                            objectFit: 'contain',
                            flexShrink: 0,
                        }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                            style={{
                                fontWeight: 700,
                                fontSize: '0.88rem',
                                color: 'var(--app-text)',
                                margin: 0,
                                lineHeight: 1.2,
                            }}
                        >
                            {pack.name}
                        </p>
                        <p
                            style={{
                                fontSize: '0.62rem',
                                color: 'var(--app-text-muted)',
                                margin: '2px 0 0',
                            }}
                        >
                            {loading ? '…' : `${cards.length} cards`}
                        </p>
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            background: 'var(--app-surface-2)',
                            border: '1px solid var(--app-border)',
                            borderRadius: 8,
                            overflow: 'hidden',
                            flexShrink: 0,
                        }}
                    >
                        {(['list', 'art'] as const).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setArtView(mode === 'art')}
                                style={{
                                    padding: '6px 12px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '0.65rem',
                                    fontWeight: 600,
                                    background: (
                                        artView
                                            ? mode === 'art'
                                            : mode === 'list'
                                    )
                                        ? 'var(--app-surface-3)'
                                        : 'transparent',
                                    color: (
                                        artView
                                            ? mode === 'art'
                                            : mode === 'list'
                                    )
                                        ? 'var(--app-text)'
                                        : 'var(--app-text-muted)',
                                    transition: 'all 150ms',
                                }}
                            >
                                {mode === 'list' ? (
                                    <svg
                                        width="13"
                                        height="13"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                    >
                                        <line x1="8" y1="6" x2="21" y2="6" />
                                        <line x1="8" y1="12" x2="21" y2="12" />
                                        <line x1="8" y1="18" x2="21" y2="18" />
                                        <circle
                                            cx="3"
                                            cy="6"
                                            r="1"
                                            fill="currentColor"
                                        />
                                        <circle
                                            cx="3"
                                            cy="12"
                                            r="1"
                                            fill="currentColor"
                                        />
                                        <circle
                                            cx="3"
                                            cy="18"
                                            r="1"
                                            fill="currentColor"
                                        />
                                    </svg>
                                ) : (
                                    <svg
                                        width="13"
                                        height="13"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                    >
                                        <rect
                                            x="3"
                                            y="3"
                                            width="7"
                                            height="7"
                                            rx="1"
                                        />
                                        <rect
                                            x="14"
                                            y="3"
                                            width="7"
                                            height="7"
                                            rx="1"
                                        />
                                        <rect
                                            x="3"
                                            y="14"
                                            width="7"
                                            height="7"
                                            rx="1"
                                        />
                                        <rect
                                            x="14"
                                            y="14"
                                            width="7"
                                            height="7"
                                            rx="1"
                                        />
                                    </svg>
                                )}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={onClose}
                        style={{
                            width: 30,
                            height: 30,
                            borderRadius: 8,
                            border: '1px solid var(--app-border)',
                            background: 'var(--app-surface-2)',
                            cursor: 'pointer',
                            color: 'var(--app-text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.85rem',
                            flexShrink: 0,
                        }}
                    >
                        ✕
                    </button>
                </div>

                <div
                    style={
                        {
                            flex: 1,
                            overflowY: 'auto',
                            padding: '12px 14px',
                            WebkitOverflowScrolling: 'touch',
                        } as React.CSSProperties
                    }
                >
                    {loading ? (
                        <div
                            style={{
                                textAlign: 'center',
                                padding: '32px 0',
                                color: 'var(--app-text-muted)',
                                fontSize: '0.78rem',
                            }}
                        >
                            Loading cards…
                        </div>
                    ) : cards.length === 0 ? (
                        <div
                            style={{
                                textAlign: 'center',
                                padding: '32px 0',
                                color: 'var(--app-text-ghost)',
                                fontSize: '0.78rem',
                            }}
                        >
                            No cards found for this pack yet.
                        </div>
                    ) : artView ? (
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns:
                                    'repeat(auto-fill, minmax(90px, 1fr))',
                                gap: 10,
                            }}
                        >
                            {cards.map((c) => (
                                <div
                                    key={c.id}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: 4,
                                    }}
                                >
                                    <div
                                        style={{
                                            position: 'relative',
                                            width: '100%',
                                        }}
                                    >
                                        {c.image_url ? (
                                            <img
                                                src={c.image_url}
                                                alt={c.name}
                                                style={{
                                                    width: '100%',
                                                    aspectRatio: '2/3',
                                                    objectFit: 'cover',
                                                    borderRadius: 7,
                                                    border: `1px solid ${RARITY_COLOR[c.rarity as never] ?? '#374151'}40`,
                                                    display: 'block',
                                                }}
                                            />
                                        ) : (
                                            <div
                                                style={{
                                                    width: '100%',
                                                    aspectRatio: '2/3',
                                                    borderRadius: 7,
                                                    background:
                                                        'var(--app-surface-2)',
                                                    border: '1px solid var(--app-border)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '1.2rem',
                                                }}
                                            >
                                                ?
                                            </div>
                                        )}
                                        {ownedIds.has(c.id) && (
                                            <span
                                                style={{
                                                    position: 'absolute',
                                                    bottom: 5,
                                                    left: '50%',
                                                    transform:
                                                        'translateX(-50%)',
                                                    fontSize: '0.46rem',
                                                    fontWeight: 700,
                                                    color: '#4ade80',
                                                    background:
                                                        'rgba(0,0,0,0.72)',
                                                    border: '1px solid rgba(74,222,128,0.35)',
                                                    borderRadius: 4,
                                                    padding: '1px 5px',
                                                    letterSpacing: '0.06em',
                                                    textTransform: 'uppercase',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                owned
                                            </span>
                                        )}
                                    </div>
                                    <span
                                        style={{
                                            fontSize: '0.54rem',
                                            color:
                                                RARITY_COLOR[
                                                    c.rarity as never
                                                ] ?? 'var(--app-text-muted)',
                                            textAlign: 'center',
                                            lineHeight: 1.2,
                                        }}
                                    >
                                        {c.name}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div>
                            {RARITY_ORDER.some(
                                (r) =>
                                    (grouped[r]?.length ?? 0) > COLLAPSED_ROWS,
                            ) && (
                                <button
                                    onClick={() => setExpanded((e) => !e)}
                                    style={{
                                        width: '100%',
                                        marginBottom: 12,
                                        padding: '8px 0',
                                        borderRadius: 8,
                                        border: '1px solid var(--app-border)',
                                        background: 'var(--app-surface-2)',
                                        color: 'var(--app-text-muted)',
                                        fontSize: '0.72rem',
                                        cursor: 'pointer',
                                        fontWeight: 500,
                                    }}
                                >
                                    {expanded
                                        ? '▲ Collapse'
                                        : `▼ Show all ${cards.length} cards`}
                                </button>
                            )}

                            {RARITY_ORDER.filter((r) => grouped[r]?.length).map(
                                (rarity) => (
                                    <div
                                        key={rarity}
                                        style={{ marginBottom: 18 }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 6,
                                                marginBottom: 8,
                                            }}
                                        >
                                            <div
                                                className={rarityGlowClass(
                                                    rarity,
                                                )}
                                                style={{
                                                    width: 8,
                                                    height: 8,
                                                    borderRadius: '50%',
                                                    background: isRainbow(
                                                        rarity,
                                                    )
                                                        ? '#fff'
                                                        : (RARITY_COLOR[
                                                              rarity
                                                          ] ?? '#9ca3af'),
                                                    flexShrink: 0,
                                                }}
                                            />
                                            <span
                                                className={rarityTextClass(
                                                    rarity,
                                                )}
                                                style={{
                                                    fontSize: '0.6rem',
                                                    fontWeight: 700,
                                                    letterSpacing: '0.08em',
                                                    textTransform: 'uppercase',
                                                    ...rarityTextStyle(rarity),
                                                }}
                                            >
                                                {rarity} —{' '}
                                                {grouped[rarity].length}
                                            </span>
                                            <div
                                                style={{
                                                    flex: 1,
                                                    height: 1,
                                                    background: isRainbow(
                                                        rarity,
                                                    )
                                                        ? 'rgba(255,255,255,0.15)'
                                                        : `${RARITY_COLOR[rarity] ?? '#374151'}30`,
                                                }}
                                            />
                                        </div>

                                        <div
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns:
                                                    'repeat(auto-fill, minmax(100px, 1fr))',
                                                gap: 10,
                                            }}
                                        >
                                            {(expanded
                                                ? grouped[rarity]
                                                : grouped[rarity].slice(
                                                      0,
                                                      COLLAPSED_ROWS,
                                                  )
                                            ).map((c) => (
                                                <div
                                                    key={c.id}
                                                    style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        borderRadius: 9,
                                                        overflow: 'hidden',
                                                        background:
                                                            'var(--app-surface-2)',
                                                        border: `1px solid ${RARITY_COLOR[rarity] ?? '#374151'}35`,
                                                    }}
                                                >
                                                    {c.image_url ? (
                                                        <img
                                                            src={c.image_url}
                                                            alt={c.name}
                                                            style={{
                                                                width: '100%',
                                                                aspectRatio:
                                                                    '2/3',
                                                                objectFit:
                                                                    'cover',
                                                                display:
                                                                    'block',
                                                            }}
                                                        />
                                                    ) : (
                                                        <div
                                                            style={{
                                                                width: '100%',
                                                                aspectRatio:
                                                                    '2/3',
                                                                background:
                                                                    'var(--app-surface-3)',
                                                                display: 'flex',
                                                                alignItems:
                                                                    'center',
                                                                justifyContent:
                                                                    'center',
                                                                fontSize:
                                                                    '1.1rem',
                                                                color: 'var(--app-text-ghost)',
                                                            }}
                                                        >
                                                            ?
                                                        </div>
                                                    )}
                                                    <div
                                                        style={{
                                                            padding:
                                                                '5px 6px 5px',
                                                            display: 'flex',
                                                            flexDirection:
                                                                'column',
                                                            gap: 2,
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                alignItems:
                                                                    'center',
                                                                gap: 4,
                                                                minWidth: 0,
                                                            }}
                                                        >
                                                            <span
                                                                style={{
                                                                    fontSize:
                                                                        '0.62rem',
                                                                    fontWeight: 600,
                                                                    color: 'var(--app-text)',
                                                                    lineHeight: 1.25,
                                                                    overflow:
                                                                        'hidden',
                                                                    textOverflow:
                                                                        'ellipsis',
                                                                    whiteSpace:
                                                                        'nowrap',
                                                                    flex: 1,
                                                                    minWidth: 0,
                                                                }}
                                                            >
                                                                {c.name}
                                                            </span>
                                                            {ownedIds.has(
                                                                c.id,
                                                            ) && (
                                                                <span
                                                                    style={{
                                                                        fontSize:
                                                                            '0.48rem',
                                                                        fontWeight: 700,
                                                                        color: '#4ade80',
                                                                        background:
                                                                            'rgba(74,222,128,0.12)',
                                                                        border: '1px solid rgba(74,222,128,0.3)',
                                                                        borderRadius: 4,
                                                                        padding:
                                                                            '1px 4px',
                                                                        flexShrink: 0,
                                                                        letterSpacing:
                                                                            '0.04em',
                                                                        textTransform:
                                                                            'uppercase',
                                                                    }}
                                                                >
                                                                    owned
                                                                </span>
                                                            )}
                                                        </div>
                                                        {c.market_price_usd !=
                                                            null && (
                                                            <span
                                                                style={{
                                                                    fontSize:
                                                                        '0.56rem',
                                                                    color: '#4ade80',
                                                                    fontWeight: 600,
                                                                }}
                                                            >
                                                                $
                                                                {Number(
                                                                    c.market_price_usd,
                                                                ).toFixed(2)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ),
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
