import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data } = await supabase
        .from('user_cards')
        .select('id, card_level, nature, stat_atk, stat_def, stat_spatk, stat_spdef, stat_spd, stat_accuracy, stat_evasion, moves, cards!inner(name, hp, rarity, image_url)')
        .eq('user_id', user.id)
        .limit(200)

    const cards = (data ?? []).map((row: any) => ({
        userCardId: row.id as string,
        name:       row.cards.name as string,
        hp:         (row.cards.hp as number) ?? 60,
        rarity:     row.cards.rarity as string,
        imageUrl:     row.cards.image_url as string,
        level:        (row.card_level as number) ?? 1,
        nature:       row.nature as string | null,
        pokemon_type: 'normal',
        atk:        row.stat_atk as number | null,
        def:        row.stat_def as number | null,
        spatk:      row.stat_spatk as number | null,
        spdef:      row.stat_spdef as number | null,
        spd:        row.stat_spd as number | null,
        accuracy:   row.stat_accuracy as number | null,
        evasion:    row.stat_evasion as number | null,
        moves:      row.moves ?? null,
    }))

    cards.sort((a, b) => b.hp - a.hp)

    return NextResponse.json({ cards })
}
