import { withAuth } from '@/lib/api/withAuth'
import { NextResponse } from 'next/server'
import { calculateGrade, gradeCost } from '@/lib/cardAttributes'
import { awardAchievements, getEarnedAchievements } from '@/lib/awardAchievement'

export const POST = withAuth(async ({ user, supabase }, request) => {
    const { userCardId } = await request.json()

    const [{ data: uc }, { data: profile }] = await Promise.all([
        supabase.from('user_cards').select('*').eq('id', userCardId).eq('user_id', user.id).single(),
        supabase.from('profiles').select('coins').eq('id', user.id).single(),
    ])

    if (!uc) return NextResponse.json({ error: 'Card not found' }, { status: 404 })

    const count = uc.grade_count ?? 0
    const cost = gradeCost(count)
    if ((profile?.coins ?? 0) < cost) {
        return NextResponse.json({ error: 'insufficient_coins', cost, coins: profile?.coins }, { status: 402 })
    }

    const grade = calculateGrade({
        attr_centering: uc.attr_centering,
        attr_corners: uc.attr_corners,
        attr_edges: uc.attr_edges,
        attr_surface: uc.attr_surface,
    }, user.id)

    await Promise.all([
        supabase.from('user_cards').update({ grade, grade_count: count + 1 }).eq('id', userCardId),
        supabase.from('profiles').update({ coins: (profile?.coins ?? 0) - cost }).eq('id', user.id),
    ])

    void (async () => {
        try {
            const earned = await getEarnedAchievements(user.id)
            const toAward: string[] = []
            if (!earned.has('card_grader')) toAward.push('card_grader')
            if (!earned.has('psa10') && grade === 10) toAward.push('psa10')
            if (toAward.length) await awardAchievements(user.id, toAward)
        } catch { /* ignore */ }
    })()

    return NextResponse.json({ grade, cost, gradeCount: count + 1 })
})
