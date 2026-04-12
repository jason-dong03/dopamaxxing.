import { NextResponse } from 'next/server'
import { withExtensionAuth } from '@/lib/api/withExtensionAuth'
import { recalcBattleRating } from '@/lib/battlePower'

export const GET = withExtensionAuth(async ({ user, supabase }) => {
    const [profileRes, stockRes, crateKeyRes] = await Promise.all([
        supabase
            .from('profiles')
            .select('username, first_name, coins, xp, level, active_title, study_minutes_today, study_reset_date')
            .eq('id', user.id)
            .single(),
        supabase
            .from('pack_stock')
            .select('pack_id, quantity')
            .eq('user_id', user.id),
        supabase
            .from('crate_keys')
            .select('pack_id, quantity')
            .eq('user_id', user.id),
    ])

    const profile = profileRes.data
    if (!profile) {
        return NextResponse.json({ error: 'Profile not found', detail: profileRes.error?.message }, { status: 404 })
    }

    const today = new Date().toISOString().slice(0, 10)
    const study_minutes_today = profile.study_reset_date === today
        ? (profile.study_minutes_today ?? 0)
        : 0

    const stock = Object.fromEntries(
        (stockRes.data ?? []).map((r: { pack_id: string; quantity: number }) => [r.pack_id, r.quantity])
    )

    // Per-crate key counts; falls back to empty if table doesn't exist yet
    const crate_keys = Object.fromEntries(
        (crateKeyRes.data ?? []).map((r: { pack_id: string; quantity: number }) => [r.pack_id, r.quantity])
    )

    const needs_migration = !!crateKeyRes.error

    const br = await recalcBattleRating(supabase, user.id)

    return NextResponse.json({
        username: profile.username,
        first_name: profile.first_name,
        coins: profile.coins,
        xp: profile.xp,
        level: profile.level,
        active_title: profile.active_title,
        study_minutes_today,
        crate_keys,
        needs_migration,
        br,
        stock,
    })
})

export const OPTIONS = withExtensionAuth(async () => NextResponse.json(null))
