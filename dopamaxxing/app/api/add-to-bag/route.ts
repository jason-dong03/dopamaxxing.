import { createClient } from '@/lib/supabase/server'
import { NextResponse, NextRequest } from 'next/server'
import { generateAttributes } from '@/lib/cardAttributes'
import { getEventMagnitude } from '@/lib/dailyEvents'
import { awardAchievements, getEarnedAchievements } from '@/lib/awardAchievement'
import { rollStats, rollNature, applyNatureToStats, type CardStats } from '@/lib/pokemon-stats'
import { fetchPokemonData, getInitialMoves, type StoredMove } from '@/lib/pokemon-moves'

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user)
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { cardId, worth, isHot, rarity, attrs: previewAttrs, previewStats, previewNature } = await request.json()

        // Check bag capacity
        const [{ count: cardCount }, { data: profileData }] = await Promise.all([
            supabase.from('user_cards').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
            supabase.from('profiles').select('bag_capacity').eq('id', user.id).single(),
        ])
        const capacity = profileData?.bag_capacity ?? 50
        if ((cardCount ?? 0) >= capacity) {
            return NextResponse.json({ error: 'Bag full', capacity, count: cardCount }, { status: 409 })
        }

        // Use pre-rolled attrs from reveal if provided, otherwise generate fresh
        const attrs = (previewAttrs?.attr_centering != null && previewAttrs?.attr_corners != null)
            ? previewAttrs
            : generateAttributes(rarity ?? 'Common')

        // Apply attr_boost event
        const attrBoost = (await getEventMagnitude('attr_boost')) > 1.0 ? 1.0 : 0
        const boostedAttrs = attrBoost > 0 ? {
            attr_centering: Math.min(10, attrs.attr_centering + attrBoost),
            attr_corners:   Math.min(10, attrs.attr_corners   + attrBoost),
            attr_edges:     Math.min(10, attrs.attr_edges     + attrBoost),
            attr_surface:   Math.min(10, attrs.attr_surface   + attrBoost),
        } : attrs

        const natureName = previewNature !== undefined ? previewNature : rollNature(rarity ?? 'Common')

        // ── PokeAPI: fetch base stats + moves in one call ─────────────────
        let rolledStats: CardStats = rollStats(rarity ?? 'Common') // fallback (no dex data)
        let initialMoves: StoredMove[] = []
        try {
            const { data: cardRow } = await supabase
                .from('cards')
                .select('national_pokedex_number')
                .eq('id', cardId)
                .single()
            const dexNum = cardRow?.national_pokedex_number
            if (dexNum) {
                const [pokeData, moves] = await Promise.all([
                    fetchPokemonData(dexNum),
                    getInitialMoves(dexNum, 1),
                ])
                // Stats use real base stats × rarity multiplier × ±15% variance
                if (pokeData) rolledStats = rollStats(rarity ?? 'Common', pokeData.baseStats)
                initialMoves = moves
            }
        } catch { /* PokeAPI is optional — falls back to rarity ranges */ }

        // If pack-reveal pre-rolled stats were provided, prefer those
        const rawStats: CardStats = (previewStats && previewStats.stat_atk != null)
            ? previewStats
            : rolledStats
        const finalStats = applyNatureToStats(rawStats, natureName)

        const { error } = await supabase.from('user_cards').insert({
            user_id: user.id,
            card_id: cardId,
            card_xp: 0,
            card_level: 1,
            is_favorited: false,
            worth,
            is_hot: isHot,
            ...boostedAttrs,
            ...finalStats,
            nature: natureName,
            moves: initialMoves.length > 0 ? initialMoves : null,
        })
        if (error) console.error('Error inserting card:', error)

        // Award achievements fire-and-forget
        void (async () => {
            try {
                const earned = await getEarnedAchievements(user.id)
                const toAward: string[] = []

                if (!earned.has('first_pull')) toAward.push('first_pull')

                const highRarities = ['Rare', 'Epic', 'Mythical', 'Legendary', 'Divine', 'Celestial', '???']
                if (!earned.has('rare_finder') && highRarities.includes(rarity)) toAward.push('rare_finder')
                if (!earned.has('legend_puller') && ['Legendary', 'Divine', 'Celestial', '???'].includes(rarity)) toAward.push('legend_puller')
                if (!earned.has('divine_puller') && rarity === 'Divine') toAward.push('divine_puller')
                if (!earned.has('celestial_puller') && rarity === 'Celestial') toAward.push('celestial_puller')
                if (!earned.has('mystery_puller') && rarity === '???') toAward.push('mystery_puller')

                const { count: newCount } = await supabase
                    .from('user_cards')
                    .select('id', { count: 'exact', head: true })
                    .eq('user_id', user.id)
                if (!earned.has('collector_10') && (newCount ?? 0) >= 10) toAward.push('collector_10')
                if (!earned.has('collector_50') && (newCount ?? 0) >= 50) toAward.push('collector_50')
                if (!earned.has('bag_full') && (newCount ?? 0) >= (profileData?.bag_capacity ?? 50)) toAward.push('bag_full')

                if (toAward.length) await awardAchievements(user.id, toAward)
            } catch { /* ignore */ }
        })()

        return NextResponse.json({ success: true, attrs: boostedAttrs })
    } catch {
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
}
