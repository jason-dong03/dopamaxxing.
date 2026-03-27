import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import {
    calculateBuyback,
    WEIGHTS_BULK, WEIGHTS_UNCOMMON_PLUS, WEIGHTS_RARE_PLUS,
    BONUS_CARD_CHANCE, pickRarityFromWeights,
    applyProfileXP, XP_PER_PACK,
} from '@/lib/rarityConfig'
import { PACKS } from '@/lib/packs'
import { generateAttributes } from '@/lib/cardAttributes'
import { getEventMagnitude, getTodayEvents } from '@/lib/dailyEvents'
import { awardAchievements, getEarnedAchievements } from '@/lib/awardAchievement'
import { awardLevelUpRewards } from '@/lib/awardLevelUp'
import { rollStats, rollNature } from '@/lib/pokemon-stats'
import { fetchPokemonData } from '@/lib/pokemon-moves'

type CardRow = Record<string, unknown>

const RARITY_RANK: Record<string, number> = {
    '???': 8, Celestial: 7, Divine: 6, Legendary: 5,
    Mythical: 4, Epic: 3, Rare: 2, Uncommon: 1, Common: 0,
}
const pityRarities = ['Legendary', 'Divine', 'Celestial', '???']

const setCardsCache = new Map<string, { cards: CardRow[]; expires: number }>()

async function getCardsForSet(supabase: Awaited<ReturnType<typeof createClient>>, setId: string): Promise<CardRow[]> {
    const cached = setCardsCache.get(setId)
    if (cached && Date.now() < cached.expires) return cached.cards
    const { data } = await supabase.from('cards').select('*').eq('set_id', setId)
    const cards = (data as CardRow[]) ?? []
    setCardsCache.set(setId, { cards, expires: Date.now() + 60 * 60 * 1000 })
    return cards
}

