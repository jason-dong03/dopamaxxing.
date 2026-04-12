import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { calculateBuyback, randomCardLevel, WEIGHTS_BULK, WEIGHTS_SLOT5, WEIGHTS_UNCOMMON_PLUS, WEIGHTS_RARE_PLUS, BONUS_CARD_CHANCE, pickRarityFromWeights } from '@/lib/rarityConfig'
import { getMergedPacks } from '@/lib/packMeta'
import { applyProfileXP, packXpGain, xpForLevel } from '@/lib/rarityConfig'
import { generateAttributes } from '@/lib/cardAttributes'
import { getEventMagnitude, getTodayEvents } from '@/lib/dailyEvents'
import { awardAchievements, getEarnedAchievements } from '@/lib/awardAchievement'
import { awardLevelUpRewards } from '@/lib/awardLevelUp'
import { rollStats, rollNature } from '@/lib/pokemon-stats'
import { fetchPokemonData } from '@/lib/pokemon-moves'
import { recalcBattleRating } from '@/lib/battlePower'
import { getOrRefreshStock } from '@/lib/packStock'

const pityRarities = ['Legendary', 'Divine', 'Celestial', '???']
const GOD_PACK_CHANCE = 0.003   // 0.3% — roughly 1 in 333
const GOD_PACK_RARITIES = ['Mythical', 'Legendary', 'Divine', 'Celestial', '???']
const WEIGHTS_GOD_PACK: Record<string, number> = { Mythical: 55, Legendary: 25, Divine: 12, Celestial: 5, '???': 3 }

// ─── module-level set card cache (per worker, 1hr TTL) ────────────────────────
type CardRow = Record<string, unknown>
const setCardsCache = new Map<string, { cards: CardRow[]; expires: number }>()

async function getCardsForSet(
    supabase: Awaited<ReturnType<typeof createClient>>,
    setId: string,
): Promise<CardRow[]> {
    const cached = setCardsCache.get(setId)
    if (cached && Date.now() < cached.expires) return cached.cards

    const { data } = await supabase
        .from('cards')
        .select('*')
        .eq('set_id', setId)
    const cards = (data as CardRow[]) ?? []
    setCardsCache.set(setId, { cards, expires: Date.now() + 60 * 60 * 1000 })
    return cards
}

const RARITY_RANK: Record<string, number> = {
    '???': 8, Celestial: 7, Divine: 6, Legendary: 5,
    Mythical: 4, Epic: 3, Rare: 2, Uncommon: 1, Common: 0,
}

