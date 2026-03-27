'use client'
import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import FlipCard from './card/FlipCard'
import FirstEditionBadge from './card/FirstEditionBadge'
import {
    isRainbow,
    rarityGlowRgb,
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
}


export default function PackOpening({
    pack,
    onBack,
    onComplete,
    autoBack = false,
    free = false,
    count = 1,
}: Props) {
    const router = useRouter()
    const isMobile = useIsMobile()
    const supabase = createClient()
    const [userCoins, setUserCoins] = useState<number | null>(null)
    const [shaking, setShaking] = useState(false)
    const [tearing, setTearing] = useState(false)
    const [opening, setOpening] = useState(false)
    const [phase, setPhase] = useState<'idle' | 'revealing' | 'done'>('idle')
    const [cards, setCards] = useState<Card[]>([])

    const [nFarewellFound, setNFarewellFound] = useState(false)

    async function handleNFarewellClick() {
        if (nFarewellFound) return
        try {
            const res = await fetch('/api/n-farewell', { method: 'POST' })
            if (res.ok) {
                setNFarewellFound(true)
                window.dispatchEvent(new Event('quest-claimed'))
            }
        } catch {}
    }

    const [specialActive, setSpecialActive] = useState(false)
    const [specialGlow, setSpecialGlow] = useState('156, 163, 175')
    const [revealedCount, setRevealedCount] = useState(0)
    const [shattering, setShattering] = useState(false)

    const [addedIndices, setAddedIndices] = useState<Set<number>>(new Set())
    const [animatingIndex, setAnimatingIndex] = useState<number | null>(null)
    const [doneIndex, setDoneIndex] = useState(0)
    const [condPanelTab, setCondPanelTab] = useState<'condition' | 'stats'>('condition')
    const [openCount, setOpenCount] = useState(count)

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

    const [fanningOut, setFanningOut] = useState(false)
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
    const idleDims = pack.test
        ? { height: 'min(240px, 48vw)', width: 'auto' }
        : pack.aspect === 'box'
          ? { height: 'min(270px, 60vw)', width: 'min(360px, 78vw)' }
          : { height: 'min(420px, 68vw)', width: 'auto' }

    // ── dev test cards — no DB ────────────────────────────────────────────────
    const TEST_MOCK_CARDS: Card[] = [
        {
            id: 'test-legendary',
            name: 'Charizard',
            image_url: 'https://assets.tcgdex.net/en/base/base1/4/high.webp',
            rarity: 'Legendary',
            national_pokedex_number: 6,
            worth: 100,
            isNew: true,
            coins: 200,
            isHot: false,
        },
        {
            id: 'test-divine',
            name: 'Mewtwo',
            image_url: 'https://assets.tcgdex.net/en/base/base1/10/high.webp',
            rarity: 'Divine',
            national_pokedex_number: 150,
            worth: 500,
            isNew: true,
            coins: 1000,
            isHot: false,
        },
        {
            id: 'test-celestial',
            name: 'Blastoise',
            image_url: 'https://assets.tcgdex.net/en/base/base1/2/high.webp',
            rarity: 'Celestial',
            national_pokedex_number: 9,
            worth: 2000,
            isNew: true,
            coins: 4000,
            isHot: false,
        },
        {
            id: 'test-mystery',
            name: 'Venusaur',
            image_url: 'https://assets.tcgdex.net/en/base/base1/15/high.webp',
            rarity: '???',
            national_pokedex_number: 3,
            worth: 9999,
            isNew: true,
            coins: 9999,
            isHot: true,
        },
        {
            id: 'test-psa1',
            name: 'Raichu',
            image_url: 'https://assets.tcgdex.net/en/base/base1/14/high.webp',
            rarity: 'Celestial',
            national_pokedex_number: 26,
            worth: 1500,
            isNew: true,
            coins: 50,
            isHot: false,
            attr_centering: 1.0,
            attr_corners: 1.0,
            attr_edges: 1.0,
            attr_surface: 1.0,
        },
    ]

    useEffect(() => {
        const session = loadSession()
        if (session) setResumeSession(session)
    }, [])

    // lock body scroll while pack opening is active
    useEffect(() => {
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => { document.body.style.overflow = prev }
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
                .select('coins')
                .eq('id', user.id)
                .single()
                .then(({ data }) => {
                    if (data) setUserCoins(Number(data.coins))
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

    async function handleClick() {
        if (shaking || opening) return
        setCoinError(null)
        setShaking(true)
        const isMulti = openCount > 1

        let openedCards: Card[] = []

        if (pack.test) {
            openedCards = isMulti
                ? Array.from({ length: openCount }, () => TEST_MOCK_CARDS).flat()
                : TEST_MOCK_CARDS
        } else if (isMulti) {
            // Batch route — single round-trip for all packs
            const res = await fetch('/api/open-pack-batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ setId: pack.id, count: openCount, free }),
            })
            if (res.status === 409) {
                setShaking(false); setCoinError({ cost: 0, coins: -1 }); return
            }
            if (res.status === 402) {
                const data = await res.json()
                setShaking(false); setCoinError({ cost: data.cost, coins: data.coins }); return
            }
            const data = await res.json()
            if (!Array.isArray(data.cards) || data.cards.length === 0) { setShaking(false); return }
            openedCards = data.cards
            if (!free && pack.cost > 0) {
                setUserCoins((prev) => (prev ?? 0) - pack.cost * openCount)
                triggerCoinFlash(pack.cost * openCount, false)
            }
        } else {
            const res = await fetch(
                pack.test_override_url ?? '/api/open-pack',
                {
                    method: pack.test_override_url ? 'GET' : 'POST',
                    ...(pack.test_override_url
                        ? {}
                        : {
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ setId: pack.id, free }),
                          }),
                },
            )
            if (res.status === 409) {
                setShaking(false); setCoinError({ cost: 0, coins: -1 }); return
            }
            if (res.status === 402) {
                const data = await res.json()
                setShaking(false); setCoinError({ cost: data.cost, coins: data.coins }); return
            }
            const data = await res.json()
            if (!Array.isArray(data.cards) || data.cards.length === 0) { setShaking(false); return }
            openedCards = data.cards
            if (!free && pack.cost > 0) {
                setUserCoins((prev) => (prev ?? 0) - pack.cost)
                triggerCoinFlash(pack.cost, false)
            }

            if (openedCards.length === 0) { setShaking(false); return }
            saveSession({ cards: openedCards, addedIndices: [], doneIndex: 0, addedCardIds: [] })
        }

        // For multi-open: sort lowest rarity first, best cards at the back
        if (isMulti) {
            openedCards.sort((a, b) => RARITY_TIERS.indexOf(a.rarity) - RARITY_TIERS.indexOf(b.rarity))
        }

        setCards(openedCards)
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
                    setTimeout(() => setPhase(isMulti ? 'done' : 'revealing'), 600)
                }, 400)
            }, 1400)
        } else {
            setShaking(false)
            setTearing(true)
            setTimeout(() => {
                setTearing(false)
                setOpening(true)
                setTimeout(() => setPhase(isMulti ? 'done' : 'revealing'), 600)
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
        if (!pack.test) {
            fetch('/api/add-to-bag', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cardId: card.id,
                    worth: card.coins,
                    isHot: card.isHot,
                    rarity: card.rarity,
                    attrs: cardAttrs(card),
                    previewStats: card.preview_stats,
                    previewNature: card.preview_nature,
                }),
            }).catch(console.error)
        }
    }

    function handleAddToBagDuplicate() {
        if (bagCount !== null && bagCount >= bagCapacity) return
        const card = remainingCards[doneIndex]
        setAddedCardIds((prev) => new Set(prev).add(card.id))
        setBagCount((prev) => (prev ?? 0) + 1)
        setAnimatingIndex(doneIndex)
        if (!pack.test) {
            fetch('/api/add-to-bag', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cardId: card.id,
                    worth: card.coins,
                    isHot: card.isHot,
                    rarity: card.rarity,
                    attrs: cardAttrs(card),
                    previewStats: card.preview_stats,
                    previewNature: card.preview_nature,
                }),
            }).catch(console.error)
        }
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
            if (autoBack) {
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
        if (!pack.test) {
            fetch('/api/buyback-card', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ card_buyback_amount: card.coins }),
            }).catch(console.error)
        }
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
        if (!pack.test) {
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
        }
        const realIndices = toSell.map((card) =>
            cards.findIndex((c) => c === card),
        )
        clearSession()
        isAutocompleting.current = false
        if (autoBack) {
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
        if (!pack.test) {
            await fetch('/api/feed-card', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userCardId }),
            })
        }
    }

    // ─── batch autocomplete ────────────────────────────────────────────────────

    function handleAutocomplete() {
        if (isAutocompleting.current) return
        isAutocompleting.current = true

        // Cap 'add' actions to remaining bag space — overflow becomes 'sell'
        const availableSlots = Math.max(0, bagCapacity - (bagCount ?? 0))
        let addSlotUsed = 0

        const queue = remainingCardsRef.current
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

         if (!pack.test) {
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
                                attrs: cardAttrs(card),
                            }
                        if (action === 'sell')
                            return { type: 'sell', coins: card.coins }
                        return { type: 'feed', cardId: card.id }
                    }),
                }),
            }).catch(console.error)
        }

        autocompleteQueue.current = queue.map(({ card }) => card.id)
        processNextAutocomplete()
    }

    async function processNextAutocomplete() {
        if (autocompleteQueue.current.length === 0) {
            isAutocompleting.current = false
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
            setTimeout(() => processNextAutocomplete(), 50)
        } else {
            // add / feed — trigger fly-down; handleAnimationEnd resumes queue
            autocompleteQueue.current.shift()
            setAnimatingIndex(i)
        }
    }

    function handleAnimationEnd() {
        if (animatingIndex === null) return

        const card = remainingCards[animatingIndex]
        const realIndex = cards.findIndex((c) => c === card)

        setAddedIndices((prev) => {
            const next = new Set(prev)
            next.add(realIndex)
            return next
        })
        setAnimatingIndex(null)

        const newRemaining = remainingCards.filter(
            (_, i) => i !== animatingIndex,
        )

        if (newRemaining.length === 0) {
            clearSession()
            isAutocompleting.current = false
            if (autoBack) {
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
            if (isAutocompleting.current) {
                setTimeout(() => processNextAutocomplete(), 50)
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

    const currentCard = remainingCards[doneIndex]
    const packBgTier: 'celestial' | 'divine' | 'legendary' | 'mystery' | null =
        (() => {
            const triggerCard =
                phase === 'done'
                    ? currentCard
                    : phase === 'revealing' && specialActive
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
                    paddingTop: isMobile ? 24 : 48,
                    paddingBottom: 88,
                    position: 'relative',
                    zIndex: 10001,
                }}
            >
                <RarityBackgroundEffects packBgTier={packBgTier} sparks={sparks} />

                {/* pack */}
                {phase === 'idle' && (
                    <div
                        style={{
                            transform: 'translateY(24px)',
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

                        {resumeSession && createPortal(
                            <div
                                style={{
                                    position: 'fixed',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    zIndex: 999,
                                    background: 'rgba(10,10,14,0.97)',
                                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                                    backdropFilter: 'blur(8px)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    padding: '10px 20px',
                                }}
                            >
                                <p style={{ color: '#9ca3af', fontSize: '0.78rem', flex: 1, margin: 0 }}>
                                    you have unresolved cards from your last pack
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
                            document.body
                        )}
                        <div
                            ref={packImgRef}
                            className={`cursor-pointer animate-subtle-pulse hover:scale-105 ${shaking ? 'animate-shake' : ''} ${opening ? 'animate-fade-out' : ''}${!shaking && !tearing && !opening && pack.idle_aura ? ` ${pack.idle_aura}` : ''}`}
                            style={{
                                ...(!pack.idle_aura ||
                                shaking ||
                                tearing ||
                                opening
                                    ? {
                                          filter: 'drop-shadow(0 0 20px rgba(228,228,228,0.99))',
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
                                onClick={handleClick}
                                className="cursor-pointer"
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
                        <div className="flex flex-col items-center gap-3 mt-8">
                            {!free && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span
                                        style={{
                                            fontSize: '0.82rem',
                                            fontWeight: 600,
                                            color:
                                                userCoins !== null
                                                    ? userCoins >= pack.cost * openCount
                                                        ? '#4ade80'
                                                        : '#f87171'
                                                    : '#6b7280',
                                            letterSpacing: '-0.01em',
                                        }}
                                    >
                                        $ {(pack.cost * openCount).toFixed(2)}
                                    </span>
                                    {pack.cost > 0 && (
                                        <button
                                            onClick={() => setOpenCount(c => c === 1 ? 10 : 1)}
                                            style={{
                                                fontSize: '0.6rem', fontWeight: 700,
                                                padding: '3px 10px', borderRadius: 6,
                                                background: openCount === 10 ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.04)',
                                                border: openCount === 10 ? '1px solid rgba(251,191,36,0.45)' : '1px solid rgba(255,255,255,0.1)',
                                                color: openCount === 10 ? '#fbbf24' : '#6b7280',
                                                cursor: 'pointer', letterSpacing: '0.05em',
                                                transition: 'all 150ms',
                                            }}
                                        >
                                            ×10
                                        </button>
                                    )}
                                </div>
                            )}
                            <button
                                onClick={onBack}
                                className="px-5 py-2 rounded-xl text-sm font-medium border border-gray-700 text-gray-300 hover:border-gray-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all duration-200"
                                style={{ letterSpacing: '-0.01em' }}
                            >
                                ← go back
                            </button>
                        </div>

                        {/* N's hidden farewell — barely visible, discoverable by players on the chain */}
                        <p
                            onClick={handleNFarewellClick}
                            style={{
                                marginTop: 32,
                                fontSize: '0.55rem',
                                fontStyle: 'italic',
                                color: 'var(--app-text)',
                                opacity: nFarewellFound ? 0.35 : 0.06,
                                textAlign: 'center',
                                maxWidth: 280,
                                lineHeight: 1.7,
                                cursor: nFarewellFound ? 'default' : 'pointer',
                                userSelect: 'none',
                                transition: 'opacity 0.4s ease',
                                letterSpacing: '0.01em',
                            }}
                        >
                            &ldquo;Everything&rsquo;s ruined. The ideals and truths I&rsquo;ve held&hellip; The dreams Pokémon shared&hellip;&rdquo;
                        </p>

                        {/* Act 9 fragments — one half per legendary pack, barely visible */}
                        {pack.id === 'sv10.5w' && (
                            <p style={{
                                marginTop: 16,
                                fontSize: '0.5rem',
                                fontStyle: 'italic',
                                color: 'rgba(255,200,100,1)',
                                opacity: 0.07,
                                textAlign: 'center',
                                maxWidth: 260,
                                lineHeight: 1.8,
                                userSelect: 'none',
                                letterSpacing: '0.01em',
                            }}>
                                &ldquo;The bonds between you and your Pokémon — they&rsquo;re real. I can&rsquo;t deny it anymore.&rdquo;
                            </p>
                        )}
                        {pack.id === 'sv10.5b' && (
                            <p style={{
                                marginTop: 16,
                                fontSize: '0.5rem',
                                fontStyle: 'italic',
                                color: 'rgba(100,160,255,1)',
                                opacity: 0.07,
                                textAlign: 'center',
                                maxWidth: 260,
                                lineHeight: 1.8,
                                userSelect: 'none',
                                letterSpacing: '0.01em',
                            }}>
                                &ldquo;I&rsquo;m going to release my dragon back to the sky. They deserve to be free. As do I.&rdquo;
                            </p>
                        )}
                    </div>
                )}

                {/* card stack */}
                {phase === 'revealing' && (
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
                                ...(!isRainbow(rarityCard?.rarity ?? '') && {
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
                )}

                {/* flip-all button + rarity odds */}
                {phase === 'revealing' && (
                    <div
                        className="flex flex-col items-center gap-2"
                        style={{
                            marginTop: 'min(24px, 5vw)',
                        }}
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
                )}

                {/* done phase */}
                {phase === 'done' &&
                    remainingCards.length > 0 &&
                    currentCard && (() => {
                        const hasAttrs = [currentCard.attr_centering, currentCard.attr_corners, currentCard.attr_edges, currentCard.attr_surface].some(v => v != null)
                        return (
                            <>
                                <div
                                    className="flex flex-col items-center gap-4"
                                    style={{
                                        transform: 'translateY(-10px)',
                                        padding: isMobile ? '0 10px' : 0,
                                        width: '100%',
                                        boxSizing: 'border-box',
                                    }}
                                >
                                    {/* top row: card + right panel */}
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: isMobile
                                                ? 'column'
                                                : 'row',
                                            alignItems: isMobile
                                                ? 'center'
                                                : 'flex-start',
                                            justifyContent: 'center',
                                            gap: isMobile ? 14 : 16,
                                            width: '100%',
                                        }}
                                    >
                                        {/* card column */}
                                        <div
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: 8,
                                                flexShrink: 0,
                                            }}
                                        >
                                            {/* card */}
                                            <div
                                                className={`relative ${animatingIndex === doneIndex ? 'animate-fly-down' : ''}`}
                                                onAnimationEnd={
                                                    handleAnimationEnd
                                                }
                                            >
                                                <img
                                                    src={currentCard.image_url}
                                                    alt={currentCard.name}
                                                    className={`rounded-xl${currentIsRainbow ? ' glow-rainbow' : ''}`}
                                                    style={{
                                                        height: isMobile
                                                            ? 'min(280px, 68vw)'
                                                            : '320px',
                                                        width: 'auto',
                                                        opacity: shattering
                                                            ? 0
                                                            : 1,
                                                        boxShadow:
                                                            currentIsRainbow
                                                                ? undefined
                                                                : `0 0 20px 4px rgba(${currentGlowRgb}, 0.6)`,
                                                        filter: currentCondFilter,
                                                        transform:
                                                            currentCenterSkew,
                                                    }}
                                                />
                                                {/* Rarity + NEW tags — top-right flex row */}
                                                {currentCard && (
                                                    <div
                                                        style={{
                                                            position:
                                                                'absolute',
                                                            top: 8,
                                                            right: 8,
                                                            display: 'flex',
                                                            alignItems:
                                                                'center',
                                                            gap: 4,
                                                        }}
                                                    >
                                                        <span
                                                            style={{
                                                                fontSize:
                                                                    '0.55rem',
                                                                fontWeight: 700,
                                                                padding:
                                                                    '2px 6px',
                                                                lineHeight: 1.4,
                                                                borderRadius: 9999,
                                                                background:
                                                                    'rgba(10,10,15,0.82)',
                                                                border: '1px solid rgba(255,255,255,0.1)',
                                                                color: `rgba(${rarityGlowRgb(currentCard.rarity)}, 1)`,
                                                                letterSpacing:
                                                                    '0.03em',
                                                                textTransform:
                                                                    'uppercase',
                                                            }}
                                                        >
                                                            {currentCard.rarity}
                                                        </span>
                                                        {currentCardIsNew && (
                                                            <span
                                                                className="bg-green-950 text-green-400 border border-green-700/50 rounded-full"
                                                                style={{
                                                                    fontSize:
                                                                        '0.6rem',
                                                                    padding:
                                                                        '2px 7px',
                                                                    lineHeight: 1.4,
                                                                }}
                                                            >
                                                                NEW
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                {shattering && (
                                                    <ShatterEffect
                                                        rarity={
                                                            currentCard.rarity
                                                        }
                                                        imageUrl={
                                                            currentCard.image_url
                                                        }
                                                    />
                                                )}
                                                <WearOverlay
                                                    ucId={currentCard.id}
                                                    overallCond={
                                                        currentOverallCond
                                                    }
                                                    attrSurface={
                                                        currentCard.attr_surface ??
                                                        null
                                                    }
                                                />
                                                {/* 1st edition badge — bottom-right */}
                                                {currentCard.set_id?.endsWith('-1ed') && (
                                                    <FirstEditionBadge variant="detail" side="right" />
                                                )}
                                            </div>
                                        </div>
                                        {/* end card column */}

                                        {/* right panel */}
                                        <div
                                            style={{
                                                width: isMobile ? 'min(340px, 92vw)' : 200,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 10,
                                                overflow: 'visible',
                                            }}
                                        >
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
                                                handleAddToBagDuplicate={handleAddToBagDuplicate}
                                                handleFeedCard={handleFeedCard}
                                                handleBuyback={handleBuyback}
                                            />
                                        </div>
                                    </div>

                                    {/* bottom nav — centered under full card+panel width */}
                                    <CardActionButtons
                                        doneIndex={doneIndex}
                                        remainingCards={remainingCards}
                                        sellAllConfirm={sellAllConfirm}
                                        handleSellAll={handleSellAll}
                                        doSellAll={doSellAll}
                                        setSellAllConfirm={setSellAllConfirm}
                                        handleAutocomplete={handleAutocomplete}
                                        setShowSettings={setShowSettings}
                                        setDoneIndex={setDoneIndex}
                                    />
                                </div>
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
        </>
    )
}
