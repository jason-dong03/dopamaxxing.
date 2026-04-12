import { withExtensionAuth } from '@/lib/api/withExtensionAuth'
import { NextResponse } from 'next/server'
import { generateAttributes } from '@/lib/cardAttributes'
import { rollStats, rollNature, applyNatureToStats } from '@/lib/pokemon-stats'
import { fetchPokemonData, getInitialMoves } from '@/lib/pokemon-moves'

export const POST = withExtensionAuth(async ({ user, supabase }, request) => {
    const { cardId, worth, rarity, cardLevel, attrs, previewStats, previewNature } =
        await (request as Request).json()

    const [{ count: cardCount }, { data: profileData }] = await Promise.all([
        supabase.from('user_cards').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('profiles').select('bag_capacity').eq('id', user.id).single(),
    ])
    const capacity = (profileData as any)?.bag_capacity ?? 50
    if ((cardCount ?? 0) >= capacity) {
        return NextResponse.json({ error: 'Bag full', capacity, count: cardCount }, { status: 409 })
    }

    const finalAttrs = (attrs?.attr_centering != null && attrs?.attr_corners != null)
        ? attrs
        : generateAttributes(rarity ?? 'Common')

    const natureName = previewNature ?? rollNature(rarity ?? 'Common')

    let rolledStats = rollStats(rarity ?? 'Common')
    let initialMoves: unknown[] = []
    try {
        const { data: cardRow } = await supabase.from('cards').select('national_pokedex_number').eq('id', cardId).single()
        const dexNum = (cardRow as any)?.national_pokedex_number
        if (dexNum) {
            const [pokeData, moves] = await Promise.all([
                fetchPokemonData(dexNum),
                getInitialMoves(dexNum, cardLevel ?? 1),
            ])
            if (pokeData) rolledStats = rollStats(rarity ?? 'Common', pokeData.baseStats)
            initialMoves = moves
        }
    } catch { /* PokeAPI is optional */ }

    const rawStats = (previewStats?.stat_atk != null) ? previewStats : rolledStats
    const finalStats = applyNatureToStats(rawStats, natureName)

    const { error } = await supabase.from('user_cards').insert({
        user_id: user.id,
        card_id: cardId,
        card_xp: 0,
        card_level: cardLevel ?? 1,
        is_favorited: false,
        worth,
        is_hot: false,
        ...finalAttrs,
        ...finalStats,
        nature: natureName,
        moves: initialMoves.length > 0 ? initialMoves : null,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
})

export const OPTIONS = withExtensionAuth(async () => NextResponse.json(null))
