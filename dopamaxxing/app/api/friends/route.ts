// GET /api/friends - list accepted friends
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
    const session = await createClient()
    const { data: { user } } = await session.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createAdminClient()

    const { data: friendships, error } = await supabase
        .from('friendships')
        .select('id, requester_id, addressee_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!friendships || friendships.length === 0) return NextResponse.json({ friends: [] })

    // Collect the "other" person's ID from each friendship
    const otherIds = friendships.map(f =>
        f.requester_id === user.id ? f.addressee_id : f.requester_id
    )

    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, profile_url')
        .in('id', otherIds)

    const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))

    const friends = friendships.map(f => {
        const otherId = f.requester_id === user.id ? f.addressee_id : f.requester_id
        const profile = profileMap[otherId] ?? { id: otherId, username: null, profile_url: null }
        return { friendshipId: f.id, ...profile }
    })

    return NextResponse.json({ friends })
}
