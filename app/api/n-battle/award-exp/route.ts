import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { applyXP, applyProfileXP } from '@/lib/rarityConfig'
import { awardLevelUpRewards } from '@/lib/awardLevelUp'

// POST /api/n-battle/award-exp
// Awards battle EXP to user cards after a won battle.
// Writes to card_xp (same column as feed-card) — unified XP system.

const EVOLVE_LEVEL_FALLBACK = 5   // fallback if PokeAPI lookup fails
const BATTLE_WIN_COINS_MIN = 80
const BATTLE_WIN_COINS_MAX = 180

/** Strip TCG suffixes and return a PokeAPI-compatible slug */
function toPokeSlug(cardName: string): string {
    return cardName
        .replace(/\s+(VMAX|VSTAR|GX|EX|V|TAG\s+TEAM|ex|gx|vmax|vstar)\b/gi, '')
        .replace(/[''']s\s+/i, '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
}

/** Traverse a PokeAPI evolution chain node looking for the min_level to evolve FROM targetName */
function findMinLevelInChain(node: any, targetName: string): number | null {
    if (node.species?.name === targetName) {
        for (const evo of (node.evolves_to ?? [])) {
            for (const detail of (evo.evolution_details ?? [])) {
                if (detail.trigger?.name === 'level-up' && detail.min_level != null) {
                    return detail.min_level as number
                }
            }
        }
        return null
    }
    for (const evo of (node.evolves_to ?? [])) {
        const found = findMinLevelInChain(evo, targetName)
        if (found !== null) return found
    }
    return null
}

/** Look up the PokeAPI min level to evolve a Pokémon. Returns fallback on any failure. */
async function getEvolutionMinLevel(cardName: string): Promise<number> {
    const slug = toPokeSlug(cardName)
    try {
        const specRes = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${slug}/`, {
            next: { revalidate: 86400 },
        })
        if (!specRes.ok) return EVOLVE_LEVEL_FALLBACK
        const species = await specRes.json()

        const chainRes = await fetch(species.evolution_chain.url, {
            next: { revalidate: 86400 },
        })
        if (!chainRes.ok) return EVOLVE_LEVEL_FALLBACK
        const chainData = await chainRes.json()

        const minLevel = findMinLevelInChain(chainData.chain, slug)
        return minLevel ?? EVOLVE_LEVEL_FALLBACK
    } catch {
        return EVOLVE_LEVEL_FALLBACK
    }
}

export async function POST(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { battleId } = await request.json() as { battleId: string }

    const { data: battle } = await supabase
        .from('n_battles')
        .select('user_cards, n_cards, status')
        .eq('id', battleId)
        .eq('user_id', user.id)
        .single()

    if (!battle || battle.status !== 'won') {
        return NextResponse.json({ error: 'Battle not found or not won' }, { status: 400 })
    }

    const userCardIds = (battle.user_cards as any[]).map((c: any) => c.id)

    // Fetch current card_xp + card_level + card name for evolution checks
    const { data: rows } = await supabase
        .from('user_cards')
        .select('id, card_xp, card_level, cards!inner(id, name, image_url, rarity, national_pokedex_number)')
        .eq('user_id', user.id)
        .in('id', userCardIds)

    if (!rows) return NextResponse.json({ ok: true, skipped: true })

    let levelUps = 0
    const leveledUpCards: { userCardId: string; cardName: string; oldLevel: number; newLevel: number }[] = []
    const perCard: { id: string; name: string; gained: number; newLevel: number | null }[] = []

    const updates = rows.map((row: any) => {
        const oldLevel   = row.card_level ?? 1
        const rarity     = row.cards.rarity ?? ''
        const expGained  = Math.floor((0.05 + Math.random() * 0.10) * 100)
        const { newLevel, newXP } = applyXP(oldLevel, row.card_xp ?? 0, expGained, rarity)
        if (newLevel > oldLevel) {
            levelUps++
            leveledUpCards.push({ userCardId: row.id, cardName: row.cards.name, oldLevel, newLevel })
            perCard.push({ id: row.id, name: row.cards.name, gained: expGained, newLevel })
        } else {
            perCard.push({ id: row.id, name: row.cards.name, gained: expGained, newLevel: null })
        }
        return { id: row.id, user_id: user.id, card_xp: newXP, card_level: newLevel }
    })

    const coinsAwarded = Math.floor(BATTLE_WIN_COINS_MIN + Math.random() * (BATTLE_WIN_COINS_MAX - BATTLE_WIN_COINS_MIN))

    const [{ error }] = await Promise.all([
        supabase.from('user_cards').upsert(updates, { onConflict: 'id' }),
        supabase.rpc('increment_coins', { uid: user.id, amount: coinsAwarded }),
    ])

    if (error) {
        console.warn('[award-exp] update failed', error.message)
        return NextResponse.json({ ok: true, skipped: true })
    }

    // Award stash rewards for card level-ups
    if (leveledUpCards.length > 0) {
        await Promise.all(
            leveledUpCards.map((lc) =>
                awardLevelUpRewards(supabase, user.id, lc.oldLevel, lc.newLevel)
            )
        )
    }

    // Award user profile XP for the battle win
    const { data: profile } = await supabase
        .from('profiles')
        .select('xp, level')
        .eq('id', user.id)
        .single()

    const oldUserLevel = profile?.level ?? 1
    const userXpGained = Math.round(25 * Math.sqrt(oldUserLevel))
    const { xp: newUserXP, level: newUserLevel } = applyProfileXP(profile?.xp ?? 0, oldUserLevel, userXpGained)
    await supabase.from('profiles').update({ xp: newUserXP, level: newUserLevel }).eq('id', user.id)
    if (newUserLevel > oldUserLevel) {
        await awardLevelUpRewards(supabase, user.id, oldUserLevel, newUserLevel)
    }

    // Check which leveled-up cards have reached EVOLVE_LEVEL and have an evolution
    const evolveEligible: {
        userCardId: string
        cardName: string
        newLevel: number
        evolution: { id: string; name: string; image_url: string | null; rarity: string }
    }[] = []

    for (const lc of leveledUpCards) {
        const evolutionMinLevel = await getEvolutionMinLevel(lc.cardName)
        if (lc.newLevel < evolutionMinLevel) continue
        const { data: evoCard } = await supabase
            .from('cards')
            .select('id, name, image_url, rarity')
            .eq('evolves_from', lc.cardName)
            .limit(1)
            .maybeSingle()
        if (evoCard) {
            evolveEligible.push({ ...lc, evolution: evoCard as any })
        }
    }

    return NextResponse.json({ ok: true, cardCount: updates.length, levelUps, evolveEligible, perCard, coinsAwarded, userXpGained, userLevel: newUserLevel })
}
