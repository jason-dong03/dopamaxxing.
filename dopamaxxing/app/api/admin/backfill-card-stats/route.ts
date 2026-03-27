// POST /api/admin/backfill-card-stats
// Backfills missing stat_spd, moves, and pokemon_type for existing cards.
// Processes 50 cards per run — call repeatedly until "Done."
//
// NOTE: 'type' mode updates the `cards` table (pokemon_type column).
//       Make sure the column exists: ALTER TABLE cards ADD COLUMN pokemon_type text;
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { rollStats } from '@/lib/pokemon-stats'
import { fetchPokemonData, getInitialMoves } from '@/lib/pokemon-moves'

const BATCH_SIZE = 50

export async function POST(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: profile } = await admin
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { mode = 'both' } = await request.json().catch(() => ({})) as {
        mode?: 'spd' | 'moves' | 'type' | 'both'
    }

    let updated = 0
    const errors: string[] = []

    // ── Type backfill: operates on `cards` table ─────────────────────────────
    if (mode === 'type') {
        const { data: cards } = await admin
            .from('cards')
            .select('id, national_pokedex_number')
            .is('pokemon_type', null)
            .not('national_pokedex_number', 'is', null)
            .limit(BATCH_SIZE)

        if (!cards?.length) return NextResponse.json({ updated: 0, remaining: 'Done.' })

        await Promise.all(cards.map(async (card: any) => {
            const data = await fetchPokemonData(card.national_pokedex_number)
            if (!data) return
            const { error } = await admin
                .from('cards')
                .update({ pokemon_type: data.primaryType })
                .eq('id', card.id)
            if (error) errors.push(`${card.id}: ${error.message}`)
            else updated++
        }))

        return NextResponse.json({
            updated,
            errors: errors.length ? errors : undefined,
            remaining: cards.length === BATCH_SIZE ? 'Run again — more cards may need backfilling.' : 'Done.',
        })
    }

    // ── Spd / moves backfill: operates on `user_cards` table ─────────────────
    let q = admin
        .from('user_cards')
        .select('id, card_level, stat_atk, stat_spd, moves, cards!inner(rarity, national_pokedex_number)')
        .limit(BATCH_SIZE)

    if (mode === 'spd')   q = q.is('stat_spd', null).not('stat_atk', 'is', null)
    else if (mode === 'moves') q = q.is('moves', null)
    else                  q = q.or('stat_spd.is.null,moves.is.null') // both

    const { data: rows, error: fetchErr } = await q
    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    if (!rows?.length) return NextResponse.json({ updated: 0, remaining: 'Done.' })

    const dexNums = [...new Set((rows as any[]).map(r => r.cards?.national_pokedex_number).filter(Boolean))]
    const pokeMap = new Map<number, Awaited<ReturnType<typeof fetchPokemonData>>>()
    await Promise.all(dexNums.map(async dex => pokeMap.set(dex, await fetchPokemonData(dex))))

    await Promise.all((rows as any[]).map(async (row) => {
        const dex: number = row.cards?.national_pokedex_number
        const rarity: string = row.cards?.rarity ?? 'Common'
        const level: number = row.card_level ?? 1
        const pokeData = dex ? pokeMap.get(dex) : null
        const patch: Record<string, unknown> = {}

        if ((mode === 'spd' || mode === 'both') && row.stat_spd == null && row.stat_atk != null) {
            patch.stat_spd = rollStats(rarity, pokeData?.baseStats ?? undefined).stat_spd
        }
        if ((mode === 'moves' || mode === 'both') && row.moves == null) {
            const moves = await getInitialMoves(dex ?? 0, level)
            if (moves.length > 0) patch.moves = moves
        }
        if (!Object.keys(patch).length) return

        const { error } = await admin.from('user_cards').update(patch).eq('id', row.id)
        if (error) errors.push(`${row.id}: ${error.message}`)
        else updated++
    }))

    return NextResponse.json({
        updated,
        errors: errors.length ? errors : undefined,
        remaining: rows.length === BATCH_SIZE ? 'Run again — more cards may need backfilling.' : 'Done.',
    })
}
