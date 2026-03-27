import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { PACKS } from '@/lib/packs'

/**
 * GET /api/cron/daily-pack
 *
 * Runs daily via Vercel cron. Delivers one free pack to every user who hasn't
 * received one today. Pack is chosen by weighted-random from classic packs only
 * (aspect='pack', no theme_pokedex_ids) — cheaper packs have higher probability.
 *
 * Secured via Authorization: Bearer <CRON_SECRET>.
 */

// Classic packs only — no theme packs, no boxes, no test pack
const CLASSIC_PACKS = PACKS.filter(
    (p) => p.aspect === 'pack' && !p.theme_pokedex_ids && !p.test_override_url,
)

// Weighted inverse cost: cheaper = higher probability
const WEIGHTS = CLASSIC_PACKS.map((p) => 1 / p.cost)
const WEIGHT_SUM = WEIGHTS.reduce((a, b) => a + b, 0)

function pickWeightedPack(): string {
    let r = Math.random() * WEIGHT_SUM
    for (let i = 0; i < CLASSIC_PACKS.length; i++) {
        r -= WEIGHTS[i]
        if (r <= 0) return CLASSIC_PACKS[i].id
    }
    return CLASSIC_PACKS[CLASSIC_PACKS.length - 1].id
}

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization')
    const expected = `Bearer ${process.env.CRON_SECRET}`
    if (!process.env.CRON_SECRET || authHeader !== expected) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const today = new Date().toISOString().slice(0, 10)

    // Get all users who haven't received a daily pack today
    const { data: profiles, error: profileErr } = await supabase
        .from('profiles')
        .select('id')
        .or(`last_daily_pack_date.is.null,last_daily_pack_date.neq.${today}`)

    if (profileErr) {
        console.error('[cron/daily-pack] fetch profiles error:', profileErr.message)
        return NextResponse.json({ error: profileErr.message }, { status: 500 })
    }

    const users = profiles ?? []
    console.log(`[cron/daily-pack] delivering to ${users.length} users for ${today}`)

    if (users.length === 0) {
        return NextResponse.json({ ok: true, delivered: 0, date: today })
    }

    // Build pending_packs inserts + profile updates in batches of 100
    const BATCH = 100
    let delivered = 0

    for (let i = 0; i < users.length; i += BATCH) {
        const batch = users.slice(i, i + BATCH)

        const inserts = batch.map((u) => ({
            user_id: u.id,
            pack_id: pickWeightedPack(),
            source: 'daily',
        }))

        const { error: insertErr } = await supabase
            .from('pending_packs')
            .insert(inserts)

        if (insertErr) {
            console.error('[cron/daily-pack] insert error:', insertErr.message)
            continue
        }

        const { error: updateErr } = await supabase
            .from('profiles')
            .update({ last_daily_pack_date: today })
            .in('id', batch.map((u) => u.id))

        if (updateErr) {
            console.error('[cron/daily-pack] update error:', updateErr.message)
        }

        delivered += batch.length
    }

    console.log(`[cron/daily-pack] done — delivered ${delivered}/${users.length}`)
    return NextResponse.json({ ok: true, delivered, total: users.length, date: today })
}
