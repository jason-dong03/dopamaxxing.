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
    rarityToOdds,
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
import { getPackAura, RARITY_TIERS } from './pack/utils'
import type { Card, UserCopy } from './pack/utils'
import { RarityBackgroundEffects } from './pack/RarityBackgroundEffects'
import { CardStatsPanel } from './pack/CardStatsPanel'
import { CardActionButtons } from './pack/CardActionButtons'
import { FeedPickerModal } from './pack/FeedPickerModal'

type Props = {
    pack: Pack
    onBack: () => void
    onComplete?: () => void
    autoBack?: boolean
    free?: boolean
    count?: number
    stock?: number
    discount?: number
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
    onPackOpened,
}: Props) {
    const router = useRouter()
    const isMobile = useIsMobile()
    const supabase = createClient()
    const effectiveCost = parseFloat((pack.cost * (1 - discount)).toFixed(2))
    const [userCoins, setUserCoins] = useState<number | null>(null)
    const [shaking, setShaking] = useState(false)
    const [tearing, setTearing] = useState(false)
    const [opening, setOpening] = useState(false)
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
    const [condPanelTab, setCondPanelTab] = useState<'condition' | 'stats'>(
        'condition',
    )
    const [openCount, setOpenCount] = useState(count)
    const [batchMode, setBatchMode] = useState(false)

    const [addedCardIds, setAddedCardIds] = useState<Set<string>>(new Set())
    const [showRarity, setShowRarity] = useState(false)
    const [rarityCard, setRarityCard] = useState<Card | null>(null)

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
    const isLevelGated = !free && !!pack.level_required && userLevel < pack.level_required
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
    const [bagCount, setBagCount] = useState<number | null>(null)
    const [bagCapacity, setBagCapacity] = useState<number>(50)

    const autocompleteQueue = useRef<string[]>([])
    const autocompleteActionMap = useRef<
        Record<string, 'add' | 'sell' | 'feed'>
    >({})
    const isAutocompleting = useRef(false)
    const wasBatchOpen = useRef(false)
    const idleDims =
        pack.aspect === 'box'
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
                        setUserCoins(Number(data.coins))
                        const lvl = Number(data.level ?? 1)
                        setUserLevel(lvl)
                        // XP per pack = 15 * sqrt(level), same formula as server
                        setXpGainPerPack(Math.round(15 * Math.sqrt(lvl)))
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

    async function handleClick(batchCount?: number) {
        if (shaking || opening) return
        if (!free && stock <= 0) return
        if (isLevelGated) return
        setCoinError(null)
        if (batchCount && batchCount > 1) {
            setOpenCount(batchCount)
            wasBatchOpen.current = true
        }
        setShaking(true)
        const isMulti = (batchCount ?? openCount) > 1
        const effectiveCount = batchCount ?? openCount

        let openedCards: Card[] = []

        if (isMulti) {
            // Batch route — single round-trip for all packs
            const res = await fetch('/api/open-pack-batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    setId: pack.id,
                    count: effectiveCount,
                    free,
                }),
            })
            if (res.status === 409) {
                setShaking(false)
                setCoinError({ cost: 0, coins: -1 })
                return
            }
            if (res.status === 402) {
                const data = await res.json()
                setShaking(false)
                setCoinError({ cost: data.cost, coins: data.coins })
                return
            }
            const data = await res.json()
            if (!Array.isArray(data.cards) || data.cards.length === 0) {
                setShaking(false)
                return
            }
            openedCards = data.cards
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
            if (data.newBR) {
                window.dispatchEvent(
                    new CustomEvent('br-updated', {
                        detail: { newBR: data.newBR },
                    }),
                )
            }
            const actualOpened = data.openedCount ?? effectiveCount
            if (!free && effectiveCost > 0) {
                setUserCoins(
                    (prev) => (prev ?? 0) - effectiveCost * actualOpened,
                )
                triggerCoinFlash(effectiveCost * actualOpened, false)
            }
            onPackOpened?.(pack.id, actualOpened)
        } else {
            const res = await fetch('/api/open-pack', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ setId: pack.id, free }),
            })
            if (res.status === 409) {
                setShaking(false)
                setCoinError({ cost: 0, coins: -1 })
                return
            }
            if (res.status === 402) {
                const data = await res.json()
                setShaking(false)
                setCoinError({ cost: data.cost, coins: data.coins })
                return
            }
            const data = await res.json()
            if (!Array.isArray(data.cards) || data.cards.length === 0) {
                setShaking(false)
                return
            }
            openedCards = data.cards
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
            if (data.newBR) {
                window.dispatchEvent(
                    new CustomEvent('br-updated', {
                        detail: { newBR: data.newBR },
                    }),
                )
            }
            if (!free && effectiveCost > 0) {
                setUserCoins((prev) => (prev ?? 0) - effectiveCost)
                triggerCoinFlash(effectiveCost, false)
            }
            onPackOpened?.(pack.id, 1)

            if (openedCards.length === 0) {
                setShaking(false)
                return
            }
            saveSession({
                cards: openedCards,
                addedIndices: [],
                doneIndex: 0,
                addedCardIds: [],
            })
        }

        // For multi-open: sort within each pack group (lowest rarity first, best at the back)
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
        const { cls: aura, rarity: auraRarity } = getPackAura(openedCards)

        router.refresh()

        // spark tiers: Legendary=1, Divine=2, Celestial=3, ???=4
        const SPARK_TIERS: Record<string, number> = {
            'pack-aura-legendary': 1,
            'pack-aura-divine': 2,
            'pack-aura-celestial': 3,
            'pack-aura-mystery': 4,
        }
        const sparkCount = aura ? (SPARK_TIERS[aura] ?? 0) : 0

        if (sparkCount > 0) {
            // pack goes still — stop shaking, fire sparks, then tear
            setShaking(false)

            const rgb = auraRarity ? rarityGlowRgb(auraRarity) : '234,179,8'

            // angle spreads from vertical, by count
            const ANGLE_SETS: Record<number, number[]> = {
                1: [0],
                2: [-38, 38],
                3: [-55, 0, 55],
                4: [-65, -22, 22, 65],
            }
            const angles = ANGLE_SETS[sparkCount] ?? [0]
            const dist = 90 + Math.random() * 40

            const rect = packImgRef.current?.getBoundingClientRect()
            const originX = rect
                ? rect.left + rect.width / 2
                : window.innerWidth / 2
            const originY = rect ? rect.top + 8 : window.innerHeight * 0.28 // top edge of pack

            setSparks(
                angles.map((deg, i) => {
                    const jitter = (Math.random() - 0.5) * 12
                    const rad = ((deg + jitter) * Math.PI) / 180
                    const ex = Math.sin(rad) * dist
                    const ey = -Math.cos(rad) * dist
                    // cx is a lateral curve offset — pulls the arc outward at midpoint
                    const cx =
                        Math.sign(deg || (Math.random() > 0.5 ? 1 : -1)) *
                        (12 + Math.random() * 14)
                    return {
                        id: Date.now() + i,
                        originX,
                        originY,

                        sd: `${1100 + Math.random() * 500}ms`,
                        color: `rgba(${rgb}, ${0.85 + Math.random() * 0.15})`,
                        rainbow: aura === 'pack-aura-mystery',
                        ex: `${ex}px`,
                        ey: `${ey}px`,
                        cx: `${cx}px`,
                    }
                }),
            )
            setTimeout(() => setSparks([]), 2000)

            setTimeout(() => {
                setTearing(true)
                setTimeout(() => {
                    setTearing(false)
                    setOpening(true)
                    setTimeout(
                        () =>
                            setPhase(isMulti ? 'multi-revealing' : 'revealing'),
                        600,
                    )
                }, 400)
            }, 1400)
        } else {
            setShaking(false)
            setTearing(true)
            setTimeout(() => {
                setTearing(false)
                setOpening(true)
                setTimeout(
                    () => setPhase(isMulti ? 'multi-revealing' : 'revealing'),
                    600,
                )
            }, 400)
        }
    }

    function handleReveal() {
        const next = revealedCount + 1
        setRevealedCount(next)
        if (next === cards.length) {
            setTimeout(() => setPhase('done'), 700)
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
            if (autoBack || wasBatchOpen.current) {
                router.refresh()
                ;(onComplete ?? onBack)()
                return
            }
            setPhase('idle')
            setCards([])
            setRevealedCount(0)
            setAddedIndices(new Set())
            setDoneIndex(0)
            setOpening(false)
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
        if (autoBack || wasBatchOpen.current) {
            router.refresh()
            ;(onComplete ?? onBack)()
            return
        }
        setAddedIndices(new Set(realIndices))
        setPhase('idle')
        setCards([])
        setRevealedCount(0)
        setAddedIndices(new Set())
        setDoneIndex(0)
        setOpening(false)
        router.refresh()
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
            if (autoBack || wasBatchOpen.current) {
                router.refresh()
                ;(onComplete ?? onBack)()
                return
            }
            setPhase('idle')
            setCards([])
            setRevealedCount(0)
            setAddedIndices(new Set())
            setDoneIndex(0)
            setOpening(false)
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
            <div
                className="flex flex-col items-center justify-center"
                style={{
                    minHeight: 'calc(100vh - 64px)',
                    padding: '24px 16px',
                    position: 'relative',
                    zIndex: 10001,
                }}
            >
                <RarityBackgroundEffects
                    packBgTier={packBgTier}
                    sparks={sparks}
                />

                {/* pack */}
                {phase === 'idle' && (
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                        }}
                    >
                        {coinError && (
                            <div
                                className="flex items-center gap-3 mb-6 px-4 py-3 rounded-xl"
                                style={{
                                    background: 'rgba(239,68,68,0.06)',
                                    border: '1px solid rgba(239,68,68,0.2)',
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
                            className={`${isLevelGated || (!free && stock <= 0) ? 'cursor-not-allowed' : 'cursor-pointer animate-subtle-pulse hover:scale-105'} ${shaking ? 'animate-shake' : ''} ${opening ? 'animate-fade-out' : ''}${!shaking && !tearing && !opening && pack.idle_aura ? ` ${pack.idle_aura}` : ''}`}
                            style={{
                                ...(!pack.idle_aura ||
                                shaking ||
                                tearing ||
                                opening
                                    ? {
                                          filter: isLevelGated || (!free && stock <= 0)
                                              ? 'grayscale(1) opacity(0.4)'
                                              : 'drop-shadow(0 0 20px rgba(228,228,228,0.99))',
                                      }
                                    : {}),
                                transform: tearing
                                    ? 'scale(1.12) rotate(2deg)'
                                    : undefined,
                                transition: tearing
                                    ? 'transform 300ms ease-in-out'
                                    : undefined,
                                position: 'relative',
                            }}
                        >
                            <img
                                src={pack.image}
                                alt={pack.name}
                                onClick={() => {
                                    if (!free && stock <= 0) return
                                    if (isLevelGated) return
                                    batchMode ? handleClick(stock) : handleClick()
                                }}
                                className={isLevelGated || (!free && stock <= 0) ? 'cursor-not-allowed' : 'cursor-pointer'}
                                style={{
                                    ...idleDims,
                                    objectFit: 'contain',
                                    display: 'block',
                                }}
                            />
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
                        <div className="flex flex-col items-center gap-2 mt-8">
                            {isLevelGated && (
                                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#a78bfa' }}>
                                    Level {pack.level_required} required
                                </div>
                            )}
                            {!isLevelGated && !free && stock <= 0 && (
                                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ef4444' }}>
                                    Out of Stock
                                </div>
                            )}
                            {!isLevelGated && !free && stock > 0 && (
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
                                                      (batchMode
                                                          ? effectiveCost *
                                                            stock
                                                          : effectiveCost)
                                                        ? '#4ade80'
                                                        : '#f87171'
                                                    : '#6b7280',
                                            letterSpacing: '-0.01em',
                                            transition: 'color 0.15s',
                                        }}
                                    >
                                        {batchMode
                                            ? `$ ${(effectiveCost * stock).toFixed(2)}`
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
                                    {batchMode && (
                                        <span
                                            style={{
                                                fontSize: '0.62rem',
                                                color: '#475569',
                                                letterSpacing: '-0.01em',
                                            }}
                                        >
                                            ({stock} × $
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
                                                (batchMode ? stock : 1)}{' '}
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
                                {stock > 1 && (
                                    <button
                                        onClick={() => setBatchMode((v) => !v)}
                                        disabled={shaking || opening}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            background: batchMode
                                                ? 'rgba(96,165,250,0.28)'
                                                : 'rgba(96,165,250,0.08)',
                                            border: batchMode
                                                ? '1px solid rgba(96,165,250,0.7)'
                                                : '1px solid rgba(96,165,250,0.25)',
                                            borderRadius: 20,
                                            padding: '6px 18px',
                                            color: batchMode
                                                ? '#bfdbfe'
                                                : '#60a5fa',
                                            fontSize: '0.72rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            letterSpacing: '-0.01em',
                                            transition:
                                                'transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease, border-color 0.15s ease, color 0.15s ease',
                                            boxShadow: batchMode
                                                ? '0 0 14px rgba(96,165,250,0.3)'
                                                : 'none',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform =
                                                'scale(1.08) translateY(-2px)'
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = ''
                                        }}
                                    >
                                        x{stock}
                                    </button>
                                )}
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
                    </div>
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
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            paddingTop: 'min(20px, 5vw)',
                            transform: isMobile
                                ? 'translateY(11px)'
                                : 'translateY(16px)',
                        }}
                    >
                        <div
                            className="relative flex items-center justify-center"
                            style={{
                                height: 'min(350px, 80vw)',
                                width: 'min(280px, 72vw)',
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
                                                isTop ? handleReveal : () => {}
                                            }
                                            onFlipped={
                                                isTop
                                                    ? () => {
                                                          setShowRarity(true)
                                                          setRarityCard(card)
                                                      }
                                                    : () => {}
                                            }
                                            onConfirmed={
                                                isTop
                                                    ? () => setShowRarity(false)
                                                    : () => {}
                                            }
                                            onSpecialChange={(active, glow) => {
                                                setSpecialActive(active)
                                                setSpecialGlow(glow)
                                            }}
                                        />
                                    </div>
                                )
                            })}
                        </div>

                        {/* flip-all button + rarity odds */}
                        <div
                            className="flex flex-col items-center gap-2"
                            style={{ marginTop: 'min(24px, 5vw)' }}
                        >
                            <button
                                onClick={handleFlipAll}
                                className="px-4 py-1.5 rounded-xl text-xs font-medium border border-gray-700 text-gray-300 hover:border-gray-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all"
                            >
                                flip all
                            </button>
                            {showRarity && rarityCard && (
                                <p
                                    className="text-xs tracking-widest uppercase"
                                    style={{
                                        color: `rgba(${rarityGlowRgb(rarityCard.rarity)}, 1)`,
                                    }}
                                >
                                    {rarityCard.rarity} ·{' '}
                                    {rarityToOdds(rarityCard.rarity)}
                                </p>
                            )}
                        </div>
                    </div>
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
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    paddingTop: 'min(10px, 8vw)',
                                }}
                            >
                                {/* pack counter — always visible above cards */}
                                <div
                                    style={{
                                        marginBottom: 40,
                                        fontSize: '0.68rem',
                                        fontWeight: 700,
                                        letterSpacing: '0.12em',
                                        color: '#6b7280',
                                        textTransform: 'uppercase',
                                        zIndex: 60,
                                        position: 'relative',
                                    }}
                                >
                                    Pack {multiPackIndex + 1} / {openCount}
                                </div>
                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        opacity: packTransitioning ? 0 : 1,
                                        transition: 'opacity 350ms ease-in-out',
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
                                                    gap: 12,
                                                    animation:
                                                        'fadeIn 250ms ease-out',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 16,
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
                                                            padding: '6px 14px',
                                                            fontSize: '1rem',
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        ←
                                                    </button>
                                                    <img
                                                        key={`${packCards[batchRevealIndex]?.id}-mobile-face`}
                                                        src={
                                                            packCards[
                                                                batchRevealIndex
                                                            ]?.image_url
                                                        }
                                                        alt={
                                                            packCards[
                                                                batchRevealIndex
                                                            ]?.name
                                                        }
                                                        className="rounded-xl"
                                                        style={{
                                                            height: 'min(300px, 68vw)',
                                                            width: 'auto',
                                                            boxShadow: `0 0 20px 6px rgba(${rarityGlowRgb(packCards[batchRevealIndex]?.rarity ?? '')}, 0.65)`,
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() =>
                                                            setBatchRevealIndex(
                                                                (p) =>
                                                                    (p + 1) %
                                                                    packCards.length,
                                                            )
                                                        }
                                                        style={{
                                                            border: '1px solid rgba(255,255,255,0.15)',
                                                            background:
                                                                'transparent',
                                                            color: 'rgba(255,255,255,0.6)',
                                                            borderRadius: 8,
                                                            padding: '6px 14px',
                                                            fontSize: '1rem',
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        →
                                                    </button>
                                                </div>
                                                {/* card name + rarity + counter */}
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 8,
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            fontSize: '0.8rem',
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
                                                            fontSize: '0.6rem',
                                                            fontWeight: 700,
                                                            padding: '2px 7px',
                                                            borderRadius: 9999,
                                                            background:
                                                                'rgba(10,10,15,0.7)',
                                                            border: '1px solid rgba(255,255,255,0.1)',
                                                            color: `rgba(${rarityGlowRgb(packCards[batchRevealIndex]?.rarity ?? '')}, 1)`,
                                                            textTransform:
                                                                'uppercase' as const,
                                                            letterSpacing:
                                                                '0.03em',
                                                        }}
                                                    >
                                                        {
                                                            packCards[
                                                                batchRevealIndex
                                                            ]?.rarity
                                                        }
                                                    </span>
                                                    <span
                                                        style={{
                                                            fontSize: '0.65rem',
                                                            color: '#6b7280',
                                                        }}
                                                    >
                                                        {batchRevealIndex + 1} /{' '}
                                                        {packCards.length}
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            /* Desktop: 1 row ≤5 cards, 2 rows >5 cards */
                                            (() => {
                                                const twoRows = packCards.length > 5
                                                const cols = twoRows ? Math.ceil(packCards.length / 2) : packCards.length
                                                const cardH = twoRows ? 155 : 220
                                                return (
                                                    <div
                                                        style={{
                                                            display: 'grid',
                                                            gridTemplateColumns: `repeat(${cols}, auto)`,
                                                            justifyContent: 'center',
                                                            gap: 10,
                                                            maxWidth: '98vw',
                                                            padding: '4px 8px',
                                                            animation: 'fadeIn 250ms ease-out',
                                                        }}
                                                    >
                                                        {packCards.map((card, i) => (
                                                            <img
                                                                key={`${card.id}-${packStart + i}-face`}
                                                                src={card.image_url}
                                                                alt={card.name}
                                                                className="rounded-lg"
                                                                style={{
                                                                    height: `${cardH}px`,
                                                                    width: 'auto',
                                                                    boxShadow: `0 0 12px 3px rgba(${rarityGlowRgb(card.rarity)}, 0.55)`,
                                                                }}
                                                            />
                                                        ))}
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
                                                const fanVisible = fanningOut
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
                                        style={{ marginTop: 'min(24px, 5vw)' }}
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
                                        {!isLastPack && (
                                            <button
                                                onClick={handleSkipAll}
                                                disabled={packTransitioning}
                                                className="px-3 py-1 rounded-lg text-xs border border-gray-800 text-gray-600 hover:border-gray-600 hover:text-gray-400 active:scale-95 transition-all"
                                            >
                                                skip to results
                                            </button>
                                        )}
                                        {showRarity && rarityCard && (
                                            <p
                                                className="text-xs tracking-widest uppercase"
                                                style={{
                                                    color: `rgba(${rarityGlowRgb(rarityCard.rarity)}, 1)`,
                                                }}
                                            >
                                                {rarityCard.rarity} ·{' '}
                                                {rarityToOdds(
                                                    rarityCard.rarity,
                                                )}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
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
                                        currentOverallCond !== null && currentOverallCond > 8 && currentCard.image_url_hi
                                            ? currentCard.image_url_hi
                                            : currentCard.image_url
                                    }
                                    alt={currentCard.name}
                                    className={`rounded-xl${currentIsRainbow ? ' glow-rainbow' : ''}`}
                                    style={{
                                        height: isMobile
                                            ? 'min(300px, 72vw)'
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
                                {/* Rarity + NEW tags */}
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
                                        className={rarityTextClass(currentCard.rarity)}
                                        style={{
                                            fontSize: '0.55rem',
                                            fontWeight: 700,
                                            padding: '2px 6px',
                                            lineHeight: 1.4,
                                            borderRadius: 9999,
                                            background: 'rgba(10,10,15,0.82)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            letterSpacing: '0.03em',
                                            textTransform: 'uppercase',
                                            ...rarityTextStyle(currentCard.rarity),
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
                                {shattering && (
                                    <ShatterEffect
                                        rarity={currentCard.rarity}
                                        imageUrl={
                                            currentOverallCond !== null && currentOverallCond > 8 && currentCard.image_url_hi
                                                ? currentCard.image_url_hi
                                                : currentCard.image_url
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
                                        /* ── Mobile: card only, name row on top ── */
                                        <div
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: 6,
                                                width: '100%',
                                            }}
                                        >
                                            {/* name + dex row — same width as card */}
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 8,
                                                    width: 'min(300px, 72vw)',
                                                    marginLeft: 100,
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        fontSize: '0.82rem',
                                                        fontWeight: 700,
                                                        color: '#e2e8f0',
                                                    }}
                                                >
                                                    {currentCard.name}
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize: '0.68rem',
                                                        color: '#6b7280',
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
                                            </div>
                                            {cardNode}
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
                                                padding: '16px 16px 32px',
                                                maxWidth: 400,
                                                width: '100%',
                                                overflowY: 'auto',
                                                maxHeight: '100vh',
                                            }}
                                        >
                                            <button
                                                onClick={() =>
                                                    setShowDetails(false)
                                                }
                                                style={{
                                                    display: 'block',
                                                    marginLeft: 'auto',
                                                    marginBottom: 12,
                                                    background: 'none',
                                                    border: 'none',
                                                    color: '#6b7280',
                                                    fontSize: '0.72rem',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                ✕ close
                                            </button>
                                            {statsPanel}
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
