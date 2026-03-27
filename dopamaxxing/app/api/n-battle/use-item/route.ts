import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { BattleCard } from '@/lib/n-battle'

export async function POST(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { battleId, item } = await request.json() as { battleId: string; item: string }

    const { data: battle } = await supabase
        .from('n_battles')
        .select('*')
        .eq('id', battleId)
        .eq('user_id', user.id)
        .single()

    if (!battle || battle.status !== 'active') {
        return NextResponse.json({ error: 'Battle not found or not active' }, { status: 404 })
    }

    let userCards: BattleCard[] = [...battle.user_cards]
    const uIdx: number = battle.user_active_index

    // Check the user actually owns this item
    const { data: itemRow } = await supabase
        .from('user_items')
        .select('quantity')
        .eq('user_id', user.id)
        .eq('item_id', item)
        .maybeSingle()

    const qty = itemRow?.quantity ?? 0
    if (qty <= 0) return NextResponse.json({ error: 'Item not available' }, { status: 400 })

    if (item === 'full-heal') {
        const card = userCards[uIdx]
        if (card.statusEffect === 'none') {
            return NextResponse.json({ error: 'No status to cure' }, { status: 400 })
        }
        userCards[uIdx] = { ...card, statusEffect: 'none', statusTurns: 0 }
    } else {
        return NextResponse.json({ error: 'Unknown item' }, { status: 400 })
    }

    // Decrement item count
    await supabase
        .from('user_items')
        .upsert({ user_id: user.id, item_id: item, quantity: qty - 1, updated_at: new Date().toISOString() }, { onConflict: 'user_id,item_id' })

    const { data: updated } = await supabase
        .from('n_battles')
        .update({ user_cards: userCards })
        .eq('id', battleId)
        .select('*')
        .single()

    return NextResponse.json({ battle: updated })
}
