// GET /api/friends/requests - list incoming pending friend requests
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
    const session = await createClient()
    const { data: { user } } = await session.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createAdminClient()

    // Fetch pending requests
    const { data: friendships, error } = await supabase
        .from('friendships')
        .select('id, created_at, requester_id')
        .eq('addressee_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!friendships || friendships.length === 0) return NextResponse.json({ requests: [] })

    // Fetch requester profiles separately (avoids FK name dependency)
    const requesterIds = friendships.map(f => f.requester_id)
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, profile_url')
        .in('id', requesterIds)

    const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))

    const requests = friendships.map(f => ({
        id: f.id,
        created_at: f.created_at,
        requester: profileMap[f.requester_id] ?? { id: f.requester_id, username: null, profile_url: null },
    }))

    return NextResponse.json({ requests })
}