async function getCardsForPokedexIds(
    supabase: Awaited<ReturnType<typeof createClient>>,
    cacheKey: string,
    dexIds: number[],
): Promise<CardRow[]> {
    const cached = setCardsCache.get(cacheKey)
    if (cached && Date.now() < cached.expires) return cached.cards
    const { data } = await supabase.from('cards').select('*').in('national_pokedex_number', dexIds)
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
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { setId, count: rawCount = 10, free = false } = await request.json()
        const count = Math.max(1, Math.min(10, Number(rawCount)))

        const packDef = PACKS.find((p) => p.id === setId)
        const baseCost = packDef?.cost ?? 0
        const costDiscount = await getEventMagnitude('cheap_packs')
        const costPerPack = free ? 0 : parseFloat((baseCost * costDiscount).toFixed(2))
        const totalCost = parseFloat((costPerPack * count).toFixed(2))

        const [{ data: profile }, allCards, bagCountRes, luckBoost, todayEvents] = await Promise.all([
            supabase
                .from('profiles')
                .select('pity_counter, pity_threshold, coins, xp, level, bag_capacity, daily_packs_today, daily_reset_date, packs_opened')
                .eq('id', user.id)
                .single(),
            packDef?.theme_pokedex_ids
                ? getCardsForPokedexIds(supabase, setId, packDef.theme_pokedex_ids)
                : getCardsForSet(supabase, setId),
            supabase.from('user_cards').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
            getEventMagnitude('luck_boost'),
            getTodayEvents(),
        ])

        const bagCapacity = profile?.bag_capacity ?? 50
        const bagCount = bagCountRes.count ?? 0
        if (bagCount >= bagCapacity) {
            return NextResponse.json({ error: 'bag_full', bagCount, bagCapacity }, { status: 409 })
        }

        if (totalCost > 0 && (profile?.coins ?? 0) < totalCost) {
            return NextResponse.json({ error: 'insufficient_coins', cost: totalCost, coins: profile?.coins ?? 0 }, { status: 402 })
        }

        if (allCards.length === 0) {
            return NextResponse.json({ error: 'No cards in set' }, { status: 400 })
        }

        const byRarity = new Map<string, CardRow[]>()
        for (const card of allCards) {
            const r = card.rarity as string
            if (!byRarity.has(r)) byRarity.set(r, [])
            byRarity.get(r)!.push(card)
        }

        const isSpecialBox = byRarity.size === 1 && byRarity.has('???')
        const extraCard = todayEvents.some((e) => e.effect === 'extra_card')

        function applyBoost(base: Record<string, number>): Record<string, number> {
            if (luckBoost <= 1) return base
            const highRarities = new Set(['Rare', 'Epic', 'Mythical', 'Legendary', 'Divine', 'Celestial', '???'])
            const out: Record<string, number> = {}
            for (const [r, w] of Object.entries(base)) out[r] = highRarities.has(r) ? w * luckBoost : w
            return out
        }

        function pickCard(weights: Record<string, number>): CardRow | null {
            const boosted = applyBoost(weights)
            for (let attempt = 0; attempt < 10; attempt++) {
                const rarity = pickRarityFromWeights(boosted)
                const pool = byRarity.get(rarity)
                if (pool && pool.length > 0) return pool[Math.floor(Math.random() * pool.length)]
            }
            return null
        }

        function pickPackCards(): CardRow[] {
            const picked: CardRow[] = []
            if (isSpecialBox) {
                const pool = byRarity.get('???')!
                picked.push(pool[Math.floor(Math.random() * pool.length)])
            } else if (packDef?.card_count) {
                const bulkSlots = packDef.card_count - 2
                for (let i = 0; i < bulkSlots; i++) { const c = pickCard(WEIGHTS_BULK); if (c) picked.push(c) }
                const u = pickCard(WEIGHTS_UNCOMMON_PLUS); if (u) picked.push(u)
                const r = pickCard(WEIGHTS_RARE_PLUS); if (r) picked.push(r)
            } else {
                for (let i = 0; i < 4; i++) { const c = pickCard(WEIGHTS_BULK); if (c) picked.push(c) }
                const g = pickCard(WEIGHTS_UNCOMMON_PLUS); if (g) picked.push(g)
                if (Math.random() < BONUS_CARD_CHANCE || extraCard) {
                    const b = pickCard(WEIGHTS_RARE_PLUS); if (b) picked.push(b)
                }
            }
            // 1st edition: guarantee Epic+
            if (setId.endsWith('-1ed')) {
                const WEIGHTS_EPIC_PLUS: Record<string, number> = {
                    Epic: 70, Mythical: 18, Legendary: 8, Divine: 3, Celestial: 0.8, '???': 0.2,
                }
                const hasEpicPlus = picked.some(c => (RARITY_RANK[c.rarity as string] ?? 0) >= RARITY_RANK['Epic'])
                if (!hasEpicPlus) {
                    const epicCard = pickCard(WEIGHTS_EPIC_PLUS)
                    if (epicCard) {
                        let lowestIdx = 0
                        for (let i = 1; i < picked.length; i++) {
                            if ((RARITY_RANK[picked[i].rarity as string] ?? 0) < (RARITY_RANK[picked[lowestIdx].rarity as string] ?? 0)) lowestIdx = i
                        }
                        picked[lowestIdx] = epicCard
                    }
                }
            }
            return picked
        }

        // Pick cards for all packs
        const allPicked: CardRow[] = []
        for (let i = 0; i < count; i++) {
            allPicked.push(...pickPackCards())
        }

        const hitHighRarity = allPicked.some(c => pityRarities.includes(c.rarity as string))
        const newPityCounter = hitHighRarity ? 0 : (profile?.pity_counter ?? 0) + 1

        const oldLevel = profile?.level ?? 1
        const { xp: newXP, level: newLevel } = applyProfileXP(profile?.xp ?? 0, oldLevel, XP_PER_PACK * count)
        void awardLevelUpRewards(supabase, user.id, oldLevel, newLevel)

        const today = new Date().toISOString().slice(0, 10)
        const needsReset = profile?.daily_reset_date !== today
        const allCardIds = allPicked.map(c => c.id as string)

        const [, { data: owned }] = await Promise.all([
            supabase.from('profiles').update({
                pity_counter: newPityCounter,
                coins: (profile?.coins ?? 0) - totalCost,
                xp: newXP,
                level: newLevel,
                packs_opened: (profile?.packs_opened ?? 0) + count,
                daily_packs_today: needsReset ? count : (profile?.daily_packs_today ?? 0) + count,
                daily_reset_date: today,
            }).eq('id', user.id),
            supabase.from('user_cards').select('card_id').eq('user_id', user.id).in('card_id', allCardIds),
        ])

        const newPacksOpened = (profile?.packs_opened ?? 0) + count
        const earned = await getEarnedAchievements(user.id)
        const toAward: string[] = []
        if (!earned.has('pack_addict') && newPacksOpened >= 10) toAward.push('pack_addict')
        if (!earned.has('rising_star') && newLevel >= 5) toAward.push('rising_star')
        const pulledRarities = new Set(allPicked.map(c => c.rarity as string))
        if (!earned.has('legend_puller') && pulledRarities.has('Legendary')) toAward.push('legend_puller')
        if (!earned.has('divine_puller') && pulledRarities.has('Divine')) toAward.push('divine_puller')
        if (!earned.has('celestial_puller') && pulledRarities.has('Celestial')) toAward.push('celestial_puller')
        if (!earned.has('mystery_puller') && pulledRarities.has('???')) toAward.push('mystery_puller')
        if (!earned.has('rare_finder') && allPicked.some(c => ['Rare','Epic','Mythical','Legendary','Divine','Celestial','???'].includes(c.rarity as string))) toAward.push('rare_finder')
        if (!earned.has('first_pull')) toAward.push('first_pull')
        if (toAward.length) await awardAchievements(user.id, toAward)

        // N quest tracking
        if (setId === 'sv10.5w' || setId === 'sv10.5b') {
            const field = setId === 'sv10.5w' ? 'opened_white_flare' : 'opened_black_bolt'
            void (async () => {
                try { await supabase.from('n_quest_progress').upsert({ user_id: user.id, [field]: true }, { onConflict: 'user_id' }) } catch {}
            })()
        }

        // Fetch PokeAPI data for all cards concurrently
        const ownedIds = new Set(owned?.map(o => o.card_id) ?? [])
        const pokeDataResults = await Promise.allSettled(
            allPicked.map(card =>
                (card.national_pokedex_number as number | null)
                    ? fetchPokemonData(card.national_pokedex_number as number)
                    : Promise.resolve(null)
            )
        )

        const cardsWithMeta = allPicked.map((card, i) => {
            const rarity = card.rarity as string
            const previewAttrs = generateAttributes(rarity)
            const pokeData = pokeDataResults[i].status === 'fulfilled' ? pokeDataResults[i].value : null
            const previewStats = rollStats(rarity, pokeData?.baseStats ?? undefined)
            const previewNature = rollNature(rarity)
            return {
                ...card,
                isNew: !ownedIds.has(card.id as string),
                worth: card.market_price_usd,
                pokedex_num: card.national_pokedex_number,
                ...previewAttrs,
                ...calculateBuyback(rarity, Number(card.market_price_usd) || 0, previewAttrs, (card.set_id as string)?.endsWith('-1ed') ?? false),
                preview_stats: previewStats,
                preview_nature: previewNature,
            }
        })

        return NextResponse.json({ cards: cardsWithMeta })
    } catch (err) {
        console.error('[open-pack-batch] unhandled error:', err)
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
}
