'use client'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import FlipCard from './card/FlipCard'
import FirstEditionBadge from './card/FirstEditionBadge'
import {
    getBuyback,
    getCardWorth,
    isRainbow,
    rarityGlowRgb,
    rarityTextClass,
    rarityTextStyle,
    calculateBuyback,
} from '@/lib/rarityConfig'
import { useRouter } from 'next/navigation'
import AutoCompleteSettings from './AutoCompleteSettings'
import { createClient } from '@/lib/supabase/client'
import {
    loadPrefs,
    getActionForCard,
    type AutoCompletePrefs,
} from '@/lib/autoCompletePref'
import {
    saveSession,
    loadSession,
    clearSession,
    PackSession,
} from '@/lib/packSession'
import { Pack } from '@/lib/packs'
import { ShatterEffect } from './card/ShatterEffect'
import { useIsMobile } from '@/lib/useIsMobile'
import WearOverlay from '@/components/card/WearOverlay'
import { conditionFilter, centeringSkew } from '@/lib/cardAttributes'
import { RARITY_TIERS } from './pack/utils'
import type { Card, UserCopy } from './pack/utils'
import { PackCutscene } from './pack/CutsceneOverlay'
import { RarityBackgroundEffects } from './pack/RarityBackgroundEffects'
import { CardStatsPanel } from './pack/CardStatsPanel'
import { CardActionButtons } from './pack/CardActionButtons'
import { FeedPickerModal } from './pack/FeedPickerModal'
import { useInvalidate } from '@/lib/userStore'

type Props = {
    pack: Pack
    onBack: () => void
    onComplete?: () => void
    autoBack?: boolean
    free?: boolean
    count?: number
    stock?: number
    discount?: number
    isAdmin?: boolean
    onPackOpened?: (packId: string, countOpened: number) => void
}

