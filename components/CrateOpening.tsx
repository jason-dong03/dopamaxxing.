'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    getBuyback,
    getCardWorth,
    isRainbow,
    rarityGlowRgb,
    rarityTextStyle,
} from '@/lib/rarityConfig'
import { ShatterEffect } from './card/ShatterEffect'
import type { Pack } from '@/lib/packs'
import { useInvalidate } from '@/lib/userStore'
import { CardStatsPanel } from '../components/pack/CardStatsPanel'
import { createClient } from '@/lib/supabase/client'
import { useIsMobile } from '@/lib/useIsMobile'

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
    storedWorth?: number
    isNew: boolean
    coins: number
    isHot: boolean
    card_level?: number
    attr_centering?: number
    attr_corners?: number
    attr_edges?: number
    attr_surface?: number
}

type Phase = 'idle' | 'spinning' | 'done'

const BLANK_CARD: PoolCard = { id: '__blank__', image_url: '', name: '', rarity: 'Common' }

// ─── component ────────────────────────────────────────────────────────────────
export default function CrateOpening({
    pack,
    onBack,
    isAdmin = false,
}: {
    pack: Pack
    onBack: () => void
    isAdmin?: boolean
}) {
    const router = useRouter()
    const supabase = createClient()
    const { invalidate } = useInvalidate()
    const isMobile = useIsMobile()
    const [phase, setPhase] = useState<Phase>('idle')
    const [strip, setStrip] = useState<PoolCard[]>([])
    const [wonCard, setWonCard] = useState<WonCard | null>(null)
    const [batchCards, setBatchCards] = useState<WonCard[] | null>(null)
    const [poolSize, setPoolSize] = useState(0)
    const [targetX, setTargetX] = useState(0)
    const [spinning, setSpinning] = useState(false)
    const [rested, setRested] = useState(false)
    const [shattering, setShattering] = useState(false)
    const [flyingDown, setFlyingDown] = useState(false)
    const [actionDone, setActionDone] = useState(false)
    const [bagCount, setBagCount] = useState<number | null>(null)
    const [bagCapacity, setBagCapacity] = useState<number>(50)
    const [adminBatchCount, setAdminBatchCount] = useState<1 | 10>(1)

    const [condPanelTab, setCondPanelTab] = useState<'condition' | 'stats'>(
        'condition',
    )
    const [bbTooltipPos, setBbTooltipPos] = useState<{
        x: number
        y: number
    } | null>(null)
    const [coinError, setCoinError] = useState<{
        cost: number
        coins: number
    } | null>(null)

    const containerRef = useRef<HTMLDivElement>(null)
    const startedRef = useRef(false)
    // stores pending API error to surface after animation ends
    const pendingErrorRef = useRef<{ cost: number; coins: number } | null>(null)
    // signals animation ended before wonCard arrived (race condition safety)
    const waitingForCardRef = useRef(false)

    // ── when wonCard arrives after animation already ended ────────────────────
    useEffect(() => {
        if (wonCard && waitingForCardRef.current) {
            waitingForCardRef.current = false
            setRested(true)
            setTimeout(() => setPhase('done'), 1600)
        }
    }, [wonCard])

    async function handleOpen() {
        if (phase !== 'idle') return
        setCoinError(null)
        pendingErrorRef.current = null

        if (isAdmin && adminBatchCount > 1) {
            // ── admin batch ────────────────────────────────────────────────────
            setPhase('spinning') // re-use spinner briefly
            const res = await fetch('/api/open-pack-batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ setId: pack.id, count: adminBatchCount }),
            })
            const data = await res.json()
            router.refresh()
            setBatchCards(Array.isArray(data.cards) ? data.cards : [])
            setPhase('done')
            return
        }

        // ── single open: start animation immediately, API runs in parallel ───
        // Build blank strip — real cards will fill in when API responds
        setStrip(Array.from({ length: STRIP_SIZE }, () => BLANK_CARD))
        startedRef.current = false
        setPhase('spinning')

        // Fire the real API call in the background
        ;(async () => {
            try {
                const res = await fetch('/api/open-pack', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ setId: pack.id }),
                })

                if (res.status === 402) {
                    const data = await res.json()
                    pendingErrorRef.current = { cost: data.cost, coins: data.coins }
                    return
                }

                const data = await res.json()
                router.refresh(); invalidate('profile')

                const winner: WonCard = data.cards[0]
                const pool: PoolCard[] = data.cardPool ?? [winner]

                setPoolSize(pool.length)
                setWonCard(winner)

                // Update strip with real cards — CSS transition continues unaffected
                setStrip(
                    Array.from({ length: STRIP_SIZE }, (_, i) =>
                        i === WINNER_IDX
                            ? winner
                            : pool[Math.floor(Math.random() * pool.length)],
                    ),
                )
            } catch {
                // network error — surface after animation
                pendingErrorRef.current = { cost: 0, coins: -999 }
            }
        })()
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

    useEffect(() => {
        if (phase !== 'done') return
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) return
            Promise.all([
                supabase
                    .from('user_cards')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', user.id),
                supabase
                    .from('profiles')
                    .select('bag_capacity')
                    .eq('id', user.id)
                    .single(),
            ]).then(([countRes, profileRes]) => {
                setBagCount(countRes.count ?? 0)
                setBagCapacity(profileRes.data?.bag_capacity ?? 50)
            })
        })
    }, [phase])

    function handleTransitionEnd() {
        if (!spinning) return
        setSpinning(false)

        // Check for API error surfaced during animation
        if (pendingErrorRef.current) {
            const err = pendingErrorRef.current
            pendingErrorRef.current = null
            setPhase('idle')
            setStrip([])
            setTargetX(0)
            startedRef.current = false
            if (err.coins !== -999) {
                setCoinError(err)
            }
            return
        }

        if (!wonCard) {
            // API hasn't responded yet (very rare with 7s anim + <2s API)
            waitingForCardRef.current = true
            return
        }

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
                worth: wonCard.storedWorth ?? getCardWorth(wonCard),
                isHot: wonCard.isHot,
                rarity: wonCard.rarity,
                cardLevel: wonCard.card_level,
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
        const coins = getBuyback(wonCard, null)
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
        onBack()
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

    // ── idle ──────────────────────────────────────────────────────────────────
    if (phase === 'idle') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[100vh] gap-7">
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
                    className="cursor-pointer hover:scale-105 transition-transform duration-300"
                    style={{ filter: 'drop-shadow(0 0 24px rgba(234,179,8,0.5))' }}
                    onClick={handleOpen}
                >
                    <img
                        src={pack.image}
                        alt={pack.name}
                        style={{ height: 200, width: 'auto', objectFit: 'contain' }}
                    />
                </div>

                {isAdmin && (
                    <div style={{ display: 'flex', gap: 6 }}>
                        {([10] as const).map((n) => (
                            <button
                                key={n}
                                onClick={() => setAdminBatchCount((v) => v === n ? 1 : n)}
                                style={{
                                    background: adminBatchCount === n
                                        ? 'rgba(167,139,250,0.28)'
                                        : 'rgba(167,139,250,0.08)',
                                    border: adminBatchCount === n
                                        ? '1px solid rgba(167,139,250,0.7)'
                                        : '1px solid rgba(167,139,250,0.25)',
                                    borderRadius: 20,
                                    padding: '5px 14px',
                                    color: adminBatchCount === n ? '#ddd6fe' : '#a78bfa',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    letterSpacing: '-0.01em',
                                    boxShadow: adminBatchCount === n ? '0 0 12px rgba(167,139,250,0.3)' : 'none',
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                x{n}
                            </button>
                        ))}
                    </div>
                )}

                <button
                    onClick={onBack}
                    className="px-5 py-2 rounded-xl text-sm font-medium border border-gray-700 text-gray-300 hover:border-gray-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all duration-200"
                    style={{ letterSpacing: '-0.01em' }}
                >
                    Back
                </button>
            </div>
        )
    }

    // ── spinning (single) ─────────────────────────────────────────────────────
    if (phase === 'spinning' && !batchCards) {
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
                                ? 'transform 11s cubic-bezier(0.22, 0, 0.08, 1)'
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
                                        background: card.image_url ? undefined : 'rgba(255,255,255,0.04)',
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
                                    {card.image_url && (
                                        <img
                                            src={card.image_url}
                                            alt={card.name}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                            }}
                                        />
                                    )}
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

    // ── done (batch) ──────────────────────────────────────────────────────────
    if (phase === 'done' && batchCards) {
        return (
            <div
                className="flex flex-col items-center min-h-[80vh] gap-6 px-4 py-8"
                style={{ zoom: isMobile ? 0.9 : 1 }}
            >
                <p
                    className="uppercase tracking-widest"
                    style={{ fontSize: '0.6rem', color: '#374151' }}
                >
                    {pack.name} — {adminBatchCount}x results
                </p>
                <div
                    style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 10,
                        justifyContent: 'center',
                        maxWidth: 700,
                    }}
                >
                    {batchCards.map((card, i) => {
                        const rgb = rarityGlowRgb(card.rarity)
                        const rainbow = isRainbow(card.rarity)
                        return (
                            <div
                                key={i}
                                style={{ position: 'relative', width: isMobile ? 80 : 100 }}
                            >
                                <img
                                    src={card.image_url}
                                    alt={card.name}
                                    className={rainbow ? 'glow-rainbow rounded-lg' : 'rounded-lg'}
                                    style={{
                                        width: '100%',
                                        height: 'auto',
                                        boxShadow: rainbow ? undefined : `0 0 10px rgba(${rgb}, 0.5)`,
                                    }}
                                />
                                {card.isNew && (
                                    <span
                                        className="bg-green-500/20 text-green-400 border border-green-500/40 rounded-full"
                                        style={{
                                            position: 'absolute',
                                            top: 4,
                                            right: 4,
                                            fontSize: '0.45rem',
                                            padding: '1px 5px',
                                        }}
                                    >
                                        NEW
                                    </span>
                                )}
                                <p
                                    style={{
                                        ...rarityTextStyle(card.rarity),
                                        fontSize: '0.5rem',
                                        textAlign: 'center',
                                        marginTop: 3,
                                        lineHeight: 1.2,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {card.name}
                                </p>
                            </div>
                        )
                    })}
                </div>
                <button
                    onClick={() => {
                        setBatchCards(null)
                        setAdminBatchCount(1)
                        setPhase('idle')
                        router.refresh(); invalidate('profile')
                    }}
                    className="px-6 py-2 rounded-xl text-sm font-medium border border-gray-700 text-gray-300 hover:border-gray-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all duration-200 mt-2"
                >
                    Done
                </button>
            </div>
        )
    }

    // ── done (single) ─────────────────────────────────────────────────────────
    if (phase === 'done' && wonCard) {
        return (
            <div
                className="flex items-center justify-center min-h-[80vh]"
                style={{ zoom: isMobile ? 1 : 1.2 }}
            >
                {isMobile ? (
                    // ── Mobile: card on top, stats below ────────────────────
                    <div className="flex flex-col items-center gap-4 w-full px-4 py-6">
                        {/* card */}
                        <div
                            className={`relative animate-slide-up${flyingDown ? ' animate-fly-down' : ''}`}
                            onAnimationEnd={(e) => {
                                if (flyingDown && e.animationName === 'flyDown') onBack()
                            }}
                        >
                            <img
                                src={wonCard.image_url}
                                alt={wonCard.name}
                                className={`rounded-xl${wonIsRainbow ? ' glow-rainbow' : ''}`}
                                style={{
                                    height: 'min(300px, 62vw)',
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

                        {/* stats panel below card on mobile */}
                        <div style={{ width: '100%', maxWidth: 340 }}>
                            <CardStatsPanel
                                currentCard={wonCard}
                                isMobile={isMobile}
                                condPanelTab={condPanelTab}
                                setCondPanelTab={setCondPanelTab}
                                bbTooltipPos={bbTooltipPos}
                                setBbTooltipPos={setBbTooltipPos}
                                bagCount={bagCount}
                                bagCapacity={bagCapacity}
                                currentCardIsNew={wonCard.isNew}
                                animatingIndex={actionDone ? 0 : null}
                                shattering={shattering}
                                isFetchingCopies={false}
                                handleAddToBag={handleAddToBag}
                                handleAddToBagDuplicate={handleAddToBag}
                                handleFeedCard={handleFeed}
                                handleBuyback={handleSell}
                            />
                        </div>
                    </div>
                ) : (
                    // ── Desktop: card + stats side by side ────────────────────
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
                                if (flyingDown && e.animationName === 'flyDown') onBack()
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

                        {/* stats panel */}
                        <div style={{ width: 220, height: 364 }}>
                            <CardStatsPanel
                                currentCard={wonCard}
                                isMobile={isMobile}
                                condPanelTab={condPanelTab}
                                setCondPanelTab={setCondPanelTab}
                                bbTooltipPos={bbTooltipPos}
                                setBbTooltipPos={setBbTooltipPos}
                                bagCount={bagCount}
                                bagCapacity={bagCapacity}
                                currentCardIsNew={wonCard.isNew}
                                animatingIndex={actionDone ? 0 : null}
                                shattering={shattering}
                                isFetchingCopies={false}
                                handleAddToBag={handleAddToBag}
                                handleAddToBagDuplicate={handleAddToBag}
                                handleFeedCard={handleFeed}
                                handleBuyback={handleSell}
                            />
                        </div>
                    </div>
                )}
            </div>
        )
    }

    return null
}
