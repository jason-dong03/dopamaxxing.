import { withAuth } from '@/lib/api/withAuth'
import { applyProfileXP } from '@/lib/rarityConfig'
import { NextResponse } from 'next/server'

export const POST = withAuth(async ({ user, supabase }) => {
    await supabase
        .from('profiles')
        .update({ tutorial_completed: true })
        .eq('id', user.id)

    const { data: quest } = await supabase
        .from('quests')
        .select('id, coin_reward, xp_reward')
        .eq('slug', 'tutorial-complete')
        .eq('is_active', true)
        .maybeSingle()

    if (!quest) return NextResponse.json({ ok: true })

    const { data: existing } = await supabase
        .from('user_quests')
        .select('id')
        .eq('user_id', user.id)
        .eq('quest_id', quest.id)
        .eq('status', 'completed')
        .maybeSingle()

    if (existing) return NextResponse.json({ ok: true, alreadyClaimed: true })

    const now = new Date().toISOString()
    await supabase.from('user_quests').insert({
        user_id: user.id,
        quest_id: quest.id,
        status: 'completed',
        started_at: now,
        completed_at: now,
        notes: 'auto-claimed on tutorial completion',
    })

    const { data: profile } = await supabase
        .from('profiles')
        .select('coins, xp, level')
        .eq('id', user.id)
        .single()

    const { xp: newXP, level: newLevel } = applyProfileXP(
        profile?.xp ?? 0,
        profile?.level ?? 1,
        quest.xp_reward,
    )

    await supabase
        .from('profiles')
        .update({
            coins: (profile?.coins ?? 0) + quest.coin_reward,
            xp: newXP,
            level: newLevel,
        })
        .eq('id', user.id)

    return NextResponse.json({ ok: true, claimed: true })
})
