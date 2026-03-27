// GET /api/achievements?userId=x - get achievements for a user
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const targetUserId = request.nextUrl.searchParams.get('userId') ?? user.id
    const isOwnProfile = targetUserId === user.id

    const [{ data: allAchievements }, { data: earned, error }] = await Promise.all([
        supabase.from('achievements').select('*'),
        supabase.from('user_achievements').select('achievement_id, earned_at').eq('user_id', targetUserId),
    ])

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const earnedSet = new Set((earned ?? []).map((r: any) => r.achievement_id))

    const result = (allAchievements ?? [])
        .filter((a: any) => !a.is_hidden || earnedSet.has(a.id) || isOwnProfile)
        .map((a: any) => ({
            id: a.id,
            name: a.is_hidden && !earnedSet.has(a.id) ? '???' : a.name,
            description: a.is_hidden && !earnedSet.has(a.id) ? '???' : a.description,
            icon: a.is_hidden && !earnedSet.has(a.id) ? '🔒' : a.icon,
            isHidden: a.is_hidden,
            coinReward: a.coin_reward,
            earned: earnedSet.has(a.id),
            earnedAt: (earned ?? []).find((r: any) => r.achievement_id === a.id)?.earned_at ?? null,
        }))

    return NextResponse.json({ achievements: result })
}
