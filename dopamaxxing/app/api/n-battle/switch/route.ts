import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { BattleCard } from '@/lib/n-battle'

export async function POST(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { battleId, toIndex } = await request.json() as { battleId: string; toIndex: number }

    const { data: battle } = await supabase
        .from('n_battles')
        .select('*')
        .eq('id', battleId)
        .eq('user_id', user.id)
        .single()

    if (!battle || battle.status !== 'active') {
        return NextResponse.json({ error: 'Battle not found or not active' }, { status: 404 })
    }

    const userCards: BattleCard[] = battle.user_cards
    const target = userCards[toIndex]

    if (!target || target.hp <= 0) {
        return NextResponse.json({ error: 'Cannot switch to fainted Pokémon' }, { status: 400 })
    }

    if (toIndex === battle.user_active_index) {
        return NextResponse.json({ error: 'Already active' }, { status: 400 })
    }

    const { data: updated } = await supabase
        .from('n_battles')
        .update({ user_active_index: toIndex })
        .eq('id', battleId)
        .select('*')
        .single()

    return NextResponse.json({ battle: updated })
}
