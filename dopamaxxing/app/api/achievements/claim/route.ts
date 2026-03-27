// POST /api/achievements/claim - claim coin reward for an earned achievement
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    const session = await createClient()
    const { data: { user } } = await session.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { achievementId } = await request.json()
    const admin = createAdminClient()

    const { data: achievement } = await admin
        .from('achievements')
        .select('coin_reward')
        .eq('id', achievementId)
        .single()
    if (!achievement) return NextResponse.json({ error: 'Unknown achievement' }, { status: 400 })

    // Check that the user has earned it and hasn't claimed it yet
    const { data: row } = await admin
        .from('user_achievements')
        .select('achievement_id, coins_claimed')
        .eq('user_id', user.id)
        .eq('achievement_id', achievementId)
        .single()

    if (!row) return NextResponse.json({ error: 'Achievement not earned' }, { status: 403 })
    if (row.coins_claimed) return NextResponse.json({ error: 'Already claimed' }, { status: 409 })

    // Mark claimed
    await admin
        .from('user_achievements')
        .update({ coins_claimed: true })
        .eq('user_id', user.id)
        .eq('achievement_id', achievementId)

    // Award coins
    const { data: profile } = await admin
        .from('profiles')
        .select('coins')
        .eq('id', user.id)
        .single()

    await admin
        .from('profiles')
        .update({ coins: (profile?.coins ?? 0) + achievement.coin_reward })
        .eq('id', user.id)

    return NextResponse.json({ success: true, coinsAwarded: achievement.coin_reward })
}
