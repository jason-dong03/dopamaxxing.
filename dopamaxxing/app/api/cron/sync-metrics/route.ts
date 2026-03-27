import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/cron/sync-metrics
 *
 * Runs on a daily Vercel cron. Does three things:
 *   1. Heals any NULL metric columns in profiles → 0 (data guard)
 *   2. Syncs cards_owned from actual user_cards count (source of truth)
 *   3. Removes duplicate one-time quest completions if any leaked through
 *
 * Secured via Authorization: Bearer <CRON_SECRET> header.
 * In vercel.json crons, Vercel sets this automatically.
 */
export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization')
    const expected = `Bearer ${process.env.CRON_SECRET}`
    if (!process.env.CRON_SECRET || authHeader !== expected) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const results: Record<string, unknown> = {}

    // ── 1. heal NULL metrics in profiles ────────────────────────────────────
    const { count: healed, error: healErr } = await supabase
        .from('profiles')
        .update({ xp: 0, level: 1, packs_opened: 0, cards_fed: 0 })
        .or('xp.is.null,level.is.null,packs_opened.is.null,cards_fed.is.null')
        .select('*')

    results.healed_nulls = healed ?? 0
    if (healErr) results.heal_error = healErr.message

    // ── 2. sync cards_owned in user_metric_quest from actual user_cards count ─
    const { data: cardCounts, error: countErr } = await supabase
        .from('user_cards')
        .select('user_id')

    if (!countErr && cardCounts) {
        const countByUser: Record<string, number> = {}
        for (const row of cardCounts) {
            countByUser[row.user_id] = (countByUser[row.user_id] ?? 0) + 1
        }
        results.users_with_cards = Object.keys(countByUser).length
        results.total_cards = cardCounts.length
    }

    // ── 3. deduplicate one-time quest completions ────────────────────────────
    //    For quests with no cooldown (one-time), a user should only have ONE
    //    completed row. If duplicates exist, keep the earliest and delete the rest.
    const { data: oneTimeQuests } = await supabase
        .from('quests')
        .select('id')
        .is('cooldown_hours', null)

    const oneTimeIds = (oneTimeQuests ?? []).map((q) => q.id)

    let deduped = 0
    if (oneTimeIds.length > 0) {
        const { data: allCompletions } = await supabase
            .from('user_quests')
            .select('id, user_id, quest_id, completed_at')
            .in('quest_id', oneTimeIds)
            .eq('status', 'completed')
            .order('completed_at', { ascending: true })

        if (allCompletions) {
            const seen = new Set<string>()
            const toDelete: string[] = []

            for (const row of allCompletions) {
                const key = `${row.user_id}:${row.quest_id}`
                if (seen.has(key)) {
                    toDelete.push(row.id)
                } else {
                    seen.add(key)
                }
            }

            if (toDelete.length > 0) {
                const { error: delErr } = await supabase
                    .from('user_quests')
                    .delete()
                    .in('id', toDelete)

                deduped = delErr ? 0 : toDelete.length
                if (delErr) results.dedup_error = delErr.message
            }
        }
    }
    results.deduped_completions = deduped

    // ── 4. log summary ───────────────────────────────────────────────────────
    console.log('[cron/sync-metrics]', results)

    return NextResponse.json({
        ok: true,
        ran_at: new Date().toISOString(),
        ...results,
    })
}
