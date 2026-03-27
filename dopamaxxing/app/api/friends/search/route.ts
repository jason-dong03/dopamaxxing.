// GET /api/friends/search?q=username - find users by username
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    // Auth check with session client
    const sessionClient = await createClient()
    const { data: { user } } = await sessionClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Use admin client to bypass RLS on profiles
    const supabase = createAdminClient()
    const q = request.nextUrl.searchParams.get('q')?.trim() ?? ''

    const base = supabase
        .from('profiles')
        .select('id, username, profile_url')
        .neq('id', user.id)
        .not('username', 'is', null)
        .limit(50)

    const { data, error } = q.length > 0
        ? await base.ilike('username', `%${q}%`)
        : await base.order('username', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ users: data ?? [] })
}