export default function PackOpening({
    pack,
    onBack,
    onComplete,
    autoBack = false,
    free = false,
    count = 1,
    stock = 1,
    discount = 0,
    isAdmin = false,
    onPackOpened,
}: Props) {
    const router = useRouter()
    const isMobile = useIsMobile()
    const supabase = createClient()
    const { invalidate } = useInvalidate()
    const clickLock = useRef(false)
    const effectiveCost = parseFloat((pack.cost * (1 - discount)).toFixed(2))
    const [userCoins, setUserCoins] = useState<number | null>(null)
    const [spinning, setSpinning] = useState(false)
    const [dramaticPulse, setDramaticPulse] = useState(false)
    const [epicMythicPulse, setEpicMythicPulse] = useState<
        'epic' | 'mythic' | null
    >(null)
    const [catchShimmer, setCatchShimmer] = useState<
        'legendary' | 'divine' | 'celestial' | 'mystery' | null
    >(null)
    const [slowShake, setSlowShake] = useState(false)
    const [cutsceneTier, setCutsceneTier] = useState<
        'legendary' | 'divine' | 'celestial' | 'mystery' | null
    >(null)
    const cutsceneResolveRef = useRef<(() => void) | null>(null)

    const [exiting, setExiting] = useState(false)
    const [ripping, setRipping] = useState(false)
    const [phase, setPhase] = useState<
        'idle' | 'revealing' | 'multi-revealing' | 'done'
    >('idle')
    const [cards, setCards] = useState<Card[]>([])

    const [specialActive, setSpecialActive] = useState(false)
    const [specialGlow, setSpecialGlow] = useState('156, 163, 175')
    const [revealedCount, setRevealedCount] = useState(0)
    const [multiPackIndex, setMultiPackIndex] = useState(0)
    const [packRevealedCount, setPackRevealedCount] = useState(0)
    const [packTransitioning, setPackTransitioning] = useState(false)
    const [batchRevealIndex, setBatchRevealIndex] = useState(0)
    const [shattering, setShattering] = useState(false)

    const [addedIndices, setAddedIndices] = useState<Set<number>>(new Set())
    const [animatingIndex, setAnimatingIndex] = useState<number | null>(null)
    const [doneIndex, setDoneIndex] = useState(0)
    const [condPanelTab, setCondPanelTab] = useState<
        'condition' | 'stats' | 'moves'
    >('condition')
    const [detailsCondPanelTab, setDetailsCondPanelTab] = useState<
        'condition' | 'stats' | 'moves'
    >('condition')
    const [openCount, setOpenCount] = useState(count)
    const [selectedCount, setSelectedCount] = useState(count > 1 ? count : 1)
    const [adminBatchCount, setAdminBatchCount] = useState<1 | 10>(1)

    const [addedCardIds, setAddedCardIds] = useState<Set<string>>(new Set())
    const [showRarity, setShowRarity] = useState(false)
    const [rarityCard, setRarityCard] = useState<Card | null>(null)
    const [screenFlash, setScreenFlash] = useState(false)

    const remainingCards = cards.filter((_, i) => !addedIndices.has(i))
    const remainingCardsRef = useRef<Card[]>([])
    remainingCardsRef.current = remainingCards

    const [prefs, setPrefs] = useState<AutoCompletePrefs>(() => loadPrefs())
    const [showSettings, setShowSettings] = useState(false)
    const [sellAllConfirm, setSellAllConfirm] = useState(false)
    function triggerCoinFlash(amount: number, gain: boolean) {
        window.dispatchEvent(
            new CustomEvent('coin-change', {
                detail: { delta: gain ? amount : -amount },
            }),
        )
    }
    const [resumeSession, setResumeSession] = useState<PackSession | null>(null)
    const [coinError, setCoinError] = useState<{
        cost: number
        coins: number
    } | null>(null)

    const [feedPickerCopies, setFeedPickerCopies] = useState<UserCopy[] | null>(
        null,
    )
    const [isFetchingCopies, setIsFetchingCopies] = useState(false)

    const [godPack, setGodPack] = useState(false)
    const [autoRunning, setAutoRunning] = useState(false)

    // XP / level-up
    const [userLevel, setUserLevel] = useState<number>(1)
    const [xpGainPerPack, setXpGainPerPack] = useState<number | null>(null)
    const [levelUpInfo, setLevelUpInfo] = useState<{
        oldLevel: number
        newLevel: number
        oldXP: number
        newXP: number
        xpRequired: number
        xpGain: number
    } | null>(null)
    const [levelUpClaiming, setLevelUpClaiming] = useState(false)
    const [levelUpClaimed, setLevelUpClaimed] = useState(false)
    const [fanningOut, setFanningOut] = useState(false)
    const [showDetails, setShowDetails] = useState(false)
    const [bbTooltipPos, setBbTooltipPos] = useState<{
        x: number
        y: number
    } | null>(null)
    const [sparks, setSparks] = useState<
        {
            id: number
            originX: number
            originY: number
            ex: string
            ey: string
            cx: string
            sd: string
            color: string
            rainbow?: boolean
        }[]
    >([])
    const packImgRef = useRef<HTMLDivElement>(null)
    const topCardRef = useRef<HTMLDivElement>(null)
    const [bagCount, setBagCount] = useState<number | null>(null)
    const [bagCapacity, setBagCapacity] = useState<number>(50)

    const autocompleteQueue = useRef<string[]>([])
    const autocompleteActionMap = useRef<
        Record<string, 'add' | 'sell' | 'feed'>
    >({})
    const isAutocompleting = useRef(false)
    const wasBatchOpen = useRef(false)
    const prefetchRef = useRef<{
        promise: Promise<Response>
        key: string
    } | null>(null)
    const touchStartYRef = useRef<number | null>(null)
    const swipeStartXRef = useRef<number | null>(null)
    const idleDims = isMobile
        ? pack.aspect === 'box'
            ? { height: 'min(340px, 80vw)', width: 'min(440px, 94vw)' }
            : { height: 'min(540px, 88vw)', width: 'auto' }
        : pack.aspect === 'box'
          ? { height: 'min(270px, 60vw)', width: 'min(360px, 78vw)' }
          : { height: 'min(420px, 68vw)', width: 'auto' }

    useEffect(() => {
        const session = loadSession()
        if (session) setResumeSession(session)
    }, [])

    // lock body scroll while pack opening is active
    useEffect(() => {
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = prev
        }
    }, [])

    // signal to DropsButton/EventBanner that a pack is open
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

    // broadcast phase changes for UI elements that need to hide during opening
    useEffect(() => {
        window.dispatchEvent(new CustomEvent('pack-phase', { detail: phase }))
    }, [phase])

    // nav-home event: return to pack selection from the Home navbar button
    useEffect(() => {
        const handler = () => onBack()
        window.addEventListener('nav-home', handler)
        return () => window.removeEventListener('nav-home', handler)
    }, [onBack])

    useEffect(() => {
        if (phase !== 'idle') return
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) return
            supabase
                .from('profiles')
                .select('coins, level, xp')
                .eq('id', user.id)
                .single()
                .then(({ data }) => {
                    if (data) {
                        const coins = Number(data.coins)
                        setUserCoins(coins)
                        const lvl = Number(data.level ?? 1)
                        setUserLevel(lvl)
                        // XP per pack = 15 * sqrt(level), same formula as server
                        setXpGainPerPack(Math.round(15 * Math.sqrt(lvl)))
                        // auto-select highest affordable batch count
                        if (!free && effectiveCost > 0 && stock > 1) {
                            const maxAffordable = Math.max(
                                1,
                                Math.min(
                                    stock,
                                    Math.floor(coins / effectiveCost),
                                ),
                            )
                            setSelectedCount(maxAffordable)
                        }
                    }
                })
        })
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

    function handleResume() {
        if (!resumeSession) return
        setCards(resumeSession.cards)
        setAddedIndices(new Set(resumeSession.addedIndices))
        setDoneIndex(resumeSession.doneIndex)
        setAddedCardIds(new Set(resumeSession.addedCardIds))
        setRevealedCount(resumeSession.cards.length)
        setPhase('done')
        setResumeSession(null)
    }

    function startPackFetch(batchCount?: number): Promise<Response> {
        const isMulti = (batchCount ?? openCount) > 1
        const effectiveCount = batchCount ?? openCount
        const setId = pack.setId ?? pack.id
        return isMulti
            ? fetch('/api/open-pack-batch', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ setId, count: effectiveCount, free }),
              })
            : fetch('/api/open-pack', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ setId, free }),
              })
    }

    function prefetchKey(batchCount?: number) {
        const c = batchCount ?? openCount
        return c > 1 ? `multi-${c}` : 'single'
    }

    function prefetchPack(batchCount?: number) {
        if (spinning || exiting || ripping) return
        if (!free && !isAdmin && stock <= 0) return
        const key = prefetchKey(batchCount)
        if (prefetchRef.current?.key === key) return
        prefetchRef.current = { key, promise: startPackFetch(batchCount) }
    }

    async function handleClick(batchCount?: number) {
        if (clickLock.current) return
        clickLock.current = true
        if (spinning || exiting || ripping) return
        if (!free && !isAdmin && stock <= 0) return
        setCoinError(null)
        if (batchCount && batchCount > 1) {
            setOpenCount(batchCount)
            wasBatchOpen.current = true
        }

        setSpinning(true)
        const shakeStart = Date.now()
        // Safety cap only — shake runs API-long; this only fires on a hung request
        const shakeTimer = setTimeout(() => setSpinning(false), 3000)

        const isMulti = (batchCount ?? openCount) > 1
        const effectiveCount = batchCount ?? openCount
        let openedCards: Card[] = []

        // ── fetch (use prefetched request if available) ────────────────────
        const key = prefetchKey(batchCount)
        let resPromise: Promise<Response>
        if (prefetchRef.current?.key === key) {
            resPromise = prefetchRef.current.promise
            prefetchRef.current = null
        } else {
            prefetchRef.current = null
            resPromise = startPackFetch(batchCount)
        }
        const res = await resPromise
        if (res.status === 409) {
            clearTimeout(shakeTimer)
            setSpinning(false)
            setCoinError({ cost: 0, coins: -1 })
            return
        }
        if (res.status === 402) {
            const d = await res.json()
            clearTimeout(shakeTimer)
            setSpinning(false)
            setCoinError({ cost: d.cost, coins: d.coins })
            return
        }
        const data = await res.json()
        if (!Array.isArray(data.cards) || data.cards.length === 0) {
            clearTimeout(shakeTimer)
            setSpinning(false)
            return
        }
        openedCards = data.cards
        if (isMulti) {
            if (data.leveledUp) {
                setLevelUpInfo({
                    oldLevel: data.oldLevel,
                    newLevel: data.newLevel,
                    oldXP: data.oldXP,
                    newXP: data.newXP,
                    xpRequired: data.xpRequired,
                    xpGain: data.xpGain,
                })
                setLevelUpClaimed(false)
            }
            if (data.xpGainPerPack) setXpGainPerPack(data.xpGainPerPack)
            if (data.newBR)
                window.dispatchEvent(
                    new CustomEvent('br-updated', {
                        detail: { newBR: data.newBR },
                    }),
                )
            const actualOpened = data.openedCount ?? effectiveCount
            setOpenCount(actualOpened)
            if (!free && effectiveCost > 0) {
                setUserCoins(
                    (prev) => (prev ?? 0) - effectiveCost * actualOpened,
                )
                triggerCoinFlash(effectiveCost * actualOpened, false)
            }
            onPackOpened?.(pack.id, actualOpened)
        } else {
            if (data.godPack) setGodPack(true)
            if (data.leveledUp) {
                setLevelUpInfo({
                    oldLevel: data.oldLevel,
                    newLevel: data.newLevel,
                    oldXP: data.oldXP,
                    newXP: data.newXP,
                    xpRequired: data.xpRequired,
                    xpGain: data.xpGain,
                })
                setLevelUpClaimed(false)
            }
            if (data.xpGain) setXpGainPerPack(data.xpGain)
            if (data.newBR)
                window.dispatchEvent(
                    new CustomEvent('br-updated', {
                        detail: { newBR: data.newBR },
                    }),
                )
            // luckyFree: server granted the pack for free — no coin deduction, no stock decrement
            const luckyFree = !!data.luckyFree
            if (!luckyFree && !free && effectiveCost > 0) {
                setUserCoins((prev) => (prev ?? 0) - effectiveCost)
                triggerCoinFlash(effectiveCost, false)
            }
            if (!luckyFree) onPackOpened?.(pack.id, 1)
            saveSession({
                cards: openedCards,
                addedIndices: [],
                doneIndex: 0,
                addedCardIds: [],
            })
        }

        // ── determine top rarity (feeds both min-shake length + catch seq) ──
        const RARITY_SHAKE_COUNT: Record<string, number> = {
            Legendary: 1,
            Divine: 1,
            Celestial: 2,
            '???': 3,
        }
        const RARITY_SPARK_COLORS: Record<string, string[]> = {
            Legendary: ['#facc15', '#fbbf24', '#f59e0b', '#fde68a', '#fff8'],
            Divine: ['#ef4444', '#f87171', '#fca5a5', '#b91c1c', '#fecaca'],
            Celestial: ['#f0f9ff', '#bae6fd', '#e0f2fe', '#ffffff', '#7dd3fc'],
            '???': [
                '#f472b6',
                '#818cf8',
                '#34d399',
                '#facc15',
                '#60a5fa',
                '#fb923c',
                '#fff',
            ],
        }
        const presentRarities = new Set(openedCards.map((c) => c.rarity))
        const topRarity =
            ['???', 'Celestial', 'Divine', 'Legendary'].find((r) =>
                presentRarities.has(r),
            ) ?? null
        const hasEpicPlus =
            presentRarities.has('Epic') || presentRarities.has('Mythical')

        // ── ensure a minimum shake window even if API was instant ────────
        // Rarer pulls deserve more anticipation; commons just get a token shake.
        const MIN_SHAKE_MS = topRarity ? 350 : hasEpicPlus ? 280 : 200
        const elapsed = Date.now() - shakeStart
        if (elapsed < MIN_SHAKE_MS)
            await new Promise((r) => setTimeout(r, MIN_SHAKE_MS - elapsed))
        clearTimeout(shakeTimer)
        setSpinning(false)

        // Epic/Mythic get a single aura pulse instead of the full Legendary+ cutscene.
        // Fires after the shake so it reads as a "something's special" beat before exit.
        if (!topRarity && hasEpicPlus) {
            const tier = presentRarities.has('Mythical') ? 'mythic' : 'epic'
            setEpicMythicPulse(tier)
            await new Promise((r) =>
                setTimeout(r, tier === 'mythic' ? 500 : 450),
            )
        }

        // ── pokéball-catch sequence for Legendary+ pulls ──────────────────
        const shakeCount = topRarity ? RARITY_SHAKE_COUNT[topRarity] : 0
        const isSlow = topRarity === '???' || topRarity === 'Celestial'
        const shakeDuration = isSlow ? 450 : 270
        const pauseBetween = isSlow ? 300 : 200

        const shimmerTier =
            topRarity === '???'
                ? 'mystery'
                : topRarity === 'Celestial'
                  ? 'celestial'
                  : topRarity === 'Divine'
                    ? 'divine'
                    : topRarity === 'Legendary'
                      ? 'legendary'
                      : null

        // cutscene + gleam start together before the shake
        if (shimmerTier) {
            setCutsceneTier(shimmerTier)
            await new Promise<void>((resolve) => {
                cutsceneResolveRef.current = resolve
            })
            setCutsceneTier(null)
            setCatchShimmer(shimmerTier)
            setSlowShake(isSlow)
        }

        function fireShakeSparks(shakeIndex: number) {
            const rect = packImgRef.current?.getBoundingClientRect()
            if (!rect) return
            const count = 8 + shakeIndex * 6 // 8, 14, 20, 26
            const colors = topRarity ? RARITY_SPARK_COLORS[topRarity] : ['#fff']
            const isRainbow = topRarity === '???'
            const newSparks = Array.from({ length: count }, (_, i) => {
                // origin: random point along left or right edge of the pack
                const side = i % 2 === 0 ? 'left' : 'right'
                const ox =
                    side === 'left'
                        ? rect.left + rect.width * 0.08
                        : rect.right - rect.width * 0.08
                const oy = rect.top + Math.random() * rect.height
                // flare outward from the side it came from
                const baseAngle = side === 'left' ? Math.PI : 0
                const spread = (Math.random() - 0.5) * Math.PI * 1.1
                const angle = baseAngle + spread
                const dist = 150 + Math.random() * 220
                return {
                    id: Date.now() + i,
                    originX: ox,
                    originY: oy,
                    ex: `${Math.cos(angle) * dist}px`,
                    ey: `${Math.sin(angle) * dist}px`,
                    cx: `${Math.cos(angle) * dist * 0.35}px`,
                    sd: `${0.65 + Math.random() * 0.5}s`,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    rainbow: isRainbow,
                }
            })
            setSparks((prev) => [...prev, ...newSparks])
            setTimeout(
                () =>
                    setSparks((prev) =>
                        prev.filter(
                            (s) => !newSparks.some((n) => n.id === s.id),
                        ),
                    ),
                1300,
            )
        }

        if (shakeCount > 0 && topRarity) {
            for (let i = 0; i < shakeCount; i++) {
                fireShakeSparks(i)
                setDramaticPulse(true)
                await new Promise((r) => setTimeout(r, shakeDuration))
                setDramaticPulse(false)
                if (i < shakeCount - 1)
                    await new Promise((r) => setTimeout(r, pauseBetween))
            }
            await new Promise((r) => setTimeout(r, 120))
        }

        // ── sort multi-pack groups ─────────────────────────────────────────
        if (isMulti) {
            const perPack = Math.round(openedCards.length / effectiveCount)
            for (let p = 0; p < effectiveCount; p++) {
                const start = p * perPack
                const slice = openedCards.splice(start, perPack)
                slice.sort(
                    (a, b) =>
                        RARITY_TIERS.indexOf(a.rarity) -
                        RARITY_TIERS.indexOf(b.rarity),
                )
                openedCards.splice(start, 0, ...slice)
            }
        }

        setCards(openedCards)
        setMultiPackIndex(0)
        setPackRevealedCount(0)
        setPackTransitioning(false)
        router.refresh()
        invalidate('profile')

        function doExit() {
            setRipping(true)
            setTimeout(() => {
                setRipping(false)
                setCatchShimmer(null)
                setSlowShake(false)
                setEpicMythicPulse(null)
                setPhase(isMulti ? 'multi-revealing' : 'revealing')
                clickLock.current = false
            }, 620)
        }

        doExit()
    }

    function handleReveal() {
        const next = revealedCount + 1
        setRevealedCount(next)
        if (next === cards.length) {
            setTimeout(() => setPhase('done'), 200)
        }
    }

    function cardAttrs(card: Card) {
        return {
            attr_centering: card.attr_centering,
            attr_corners: card.attr_corners,
            attr_edges: card.attr_edges,
            attr_surface: card.attr_surface,
        }
    }

    function handleAddToBag() {
        if (bagCount !== null && bagCount >= bagCapacity) return
        const card = remainingCards[doneIndex]
        setAddedCardIds((prev) => new Set(prev).add(card.id))
        setBagCount((prev) => (prev ?? 0) + 1)
        setAnimatingIndex(doneIndex)
        fetch('/api/add-to-bag', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cardId: card.id,
                worth: card.storedWorth ?? getCardWorth(card),
                isHot: card.isHot,
                rarity: card.rarity,
                cardLevel: card.card_level,
                attrs: cardAttrs(card),
                previewStats: card.preview_stats,
                previewNature: card.preview_nature,
            }),
        }).catch(console.error)
    }

    function handleAddToBagDuplicate() {
        if (bagCount !== null && bagCount >= bagCapacity) return
        const card = remainingCards[doneIndex]
        setAddedCardIds((prev) => new Set(prev).add(card.id))
        setBagCount((prev) => (prev ?? 0) + 1)
        setAnimatingIndex(doneIndex)
        fetch('/api/add-to-bag', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cardId: card.id,
                worth: card.storedWorth ?? getCardWorth(card),
                isHot: card.isHot,
                rarity: card.rarity,
                cardLevel: card.card_level,
                attrs: cardAttrs(card),
                previewStats: card.preview_stats,
                previewNature: card.preview_nature,
            }),
        }).catch(console.error)
    }

    function removeCard(index: number) {
        const card = remainingCardsRef.current[index]
        const realIndex = cards.findIndex((c) => c === card)

        setAddedIndices((prev) => {
            const next = new Set(prev)
            next.add(realIndex)
            return next
        })

        const newRemaining = remainingCardsRef.current.filter(
            (_, i) => i !== index,
        )

        if (newRemaining.length === 0) {
            clearSession()
            isAutocompleting.current = false
            setAutoRunning(false)
            const outOfStock = !free && !isAdmin && stock <= 0
            if (autoBack || outOfStock) {
                router.refresh()
                invalidate('profile')
                ;(onComplete ?? onBack)()
                return
            }
            wasBatchOpen.current = false
            setPhase('idle')
            setCards([])
            setRevealedCount(0)
            setAddedIndices(new Set())
            setDoneIndex(0)
            setExiting(false)
            setRipping(false)
        } else {
            const newDoneIndex = Math.min(doneIndex, newRemaining.length - 1)
            setDoneIndex(newDoneIndex)
            saveSession({
                cards,
                addedIndices: [...addedIndices, realIndex],
                doneIndex: newDoneIndex,
                addedCardIds: [...addedCardIds],
            })
        }
        router.refresh()
        invalidate('profile')
    }

    function handleBuyback() {
        const card = remainingCards[doneIndex]
        setShattering(true)
        setUserCoins((prev) => (prev ?? 0) + card.coins)
        triggerCoinFlash(card.coins, true)
        fetch('/api/buyback-card', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                card_buyback_amount: getBuyback(card, null),
            }),
        }).catch(console.error)
        setTimeout(() => {
            setShattering(false)
            removeCard(doneIndex)
        }, 550)
    }

    const PRECIOUS_RARITIES = ['Legendary', 'Divine', 'Celestial', '???']

    function handleSellAll() {
        const hasPrecious = remainingCardsRef.current.some((c) =>
            PRECIOUS_RARITIES.includes(c.rarity),
        )
        if (hasPrecious) {
            setSellAllConfirm(true)
            return
        }
        doSellAll()
    }

    function doSellAll() {
        setSellAllConfirm(false)
        const toSell = remainingCardsRef.current
        if (toSell.length === 0) return
        const totalCoins = toSell.reduce((sum, c) => sum + c.coins, 0)
        setUserCoins((prev) => (prev ?? 0) + totalCoins)
        triggerCoinFlash(totalCoins, true)
        fetch('/api/batch-action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                actions: toSell.map((c) => ({
                    type: 'sell',
                    coins: c.coins,
                })),
            }),
        }).catch(console.error)
        const realIndices = toSell.map((card) =>
            cards.findIndex((c) => c === card),
        )
        clearSession()
        isAutocompleting.current = false
        setAutoRunning(false)
        const outOfStock = !free && !isAdmin && stock <= 0
        if (autoBack || outOfStock) {
            router.refresh()
            invalidate('profile')
            ;(onComplete ?? onBack)()
            return
        }
        wasBatchOpen.current = false
        setAddedIndices(new Set(realIndices))
        setPhase('idle')
        setCards([])
        setRevealedCount(0)
        setAddedIndices(new Set())
        setDoneIndex(0)
        setExiting(false)
        setRipping(false)
        router.refresh()
        invalidate('profile')
    }

    async function handleFeedCard() {
        const card = remainingCards[doneIndex]
        setIsFetchingCopies(true)
        const supabase = createClient()
        const { data: copies } = await supabase
            .from('user_cards')
            .select('id, card_level, card_xp, grade')
            .eq('card_id', card.id)
            .order('card_level', { ascending: false })
        setIsFetchingCopies(false)
        if (!copies || copies.length === 0) return
        if (copies.length === 1) {
            // only one copy — feed into it directly
            await feedInto(copies[0].id)
        } else {
            // multiple copies — let user pick
            setFeedPickerCopies(copies)
        }
    }

    async function feedInto(userCardId: string) {
        setFeedPickerCopies(null)
        setAnimatingIndex(doneIndex)
        await fetch('/api/feed-card', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userCardId }),
        })
    }

    // ─── batch autocomplete ────────────────────────────────────────────────────

    function handleStopAutocomplete() {
        isAutocompleting.current = false
        autocompleteQueue.current = []
        autocompleteActionMap.current = {}
        setAutoRunning(false)
    }

    function handleAutocomplete(fromBack = false) {
        if (isAutocompleting.current) return
        isAutocompleting.current = true
        setAutoRunning(true)

        // Cap 'add' actions to remaining bag space — overflow becomes 'sell'
        const availableSlots = Math.max(0, bagCapacity - (bagCount ?? 0))
        let addSlotUsed = 0

        const source = fromBack
            ? [...remainingCardsRef.current].reverse()
            : remainingCardsRef.current

        const queue = source
            .map((card) => {
                const currentIsNew = card.isNew && !addedCardIds.has(card.id)
                let action = getActionForCard(card, prefs, currentIsNew)
                if (action === 'add') {
                    if (addSlotUsed >= availableSlots) {
                        action = 'sell'
                    } else {
                        addSlotUsed++
                    }
                }
                return { card, action }
            })
            .filter(({ action }) => action !== 'skip')

        if (queue.length === 0) {
            isAutocompleting.current = false
            setAutoRunning(false)
            return
        }

        autocompleteActionMap.current = Object.fromEntries(
            queue.map(({ card, action }) => [
                card.id,
                action as 'add' | 'sell' | 'feed',
            ]),
        )
        setAddedCardIds((prev) => {
            const next = new Set(prev)
            queue
                .filter(({ action }) => action === 'add')
                .forEach(({ card }) => next.add(card.id))
            return next
        })

        fetch('/api/batch-action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                actions: queue.map(({ card, action }) => {
                    if (action === 'add')
                        return {
                            type: 'add',
                            cardId: card.id,
                            coins: card.coins,
                            isHot: card.isHot,
                            natureTier: card.nature_tier ?? null,
                            attrs: cardAttrs(card),
                        }
                    if (action === 'sell')
                        return { type: 'sell', coins: card.coins }
                    return { type: 'feed', cardId: card.id }
                }),
            }),
        }).catch(console.error)

        autocompleteQueue.current = queue.map(({ card }) => card.id)
        processNextAutocomplete()
    }

    async function processNextAutocomplete() {
        if (!isAutocompleting.current) {
            autocompleteQueue.current = []
            setAutoRunning(false)
            return
        }

        if (autocompleteQueue.current.length === 0) {
            isAutocompleting.current = false
            setAutoRunning(false)
            return
        }

        const cardId = autocompleteQueue.current[0]
        const card = remainingCardsRef.current.find((c) => c.id === cardId)

        if (!card) {
            autocompleteQueue.current.shift()
            processNextAutocomplete()
            return
        }

        const i = remainingCardsRef.current.indexOf(card)
        const action = autocompleteActionMap.current[cardId]

        setDoneIndex(i)

        if (action === 'sell') {
            setShattering(true)
            await new Promise((res) => setTimeout(res, 550))
            setShattering(false)
            autocompleteQueue.current.shift()
            removeCard(i)
            if (!isAutocompleting.current) return
            setTimeout(() => processNextAutocomplete(), 50)
        } else {
            // add / feed — trigger fly-down; handleAnimationEnd resumes queue
            autocompleteQueue.current.shift()
            if (!isAutocompleting.current) return
            setAnimatingIndex(i)
        }
    }

    function handleAnimationEnd() {
        if (animatingIndex === null) return

        const removedIndex = animatingIndex
        const card = remainingCards[removedIndex]
        const realIndex = cards.findIndex((c) => c === card)

        setAddedIndices((prev) => {
            const next = new Set(prev)
            next.add(realIndex)
            return next
        })
        setAnimatingIndex(null)

        const newRemaining = remainingCards.filter((_, i) => i !== removedIndex)

        if (newRemaining.length === 0) {
            clearSession()
            isAutocompleting.current = false
            autocompleteQueue.current = []
            autocompleteActionMap.current = {}
            setAutoRunning(false)
            const outOfStock = !free && !isAdmin && stock <= 0
            if (autoBack || outOfStock) {
                router.refresh()
                invalidate('profile')
                ;(onComplete ?? onBack)()
                return
            }
            wasBatchOpen.current = false
            setPhase('idle')
            setCards([])
            setRevealedCount(0)
            setAddedIndices(new Set())
            setDoneIndex(0)
            setExiting(false)
            setRipping(false)
        } else {
            const newDoneIndex = Math.min(removedIndex, newRemaining.length - 1)
            setDoneIndex(newDoneIndex)
            saveSession({
                cards,
                addedIndices: [...addedIndices, realIndex],
                doneIndex: newDoneIndex,
                addedCardIds: [...addedCardIds],
            })
            if (isAutocompleting.current) {
                setTimeout(() => {
                    if (isAutocompleting.current) processNextAutocomplete()
                }, 50)
            }
        }
        router.refresh()
        invalidate('profile')
    }
    function handleFlipAll() {
        const remaining = cards.length - revealedCount
        if (remaining <= 0) return
        setFanningOut(true)
        setTimeout(() => {
            setFanningOut(false)
            setRevealedCount(cards.length)
            setPhase('done')
        }, 600)
    }

    // ─── multi-pack reveal helpers ─────────────────────────────────────────────
    const cardsPerPack =
        openCount > 1 ? Math.round(cards.length / openCount) : cards.length

    function handlePackReveal() {
        const next = packRevealedCount + 1
        setPackRevealedCount(next)
    }

    function handleFlipPackAll() {
        setFanningOut(true)
        setTimeout(() => {
            setFanningOut(false)
            setPackRevealedCount(cardsPerPack)
        }, 600)
    }

    function sortCardsRarestLast(arr: Card[]): Card[] {
        return [...arr].sort(
            (a, b) =>
                RARITY_TIERS.indexOf(a.rarity) - RARITY_TIERS.indexOf(b.rarity),
        )
    }

    function handleSkipAll() {
        setCards(sortCardsRarestLast(cards))
        setPackTransitioning(true)
        setTimeout(() => {
            setPhase('done')
            setPackTransitioning(false)
        }, 350)
    }

    function handleNextPack() {
        const isLast = multiPackIndex >= openCount - 1
        setPackTransitioning(true)
        setTimeout(() => {
            if (isLast) {
                setCards(sortCardsRarestLast(cards))
                setPhase('done')
                setPackTransitioning(false)
            } else {
                setMultiPackIndex((i) => i + 1)
                setPackRevealedCount(0)
                setBatchRevealIndex(0)
                setSpecialActive(false)
                setSpecialGlow('156, 163, 175')
                setShowRarity(false)
                setRarityCard(null)
                setFanningOut(false)
                setPackTransitioning(false)
            }
        }, 350)
    }

    // keyboard: space / enter / arrow-right advance the reveal
    useEffect(() => {
        if (phase !== 'revealing' && phase !== 'multi-revealing') return
        function onKey(e: KeyboardEvent) {
            if (
                e.target instanceof HTMLInputElement ||
                e.target instanceof HTMLTextAreaElement
            )
                return
            if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') {
                e.preventDefault()
                if (phase === 'revealing') {
                    // Click events don't propagate from a parent down to children, so
                    // we have to dispatch on FlipCard's actual clickable element.
                    const target = topCardRef.current?.querySelector(
                        '[data-flip-clickable]',
                    ) as HTMLElement | null
                    target?.click()
                } else {
                    const allFlipped = packRevealedCount >= cardsPerPack
                    if (allFlipped) {
                        if (!packTransitioning) handleNextPack()
                    } else {
                        const target = topCardRef.current?.querySelector(
                            '[data-flip-clickable]',
                        ) as HTMLElement | null
                        if (target) target.click()
                        else handlePackReveal()
                    }
                }
            }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [
        phase,
        revealedCount,
        packRevealedCount,
        cardsPerPack,
        packTransitioning,
    ])

    const currentCard = remainingCards[doneIndex]
    const packBgTier: 'celestial' | 'divine' | 'legendary' | 'mystery' | null =
        (() => {
            const triggerCard =
                phase === 'done'
                    ? currentCard
                    : (phase === 'revealing' || phase === 'multi-revealing') &&
                        specialActive
                      ? rarityCard
                      : null
            if (!triggerCard) return null
            if (triggerCard.rarity === '???') return 'mystery'
            if (triggerCard.rarity === 'Celestial') return 'celestial'
            if (triggerCard.rarity === 'Divine') return 'divine'
            if (triggerCard.rarity === 'Legendary') return 'legendary'
            return null
        })()
    const currentCardIsNew =
        currentCard?.isNew && !addedCardIds.has(currentCard.id)
    const currentGlowRgb = currentCard
        ? rarityGlowRgb(currentCard.rarity)
        : '156,163,175'
    const currentIsRainbow = currentCard ? isRainbow(currentCard.rarity) : false
    const currentOverallCond = currentCard
        ? (() => {
              const vals = [
                  currentCard.attr_centering,
                  currentCard.attr_corners,
                  currentCard.attr_edges,
                  currentCard.attr_surface,
              ].filter((v): v is number => v != null)
              return vals.length
                  ? vals.reduce((s, v) => s + v, 0) / vals.length
                  : null
          })()
        : null
    const currentCondFilter = conditionFilter(currentOverallCond)
    const currentCenterSkew = centeringSkew(
        currentCard?.attr_centering,
        currentCard?.id,
    )

    return (
        <>
            {cutsceneTier && (
                <PackCutscene
                    tier={cutsceneTier}
                    onComplete={() => {
                        cutsceneResolveRef.current?.()
                        cutsceneResolveRef.current = null
                    }}
                />
            )}
            <div
                className="flex flex-col items-center justify-center"
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 64,
                    padding: '24px 16px',
                    background: 'var(--app-bg, #070709)',
                    zIndex: 10001,
                }}
            >
                <RarityBackgroundEffects
                    packBgTier={packBgTier}
                    sparks={sparks}
                />
                {screenFlash && (
                    <div
                        className="screen-flash-overlay"
                        style={{ zIndex: 100 }}
                    />
                )}

                {/* pack */}
                {phase === 'idle' && (
                    <>
                        {coinError && (
                            <div
                                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                                style={{
                                    position: 'absolute',
                                    top: 24,
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    background: 'rgba(239,68,68,0.06)',
                                    border: '1px solid rgba(239,68,68,0.2)',
                                    zIndex: 5,
                                }}
                            >
                                <p className="text-red-400 text-xs">
                                    {coinError.coins === -1 ? (
                                        'bag is full — sell or feed cards before opening more packs'
                                    ) : (
                                        <>
                                            not enough coins — need{' '}
                                            <span className="font-bold">
                                                $ {coinError.cost}
                                            </span>
                                            , you have{' '}
                                            <span className="font-bold text-gray-400">
                                                {coinError.coins}
                                            </span>
                                        </>
                                    )}
                                </p>
                            </div>
                        )}

                        {resumeSession &&
                            createPortal(
                                <div
                                    style={{
                                        position: 'fixed',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        zIndex: 999,
                                        background: 'rgba(10,10,14,0.97)',
                                        borderBottom:
                                            '1px solid rgba(255,255,255,0.1)',
                                        backdropFilter: 'blur(8px)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12,
                                        padding: '10px 20px',
                                    }}
                                >
                                    <p
                                        style={{
                                            color: '#9ca3af',
                                            fontSize: '0.78rem',
                                            flex: 1,
                                            margin: 0,
                                        }}
                                    >
                                        you have unresolved cards from your last
                                        pack
                                    </p>
                                    <button
                                        onClick={handleResume}
                                        style={{
                                            background: 'rgba(255,255,255,0.1)',
                                            border: '1px solid rgba(255,255,255,0.15)',
                                            borderRadius: 8,
                                            padding: '5px 14px',
                                            fontSize: '0.75rem',
                                            color: '#fff',
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        resume
                                    </button>
                                    <button
                                        onClick={() => {
                                            clearSession()
                                            setResumeSession(null)
                                        }}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            fontSize: '0.72rem',
                                            color: '#4b5563',
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        dismiss
                                    </button>
                                </div>,
                                document.body,
                            )}
                        <div
                            ref={packImgRef}
                            className={`${!isAdmin && !free && stock <= 0 ? 'cursor-not-allowed' : ripping ? 'cursor-pointer' : 'cursor-pointer animate-subtle-pulse hover:scale-105'} ${spinning ? 'animate-subtle-shake' : ''} ${dramaticPulse ? (slowShake ? 'animate-dramatic-pulse-slow' : 'animate-dramatic-pulse') : ''} ${epicMythicPulse === 'mythic' ? 'pack-pulse-mythic' : epicMythicPulse === 'epic' ? 'pack-pulse-epic' : ''} ${exiting ? 'animate-pack-exit' : ''}${!spinning && !dramaticPulse && !epicMythicPulse && !exiting && !ripping && pack.idle_aura ? ` ${pack.idle_aura}` : ''}`}
                            style={{
                                ...(epicMythicPulse
                                    ? {} // let .pack-pulse-* keyframes own the filter
                                    : !pack.idle_aura || spinning || exiting
                                      ? {
                                            filter:
                                                !isAdmin && !free && stock <= 0
                                                    ? 'grayscale(1) opacity(0.4)'
                                                    : 'drop-shadow(0 0 20px rgba(228,228,228,0.99))',
                                        }
                                      : {}),
                                position: 'relative',
                                overflow: 'visible',
                            }}
                        >
                            {ripping ? (
                                // SVG clip-paths use bezier curves (smooth wave, not jagged triangles)
                                // objectBoundingBox = 0–1 coords so it scales to any pack size
                                <div
                                    style={{
                                        position: 'relative',
                                        display: 'inline-block',
                                        overflow: 'visible',
                                    }}
                                >
                                    <svg
                                        style={{
                                            position: 'absolute',
                                            width: 0,
                                            height: 0,
                                            overflow: 'hidden',
                                        }}
                                        aria-hidden="true"
                                    >
                                        <defs>
                                            {/* single cubic bezier — one organic arc, not a repeating wave */}
                                            <clipPath
                                                id="pack-rip-top"
                                                clipPathUnits="objectBoundingBox"
                                            >
                                                <path d="M0,0 L1,0 L1,0.083 C0.70,0.062 0.27,0.098 0,0.079 Z" />
                                            </clipPath>
                                            <clipPath
                                                id="pack-rip-bottom"
                                                clipPathUnits="objectBoundingBox"
                                            >
                                                <path d="M0,0.079 C0.27,0.098 0.70,0.062 1,0.083 L1,1 L0,1 Z" />
                                            </clipPath>
                                        </defs>
                                    </svg>
                                    {/* hidden spacer — gives container natural rendered dimensions */}
                                    <img
                                        src={pack.image}
                                        alt=""
                                        style={{
                                            ...idleDims,
                                            objectFit: 'contain',
                                            display: 'block',
                                            visibility: 'hidden',
                                        }}
                                    />
                                    {/* bottom body stays */}
                                    <img
                                        src={pack.image}
                                        alt=""
                                        style={{
                                            ...idleDims,
                                            objectFit: 'contain',
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            clipPath: 'url(#pack-rip-bottom)',
                                            zIndex: 1,
                                        }}
                                        className="pack-rip-bottom"
                                    />
                                    {/* top strip peels off — rendered last so it falls OVER the body */}
                                    <img
                                        src={pack.image}
                                        alt=""
                                        style={{
                                            ...idleDims,
                                            objectFit: 'contain',
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            clipPath: 'url(#pack-rip-top)',
                                            zIndex: 2,
                                        }}
                                        className="pack-rip-top"
                                    />
                                </div>
                            ) : (
                                <img
                                    src={pack.image}
                                    alt={pack.name}
                                    onPointerDown={() => {
                                        if (!free && !isAdmin && stock <= 0)
                                            return
                                        if (isAdmin && adminBatchCount > 1)
                                            prefetchPack(adminBatchCount)
                                        else if (!isAdmin && selectedCount > 1)
                                            prefetchPack(selectedCount)
                                        else prefetchPack()
                                    }}
                                    onClick={() => {
                                        if (!free && !isAdmin && stock <= 0)
                                            return
                                        if (isAdmin && adminBatchCount > 1)
                                            handleClick(adminBatchCount)
                                        else if (!isAdmin && selectedCount > 1)
                                            handleClick(selectedCount)
                                        else handleClick()
                                    }}
                                    onTouchStart={(e) => {
                                        touchStartYRef.current =
                                            e.touches[0].clientY
                                    }}
                                    onTouchEnd={(e) => {
                                        if (touchStartYRef.current === null)
                                            return
                                        const dy =
                                            touchStartYRef.current -
                                            e.changedTouches[0].clientY
                                        touchStartYRef.current = null
                                        if (dy > 40) {
                                            if (!free && !isAdmin && stock <= 0)
                                                return
                                            if (isAdmin && adminBatchCount > 1)
                                                handleClick(adminBatchCount)
                                            else if (
                                                !isAdmin &&
                                                selectedCount > 1
                                            )
                                                handleClick(selectedCount)
                                            else handleClick()
                                        }
                                    }}
                                    className={
                                        !isAdmin && !free && stock <= 0
                                            ? 'cursor-not-allowed'
                                            : 'cursor-pointer'
                                    }
                                    style={{
                                        ...idleDims,
                                        objectFit: 'contain',
                                        display: 'block',
                                    }}
                                />
                            )}
                            {catchShimmer && (
                                <div className="pack-gleam-clip">
                                    <div
                                        className={`pack-gleam-streak ${catchShimmer}`}
                                    />
                                </div>
                            )}
                            {pack.idle_aura &&
                                [
                                    'pack-aura-legendary',
                                    'pack-aura-divine',
                                    'pack-aura-celestial',
                                    'pack-aura-mystery',
                                ].includes(pack.idle_aura) && (
                                    <div className="pack-shimmer-overlay" />
                                )}
                        </div>
                        <div
                            className="flex flex-col items-center gap-2"
                            style={{
                                position: 'absolute',
                                bottom: 24,
                                left: 0,
                                right: 0,
                                zIndex: 5,
                            }}
                        >
                            {!isAdmin && !free && stock <= 0 && (
                                <div
                                    style={{
                                        fontSize: '0.82rem',
                                        fontWeight: 700,
                                        color: '#ef4444',
                                    }}
                                >
                                    Out of Stock
                                </div>
                            )}
                            {!free && (isAdmin || stock > 0) && (
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                    }}
                                >
                                    {discount > 0 && (
                                        <span
                                            style={{
                                                fontSize: '0.55rem',
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
                                    <span
                                        style={{
                                            fontSize: '0.82rem',
                                            fontWeight: 600,
                                            color:
                                                userCoins !== null
                                                    ? userCoins >=
                                                      effectiveCost *
                                                          (isAdmin
                                                              ? 1
                                                              : selectedCount)
                                                        ? '#4ade80'
                                                        : '#f87171'
                                                    : '#6b7280',
                                            letterSpacing: '-0.01em',
                                            transition: 'color 0.15s',
                                        }}
                                    >
                                        {!isAdmin && selectedCount > 1
                                            ? `$ ${(effectiveCost * selectedCount).toFixed(2)}`
                                            : `$ ${effectiveCost.toFixed(2)}`}
                                    </span>
                                    {discount > 0 && (
                                        <span
                                            style={{
                                                fontSize: '0.62rem',
                                                color: '#475569',
                                                textDecoration: 'line-through',
                                                letterSpacing: '-0.01em',
                                            }}
                                        >
                                            ${pack.cost.toFixed(2)}
                                        </span>
                                    )}
                                    {!isAdmin && selectedCount > 1 && (
                                        <span
                                            style={{
                                                fontSize: '0.62rem',
                                                color: '#475569',
                                                letterSpacing: '-0.01em',
                                            }}
                                        >
                                            ({selectedCount} × $
                                            {effectiveCost.toFixed(2)})
                                        </span>
                                    )}
                                    {xpGainPerPack !== null && (
                                        <span
                                            style={{
                                                fontSize: '0.65rem',
                                                color: '#6b7280',
                                                letterSpacing: '0.04em',
                                            }}
                                        >
                                            +
                                            {xpGainPerPack *
                                                (isAdmin
                                                    ? 1
                                                    : selectedCount)}{' '}
                                            XP
                                        </span>
                                    )}
                                </div>
                            )}
                            {free && xpGainPerPack !== null && (
                                <div
                                    style={{
                                        fontSize: '0.65rem',
                                        color: '#6b7280',
                                        letterSpacing: '0.04em',
                                    }}
                                >
                                    +{xpGainPerPack} XP
                                </div>
                            )}
                            {/* Batch + back buttons — horizontal row */}
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    marginTop: 4,
                                }}
                            >
                                {!isAdmin && stock > 1 && (
                                    <button
                                        onClick={() =>
                                            setSelectedCount((n) =>
                                                n >= stock ? 1 : n + 1,
                                            )
                                        }
                                        disabled={
                                            spinning || exiting || ripping
                                        }
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            background:
                                                selectedCount > 1
                                                    ? 'rgba(96,165,250,0.22)'
                                                    : 'rgba(96,165,250,0.08)',
                                            border:
                                                selectedCount > 1
                                                    ? '1px solid rgba(96,165,250,0.7)'
                                                    : '1px solid rgba(96,165,250,0.25)',
                                            borderRadius: 20,
                                            padding: '6px 18px',
                                            color:
                                                selectedCount > 1
                                                    ? '#bfdbfe'
                                                    : '#60a5fa',
                                            fontSize: '0.72rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            letterSpacing: '-0.01em',
                                            transition:
                                                'background 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease',
                                            boxShadow:
                                                selectedCount > 1
                                                    ? '0 0 14px rgba(96,165,250,0.3)'
                                                    : 'none',
                                        }}
                                    >
                                        {selectedCount}x
                                    </button>
                                )}
                                {isAdmin &&
                                    ([10] as const).map((n) => (
                                        <button
                                            key={n}
                                            onClick={() =>
                                                setAdminBatchCount((v) =>
                                                    v === n ? 1 : n,
                                                )
                                            }
                                            disabled={
                                                spinning || exiting || ripping
                                            }
                                            style={{
                                                background:
                                                    adminBatchCount === n
                                                        ? 'rgba(167,139,250,0.28)'
                                                        : 'rgba(167,139,250,0.08)',
                                                border:
                                                    adminBatchCount === n
                                                        ? '1px solid rgba(167,139,250,0.7)'
                                                        : '1px solid rgba(167,139,250,0.25)',
                                                borderRadius: 20,
                                                padding: '6px 14px',
                                                color:
                                                    adminBatchCount === n
                                                        ? '#ddd6fe'
                                                        : '#a78bfa',
                                                fontSize: '0.72rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                letterSpacing: '-0.01em',
                                                transition:
                                                    'transform 0.15s ease, background 0.15s ease, border-color 0.15s ease',
                                                boxShadow:
                                                    adminBatchCount === n
                                                        ? '0 0 14px rgba(167,139,250,0.3)'
                                                        : 'none',
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.transform =
                                                    'scale(1.08) translateY(-2px)'
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.transform =
                                                    ''
                                            }}
                                        >
                                            x{n}
                                        </button>
                                    ))}
                                <button
                                    onClick={onBack}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 5,
                                        background: 'rgba(255,255,255,0.06)',
                                        border: '1px solid rgba(255,255,255,0.12)',
                                        borderRadius: 20,
                                        padding: '5px 16px',
                                        color: 'rgba(255,255,255,0.6)',
                                        fontSize: '0.68rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        letterSpacing: '-0.01em',
                                        transition: 'transform 0.15s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform =
                                            'scale(1.05) translateY(-1px)'
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = ''
                                    }}
                                >
                                    ← Back
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* god pack banner */}
                {phase === 'revealing' && godPack && (
                    <div
                        style={{
                            position: 'absolute',
                            top: 12,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            zIndex: 20,
                            pointerEvents: 'none',
                            background:
                                'conic-gradient(from 0deg, #ff6b6b, #ffd93d, #6bcb77, #4d96ff, #c77dff, #ff6b6b)',
                            padding: 1.5,
                            borderRadius: 20,
                            animation: 'hue-rotate-border 2s linear infinite',
                        }}
                    >
                        <div
                            style={{
                                background: '#0a0a12',
                                borderRadius: 19,
                                padding: '5px 16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                            }}
                        >
                            <span style={{ fontSize: '0.9rem' }}>✨</span>
                            <span
                                style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 800,
                                    letterSpacing: '0.1em',
                                    background:
                                        'linear-gradient(90deg, #ffd93d, #ff6b6b, #c77dff, #4d96ff)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    textTransform: 'uppercase',
                                }}
                            >
                                God Pack
                            </span>
                            <span style={{ fontSize: '0.9rem' }}>✨</span>
                        </div>
                    </div>
                )}

                {/* card stack + flip button — offset downward to sit more centred */}
                {/* ↓ vertical position: adjust translateY below (mobile / desktop) */}
                {phase === 'revealing' && (
                    <>
                        {showRarity &&
                            rarityCard &&
                            createPortal(
                                <div
                                    style={{
                                        position: 'fixed',
                                        top: 108,
                                        left: 0,
                                        right: 0,
                                        display: 'flex',
                                        justifyContent: 'center',
                                        zIndex: 10002,
                                        pointerEvents: 'none',
                                    }}
                                >
                                    <div
                                        className="rarity-badge-reveal"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: '5px 18px',
                                            borderRadius: 99,
                                            background: `rgba(${rarityGlowRgb(rarityCard.rarity)}, 0.12)`,
                                            border: `1px solid rgba(${rarityGlowRgb(rarityCard.rarity)}, 0.45)`,
                                            boxShadow: `0 0 18px rgba(${rarityGlowRgb(rarityCard.rarity)}, 0.3)`,
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontSize: '0.55rem',
                                                fontWeight: 800,
                                                letterSpacing: '0.1em',
                                                textTransform: 'uppercase',
                                                color: `rgba(${rarityGlowRgb(rarityCard.rarity)}, 1)`,
                                            }}
                                        >
                                            {rarityCard.rarity}
                                        </span>
                                    </div>
                                </div>,
                                document.body,
                            )}
                        <div
                            className="animate-cards-slide-up"
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                marginTop: 'min(40px, 6vh)',
                            }}
                        >
                            <div
                                className="relative flex items-center justify-center"
                                style={{
                                    height: isMobile ? 'min(350px, 80vw)' : 504,
                                    width: isMobile ? 'min(280px, 72vw)' : 360,
                                    position: 'relative',
                                }}
                            >
                                {/* rarity glow behind the top card */}
                                <div
                                    className={
                                        specialActive &&
                                        isRainbow(rarityCard?.rarity ?? '')
                                            ? 'bg-rainbow-radial'
                                            : ''
                                    }
                                    style={{
                                        position: 'absolute',
                                        width: '130%',
                                        height: '130%',
                                        borderRadius: '50%',
                                        ...(!isRainbow(
                                            rarityCard?.rarity ?? '',
                                        ) && {
                                            background: `radial-gradient(ellipse at center, rgba(${specialGlow}, 0.6) 0%, transparent 65%)`,
                                        }),
                                        filter: 'blur(32px)',
                                        zIndex: 0,
                                        pointerEvents: 'none',
                                        opacity: specialActive ? 1 : 0,
                                        transition: 'opacity 600ms ease-in-out',
                                    }}
                                />
                                {cards.map((card, index) => {
                                    const isTop = index === revealedCount
                                    const isRevealed = index < revealedCount
                                    if (isRevealed) return null
                                    const fanVisible = fanningOut
                                    const n = cards.length - revealedCount
                                    const i = index - revealedCount
                                    const offset = i - (n - 1) / 2
                                    return (
                                        <div
                                            key={`${card.id}-${index}`}
                                            ref={isTop ? topCardRef : undefined}
                                            className={`absolute${fanVisible ? ' card-fan-fly' : ''}`}
                                            style={
                                                fanVisible
                                                    ? {
                                                          transform: `translateX(${offset * 58}px) translateY(-65px) rotate(${offset * 13}deg)`,
                                                          zIndex: 50,
                                                          pointerEvents: 'none',
                                                          transition:
                                                              'transform 450ms cubic-bezier(0.2, 0, 0.8, 1)',
                                                      }
                                                    : {
                                                          transform: `translateY(${(index - revealedCount) * -6}px) rotate(${(index - revealedCount) * -1}deg)`,
                                                          zIndex: isTop
                                                              ? 50
                                                              : 50 - index,
                                                          pointerEvents: isTop
                                                              ? 'auto'
                                                              : 'none',
                                                      }
                                            }
                                        >
                                            <FlipCard
                                                card={card}
                                                onReveal={
                                                    isTop
                                                        ? handleReveal
                                                        : () => {}
                                                }
                                                onFlipped={
                                                    isTop
                                                        ? () => {
                                                              setShowRarity(
                                                                  true,
                                                              )
                                                              setRarityCard(
                                                                  card,
                                                              )
                                                              if (
                                                                  [
                                                                      'Legendary',
                                                                      'Divine',
                                                                      'Celestial',
                                                                      '???',
                                                                  ].includes(
                                                                      card.rarity,
                                                                  )
                                                              ) {
                                                                  setScreenFlash(
                                                                      true,
                                                                  )
                                                                  setTimeout(
                                                                      () =>
                                                                          setScreenFlash(
                                                                              false,
                                                                          ),
                                                                      450,
                                                                  )
                                                              }
                                                          }
                                                        : () => {}
                                                }
                                                onConfirmed={
                                                    isTop
                                                        ? () =>
                                                              setShowRarity(
                                                                  false,
                                                              )
                                                        : () => {}
                                                }
                                                onSpecialChange={(
                                                    active,
                                                    glow,
                                                ) => {
                                                    setSpecialActive(active)
                                                    setSpecialGlow(glow)
                                                }}
                                            />
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                        {/* flip-all button — anchored above tap-to-continue */}
                        <div
                            style={{
                                position: 'absolute',
                                bottom: 56,
                                left: 0,
                                right: 0,
                                display: 'flex',
                                justifyContent: 'center',
                                zIndex: 5,
                            }}
                        >
                            <button
                                onClick={handleFlipAll}
                                className="px-4 py-1.5 rounded-xl text-xs font-medium border border-gray-700 text-gray-300 hover:border-gray-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all"
                            >
                                flip all
                            </button>
                        </div>
                    </>
                )}

                {/* multi-pack reveal phase */}
                {/* ↓ vertical position: adjust paddingTop below */}
                {phase === 'multi-revealing' &&
                    (() => {
                        const packStart = multiPackIndex * cardsPerPack
                        const packCards = cards.slice(
                            packStart,
                            packStart + cardsPerPack,
                        )
                        const allFlipped = packRevealedCount >= packCards.length
                        const isLastPack = multiPackIndex >= openCount - 1
                        return (
                            <>
                                {/* skip to results — outside the transformed div so position:fixed works on pack 1 */}
                                {!isLastPack &&
                                    createPortal(
                                        <button
                                            onClick={handleSkipAll}
                                            disabled={packTransitioning}
                                            style={{
                                                position: 'fixed',
                                                top: 12,
                                                right: 12,
                                                background: 'none',
                                                border: 'none',
                                                color: 'rgba(255,255,255,0.4)',
                                                fontSize: '0.82rem',
                                                fontWeight: 500,
                                                cursor: 'pointer',
                                                padding: '4px 8px',
                                                letterSpacing: '-0.01em',
                                                zIndex: 10002,
                                            }}
                                        >
                                            skip to results
                                        </button>,
                                        document.body,
                                    )}
                                {/* pack counter — top-left */}
                                {createPortal(
                                    <div
                                        style={{
                                            position: 'fixed',
                                            top: 14,
                                            left: 14,
                                            fontSize: '0.68rem',
                                            fontWeight: 700,
                                            letterSpacing: '0.12em',
                                            color: '#9ca3af',
                                            textTransform: 'uppercase',
                                            zIndex: 10002,
                                            pointerEvents: 'none',
                                        }}
                                    >
                                        Pack {multiPackIndex + 1} / {openCount}
                                    </div>,
                                    document.body,
                                )}
                                {showRarity &&
                                    rarityCard &&
                                    !allFlipped &&
                                    createPortal(
                                        <div
                                            style={{
                                                position: 'fixed',
                                                top: 108,
                                                left: 0,
                                                right: 0,
                                                display: 'flex',
                                                justifyContent: 'center',
                                                zIndex: 10002,
                                                pointerEvents: 'none',
                                            }}
                                        >
                                            <div
                                                className="rarity-badge-reveal"
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    padding: '5px 18px',
                                                    borderRadius: 99,
                                                    background: `rgba(${rarityGlowRgb(rarityCard.rarity)}, 0.12)`,
                                                    border: `1px solid rgba(${rarityGlowRgb(rarityCard.rarity)}, 0.45)`,
                                                    boxShadow: `0 0 18px rgba(${rarityGlowRgb(rarityCard.rarity)}, 0.3)`,
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        fontSize: '0.55rem',
                                                        fontWeight: 800,
                                                        letterSpacing: '0.1em',
                                                        textTransform:
                                                            'uppercase',
                                                        color: `rgba(${rarityGlowRgb(rarityCard.rarity)}, 1)`,
                                                    }}
                                                >
                                                    {rarityCard.rarity}
                                                </span>
                                            </div>
                                        </div>,
                                        document.body,
                                    )}
                                <div
                                    className={
                                        multiPackIndex === 0
                                            ? 'animate-cards-slide-up'
                                            : undefined
                                    }
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        marginTop: 'min(40px, 6vh)',
                                        position: 'relative',
                                        width: '100%',
                                    }}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            opacity: packTransitioning ? 0 : 1,
                                            transition:
                                                'opacity 350ms ease-in-out',
                                        }}
                                    >
                                        {allFlipped ? (
                                            isMobile ? (
                                                /* Mobile: single card carousel with arrows */
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        gap: 10,
                                                        animation:
                                                            'fadeIn 250ms ease-out',
                                                    }}
                                                >
                                                    {/* rarity pill above card */}
                                                    <div
                                                        style={{
                                                            display:
                                                                'inline-flex',
                                                            alignItems:
                                                                'center',
                                                            justifyContent:
                                                                'center',
                                                            padding: '4px 16px',
                                                            borderRadius: 99,
                                                            background: `rgba(${rarityGlowRgb(packCards[batchRevealIndex]?.rarity ?? '')}, 0.12)`,
                                                            border: `1px solid rgba(${rarityGlowRgb(packCards[batchRevealIndex]?.rarity ?? '')}, 0.45)`,
                                                            boxShadow: `0 0 14px rgba(${rarityGlowRgb(packCards[batchRevealIndex]?.rarity ?? '')}, 0.3)`,
                                                        }}
                                                    >
                                                        <span
                                                            style={{
                                                                fontSize:
                                                                    '0.52rem',
                                                                fontWeight: 800,
                                                                letterSpacing:
                                                                    '0.1em',
                                                                textTransform:
                                                                    'uppercase' as const,
                                                                color: `rgba(${rarityGlowRgb(packCards[batchRevealIndex]?.rarity ?? '')}, 1)`,
                                                            }}
                                                        >
                                                            {
                                                                packCards[
                                                                    batchRevealIndex
                                                                ]?.rarity
                                                            }
                                                        </span>
                                                    </div>
                                                    {(() => {
                                                        const bc =
                                                            packCards[
                                                                batchRevealIndex
                                                            ]
                                                        if (!bc) return null
                                                        const src =
                                                            bc.image_url_hi ||
                                                            bc.image_url
                                                        return (
                                                            <div
                                                                key={`${bc.id}-mobile-face`}
                                                                className="relative rounded-xl"
                                                                onTouchStart={(
                                                                    e,
                                                                ) => {
                                                                    swipeStartXRef.current =
                                                                        e.touches[0].clientX
                                                                }}
                                                                onTouchEnd={(
                                                                    e,
                                                                ) => {
                                                                    if (
                                                                        swipeStartXRef.current ===
                                                                        null
                                                                    )
                                                                        return
                                                                    const dx =
                                                                        e.changedTouches[0]
                                                                            .clientX -
                                                                        swipeStartXRef.current
                                                                    swipeStartXRef.current =
                                                                        null
                                                                    if (
                                                                        Math.abs(
                                                                            dx,
                                                                        ) < 40
                                                                    )
                                                                        return
                                                                    if (dx < 0)
                                                                        setBatchRevealIndex(
                                                                            (
                                                                                p,
                                                                            ) =>
                                                                                (p +
                                                                                    1) %
                                                                                packCards.length,
                                                                        )
                                                                    else
                                                                        setBatchRevealIndex(
                                                                            (
                                                                                p,
                                                                            ) =>
                                                                                (p -
                                                                                    1 +
                                                                                    packCards.length) %
                                                                                packCards.length,
                                                                        )
                                                                }}
                                                                style={{
                                                                    height: 'min(300px, 68vw)',
                                                                    width: 'auto',
                                                                    flexShrink: 0,
                                                                    touchAction:
                                                                        'pan-y',
                                                                }}
                                                            >
                                                                <img
                                                                    src={src}
                                                                    alt={bc.name}
                                                                    className="rounded-xl"
                                                                    style={{
                                                                        height: 'min(300px, 68vw)',
                                                                        width: 'auto',
                                                                        boxShadow: `0 0 20px 6px rgba(${rarityGlowRgb(bc.rarity)}, 0.65)`,
                                                                        pointerEvents:
                                                                            'none',
                                                                    }}
                                                                />
                                                            </div>
                                                        )
                                                    })()}
                                                    {/* card name + dex */}
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            alignItems:
                                                                'center',
                                                            gap: 6,
                                                        }}
                                                    >
                                                        <span
                                                            style={{
                                                                fontSize:
                                                                    '0.8rem',
                                                                fontWeight: 700,
                                                                color: '#e2e8f0',
                                                            }}
                                                        >
                                                            {
                                                                packCards[
                                                                    batchRevealIndex
                                                                ]?.name
                                                            }
                                                        </span>
                                                        <span
                                                            style={{
                                                                fontSize:
                                                                    '0.65rem',
                                                                color: '#6b7280',
                                                            }}
                                                        >
                                                            #
                                                            {String(
                                                                packCards[
                                                                    batchRevealIndex
                                                                ]
                                                                    ?.national_pokedex_number ??
                                                                    0,
                                                            ).padStart(3, '0')}
                                                        </span>
                                                    </div>
                                                    {/* arrows + counter */}
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            alignItems:
                                                                'center',
                                                            gap: 14,
                                                        }}
                                                    >
                                                        <button
                                                            onClick={() =>
                                                                setBatchRevealIndex(
                                                                    (p) =>
                                                                        (p -
                                                                            1 +
                                                                            packCards.length) %
                                                                        packCards.length,
                                                                )
                                                            }
                                                            style={{
                                                                border: '1px solid rgba(255,255,255,0.15)',
                                                                background:
                                                                    'transparent',
                                                                color: 'rgba(255,255,255,0.6)',
                                                                borderRadius: 8,
                                                                padding:
                                                                    '4px 12px',
                                                                fontSize:
                                                                    '0.9rem',
                                                                cursor: 'pointer',
                                                            }}
                                                        >
                                                            ←
                                                        </button>
                                                        <span
                                                            style={{
                                                                fontSize:
                                                                    '0.65rem',
                                                                color: '#6b7280',
                                                                minWidth: 36,
                                                                textAlign:
                                                                    'center',
                                                            }}
                                                        >
                                                            {batchRevealIndex +
                                                                1}{' '}
                                                            / {packCards.length}
                                                        </span>
                                                        <button
                                                            onClick={() =>
                                                                setBatchRevealIndex(
                                                                    (p) =>
                                                                        (p +
                                                                            1) %
                                                                        packCards.length,
                                                                )
                                                            }
                                                            style={{
                                                                border: '1px solid rgba(255,255,255,0.15)',
                                                                background:
                                                                    'transparent',
                                                                color: 'rgba(255,255,255,0.6)',
                                                                borderRadius: 8,
                                                                padding:
                                                                    '4px 12px',
                                                                fontSize:
                                                                    '0.9rem',
                                                                cursor: 'pointer',
                                                            }}
                                                        >
                                                            →
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                /* Desktop: 1 row ≤5 cards, 2 rows >5 cards */
                                                (() => {
                                                    const twoRows =
                                                        packCards.length > 5
                                                    const cols = twoRows
                                                        ? Math.ceil(
                                                              packCards.length /
                                                                  2,
                                                          )
                                                        : packCards.length
                                                    const cardH = twoRows
                                                        ? 155
                                                        : 220
                                                    return (
                                                        <div
                                                            style={{
                                                                display: 'grid',
                                                                gridTemplateColumns: `repeat(${cols}, auto)`,
                                                                justifyContent:
                                                                    'center',
                                                                gap: 10,
                                                                maxWidth:
                                                                    '98vw',
                                                                padding:
                                                                    '4px 8px',
                                                                animation:
                                                                    'fadeIn 250ms ease-out',
                                                            }}
                                                        >
                                                            {packCards.map(
                                                                (card, i) => {
                                                                    const src =
                                                                        card.image_url_hi ||
                                                                        card.image_url
                                                                    return (
                                                                        <div
                                                                            key={`${card.id}-${packStart + i}-face`}
                                                                            className="relative rounded-lg"
                                                                            style={{
                                                                                height: `${cardH}px`,
                                                                                width: 'auto',
                                                                            }}
                                                                        >
                                                                            <img
                                                                                src={
                                                                                    src
                                                                                }
                                                                                alt={
                                                                                    card.name
                                                                                }
                                                                                className="rounded-lg"
                                                                                style={{
                                                                                    height: `${cardH}px`,
                                                                                    width: 'auto',
                                                                                    boxShadow: `0 0 12px 3px rgba(${rarityGlowRgb(card.rarity)}, 0.55)`,
                                                                                }}
                                                                            />
                                                                        </div>
                                                                    )
                                                                },
                                                            )}
                                                        </div>
                                                    )
                                                })()
                                            )
                                        ) : (
                                            <div
                                                className="relative flex items-center justify-center"
                                                style={{
                                                    height: 'min(350px, 80vw)',
                                                    width: 'min(280px, 72vw)',
                                                }}
                                            >
                                                {/* rarity glow */}
                                                <div
                                                    className={
                                                        specialActive &&
                                                        isRainbow(
                                                            rarityCard?.rarity ??
                                                                '',
                                                        )
                                                            ? 'bg-rainbow-radial'
                                                            : ''
                                                    }
                                                    style={{
                                                        position: 'absolute',
                                                        width: '130%',
                                                        height: '130%',
                                                        borderRadius: '50%',
                                                        ...(!isRainbow(
                                                            rarityCard?.rarity ??
                                                                '',
                                                        ) && {
                                                            background: `radial-gradient(ellipse at center, rgba(${specialGlow}, 0.6) 0%, transparent 65%)`,
                                                        }),
                                                        filter: 'blur(32px)',
                                                        zIndex: 0,
                                                        pointerEvents: 'none',
                                                        opacity: specialActive
                                                            ? 1
                                                            : 0,
                                                        transition:
                                                            'opacity 600ms ease-in-out',
                                                    }}
                                                />
                                                {packCards.map((card, i) => {
                                                    const isTop =
                                                        i === packRevealedCount
                                                    const isRevealed =
                                                        i < packRevealedCount
                                                    if (isRevealed) return null
                                                    const fanVisible =
                                                        fanningOut
                                                    const n =
                                                        packCards.length -
                                                        packRevealedCount
                                                    const offset =
                                                        i -
                                                        packRevealedCount -
                                                        (n - 1) / 2
                                                    return (
                                                        <div
                                                            key={`${card.id}-${packStart + i}`}
                                                            ref={
                                                                isTop
                                                                    ? topCardRef
                                                                    : undefined
                                                            }
                                                            className={`absolute${fanVisible ? ' card-fan-fly' : ''}`}
                                                            style={
                                                                fanVisible
                                                                    ? {
                                                                          transform: `translateX(${offset * 58}px) translateY(-65px) rotate(${offset * 13}deg)`,
                                                                          zIndex: 50,
                                                                          pointerEvents:
                                                                              'none',
                                                                          transition:
                                                                              'transform 450ms cubic-bezier(0.2, 0, 0.8, 1)',
                                                                      }
                                                                    : {
                                                                          transform: `translateY(${(i - packRevealedCount) * -6}px) rotate(${(i - packRevealedCount) * -1}deg)`,
                                                                          zIndex: isTop
                                                                              ? 50
                                                                              : 50 -
                                                                                i,
                                                                          pointerEvents:
                                                                              isTop
                                                                                  ? 'auto'
                                                                                  : 'none',
                                                                      }
                                                            }
                                                        >
                                                            <FlipCard
                                                                card={card}
                                                                onReveal={
                                                                    isTop
                                                                        ? handlePackReveal
                                                                        : () => {}
                                                                }
                                                                onFlipped={
                                                                    isTop
                                                                        ? () => {
                                                                              setShowRarity(
                                                                                  true,
                                                                              )
                                                                              setRarityCard(
                                                                                  card,
                                                                              )
                                                                              if (
                                                                                  [
                                                                                      'Legendary',
                                                                                      'Divine',
                                                                                      'Celestial',
                                                                                      '???',
                                                                                  ].includes(
                                                                                      card.rarity,
                                                                                  )
                                                                              ) {
                                                                                  setScreenFlash(
                                                                                      true,
                                                                                  )
                                                                                  setTimeout(
                                                                                      () =>
                                                                                          setScreenFlash(
                                                                                              false,
                                                                                          ),
                                                                                      450,
                                                                                  )
                                                                              }
                                                                          }
                                                                        : () => {}
                                                                }
                                                                onConfirmed={
                                                                    isTop
                                                                        ? () =>
                                                                              setShowRarity(
                                                                                  false,
                                                                              )
                                                                        : () => {}
                                                                }
                                                                onSpecialChange={(
                                                                    active,
                                                                    glow,
                                                                ) => {
                                                                    setSpecialActive(
                                                                        active,
                                                                    )
                                                                    setSpecialGlow(
                                                                        glow,
                                                                    )
                                                                }}
                                                            />
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}

                                        {/* buttons row */}
                                        <div
                                            className="flex flex-col items-center gap-2"
                                            style={{
                                                marginTop: 'min(20px, 5vw)',
                                            }}
                                        >
                                            {allFlipped ? (
                                                <button
                                                    onClick={handleNextPack}
                                                    disabled={packTransitioning}
                                                    className="px-6 py-2 rounded-xl text-sm font-semibold border border-gray-500 text-white hover:border-white hover:bg-white/10 active:scale-95 transition-all"
                                                    style={{
                                                        letterSpacing: '0.04em',
                                                    }}
                                                >
                                                    {isLastPack
                                                        ? 'see results →'
                                                        : 'next pack →'}
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={handleFlipPackAll}
                                                    className="px-4 py-1.5 rounded-xl text-xs font-medium border border-gray-700 text-gray-300 hover:border-gray-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all"
                                                >
                                                    flip all
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )
                    })()}

                {/* done phase */}
                {phase === 'done' &&
                    remainingCards.length > 0 &&
                    currentCard &&
                    (() => {
                        const cardNode = (
                            <div
                                className={`relative ${animatingIndex === doneIndex ? 'animate-fly-down' : ''}`}
                                onAnimationEnd={handleAnimationEnd}
                            >
                                <img
                                    src={
                                        currentCard.image_url_hi ||
                                        currentCard.image_url
                                    }
                                    alt={currentCard.name}
                                    className={`rounded-xl${currentIsRainbow ? ' glow-rainbow' : ''}`}
                                    style={{
                                        height: isMobile
                                            ? 'min(360px, 76vw)'
                                            : '420px',
                                        width: 'auto',
                                        opacity: shattering ? 0 : 1,
                                        boxShadow: currentIsRainbow
                                            ? undefined
                                            : `0 0 24px 6px rgba(${currentGlowRgb}, 0.6)`,
                                        filter: currentCondFilter,
                                        transform: currentCenterSkew,
                                    }}
                                />
                                {!shattering &&
                                    (currentCard.rarity === 'Legendary' ||
                                        currentCard.rarity === 'Divine' ||
                                        currentCard.rarity === 'Celestial') && (
                                        <div className="card-gleam-clip">
                                            <div
                                                className={`card-gleam-streak ${currentCard.rarity.toLowerCase()}`}
                                            />
                                        </div>
                                    )}
                                {/* Rarity + NEW tags — desktop only; mobile shows rarity above card and NEW inside card */}
                                {!isMobile && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            top: 8,
                                            right: 8,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 4,
                                        }}
                                    >
                                        <span
                                            className={rarityTextClass(
                                                currentCard.rarity,
                                            )}
                                            style={{
                                                fontSize: '0.55rem',
                                                fontWeight: 700,
                                                padding: '2px 6px',
                                                lineHeight: 1.4,
                                                borderRadius: 9999,
                                                background:
                                                    'rgba(10,10,15,0.82)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                letterSpacing: '0.03em',
                                                textTransform: 'uppercase',
                                                ...rarityTextStyle(
                                                    currentCard.rarity,
                                                ),
                                            }}
                                        >
                                            {currentCard.rarity}
                                        </span>
                                        {currentCardIsNew && (
                                            <span
                                                className="bg-green-950 text-green-400 border border-green-700/50 rounded-full"
                                                style={{
                                                    fontSize: '0.6rem',
                                                    padding: '2px 7px',
                                                    lineHeight: 1.4,
                                                }}
                                            >
                                                NEW
                                            </span>
                                        )}
                                    </div>
                                )}
                                {/* Mobile: NEW badge inside card image, top-right */}
                                {isMobile && currentCardIsNew && (
                                    <span
                                        className="bg-green-950 text-green-400 border border-green-700/50 rounded-full"
                                        style={{
                                            position: 'absolute',
                                            top: 8,
                                            right: 8,
                                            fontSize: '0.6rem',
                                            fontWeight: 700,
                                            padding: '2px 7px',
                                            lineHeight: 1.4,
                                            letterSpacing: '0.04em',
                                            zIndex: 6,
                                        }}
                                    >
                                        NEW
                                    </span>
                                )}
                                {shattering && (
                                    <ShatterEffect
                                        rarity={currentCard.rarity}
                                        imageUrl={
                                            currentCard.image_url_hi ||
                                            currentCard.image_url
                                        }
                                    />
                                )}
                                <WearOverlay
                                    ucId={currentCard.id}
                                    overallCond={currentOverallCond}
                                    attrSurface={
                                        currentCard.attr_surface ?? null
                                    }
                                />
                                {currentCard.set_id?.endsWith('-1ed') && (
                                    <FirstEditionBadge
                                        variant="detail"
                                        side="right"
                                    />
                                )}
                            </div>
                        )

                        const statsPanel = (
                            <CardStatsPanel
                                currentCard={currentCard}
                                isMobile={isMobile}
                                condPanelTab={condPanelTab}
                                setCondPanelTab={setCondPanelTab}
                                bbTooltipPos={bbTooltipPos}
                                setBbTooltipPos={setBbTooltipPos}
                                bagCount={bagCount}
                                bagCapacity={bagCapacity}
                                currentCardIsNew={currentCardIsNew}
                                animatingIndex={animatingIndex}
                                shattering={shattering}
                                isFetchingCopies={isFetchingCopies}
                                handleAddToBag={handleAddToBag}
                                handleAddToBagDuplicate={
                                    handleAddToBagDuplicate
                                }
                                handleFeedCard={handleFeedCard}
                                handleBuyback={handleBuyback}
                                onAction={() => setShowDetails(false)}
                            />
                        )

                        const detailsPanel = (
                            <CardStatsPanel
                                currentCard={currentCard}
                                isMobile={isMobile}
                                condPanelTab={detailsCondPanelTab}
                                setCondPanelTab={setDetailsCondPanelTab}
                                bbTooltipPos={bbTooltipPos}
                                setBbTooltipPos={setBbTooltipPos}
                                bagCount={bagCount}
                                bagCapacity={bagCapacity}
                                currentCardIsNew={currentCardIsNew}
                                animatingIndex={animatingIndex}
                                shattering={shattering}
                                isFetchingCopies={isFetchingCopies}
                                handleAddToBag={handleAddToBag}
                                handleAddToBagDuplicate={
                                    handleAddToBagDuplicate
                                }
                                handleFeedCard={handleFeedCard}
                                handleBuyback={handleBuyback}
                                onAction={() => setShowDetails(false)}
                                hideActions
                                showMoves
                                mode="overlay"
                            />
                        )

                        const mobileAttrs = [
                            currentCard.attr_centering,
                            currentCard.attr_corners,
                            currentCard.attr_edges,
                            currentCard.attr_surface,
                        ].filter((v): v is number => v != null)
                        const mobileOverall = mobileAttrs.length
                            ? Math.round(
                                  (mobileAttrs.reduce((s, v) => s + v, 0) /
                                      mobileAttrs.length) *
                                      10,
                              ) / 10
                            : null
                        const mobileBuyback = calculateBuyback(
                            currentCard.rarity,
                            Number(currentCard.worth) || 0,
                            (
                                currentCard.set_id as string | undefined
                            )?.endsWith('-1ed') ?? false,
                        )

                        return (
                            <>
                                <div
                                    className="flex flex-col items-center gap-4"
                                    style={{
                                        width: '100%',
                                        boxSizing: 'border-box',
                                        padding: '0 16px',
                                    }}
                                >
                                    {isMobile ? (
                                        /* ── Mobile: rarity → name+details → card → counter+arrows ── */
                                        <div
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: 8,
                                                width: '100%',
                                            }}
                                        >
                                            {/* rarity (above card, centered) — NEW badge sits on the card image */}
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: 6,
                                                }}
                                            >
                                                <span
                                                    className={rarityTextClass(
                                                        currentCard.rarity,
                                                    )}
                                                    style={{
                                                        fontSize: '0.6rem',
                                                        fontWeight: 700,
                                                        padding: '3px 10px',
                                                        lineHeight: 1.4,
                                                        borderRadius: 9999,
                                                        background:
                                                            'rgba(10,10,15,0.82)',
                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                        letterSpacing: '0.06em',
                                                        textTransform:
                                                            'uppercase',
                                                        ...rarityTextStyle(
                                                            currentCard.rarity,
                                                        ),
                                                    }}
                                                >
                                                    {currentCard.rarity}
                                                </span>
                                            </div>
                                            {/* name + dex + Details (above card, centered) */}
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: 8,
                                                    maxWidth: '100%',
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        fontSize: '0.85rem',
                                                        fontWeight: 700,
                                                        color: '#fff',
                                                        overflow: 'hidden',
                                                        textOverflow:
                                                            'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                        maxWidth: '50vw',
                                                    }}
                                                >
                                                    {currentCard.name}
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize: '0.7rem',
                                                        color: 'rgba(255,255,255,0.55)',
                                                        fontFamily: 'monospace',
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    #
                                                    {String(
                                                        currentCard.national_pokedex_number ??
                                                            0,
                                                    ).padStart(3, '0')}
                                                </span>
                                                <button
                                                    onClick={() =>
                                                        setShowDetails(true)
                                                    }
                                                    className="btn-details-glow"
                                                    style={{ flexShrink: 0 }}
                                                >
                                                    Details
                                                </button>
                                            </div>
                                            {/* card image (clean) */}
                                            {cardNode}
                                            {/* arrows + counter (below card, centered) */}
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: 16,
                                                }}
                                            >
                                                <button
                                                    onClick={() =>
                                                        setDoneIndex(
                                                            (prev) =>
                                                                (prev -
                                                                    1 +
                                                                    remainingCards.length) %
                                                                remainingCards.length,
                                                        )
                                                    }
                                                    style={{
                                                        border: 'none',
                                                        color: 'var(--app-text-secondary)',
                                                        padding: '6px 14px',
                                                        borderRadius: 8,
                                                        fontSize: '1rem',
                                                        background:
                                                            'transparent',
                                                        cursor: 'pointer',
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    ←
                                                </button>
                                                <span
                                                    style={{
                                                        fontSize: '0.75rem',
                                                        color: 'var(--app-text-muted)',
                                                        fontFamily: 'monospace',
                                                        minWidth: 50,
                                                        textAlign: 'center',
                                                    }}
                                                >
                                                    {doneIndex + 1} /{' '}
                                                    {remainingCards.length}
                                                </span>
                                                <button
                                                    onClick={() =>
                                                        setDoneIndex(
                                                            (prev) =>
                                                                (prev + 1) %
                                                                remainingCards.length,
                                                        )
                                                    }
                                                    style={{
                                                        border: 'none',
                                                        color: 'var(--app-text-secondary)',
                                                        padding: '6px 14px',
                                                        borderRadius: 8,
                                                        fontSize: '1rem',
                                                        background:
                                                            'transparent',
                                                        cursor: 'pointer',
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    →
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        /* ── Desktop/tablet: card + panel side by side, centered ── */
                                        <div
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'row',
                                                alignItems: 'flex-start',
                                                justifyContent: 'center',
                                                gap: 24,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    gap: 8,
                                                    flexShrink: 0,
                                                }}
                                            >
                                                {cardNode}
                                            </div>
                                            <div
                                                style={{
                                                    width: 300,
                                                    height: 420,
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: 10,
                                                    overflowY: 'auto',
                                                }}
                                            >
                                                {statsPanel}
                                            </div>
                                        </div>
                                    )}

                                    <CardActionButtons
                                        doneIndex={doneIndex}
                                        remainingCards={remainingCards}
                                        sellAllConfirm={sellAllConfirm}
                                        handleSellAll={handleSellAll}
                                        doSellAll={doSellAll}
                                        setSellAllConfirm={setSellAllConfirm}
                                        handleAutocomplete={handleAutocomplete}
                                        handleStopAutocomplete={
                                            handleStopAutocomplete
                                        }
                                        autoRunning={autoRunning}
                                        setShowSettings={setShowSettings}
                                        setDoneIndex={setDoneIndex}
                                        autoReverse={prefs.autoReverse}
                                        isMobile={isMobile}
                                        onShowDetails={() =>
                                            setShowDetails(true)
                                        }
                                        mobileInfoPanel={
                                            isMobile
                                                ? {
                                                      worth:
                                                          Number(
                                                              currentCard.worth,
                                                          ) || 0,
                                                      overall: mobileOverall,
                                                      card_level:
                                                          currentCard.card_level,
                                                      buybackAmount:
                                                          mobileBuyback.amount,
                                                      bagFull:
                                                          bagCount !== null &&
                                                          bagCount >=
                                                              bagCapacity,
                                                      actDisabled:
                                                          animatingIndex !==
                                                              null ||
                                                          shattering,
                                                      isFetchingCopies,
                                                      currentCardIsNew,
                                                      handleAddToBag,
                                                      handleAddToBagDuplicate,
                                                      handleFeedCard,
                                                      handleBuyback,
                                                  }
                                                : undefined
                                        }
                                    />
                                </div>

                                {/* Mobile details overlay */}
                                {isMobile && showDetails && (
                                    <div
                                        style={{
                                            position: 'fixed',
                                            inset: 0,
                                            zIndex: 99999,
                                            background: '#0a0a12',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                        onClick={(e) => {
                                            if (e.target === e.currentTarget)
                                                setShowDetails(false)
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: '100%',
                                                maxWidth: 440,
                                                maxHeight: '100dvh',
                                                overflowY: 'auto',
                                                display: 'flex',
                                                flexDirection: 'column',
                                            }}
                                        >
                                            {/* sticky close bar */}
                                            <div
                                                style={{
                                                    position: 'sticky',
                                                    top: 0,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent:
                                                        'space-between',
                                                    padding: '14px 20px 10px',
                                                    background:
                                                        'rgba(10,10,18,0.92)',
                                                    backdropFilter:
                                                        'blur(12px)',
                                                    borderBottom:
                                                        '1px solid rgba(255,255,255,0.04)',
                                                    zIndex: 1,
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        fontSize: '0.6rem',
                                                        color: '#374151',
                                                        textTransform:
                                                            'uppercase',
                                                        letterSpacing: '0.1em',
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    Card Details
                                                </span>
                                                <button
                                                    onClick={() =>
                                                        setShowDetails(false)
                                                    }
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent:
                                                            'center',
                                                        width: 28,
                                                        height: 28,
                                                        borderRadius: '50%',
                                                        background:
                                                            'rgba(255,255,255,0.06)',
                                                        border: '1px solid rgba(255,255,255,0.08)',
                                                        color: '#6b7280',
                                                        fontSize: '0.75rem',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                            <div
                                                style={{
                                                    padding: '20px 20px 40px',
                                                }}
                                            >
                                                {detailsPanel}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )
                    })()}

                {showSettings && (
                    <AutoCompleteSettings
                        prefs={prefs}
                        onSave={setPrefs}
                        onClose={() => setShowSettings(false)}
                    />
                )}

                {/* feed picker — shown when user has 2+ copies */}
                {feedPickerCopies && (
                    <FeedPickerModal
                        feedPickerCopies={feedPickerCopies}
                        feedInto={feedInto}
                        onClose={() => setFeedPickerCopies(null)}
                    />
                )}
            </div>

            {/* ── level-up overlay ────────────────────────────────────── */}
            {levelUpInfo &&
                !levelUpClaimed &&
                createPortal(
                    <LevelUpOverlay
                        info={levelUpInfo}
                        claiming={levelUpClaiming}
                        onClaim={async () => {
                            setLevelUpClaiming(true)
                            await fetch('/api/claim-level-rewards', {
                                method: 'POST',
                            })
                            window.dispatchEvent(new Event('stash-claimed'))
                            setLevelUpClaiming(false)
                            setLevelUpClaimed(true)
                            setLevelUpInfo(null)
                        }}
                    />,
                    document.body,
                )}
        </>
    )
}

