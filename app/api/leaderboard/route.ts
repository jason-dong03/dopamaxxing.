import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

const VALID_METRICS = ['packs', 'br', 'level', 'coins'] as const
type Metric = (typeof VALID_METRICS)[number]

const METRIC_COLUMN: Record<Metric, string> = {
    packs:  'packs_opened',
    br:     'battle_power',
    level:  'level',
    coins:  'coins',
}

// Minimum value required to appear on each leaderboard
const METRIC_MIN: Record<Metric, number> = {
    packs:  100,      // opened at least 100 packs
    br:     100000,   // at least 100,000 BR
    level:  10,       // at least level 10
    coins:  1000,     // at least $1,000 coins
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const raw = searchParams.get('metric') ?? 'br'
    const metric = VALID_METRICS.includes(raw as Metric) ? (raw as Metric) : 'br'
    const col = METRIC_COLUMN[metric]

    const supabase = createAdminClient()

    const min = METRIC_MIN[metric]

    const { data, error } = await supabase
        .from('profiles')
        .select(`id, username, profile_url, ${col}`)
        .not(col, 'is', null)
        .gte(col, min)
        .eq('is_admin', false)
        .order(col, { ascending: false })
        .limit(10)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const rows = (data ?? []).map((row: any, i) => ({
        rank: i + 1,
        id: row.id,
        username: row.username ?? 'Trainer',
        profile_url: row.profile_url ?? null,
        value: Number(row[col] ?? 0),
    }))

    return NextResponse.json({ metric, rows })
}
