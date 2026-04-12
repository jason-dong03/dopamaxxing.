import { withExtensionAuth } from '@/lib/api/withExtensionAuth'
import { NextResponse } from 'next/server'
import { getMergedPacks } from '@/lib/packMeta'
import {
    calculateBuyback, randomCardLevel,
    WEIGHTS_RARE_PLUS, pickRarityFromWeights,
} from '@/lib/rarityConfig'
import { generateAttributes } from '@/lib/cardAttributes'
import { rollStats, rollNatureWithTier } from '@/lib/pokemon-stats'
import { fetchPokemonData } from '@/lib/pokemon-moves'
import { getOrRefreshStock } from '@/lib/packStock'

const RARITY_RANK: Record<string, number> = {
    '???': 8, Celestial: 7, Divine: 6, Legendary: 5,
    Mythical: 4, Epic: 3, Rare: 2, Uncommon: 1, Common: 0,
}
type CardRow = Record<string, unknown>

export const POST = withExtensionAuth(async ({ user, supabase }, request) => {
    const { packId } = await (request as Request).json()
    if (!packId) return NextResponse.json({ error: 'packId required' }, { status: 400 })

    const allPacks = await getMergedPacks(supabase)
    const packDef = allPacks.find(p => p.id === packId)
    if (!packDef || packDef.aspect !== 'box') {
        return NextResponse.json({ error: 'Invalid crate pack' }, { status: 400 })
    }

    const [{ data: profile }, { count: bagCount }] = await Promise.all([
        supabase.from('profiles').select('coins, is_admin, bag_capacity').eq('id', user.id).single(),
        supabase.from('user_cards').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ])

    const isAdmin = !!(profile as any)?.is_admin
    const bagCapacity = (profile as any)?.bag_capacity ?? 50
    if ((bagCount ?? 0) >= bagCapacity) {
        return NextResponse.json({ error: 'bag_full' }, { status: 409 })
    }

    if (!isAdmin) {
        // Check crate key
        const { data: crateKey } = await supabase
            .from('crate_keys').select('quantity')
            .eq('user_id', user.id).eq('pack_id', packId).single()
        const keyCount = (crateKey as any)?.quantity ?? 0
        if (keyCount < 1) {
            return NextResponse.json({ error: 'no_key' }, { status: 402 })
        }

        // Check stock
        const { stock } = await getOrRefreshStock(supabase, user.id)
        const available = stock[packId] ?? 0
        if (available <= 0) {
            return NextResponse.json({ error: 'insufficient_stock', available: 0 }, { status: 409 })
        }

        // Check coins
        const cost = packDef.cost ?? 0
        if (((profile as any)?.coins ?? 0) < cost) {
            return NextResponse.json({ error: 'insufficient_coins', cost, coins: (profile as any)?.coins ?? 0 }, { status: 402 })
        }

        // Deduct key, stock, coins in parallel
        await Promise.all([
            supabase.from('crate_keys').update({ quantity: Math.max(0, keyCount - 1) }).eq('user_id', user.id).eq('pack_id', packId),
            supabase.from('pack_stock').update({ quantity: available - 1 }).eq('user_id', user.id).eq('pack_id', packId),
            supabase.from('profiles').update({ coins: ((profile as any)?.coins ?? 0) - cost }).eq('id', user.id),
        ])
    }

    // Get cards for this pack
    let allCards: CardRow[] = []
    if (packDef.theme_pokedex_ids?.length) {
        const { data } = await supabase.from('cards').select('*').in('national_pokedex_number', packDef.theme_pokedex_ids)
        const seen = new Map<string, CardRow>()
        for (const card of (data ?? []) as CardRow[]) {
            const name = card.name as string
            const existing = seen.get(name)
            if (!existing || (RARITY_RANK[card.rarity as string] ?? 0) > (RARITY_RANK[existing.rarity as string] ?? 0)) {
                seen.set(name, card)
            }
        }
        allCards = Array.from(seen.values())
    } else {
        const { data } = await supabase.from('cards').select('*').eq('set_id', packId)
        allCards = (data as CardRow[]) ?? []
    }

    if (allCards.length === 0) {
        return NextResponse.json({ error: 'No cards in set' }, { status: 400 })
    }

    // Group by rarity and pick winner
    const byRarity = new Map<string, CardRow[]>()
    for (const card of allCards) {
        const r = card.rarity as string
        if (!byRarity.has(r)) byRarity.set(r, [])
        byRarity.get(r)!.push(card)
    }

    const isSpecialBox = byRarity.size === 1 && byRarity.has('???')
    let wonCard: CardRow
    if (isSpecialBox) {
        const pool = byRarity.get('???')!
        wonCard = pool[Math.floor(Math.random() * pool.length)]
    } else {
        let picked: CardRow | null = null
        for (let attempt = 0; attempt < 20; attempt++) {
            const rarity = pickRarityFromWeights(WEIGHTS_RARE_PLUS)
            const pool = byRarity.get(rarity)
            if (pool?.length) { picked = pool[Math.floor(Math.random() * pool.length)]; break }
        }
        wonCard = picked ?? allCards[Math.floor(Math.random() * allCards.length)]
    }

    // Card pool for reel animation (cards with images)
    const cardPool = allCards
        .filter(c => c.image_url)
        .map(c => ({ id: c.id, image_url: c.image_url, name: c.name, rarity: c.rarity }))

    // Generate metadata for won card
    const rarity = wonCard.rarity as string
    const previewAttrs = generateAttributes(rarity)
    const cardLevel = randomCardLevel(rarity)
    const pokeData = wonCard.national_pokedex_number
        ? await fetchPokemonData(wonCard.national_pokedex_number as number).catch(() => null)
        : null
    const previewStats = rollStats(rarity, pokeData?.baseStats ?? undefined)
    const { name: natureName } = rollNatureWithTier(rarity)
    const { storedWorth, ...buybackResult } = calculateBuyback(
        rarity,
        Number(wonCard.market_price_usd) || 0,
        (wonCard.set_id as string)?.endsWith('-1ed') ?? false,
    )

    const { data: existing } = await supabase
        .from('user_cards').select('id').eq('user_id', user.id).eq('card_id', wonCard.id).maybeSingle()

    return NextResponse.json({
        card: {
            ...wonCard,
            isNew: !existing,
            worth: wonCard.market_price_usd,
            storedWorth,
            coins: buybackResult.amount,
            card_level: cardLevel,
            pokedex_num: wonCard.national_pokedex_number,
            ...previewAttrs,
            ...buybackResult,
            preview_stats: previewStats,
            preview_nature: natureName,
        },
        cardPool,
    })
})

export const OPTIONS = withExtensionAuth(async () => NextResponse.json(null))
