'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isRainbow, rarityGlowRgb, rarityTextStyle } from '@/lib/rarityConfig'
import { ShatterEffect } from './card/ShatterEffect'
import type { Pack } from '@/lib/packs'

// ─── reel constants ────────────────────────────────────────────────────────────
const CARD_W = 120
const CARD_H = 168
const GAP = 6
const PITCH = CARD_W + GAP // 126px per slot
const STRIP_SIZE = 62
const WINNER_IDX = 52 // where the guaranteed winner sits in the strip

// ─── types ────────────────────────────────────────────────────────────────────
type PoolCard = { id: string; image_url: string; name: string; rarity: string }

type WonCard = PoolCard & {
    national_pokedex_number: number
    worth: number
    isNew: boolean
    coins: number
    isHot: boolean
    attr_centering?: number
    attr_corners?: number
    attr_edges?: number
    attr_surface?: number
}

type Phase = 'idle' | 'loading' | 'spinning' | 'done'

// ─── component ────────────────────────────────────────────────────────────────
export default function CrateOpening({
    pack,
    onBack,
}: {
    pack: Pack
    onBack: () => void
}) {
    const router = useRouter()
    const [phase, setPhase] = useState<Phase>('idle')
    const [strip, setStrip] = useState<PoolCard[]>([])
    const [wonCard, setWonCard] = useState<WonCard | null>(null)
    const [poolSize, setPoolSize] = useState(0)
    const [targetX, setTargetX] = useState(0)
    const [spinning, setSpinning] = useState(false)
    const [rested, setRested] = useState(false)
    const [shattering, setShattering] = useState(false)
    const [flyingDown, setFlyingDown] = useState(false)
    const [actionDone, setActionDone] = useState(false)
    const [coinError, setCoinError] = useState<{
        cost: number
        coins: number
    } | null>(null)

    const containerRef = useRef<HTMLDivElement>(null)
    const startedRef = useRef(false)

    async function handleOpen() {
        if (phase !== 'idle') return
        setCoinError(null)
        setPhase('loading')

        const res = await fetch('/api/open-pack', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ setId: pack.id }),
        })

        if (res.status === 402) {
            const data = await res.json()
            setPhase('idle')
            setCoinError({ cost: data.cost, coins: data.coins })
            return
        }

        const data = await res.json()

        // refresh server data so coin count in header updates immediately
        router.refresh()

        const winner: WonCard = data.cards[0]
        const pool: PoolCard[] = data.cardPool ?? [winner]

        setPoolSize(pool.length)
        setWonCard(winner)

        // build strip: random pool cards with winner guaranteed at WINNER_IDX
        const s: PoolCard[] = Array.from({ length: STRIP_SIZE }, (_, i) =>
            i === WINNER_IDX
                ? winner
                : pool[Math.floor(Math.random() * pool.length)],
        )
        setStrip(s)
        startedRef.current = false
        setPhase('spinning')
    }

    // kick off CSS transition after the strip has rendered
    useEffect(() => {
        if (phase !== 'spinning' || startedRef.current) return
        startedRef.current = true
        requestAnimationFrame(() =>
            requestAnimationFrame(() => {
                const cw = containerRef.current?.clientWidth ?? 640
                const winnerCenter = WINNER_IDX * PITCH + CARD_W / 2
                setTargetX(-(winnerCenter - cw / 2))
                setSpinning(true)
            }),
        )
    }, [phase])

    function handleTransitionEnd() {
        if (!spinning) return
        setSpinning(false)
        setRested(true)
        setTimeout(() => setPhase('done'), 1600)
    }

    async function handleAddToBag() {
        if (!wonCard || actionDone) return
        setActionDone(true)
        await fetch('/api/add-to-bag', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cardId: wonCard.id,
                worth: wonCard.coins,
                isHot: wonCard.isHot,
                rarity: wonCard.rarity,
                attrs: {
                    attr_centering: wonCard.attr_centering,
                    attr_corners: wonCard.attr_corners,
                    attr_edges: wonCard.attr_edges,
                    attr_surface: wonCard.attr_surface,
                },
            }),
        })
        onBack()
    }

    async function handleSell() {
        if (!wonCard || actionDone) return
        setActionDone(true)
        setShattering(true)
        const coins = wonCard.coins
        await fetch('/api/buyback-card', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ card_buyback_amount: coins }),
        })
        setTimeout(() => {
            setShattering(false)
            setPhase('idle')
            setWonCard(null)
            setActionDone(false)
        }, 900)
    }

    async function handleFeed() {
        if (!wonCard || actionDone) return
        setActionDone(true)
        setFlyingDown(true)
        await fetch('/api/feed-card', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cardID: wonCard.id }),
        })
    }

    const wonRarity = wonCard?.rarity ?? 'Common'
    const glowRgb = rarityGlowRgb(wonRarity)
    const wonIsRainbow = isRainbow(wonRarity)

    // ── idle / loading ────────────────────────────────────────────────────────
    if (phase === 'idle' || phase === 'loading') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] gap-7">
                {coinError && (
                    <div
                        className="flex items-center gap-2 px-4 py-3 rounded-xl"
                        style={{
                            background: 'rgba(239,68,68,0.06)',
                            border: '1px solid rgba(239,68,68,0.2)',
                        }}
                    >
                        <p className="text-red-400 text-xs">
                            not enough coins — need{' '}
                            <span className="font-bold">
                                $ {coinError.cost}
                            </span>
                            , you have{' '}
                            <span className="font-bold text-gray-400">
                                {coinError.coins}
                            </span>
                        </p>
                    </div>
                )}
                <div
                    className={
                        phase === 'loading'
                            ? 'animate-pulse'
                            : 'cursor-pointer hover:scale-105 transition-transform duration-300'
                    }
                    style={{
                        filter: 'drop-shadow(0 0 24px rgba(234,179,8,0.5))',
                    }}
                    onClick={phase === 'idle' ? handleOpen : undefined}
                >
                    <img
                        src={pack.image}
                        alt={pack.name}
                        style={{
                            height: 200,
                            width: 'auto',
                            objectFit: 'contain',
                            opacity: phase === 'loading' ? 0.55 : 1,
                            transition: 'opacity 0.3s',
                        }}
                    />
                </div>

                {phase === 'idle' ? (
                    <button
                        onClick={handleOpen}
                        className="px-8 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95 hover:scale-105"
                        style={{
                            background:
                                'linear-gradient(135deg, rgba(234,179,8,0.12), rgba(255,255,255,0.06))',
                            border: '1px solid rgba(234,179,8,0.35)',
                            color: '#eab308',
                            letterSpacing: '0.08em',
                        }}
                    >
                        Open Box
                    </button>
                ) : (
                    <p className="text-gray-600 text-xs tracking-widest uppercase animate-pulse">
                        opening…
                    </p>
                )}

                <button
                    onClick={onBack}
                    className="text-gray-600 text-xs hover:text-gray-400 transition-colors"
                >
                    ← back
                </button>
            </div>
        )
    }

    // ── spinning ──────────────────────────────────────────────────────────────
    if (phase === 'spinning') {
        return (
            <div
                className="flex flex-col items-center justify-center min-h-[80vh] gap-6 w-full px-4"
                style={{ zoom: 1.2, transform: 'translateY(-20px)' }}
            >
                <p
                    className="uppercase tracking-widest"
                    style={{ fontSize: '0.6rem', color: '#374151' }}
                >
                    {pack.name}
                </p>

                {/* reel container */}
                <div
                    ref={containerRef}
                    className="relative overflow-hidden w-full"
                    style={{
                        maxWidth: 760,
                        height: CARD_H + 32,
                        background: 'rgba(255,255,255,0.015)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: 16,
                    }}
                >
                    {/* left/right fades */}
                    <div
                        className="absolute inset-y-0 left-0 z-10 pointer-events-none"
                        style={{
                            width: 100,
                            background:
                                'linear-gradient(to right, #08080d 30%, transparent)',
                        }}
                    />
                    <div
                        className="absolute inset-y-0 right-0 z-10 pointer-events-none"
                        style={{
                            width: 100,
                            background:
                                'linear-gradient(to left, #08080d 30%, transparent)',
                        }}
                    />

                    {/* center marker line */}
                    <div
                        className="absolute inset-y-0 left-1/2 -translate-x-px z-20 pointer-events-none"
                        style={{
                            width: 2,
                            background: rested
                                ? `rgba(${glowRgb}, 0.9)`
                                : 'rgba(234,179,8,0.8)',
                            boxShadow: rested
                                ? `0 0 12px rgba(${glowRgb}, 1), 0 0 24px rgba(${glowRgb}, 0.5)`
                                : '0 0 10px rgba(234,179,8,1)',
                            transition: 'background 0.5s, box-shadow 0.5s',
                        }}
                    />

                    {/* card strip */}
                    <div
                        className="absolute flex items-center"
                        style={{
                            top: 16,
                            left: 0,
                            gap: GAP,
                            transform: `translateX(${targetX}px)`,
                            transition: spinning
                                ? 'transform 7s cubic-bezier(0.04, 0, 0.12, 1)'
                                : 'none',
                            willChange: 'transform',
                        }}
                        onTransitionEnd={handleTransitionEnd}
                    >
                        {strip.map((card, i) => {
                            const isWinner = rested && i === WINNER_IDX
                            const cardIsRainbow = isRainbow(card.rarity)
                            const cGlow = rarityGlowRgb(card.rarity)
                            return (
                                <div
                                    key={i}
                                    className={
                                        isWinner && cardIsRainbow
                                            ? 'glow-rainbow'
                                            : undefined
                                    }
                                    style={{
                                        width: CARD_W,
                                        height: CARD_H,
                                        flexShrink: 0,
                                        borderRadius: 8,
                                        overflow: 'hidden',
                                        border: isWinner
                                            ? `2px solid rgba(${cGlow}, 1)`
                                            : '1px solid rgba(255,255,255,0.07)',
                                        boxShadow:
                                            isWinner && !cardIsRainbow
                                                ? `0 0 20px rgba(${cGlow}, 0.8), 0 0 44px rgba(${cGlow}, 0.35)`
                                                : !isWinner
                                                  ? `0 0 8px rgba(${cGlow}, 0.18)`
                                                  : undefined,
                                        transform: isWinner
                                            ? 'scale(1.07)'
                                            : 'scale(1)',
                                        transition:
                                            'transform 0.4s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.4s, border 0.4s',
                                    }}
                                >
                                    <img
                                        src={card.image_url}
                                        alt={card.name}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                        }}
                                    />
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* winner name fade-in after reel rests */}
                {rested && wonCard && (
                    <div className="flex flex-col items-center gap-1 animate-slide-up">
                        <p
                            className="font-bold text-base"
                            style={rarityTextStyle(wonCard.rarity)}
                        >
                            {wonCard.name}
                        </p>
                        <p
                            className="uppercase tracking-widest"
                            style={{ fontSize: '0.58rem', color: '#4b5563' }}
                        >
                            {wonCard.rarity} · 1 / {poolSize} (
                            {((1 / poolSize) * 100).toFixed(2)}%)
                        </p>
                    </div>
                )}
            </div>
        )
    }

    // ── done ──────────────────────────────────────────────────────────────────
    if (phase === 'done' && wonCard) {
        const attrs = [
            { label: 'Centering', value: wonCard.attr_centering },
            { label: 'Corners', value: wonCard.attr_corners },
            { label: 'Edges', value: wonCard.attr_edges },
            { label: 'Surface', value: wonCard.attr_surface },
        ].filter((a): a is { label: string; value: number } => a.value != null)
        const overall = attrs.length
            ? Math.round(
                  (attrs.reduce((s, a) => s + a.value, 0) / attrs.length) * 10,
              ) / 10
            : null
        function attrColor(v: number) {
            return v >= 8.5 ? '#4ade80' : v >= 6.5 ? '#fbbf24' : '#f87171'
        }
        const hasAttrs = attrs.length > 0

        return (
            <div
                className="flex flex-col items-center justify-center min-h-[80vh] gap-4"
                style={{ zoom: 1.2 }}
            >
                {/* top row: card + right panel */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 16,
                    }}
                >
                    {/* card */}
                    <div
                        className={`relative animate-slide-up${flyingDown ? ' animate-fly-down' : ''}`}
                        onAnimationEnd={(e) => {
                            if (flyingDown && e.animationName === 'flyDown')
                                onBack()
                        }}
                    >
                        <img
                            src={wonCard.image_url}
                            alt={wonCard.name}
                            className={`rounded-xl${wonIsRainbow ? ' glow-rainbow' : ''}`}
                            style={{
                                height: 364,
                                width: 'auto',
                                opacity: shattering ? 0 : 1,
                                boxShadow: wonIsRainbow
                                    ? undefined
                                    : `0 0 20px 4px rgba(${glowRgb}, 0.6)`,
                            }}
                        />
                        {wonCard.isNew && (
                            <span
                                className="bg-green-500/20 text-green-400 border border-green-500/40 rounded-full"
                                style={{
                                    position: 'absolute',
                                    top: 8,
                                    right: 8,
                                    fontSize: '0.6rem',
                                    padding: '2px 7px',
                                    lineHeight: 1.4,
                                    backdropFilter: 'blur(4px)',
                                }}
                            >
                                NEW
                            </span>
                        )}
                        {shattering && (
                            <ShatterEffect
                                rarity={wonCard.rarity}
                                imageUrl={wonCard.image_url}
                            />
                        )}
                    </div>

                    {/* right panel */}
                    <div
                        style={{
                            height: 364,
                            width: 200,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10,
                        }}
                    >
                        {/* name + dex */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'baseline',
                                gap: 5,
                            }}
                        >
                            <p
                                style={{
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    color: 'var(--app-text)',
                                    margin: 0,
                                    lineHeight: 1.2,
                                    letterSpacing: '0.02em',
                                }}
                            >
                                {wonCard.name}
                            </p>
                            <span
                                style={{
                                    fontSize: '0.68rem',
                                    color: '#4b5563',
                                    lineHeight: 1.2,
                                }}
                            >
                                #{wonCard.national_pokedex_number}
                            </span>
                        </div>

                        {/* est condition bars */}
                        {hasAttrs && (
                            <div
                                style={{
                                    flex: 1,
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.07)',
                                    borderRadius: 10,
                                    padding: '12px 14px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 0,
                                }}
                            >
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
                                            fontSize: '0.58rem',
                                            fontWeight: 700,
                                            letterSpacing: '0.1em',
                                            textTransform: 'uppercase',
                                            color: '#6b7280',
                                        }}
                                    >
                                        est condition
                                    </span>
                                    {overall != null && (
                                        <span
                                            style={{
                                                fontSize: '1.1rem',
                                                fontWeight: 800,
                                                fontFamily: 'monospace',
                                                color: attrColor(overall),
                                                textShadow: `0 0 8px ${attrColor(overall)}80`,
                                            }}
                                        >
                                            {overall.toFixed(1)}
                                        </span>
                                    )}
                                </div>
                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 8,
                                        flex: 1,
                                        justifyContent: 'center',
                                    }}
                                >
                                    {attrs.map(({ label, value }) => (
                                        <div
                                            key={label}
                                            className="flex items-center gap-2"
                                        >
                                            <span
                                                style={{
                                                    fontSize: '0.65rem',
                                                    color: '#6b7280',
                                                    width: 60,
                                                    flexShrink: 0,
                                                }}
                                            >
                                                {label}
                                            </span>
                                            <div
                                                className="flex-1 rounded-full overflow-hidden"
                                                style={{
                                                    height: 5,
                                                    background:
                                                        'rgba(255,255,255,0.05)',
                                                }}
                                            >
                                                <div
                                                    className="h-full rounded-full"
                                                    style={{
                                                        width: `${(value / 10) * 100}%`,
                                                        background:
                                                            attrColor(value),
                                                        transition:
                                                            'width 600ms ease',
                                                    }}
                                                />
                                            </div>
                                            <span
                                                style={{
                                                    fontSize: '0.78rem',
                                                    fontWeight: 700,
                                                    fontFamily: 'monospace',
                                                    color: attrColor(value),
                                                    width: 28,
                                                    textAlign: 'right' as const,
                                                }}
                                            >
                                                {value.toFixed(1)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* value + buyback */}
                        <div
                            style={{
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.07)',
                                borderRadius: 10,
                                padding: '10px 14px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 6,
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: '0.58rem',
                                        color: '#4b5563',
                                    }}
                                >
                                    market value
                                </span>
                                <span
                                    style={{
                                        fontSize: '0.72rem',
                                        fontWeight: 600,
                                        color: '#4ade80',
                                        fontFamily: 'monospace',
                                    }}
                                >
                                    $
                                    {wonCard.worth != null
                                        ? Number(wonCard.worth).toFixed(2)
                                        : '—'}
                                </span>
                            </div>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: '0.58rem',
                                        color: '#4b5563',
                                    }}
                                >
                                    buyback
                                </span>
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4,
                                    }}
                                >
                                    {wonCard.isHot && (
                                        <span
                                            style={{
                                                fontSize: '0.5rem',
                                                fontWeight: 700,
                                                color: '#fb923c',
                                                background:
                                                    'rgba(251,146,60,0.12)',
                                                border: '1px solid rgba(251,146,60,0.3)',
                                                borderRadius: 4,
                                                padding: '0 4px',
                                                letterSpacing: '0.05em',
                                            }}
                                        >
                                            HOT 🔥
                                        </span>
                                    )}
                                    <span
                                        style={{
                                            fontSize: '0.72rem',
                                            fontWeight: 600,
                                            fontFamily: 'monospace',
                                            color: wonCard.isHot
                                                ? '#fb923c'
                                                : '#eab308',
                                        }}
                                    >
                                        ${Number(wonCard.coins).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* action buttons — compact horizontal row */}
                        {!actionDone && (
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    gap: 5,
                                    marginTop: hasAttrs ? 0 : 'auto',
                                }}
                            >
                                {wonCard.isNew ? (
                                    <button
                                        onClick={handleAddToBag}
                                        className="flex-1 border border-gray-600 text-gray-300 rounded-lg hover:border-gray-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all"
                                        style={{
                                            fontSize: '0.68rem',
                                            padding: '5px 8px',
                                        }}
                                    >
                                        Add to Bag
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={handleAddToBag}
                                            className="flex-1 border border-blue-700 text-blue-400 rounded-lg hover:border-blue-500 hover:text-blue-200 hover:bg-blue-500/5 active:scale-95 transition-all"
                                            style={{
                                                fontSize: '0.68rem',
                                                padding: '5px 8px',
                                            }}
                                        >
                                            Add
                                        </button>
                                        <button
                                            onClick={handleFeed}
                                            className="flex-1 border border-purple-800 text-purple-400 rounded-lg hover:border-purple-600 hover:text-purple-200 hover:bg-purple-500/5 active:scale-95 transition-all"
                                            style={{
                                                fontSize: '0.68rem',
                                                padding: '5px 8px',
                                            }}
                                        >
                                            Feed
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={handleSell}
                                    className="flex-1 border border-gray-600 text-gray-300 rounded-lg hover:border-gray-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all"
                                    style={{
                                        fontSize: '0.68rem',
                                        padding: '5px 8px',
                                    }}
                                >
                                    Sell
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    return null
}
