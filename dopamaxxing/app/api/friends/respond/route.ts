// POST /api/friends/respond - accept or reject a friend request
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { awardAchievements, getEarnedAchievements } from '@/lib/awardAchievement'

export async function POST(request: NextRequest) {
    const session = await createClient()
    const { data: { user } } = await session.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { friendshipId, action } = await request.json() // action: 'accept' | 'reject'
    if (!['accept', 'reject'].includes(action)) {
        return NextResponse.json({ error: 'action must be accept or reject' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { error } = await supabase
        .from('friendships')
        .update({ status: action === 'accept' ? 'accepted' : 'rejected' })
        .eq('id', friendshipId)
        .eq('addressee_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Award first_friend to both parties on acceptance
    if (action === 'accept') {
        const { data: friendship } = await supabase
            .from('friendships')
            .select('requester_id, addressee_id')
            .eq('id', friendshipId)
            .single()

        if (friendship) {
            const earned = await getEarnedAchievements(user.id)
            if (!earned.has('first_friend')) {
                await awardAchievements(user.id, ['first_friend'])
            }
            const requesterEarned = await getEarnedAchievements(friendship.requester_id)
            if (!requesterEarned.has('first_friend')) {
                await awardAchievements(friendship.requester_id, ['first_friend'])
            }
        }
    }

    return NextResponse.json({ success: true })
}
