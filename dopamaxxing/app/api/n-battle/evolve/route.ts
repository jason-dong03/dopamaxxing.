import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/n-battle/evolve
// Creates a new user_card for the evolved form of the given card.
// transferLevel=true  → new card inherits the current card_level
// transferLevel=false → new card starts at level 1
export async function POST(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { userCardId, transferLevel } = await request.json() as {
        userCardId: string
        transferLevel: boolean
    }

    // Fetch the user card + its card data
    const { data: userCard } = await supabase
        .from('user_cards')
        .select('id, card_level, exp, moves, cards!inner(id, name, rarity, image_url)')
        .eq('id', userCardId)
        .eq('user_id', user.id)
        .single()

    if (!userCard) return NextResponse.json({ error: 'Card not found' }, { status: 404 })

    const card = (userCard as any).cards
    if (!card) return NextResponse.json({ error: 'Card data missing' }, { status: 400 })

    // Find the evolution in the cards table
    const { data: evoCard } = await supabase
        .from('cards')
        .select('id, name, rarity, image_url')
        .eq('evolves_from', card.name)
        .limit(1)
        .maybeSingle()

    if (!evoCard) return NextResponse.json({ error: 'No evolution found' }, { status: 400 })

    // Check user doesn't already own this evolved card from this evolution
    // (allow multiple — just insert a new one)
    const newLevel = transferLevel ? (userCard.card_level ?? 1) : 1
    const { data: newUserCard, error } = await supabase
        .from('user_cards')
        .insert({
            user_id:    user.id,
            card_id:    evoCard.id,
            card_level: newLevel,
            exp:        transferLevel ? (userCard.exp ?? 0) : 0,
            moves:      userCard.moves ?? null,
        })
        .select('id, card_level, exp, cards!inner(id, name, rarity, image_url)')
        .single()

    if (error || !newUserCard) {
        console.error('[evolve] insert failed:', error?.message)
        return NextResponse.json({ error: 'Failed to create evolved card' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, newUserCard })
}
