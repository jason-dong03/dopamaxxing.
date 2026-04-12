import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getMergedPacks } from '@/lib/packMeta'
import type { Pack } from '@/lib/packs'

/**
 * GET /api/cron/daily-pack
 *
 * Runs daily via Vercel cron. Delivers one free pack to every user who hasn't
 * received one today. Pack is chosen by weighted-random from classic packs only
 * (aspect='pack', no theme_pokedex_ids) — cheaper packs have higher probability.
 *
 * Secured via Authorization: Bearer <CRON_SECRET>.
 */

function pickWeightedPack(classicPacks: Pack[]): string {
    const weights = classicPacks.map((p) => 1 / p.cost)
    const weightSum = weights.reduce((a, b) => a + b, 0)
    let r = Math.random() * weightSum
    for (let i = 0; i < classicPacks.length; i++) {
        r -= weights[i]
        if (r <= 0) return classicPacks[i].id
    }
    return classicPacks[classicPacks.length - 1].id
}

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization')
    const expected = `Bearer ${process.env.CRON_SECRET}`
    if (!process.env.CRON_SECRET || authHeader !== expected) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    const allPacks = await getMergedPacks(supabase)
    const classicPacks = allPacks.filter(
        (p) => p.aspect === 'pack' && !p.theme_pokedex_ids && !(p as any).test,
    )

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
            pack_id: pickWeightedPack(classicPacks),
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
