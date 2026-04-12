import { NextResponse } from 'next/server'
import { withExtensionAuth } from '@/lib/api/withExtensionAuth'
import { recalcBattleRating } from '@/lib/battlePower'

export const GET = withExtensionAuth(async ({ user, supabase }) => {
    // Core profile — columns that always exist
    const [profileRes, stockRes] = await Promise.all([
        supabase
            .from('profiles')
            .select('username, first_name, coins, xp, level, active_title')
            .eq('id', user.id)
            .single(),
        supabase
            .from('pack_stock')
            .select('pack_id, quantity')
            .eq('user_id', user.id),
    ])

    const profile = profileRes.data
    if (!profile) {
        return NextResponse.json({ error: 'Profile not found', detail: profileRes.error?.message }, { status: 404 })
    }

    // Study columns — only exist after migration; fall back to 0 if absent
    let study_keys = 0
    let study_minutes_today = 0
    let needs_migration = false
    try {
        const { data: studyData, error: studyError } = await supabase
            .from('profiles')
            .select('study_keys, study_minutes_today, study_reset_date')
            .eq('id', user.id)
            .single()

        if (studyError) {
            needs_migration = true
        } else if (studyData) {
            const today = new Date().toISOString().slice(0, 10)
            study_keys = studyData.study_keys ?? 0
            study_minutes_today = studyData.study_reset_date === today
                ? (studyData.study_minutes_today ?? 0)
                : 0
        }
    } catch {
        needs_migration = true
    }

    const stock = Object.fromEntries(
        (stockRes.data ?? []).map((r: { pack_id: string; quantity: number }) => [r.pack_id, r.quantity])
    )

    const br = await recalcBattleRating(supabase, user.id)

    return NextResponse.json({
        username: profile.username,
        first_name: profile.first_name,
        coins: profile.coins,
        xp: profile.xp,
        level: profile.level,
        active_title: profile.active_title,
        study_keys,
        study_minutes_today,
        needs_migration,
        br,
        stock,
    })
})

export const OPTIONS = withExtensionAuth(async () => NextResponse.json(null))
