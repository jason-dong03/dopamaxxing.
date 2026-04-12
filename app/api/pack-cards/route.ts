import { createClient } from '@/lib/supabase/server'
import { NextResponse, NextRequest } from 'next/server'
import { getMergedPacks } from '@/lib/packMeta'

export async function GET(request: NextRequest) {
    const id = request.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const supabase = await createClient()
    const allPacks = await getMergedPacks(supabase)
    const pack = allPacks.find((p) => p.id === id)
    if (!pack) return NextResponse.json({ error: 'Pack not found' }, { status: 404 })

    let query = supabase
        .from('cards')
        .select('id, name, rarity, hp, market_price_usd, image_url, national_pokedex_number')
        .order('rarity', { ascending: true })
        .order('name', { ascending: true })

    if (pack.theme_pokedex_ids) {
        query = query.in('national_pokedex_number', pack.theme_pokedex_ids)
    } else {
        query = query.eq('set_id', id)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    let cards = data ?? []

    // For theme packs (cross-set queries), deduplicate by Pokémon name — keep the
    // highest-rarity version so the list shows one canonical card per Pokémon.
    if (pack.theme_pokedex_ids) {
        const RARITY_RANK: Record<string, number> = {
            '???': 8, Celestial: 7, Divine: 6, Legendary: 5,
            Mythical: 4, Epic: 3, Rare: 2, Uncommon: 1, Common: 0,
        }
        const seen = new Map<string, typeof cards[number]>()
        for (const card of cards) {
            const existing = seen.get(card.name)
            if (!existing || (RARITY_RANK[card.rarity] ?? 0) > (RARITY_RANK[existing.rarity] ?? 0)) {
                seen.set(card.name, card)
            }
        }
        cards = Array.from(seen.values())
    }

    // check which cards the current user owns
    let ownedCardIds: string[] = []
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
        const cardIds = cards.map((c) => c.id)
        const { data: owned } = await supabase
            .from('user_cards')
            .select('card_id')
            .eq('user_id', user.id)
            .in('card_id', cardIds)
        ownedCardIds = (owned ?? []).map((r) => r.card_id)
    }

    return NextResponse.json({ cards, total: cards.length, ownedCardIds })
}
