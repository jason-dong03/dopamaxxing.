// GET  /api/battle-lineup  — returns saved preset lineup IDs + card details
// POST /api/battle-lineup  — saves a new preset lineup (1–5 cards)
//
// Requires: ALTER TABLE profiles ADD COLUMN IF NOT EXISTS battle_lineup text[];
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
        .from('profiles')
        .select('battle_lineup')
        .eq('id', user.id)
        .single()

    const lineup: string[] = (profile as any)?.battle_lineup ?? []

    if (!lineup.length) return NextResponse.json({ lineup: [], cards: [] })

    // Fetch card details for the lineup
    const { data: rows } = await supabase
        .from('user_cards')
        .select('id, card_level, cards!inner(id, name, image_url, rarity)')
        .in('id', lineup)
        .eq('user_id', user.id)

    // Preserve lineup order
    const cardMap = Object.fromEntries((rows ?? []).map((r: any) => [r.id, r]))
    const cards = lineup.map(id => cardMap[id]).filter(Boolean)

    return NextResponse.json({ lineup, cards })
}

export async function POST(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { lineup } = await request.json() as { lineup: string[] }
    if (!Array.isArray(lineup) || lineup.length < 1 || lineup.length > 5) {
        return NextResponse.json({ error: 'Lineup must be 1–5 card IDs' }, { status: 400 })
    }

    // Verify ownership of all cards
    const { data: rows } = await supabase
        .from('user_cards')
        .select('id')
        .eq('user_id', user.id)
        .in('id', lineup)

    if (!rows || rows.length !== lineup.length) {
        return NextResponse.json({ error: 'Invalid card selection' }, { status: 400 })
    }

    const { error } = await supabase
        .from('profiles')
        .update({ battle_lineup: lineup } as any)
        .eq('id', user.id)

    if (error) {
        console.warn('[battle-lineup] update failed:', error.message)
        return NextResponse.json({ error: 'Failed to save lineup. Run: ALTER TABLE profiles ADD COLUMN IF NOT EXISTS battle_lineup text[];' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
}
