'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { PACKS } from '@/lib/packs'
import type { BmItem, BlackMarketState } from '@/lib/blackMarket'
import { createClient } from '@/lib/supabase/client'

function useCountdown(target: string | null) {
    const [label, setLabel] = useState('')
    useEffect(() => {
        if (!target) {
            setLabel('')
            return
        }
        function tick() {
            const diff = new Date(target!).getTime() - Date.now()
            if (diff <= 0) {
                setLabel('now')
                return
            }
            const h = Math.floor(diff / 3_600_000)
            const m = Math.floor((diff % 3_600_000) / 60_000)
            const s = Math.floor((diff % 60_000) / 1_000)
            setLabel(
                h > 0 ? `${h}h ${m}m` : `${m}:${String(s).padStart(2, '0')}`,
            )
        }
        tick()
        const id = setInterval(tick, 1_000)
        return () => clearInterval(id)
    }, [target])
    return label
}

export default function BlackMarket({
    coins,
    onCoinsChange,
    userLevel = 1,
}: {
    coins: number
    onCoinsChange?: (delta: number) => void
    userLevel?: number
}) {
    const [state, setState] = useState<BlackMarketState | null>(null)
    const [expanded, setExpanded] = useState(false)
    const [hovered, setHovered] = useState(false)
    const [buying, setBuying] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const panelRef = useRef<HTMLDivElement>(null)
    const supabase = createClient()

    const fetch_ = useCallback(() => {
        fetch('/api/black-market')
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
                if (d) setState(d)
            })
            .catch(() => {})
    }, [])

    useEffect(() => {
        fetch_()
        const id = setInterval(fetch_, 15_000)
        return () => clearInterval(id)
    }, [fetch_])

    // Real-time: update quantity_remaining when another player buys
    useEffect(() => {
        if (!state?.active) return
        const marketId = (state as Extract<typeof state, { active: true }>).marketId
        const channel = supabase
            .channel(`bm-items-${marketId}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'black_market_items', filter: `market_id=eq.${marketId}` },
                (payload) => {
                    const updated = payload.new as { id: string; quantity_remaining: number }
                    setState((prev) => {
                        if (!prev || !prev.active) return prev
                        return {
                            ...prev,
                            items: prev.items.map((i) =>
                                i.id === updated.id
                                    ? { ...i, quantity_remaining: updated.quantity_remaining }
                                    : i,
                            ),
                        }
                    })
                },
            )
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [state?.active, state && state.active ? state.marketId : null])

    // Close panel when clicking outside
    useEffect(() => {
        if (!expanded) return
        function handleClick(e: MouseEvent) {
            if (
                panelRef.current &&
                !panelRef.current.contains(e.target as Node)
            ) {
                setExpanded(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [expanded])

    const closeTime = state?.active ? state.activeUntil : null
    const closeLabel = useCountdown(closeTime)

    async function handleBuy(item: BmItem) {
        if (buying) return
        setBuying(item.id)
        setError(null)
        try {
            const res = await fetch('/api/black-market/buy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId: item.id }),
            })
            const data = await res.json()
            if (!res.ok) {
                setError(data.error ?? 'Purchase failed')
                return
            }
            onCoinsChange?.(-data.coinsSpent)
            setState((prev) => {
                if (!prev || !prev.active) return prev
                return {
                    ...prev,
                    items: prev.items.map((i) =>
                        i.id === item.id
                            ? {
                                  ...i,
                                  quantity_remaining: i.quantity_remaining - 1,
                              }
                            : i,
                    ),
                }
            })
        } catch {
            setError('Network error')
        } finally {
            setBuying(null)
        }
    }

    if (!state?.active) return null

    const items: BmItem[] = (state as any)?.items ?? []

    return (
        <div
            ref={panelRef}
            style={{
                position: 'fixed',
                bottom: 84,
                right: 106,
                zIndex: 10011,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                pointerEvents: 'none',
            }}
        >
            {/* Market panel — floats above character */}
            {expanded && (
                <div
                    className="bm-panel-glow"
                    style={{
                        pointerEvents: 'all',
                        marginBottom: 8,
                        width: 300,
                        maxHeight: '70vh',
                        overflowY: 'auto',
                        borderRadius: 14,
                        background: '#000',
                        border: '1px solid rgba(255,255,255,0.7)',
                    }}
                >
                    {/* Panel header */}
                    <div
                        style={{
                            padding: '12px 16px 10px',
                            borderBottom: '1px solid rgba(239,68,68,0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                        }}
                    >
                        <span
                            style={{
                                fontSize: '0.62rem',
                                fontWeight: 800,
                                letterSpacing: '0.18em',
                                textTransform: 'uppercase',
                                color: '#fca5a5',
                                flex: 1,
                            }}
                        >
                            Black Market
                        </span>
                        <span
                            style={{
                                fontSize: '0.55rem',
                                fontWeight: 700,
                                color: '#f87171',
                                background: 'rgba(239,68,68,0.12)',
                                border: '1px solid rgba(239,68,68,0.3)',
                                borderRadius: 6,
                                padding: '2px 7px',
                            }}
                        >
                            OPEN · {closeLabel}
                        </span>
                    </div>
                    {error && (
                        <div
                            style={{
                                padding: '8px 16px',
                                fontSize: '0.68rem',
                                color: '#f87171',
                                background: 'rgba(239,68,68,0.08)',
                            }}
                        >
                            {error}
                        </div>
                    )}
                    {items.length === 0 ? (
                        <div
                            style={{
                                padding: 20,
                                fontSize: '0.72rem',
                                color: '#4b5563',
                                textAlign: 'center',
                            }}
                        >
                            Loading inventory…
                        </div>
                    ) : (
                        items.map((item) => {
                            const pack = PACKS.find(
                                (p) => p.id === item.pack_id,
                            )
                            if (!pack) return null
                            const discounted = parseFloat(
                                (
                                    pack.cost *
                                    (1 - Number(item.discount_pct))
                                ).toFixed(2),
                            )
                            const discPct = Math.round(
                                Number(item.discount_pct) * 100,
                            )
                            const canAfford = coins >= discounted
                            const outOfStock = item.quantity_remaining <= 0
                            const levelLocked =
                                !!pack.level_required &&
                                userLevel < pack.level_required
                            const disabled =
                                !canAfford ||
                                outOfStock ||
                                levelLocked ||
                                !!buying
                            // accent color: red when locked, green when unlocked
                            const accent = levelLocked
                                ? {
                                      border: '1px solid rgba(239,68,68,0.45)',
                                      bg: 'rgba(239,68,68,0.08)',
                                      text: '#fca5a5',
                                  }
                                : {
                                      border: '1px solid rgba(74,222,128,0.45)',
                                      bg: 'rgba(74,222,128,0.08)',
                                      text: '#86efac',
                                  }
                            return (
                                <div
                                    key={item.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12,
                                        padding: '12px 16px',
                                        borderBottom:
                                            '1px solid rgba(255,255,255,0.06)',
                                        background: accent.bg,
                                        opacity:
                                            outOfStock || levelLocked
                                                ? 0.55
                                                : 1,
                                    }}
                                >
                                    <img
                                        src={pack.image}
                                        alt={pack.name}
                                        style={{
                                            width: 40,
                                            height: 60,
                                            objectFit: 'contain',
                                            flexShrink: 0,
                                        }}
                                    />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div
                                            style={{
                                                fontSize: '0.78rem',
                                                fontWeight: 700,
                                                color: accent.text,
                                                marginBottom: 2,
                                            }}
                                        >
                                            {pack.name}
                                        </div>
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 5,
                                                flexWrap: 'wrap',
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: '0.58rem',
                                                    fontWeight: 800,
                                                    background: '#dc2626',
                                                    color: '#fff',
                                                    borderRadius: 4,
                                                    padding: '1px 5px',
                                                }}
                                            >
                                                -{discPct}%
                                            </span>
                                            <span
                                                style={{
                                                    fontSize: '0.78rem',
                                                    fontWeight: 700,
                                                    color: canAfford
                                                        ? '#4ade80'
                                                        : '#ef4444',
                                                }}
                                            >
                                                $
                                                {discounted.toLocaleString(
                                                    undefined,
                                                    {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                    },
                                                )}
                                            </span>
                                            <span
                                                style={{
                                                    fontSize: '0.6rem',
                                                    color: '#6b7280',
                                                    textDecoration:
                                                        'line-through',
                                                }}
                                            >
                                                $
                                                {pack.cost.toLocaleString(
                                                    undefined,
                                                    {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                    },
                                                )}
                                            </span>
                                        </div>
                                        {pack.level_required && (
                                            <div
                                                style={{
                                                    fontSize: '0.55rem',
                                                    color: '#9ca3af',
                                                    marginTop: 2,
                                                }}
                                            >
                                                Lv {pack.level_required}+
                                                required
                                            </div>
                                        )}
                                    </div>
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'flex-end',
                                            gap: 4,
                                            flexShrink: 0,
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontSize: '0.55rem',
                                                color: '#6b7280',
                                            }}
                                        >
                                            {outOfStock
                                                ? 'sold out'
                                                : `×${item.quantity_remaining}`}
                                        </span>
                                        <button
                                            onClick={() => handleBuy(item)}
                                            disabled={disabled}
                                            style={{
                                                padding: '4px 12px',
                                                borderRadius: 7,
                                                border: accent.border,
                                                background: disabled
                                                    ? levelLocked
                                                        ? 'rgba(239,68,68,0.12)'
                                                        : 'rgba(255,255,255,0.04)'
                                                    : 'rgba(74,222,128,0.18)',
                                                color: disabled
                                                    ? levelLocked
                                                        ? '#fca5a5'
                                                        : '#4b5563'
                                                    : '#86efac',
                                                fontSize: '0.65rem',
                                                fontWeight: 700,
                                                cursor: disabled
                                                    ? 'not-allowed'
                                                    : 'pointer',
                                                transition: 'all 150ms ease',
                                            }}
                                        >
                                            {buying === item.id
                                                ? '…'
                                                : levelLocked
                                                  ? `Lv ${pack.level_required}`
                                                  : 'Buy'}
                                        </button>
                                    </div>
                                </div>
                            )
                        })
                    )}
                    <div
                        style={{
                            padding: '8px 16px',
                            fontSize: '0.55rem',
                            color: '#6b7280',
                            textAlign: 'center',
                        }}
                    >
                        Purchases go directly to your Stash
                    </div>
                </div>
            )}

            {/* Character + speech bubble wrapper */}
            <div
                style={{
                    pointerEvents: 'all',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    transform: expanded
                        ? 'translateY(0) scale(1.08)'
                        : hovered
                          ? 'translateY(0) scale(1.1)'
                          : 'translateY(18px) scale(1)',
                    transition: 'transform 200ms ease-out',
                    cursor: 'pointer',
                }}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                onClick={() => setExpanded((v) => !v)}
            >
                {/* Speech bubble */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: '100%',
                        right: 68,
                        marginBottom: 6,
                        background: 'rgba(15,5,5,0.97)',
                        border: '1px solid rgba(239,68,68,0.4)',
                        borderRadius: '10px 10px 2px 10px',
                        padding: '8px 12px',
                        whiteSpace: 'nowrap',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        color: '#fca5a5',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                        opacity: hovered && !expanded ? 1 : 0,
                        transform:
                            hovered && !expanded
                                ? 'scale(1) translateY(0)'
                                : 'scale(0.85) translateY(6px)',
                        transition: 'opacity 180ms ease, transform 180ms ease',
                        pointerEvents: 'none',
                        transformOrigin: 'bottom right',
                    }}
                >
                    psst.. pal.. over here!
                    <br />
                    <span style={{ color: '#f87171' }}>
                        wanna see some sweet deals?
                    </span>
                    {/* Triangle pointer */}
                    <div
                        style={{
                            position: 'absolute',
                            bottom: -7,
                            right: 14,
                            width: 0,
                            height: 0,
                            borderLeft: '6px solid transparent',
                            borderRight: '6px solid transparent',
                            borderTop: '7px solid rgba(239,68,68,0.4)',
                        }}
                    />
                    <div
                        style={{
                            position: 'absolute',
                            bottom: -6,
                            right: 15,
                            width: 0,
                            height: 0,
                            borderLeft: '5px solid transparent',
                            borderRight: '5px solid transparent',
                            borderTop: '6px solid rgba(15,5,5,0.97)',
                        }}
                    />
                </div>

                {/* Sprite */}
                <img
                    src="/assets/black-market-guy.png"
                    alt=""
                    draggable={false}
                    style={{
                        width: 64,
                        height: 'auto',
                        imageRendering: 'pixelated',
                        display: 'block',
                        filter: expanded
                            ? 'drop-shadow(0 0 8px rgba(239,68,68,0.6))'
                            : 'none',
                        transition: 'filter 200ms ease',
                    }}
                />
            </div>
        </div>
    )
}
