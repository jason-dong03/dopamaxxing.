import { applyXP, RARITY_XP } from '@/lib/rarityConfig'
import { createClient } from '@/lib/supabase/server'
import { NextResponse, NextRequest } from 'next/server'
import { getNewMovesInRange } from '@/lib/pokemon-moves'

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()
        if (!user)
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { userCardId, cardID } = await request.json()

        let userCard: Record<string, unknown> | null = null

        if (userCardId) {
            // Direct user_card row by id
            const { data } = await supabase
                .from('user_cards')
                .select('*, cards(rarity, national_pokedex_number)')
                .eq('id', userCardId)
                .eq('user_id', user.id)
                .single()
            userCard = data
        } else if (cardID) {
            // Legacy: auto-pick highest-level copy of this card
            const { data } = await supabase
                .from('user_cards')
                .select('*, cards(rarity, national_pokedex_number)')
                .eq('user_id', user.id)
                .eq('card_id', cardID)
                .order('card_level', { ascending: false })
                .limit(1)
                .single()
            userCard = data
        }

        if (!userCard)
            return NextResponse.json(
                { error: 'Card not found' },
                { status: 404 },
            )

        const cardInfo = userCard.cards as { rarity: string; national_pokedex_number: number | null }
        const rarity = cardInfo.rarity
        const oldLevel = userCard.card_level as number
        const { newLevel, newXP } = applyXP(
            oldLevel,
            userCard.card_xp as number,
            RARITY_XP[rarity],
            rarity,
        )
        const levelsGained = newLevel - oldLevel

        // Check for new learnable moves on level-up (fire-and-forget)
        let pendingMovesUpdate: unknown[] | undefined
        if (levelsGained > 0 && cardInfo.national_pokedex_number) {
            try {
                const newMoves = await getNewMovesInRange(
                    cardInfo.national_pokedex_number,
                    oldLevel,
                    newLevel,
                )
                if (newMoves.length > 0) {
                    const existing = (userCard.pending_moves as unknown[] | null) ?? []
                    pendingMovesUpdate = [...existing, ...newMoves]
                }
            } catch { /* optional */ }
        }

        const updatePayload: Record<string, unknown> = { card_level: newLevel, card_xp: newXP }
        if (pendingMovesUpdate) updatePayload.pending_moves = pendingMovesUpdate

        const today = new Date().toISOString().slice(0, 10)
        const [, { data: pData }] = await Promise.all([
            supabase.from('user_cards').update(updatePayload).eq('id', userCard.id as string),
            supabase.from('profiles').select('cards_fed, daily_cards_fed_today, daily_reset_date').eq('id', user.id).single(),
        ])
        const needsReset = pData?.daily_reset_date !== today
        await supabase.from('profiles').update({
            cards_fed: (pData?.cards_fed ?? 0) + 1,
            daily_cards_fed_today: needsReset ? 1 : (pData?.daily_cards_fed_today ?? 0) + 1,
            daily_reset_date: today,
        }).eq('id', user.id)

        return NextResponse.json({ newLevel, newXP, levelsGained, hasPendingMoves: !!pendingMovesUpdate })
    } catch {
        return NextResponse.json(
            { error: 'Something went wrong' },
            { status: 500 },
        )
    }
}