async function getCardsForPokedexIds(
    supabase: Awaited<ReturnType<typeof createClient>>,
    cacheKey: string,
    dexIds: number[],
): Promise<CardRow[]> {
    const cached = setCardsCache.get(cacheKey)
    if (cached && Date.now() < cached.expires) return cached.cards

    const { data } = await supabase
        .from('cards')
        .select('*')
        .in('national_pokedex_number', dexIds)

    // Deduplicate by Pokémon name — keep the highest-rarity version per Pokémon
    // so cross-set duplicates don't inflate pull rates.
    const seen = new Map<string, CardRow>()
    for (const card of (data ?? []) as CardRow[]) {
        const name = card.name as string
        const existing = seen.get(name)
        if (!existing || (RARITY_RANK[card.rarity as string] ?? 0) > (RARITY_RANK[existing.rarity as string] ?? 0)) {
            seen.set(name, card)
        }
    }
    const cards = Array.from(seen.values())
    setCardsCache.set(cacheKey, { cards, expires: Date.now() + 60 * 60 * 1000 })
    return cards
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user)
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { setId, free = false } = await request.json()

        // look up pack cost from catalog (DB overrides static defaults)
        const mergedPacks = await getMergedPacks(supabase)
        const packDef = mergedPacks.find((p) => p.id === setId)
        const baseCost = packDef?.cost ?? 0
        const costDiscount = await getEventMagnitude('cheap_packs') // e.g. 0.75 = 25% off
        const freePackChance = free ? 0 : await getEventMagnitude('free_pack') // e.g. 0.15 = 15% chance
        const luckyFree = !free && freePackChance > 0 && Math.random() < freePackChance
        const effectiveFree = free || luckyFree

        // fetch profile + all set cards + bag count in parallel
        const [{ data: profile }, allCards, bagCountRes] = await Promise.all([
            supabase
                .from('profiles')
                .select('pity_counter, pity_threshold, coins, xp, level, bag_capacity, daily_packs_today, daily_reset_date, packs_opened')
                .eq('id', user.id)
                .single(),
            packDef?.theme_pokedex_ids
                ? getCardsForPokedexIds(supabase, setId, packDef.theme_pokedex_ids)
                : getCardsForSet(supabase, setId),
            supabase
                .from('user_cards')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id),
        ])

        // ── bag full check ────────────────────────────────────────────────────
        const bagCapacity = profile?.bag_capacity ?? 50
        const bagCount = bagCountRes.count ?? 0
        if (bagCount >= bagCapacity) {
            return NextResponse.json(
                { error: 'bag_full', bagCount, bagCapacity },
                { status: 409 },
            )
        }

        // ── stock check + decrement (also derives per-pack discount) ─────────
        let cost = 0
        if (!effectiveFree) {
            const { stock, discounts } = await getOrRefreshStock(supabase, user.id)
            const available = stock[setId] ?? 0
            if (available <= 0) {
                return NextResponse.json(
                    { error: 'insufficient_stock', available: 0 },
                    { status: 409 },
                )
            }
            const packDiscount = discounts[setId] ?? 0
            cost = parseFloat((baseCost * costDiscount * (1 - packDiscount)).toFixed(2))

            // Re-check coins with the final cost (pack discount may have lowered it)
            if (cost > 0 && (profile?.coins ?? 0) < cost) {
                return NextResponse.json(
                    { error: 'insufficient_coins', cost, coins: profile?.coins ?? 0 },
                    { status: 402 },
                )
            }

            await supabase
                .from('pack_stock')
                .update({ quantity: available - 1 })
                .eq('user_id', user.id)
                .eq('pack_id', setId)
        }

        if (allCards.length === 0) {
            return NextResponse.json(
                { error: 'No cards in set' },
                { status: 400 },
            )
        }

        // group cards by rarity in memory — no more per-slot DB queries
        const byRarity = new Map<string, CardRow[]>()
        for (const card of allCards) {
            const r = card.rarity as string
            if (!byRarity.has(r)) byRarity.set(r, [])
            byRarity.get(r)!.push(card)
        }

        const isSpecialBox = byRarity.size === 1 && byRarity.has('???')

        const pickedCards: CardRow[] = []

        const cardPool = isSpecialBox
            ? allCards.map((c) => ({
                  id: c.id,
                  image_url: c.image_url,
                  name: c.name,
                  rarity: c.rarity,
              }))
            : undefined

        const luckBoost = await getEventMagnitude('luck_boost')
        const todayEvents = await getTodayEvents()
        const extraCard = todayEvents.some((e) => e.effect === 'extra_card')

        // Apply luckBoost to a weight table (boosts Rare+ entries)
        function applyBoost(base: Record<string, number>): Record<string, number> {
            if (luckBoost <= 1) return base
            const highRarities = new Set(['Rare', 'Epic', 'Mythical', 'Legendary', 'Divine', 'Celestial', '???'])
            const out: Record<string, number> = {}
            for (const [r, w] of Object.entries(base)) {
                out[r] = highRarities.has(r) ? w * luckBoost : w
            }
            return out
        }

        // Pick a card from byRarity using the given weight table; retries up to 10x
        function pickCard(weights: Record<string, number>): CardRow | null {
            const boosted = applyBoost(weights)
            for (let attempt = 0; attempt < 10; attempt++) {
                const rarity = pickRarityFromWeights(boosted)
                const pool = byRarity.get(rarity)
                if (pool && pool.length > 0)
                    return pool[Math.floor(Math.random() * pool.length)]
            }
            return null
        }

        if (isSpecialBox) {
            const pool = byRarity.get('???')!
            pickedCards.push(pool[Math.floor(Math.random() * pool.length)])
        } else if (packDef?.card_count) {
            // Custom card count: (count-2) bulk + 1 uncommon+ + 1 guaranteed rare+
            const bulkSlots = packDef.card_count - 2
            for (let i = 0; i < bulkSlots; i++) {
                const card = pickCard(WEIGHTS_BULK)
                if (card) pickedCards.push(card)
            }
            const uncommonCard = pickCard(WEIGHTS_UNCOMMON_PLUS)
            if (uncommonCard) pickedCards.push(uncommonCard)
            const rareCard = pickCard(WEIGHTS_RARE_PLUS)
            if (rareCard) pickedCards.push(rareCard)
        } else {
            // Slots 1–4: bulk (mostly common, small chance of uncommon+)
            for (let i = 0; i < 4; i++) {
                const card = pickCard(WEIGHTS_BULK)
                if (card) pickedCards.push(card)
            }

            // Slot 5: elevated odds (not guaranteed — ~70% uncommon+, ~30% common)
            const guaranteedCard = pickCard(WEIGHTS_SLOT5)
            if (guaranteedCard) pickedCards.push(guaranteedCard)

            // Hidden 8% chance for a bonus 6th card (guaranteed rare+)
            const bonusHit = Math.random() < BONUS_CARD_CHANCE
            if (bonusHit || extraCard) {
                const bonusCard = pickCard(WEIGHTS_RARE_PLUS)
                if (bonusCard) pickedCards.push(bonusCard)
            }
        }

        // ── God Pack: 0.3% chance — replace all cards with Mythical+, no dups ──
        let isGodPack = false
        if (!isSpecialBox && Math.random() < GOD_PACK_CHANCE) {
            // Build a mutable no-dup pool of all Mythical+ cards in this set
            const godPool: CardRow[] = []
            for (const r of GOD_PACK_RARITIES) {
                const bucket = byRarity.get(r)
                if (bucket) godPool.push(...bucket)
            }
            if (godPool.length >= pickedCards.length) {
                isGodPack = true
                // Fisher-Yates shuffle then slice
                for (let i = godPool.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1))
                    ;[godPool[i], godPool[j]] = [godPool[j], godPool[i]]
                }
                pickedCards.splice(0, pickedCards.length, ...godPool.slice(0, pickedCards.length))
            }
        }

        // 1st edition packs guarantee at least one Epic+ card
        if (setId.endsWith('-1ed')) {
            const WEIGHTS_EPIC_PLUS: Record<string, number> = {
                Epic: 70,
                Mythical: 18,
                Legendary: 8,
                Divine: 3,
                Celestial: 0.8,
                '???': 0.2,
            }
            const hasEpicPlus = pickedCards.some(
                (c) => (RARITY_RANK[c.rarity as string] ?? 0) >= RARITY_RANK['Epic'],
            )
            if (!hasEpicPlus) {
                const epicCard = pickCard(WEIGHTS_EPIC_PLUS)
                if (epicCard) {
                    // replace the lowest-rarity card
                    let lowestIdx = 0
                    for (let i = 1; i < pickedCards.length; i++) {
                        if ((RARITY_RANK[pickedCards[i].rarity as string] ?? 0) < (RARITY_RANK[pickedCards[lowestIdx].rarity as string] ?? 0)) {
                            lowestIdx = i
                        }
                    }
                    pickedCards[lowestIdx] = epicCard
                }
            }
        }

        const hitHighRarity = pickedCards.some((c) =>
            pityRarities.includes(c.rarity as string),
        )
        const newPityCounter = hitHighRarity
            ? 0
            : (profile?.pity_counter ?? 0) + 1

        const cardIds = pickedCards.map((c) => c.id)

        const oldLevel = profile?.level ?? 1
        const { xp: newXP, level: newLevel } = applyProfileXP(
            profile?.xp ?? 0,
            oldLevel,
            packXpGain(oldLevel),
        )

        // award level-up stash rewards for any levels crossed (fire-and-forget)
        void awardLevelUpRewards(supabase, user.id, oldLevel, newLevel)

        // update pity + coins + xp/level, increment user_metric_quest.packs_opened, and check ownership — in parallel
        const today = new Date().toISOString().slice(0, 10)
        const needsReset = profile?.daily_reset_date !== today
        const [, { data: owned }] = await Promise.all([
            supabase
                .from('profiles')
                .update({
                    pity_counter: newPityCounter,
                    coins: (profile?.coins ?? 0) - cost,
                    xp: newXP,
                    level: newLevel,
                    packs_opened: (profile?.packs_opened ?? 0) + 1,
                    daily_packs_today: needsReset
                        ? 1
                        : (profile?.daily_packs_today ?? 0) + 1,
                    daily_reset_date: today,
                })
                .eq('id', user.id),
            supabase
                .from('user_cards')
                .select('card_id')
                .eq('user_id', user.id)
                .in('card_id', cardIds),
        ])

        const newPacksOpened = (profile?.packs_opened ?? 0) + 1

        // Award pack-related achievements
        const earned = await getEarnedAchievements(user.id)
        const toAward: string[] = []
        if (!earned.has('pack_addict') && newPacksOpened >= 10) toAward.push('pack_addict')
        if (!earned.has('rising_star') && newLevel >= 5) toAward.push('rising_star')
        const pulledRarities = new Set(pickedCards.map(c => c.rarity as string))
        if (!earned.has('legend_puller') && pulledRarities.has('Legendary')) toAward.push('legend_puller')
        if (!earned.has('divine_puller') && pulledRarities.has('Divine')) toAward.push('divine_puller')
        if (!earned.has('celestial_puller') && pulledRarities.has('Celestial')) toAward.push('celestial_puller')
        if (!earned.has('mystery_puller') && pulledRarities.has('???')) toAward.push('mystery_puller')
        if (!earned.has('rare_finder') && pickedCards.some(c => ['Rare','Epic','Mythical','Legendary','Divine','Celestial','???'].includes(c.rarity as string))) toAward.push('rare_finder')
        if (!earned.has('first_pull')) toAward.push('first_pull')
        if (toAward.length) await awardAchievements(user.id, toAward)

        const ownedIds = new Set(owned?.map((o) => o.card_id) ?? [])

        // Fetch PokeAPI base stats concurrently for all picked cards
        const pokeDataResults = await Promise.allSettled(
            pickedCards.map(card =>
                (card.national_pokedex_number as number | null)
                    ? fetchPokemonData(card.national_pokedex_number as number)
                    : Promise.resolve(null)
            )
        )

        const cardsWithMeta = pickedCards.map((card, i) => {
            const rarity = card.rarity as string
            const previewAttrs = generateAttributes(rarity)
            const pokeData = pokeDataResults[i].status === 'fulfilled' ? pokeDataResults[i].value : null
            // Use real base stats if available, else fall back to rarity-only ranges
            const previewStats = rollStats(rarity, pokeData?.baseStats ?? undefined)
            const previewNature = rollNature(rarity)
            const cardLevel = randomCardLevel(rarity)
            const { storedWorth, ...buybackResult } = calculateBuyback(rarity, Number(card.market_price_usd) || 0, (card.set_id as string)?.endsWith('-1ed') ?? false)
            return {
                ...card,
                isNew: !ownedIds.has(card.id as string),
                worth: card.market_price_usd,
                storedWorth,
                coins: buybackResult.amount,
                pokedex_num: card.national_pokedex_number,
                card_level: cardLevel,
                ...previewAttrs,
                ...buybackResult,
                preview_stats: previewStats,
                preview_nature: previewNature,
            }
        })

        // Track N's quest progress for White Flare / Black Bolt packs (fire-and-forget)
        if (setId === 'sv10.5w' || setId === 'sv10.5b') {
            const field = setId === 'sv10.5w' ? 'opened_white_flare' : 'opened_black_bolt'
            void (async () => {
                try { await supabase.from('n_quest_progress').upsert({ user_id: user.id, [field]: true }, { onConflict: 'user_id' }) } catch {}
            })()
        }

        const newBR = await recalcBattleRating(supabase, user.id)
        const xpGained = packXpGain(oldLevel)
        return NextResponse.json({
            cards: cardsWithMeta,
            cardPool,
            godPack: isGodPack,
            luckyFree,
            newBR,
            xpGain: xpGained,
            oldLevel,
            newLevel,
            oldXP: profile?.xp ?? 0,
            newXP,
            xpRequired: xpForLevel(newLevel),
            leveledUp: newLevel > oldLevel,
        })
    } catch (err) {
        console.error('[open-pack] unhandled error:', err)
        return NextResponse.json(
            { error: 'Something went wrong' },
            { status: 500 },
        )
    }
}