// ─── LevelUpOverlay ──────────────────────────────────────────────────────────

type LevelUpOverlayProps = {
    info: {
        oldLevel: number
        newLevel: number
        oldXP: number
        newXP: number
        xpRequired: number
        xpGain: number
    }
    claiming: boolean
    onClaim: () => void
}

function LevelUpOverlay({ info, claiming, onClaim }: LevelUpOverlayProps) {
    const { oldLevel, newLevel, newXP, xpRequired } = info
    const barPct = Math.min(100, Math.round((newXP / xpRequired) * 100))
    const levelsGained = newLevel - oldLevel

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.78)',
                backdropFilter: 'blur(6px)',
                animation: 'fadeIn 300ms ease-out',
            }}
        >
            <div
                style={{
                    background:
                        'linear-gradient(160deg, rgba(20,20,32,0.98), rgba(10,10,20,0.98))',
                    border: '1px solid rgba(251,191,36,0.35)',
                    borderRadius: 24,
                    padding: '36px 40px',
                    maxWidth: 340,
                    width: '90vw',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 16,
                    boxShadow: '0 0 60px rgba(251,191,36,0.12)',
                    animation: 'cardPop 350ms cubic-bezier(0.34,1.56,0.64,1)',
                }}
            >
                {/* level badge */}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 4,
                    }}
                >
                    <p
                        style={{
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            letterSpacing: '0.14em',
                            color: '#fbbf24',
                            textTransform: 'uppercase',
                            margin: 0,
                        }}
                    >
                        Level Up{levelsGained > 1 ? ` ×${levelsGained}` : ''}!
                    </p>
                    <p
                        style={{
                            fontSize: '2.4rem',
                            fontWeight: 900,
                            color: '#fff',
                            margin: 0,
                            lineHeight: 1,
                        }}
                    >
                        {oldLevel}
                        <span style={{ color: '#fbbf24', margin: '0 8px' }}>
                            →
                        </span>
                        {newLevel}
                    </p>
                </div>

                {/* XP bar */}
                <div
                    style={{
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '0.62rem',
                            color: '#6b7280',
                        }}
                    >
                        <span>XP</span>
                        <span>
                            {newXP} / {xpRequired}
                        </span>
                    </div>
                    <div
                        style={{
                            width: '100%',
                            height: 6,
                            borderRadius: 999,
                            background: 'rgba(255,255,255,0.06)',
                            overflow: 'hidden',
                        }}
                    >
                        <div
                            style={{
                                height: '100%',
                                width: `${barPct}%`,
                                borderRadius: 999,
                                background:
                                    'linear-gradient(90deg, #fbbf24, #f59e0b)',
                                transition:
                                    'width 800ms cubic-bezier(0.4,0,0.2,1)',
                                boxShadow: '0 0 8px rgba(251,191,36,0.6)',
                            }}
                        />
                    </div>
                </div>

                {/* rewards note */}
                <p
                    style={{
                        fontSize: '0.68rem',
                        color: '#9ca3af',
                        margin: 0,
                        textAlign: 'center',
                    }}
                >
                    Rewards are waiting in your stash
                </p>

                {/* claim button */}
                <button
                    onClick={onClaim}
                    disabled={claiming}
                    style={{
                        marginTop: 4,
                        padding: '10px 36px',
                        borderRadius: 12,
                        background: claiming
                            ? 'rgba(251,191,36,0.15)'
                            : 'rgba(251,191,36,0.18)',
                        border: '1px solid rgba(251,191,36,0.5)',
                        color: '#fbbf24',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        cursor: claiming ? 'default' : 'pointer',
                        transition: 'all 150ms',
                    }}
                    onMouseEnter={(e) => {
                        if (!claiming) {
                            e.currentTarget.style.background =
                                'rgba(251,191,36,0.28)'
                            e.currentTarget.style.boxShadow =
                                '0 0 20px rgba(251,191,36,0.2)'
                        }
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background =
                            'rgba(251,191,36,0.18)'
                        e.currentTarget.style.boxShadow = 'none'
                    }}
                >
                    {claiming ? 'claiming…' : 'claim rewards'}
                </button>
            </div>
        </div>
    )
}
