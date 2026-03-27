import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/n-battle/award-exp
// Awards battle EXP to user cards after a won battle.
// Requires an `exp` integer column on the `user_cards` table.
// Run in Supabase SQL editor: ALTER TABLE user_cards ADD COLUMN IF NOT EXISTS exp integer NOT NULL DEFAULT 0;

const EXP_PER_LEVEL = 50
const EVOLVE_LEVEL  = 5   // card_level at which evolution becomes available

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

    // Fetch current exp + card_level + card name for evolution checks
    const { data: rows } = await supabase
        .from('user_cards')
        .select('id, exp, card_level, cards!inner(id, name, image_url, rarity)')
        .eq('user_id', user.id)
        .in('id', userCardIds)

    if (!rows) return NextResponse.json({ ok: true, skipped: true })

    let levelUps = 0
    const leveledUpCards: { userCardId: string; cardName: string; newLevel: number }[] = []

    const updates = rows.map((row: any) => {
        const level      = row.card_level ?? 1
        const expGained  = Math.floor((0.05 + Math.random() * 0.10) * level * EXP_PER_LEVEL)
        const newExp     = (row.exp ?? 0) + expGained
        const threshold = level * EXP_PER_LEVEL
        if (newExp >= threshold) {
            levelUps++
            const newLevel = level + 1
            leveledUpCards.push({ userCardId: row.id, cardName: row.cards.name, newLevel })
            return { id: row.id, user_id: user.id, exp: newExp - threshold, card_level: newLevel }
        }
        return { id: row.id, user_id: user.id, exp: newExp }
    })

    const { error } = await supabase
        .from('user_cards')
        .upsert(updates, { onConflict: 'id' })

    if (error) {
        console.warn('[award-exp] update failed (add exp column?)', error.message)
        return NextResponse.json({ ok: true, skipped: true })
    }

    // Check which leveled-up cards have reached EVOLVE_LEVEL and have an evolution
    const evolveEligible: {
        userCardId: string
        cardName: string
        newLevel: number
        evolution: { id: string; name: string; image_url: string | null; rarity: string }
    }[] = []

    for (const lc of leveledUpCards) {
        if (lc.newLevel < EVOLVE_LEVEL) continue
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

    return NextResponse.json({ ok: true, cardCount: updates.length, levelUps, evolveEligible })
}
