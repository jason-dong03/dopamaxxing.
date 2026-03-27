import { withAuth } from '@/lib/api/withAuth'
import { NextResponse } from 'next/server'

export const POST = withAuth(async ({ user, supabase }, request) => {
    const { username } = await request.json()
    if (!username || username.length < 3 || username.length > 20) {
        return NextResponse.json({ error: 'Username must be 3–20 characters' }, { status: 400 })
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return NextResponse.json({ error: 'Only letters, numbers, underscores' }, { status: 400 })
    }

    const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.toLowerCase())
        .maybeSingle()

    if (existing) {
        return NextResponse.json({ error: 'Username taken' }, { status: 409 })
    }

    const { error } = await supabase
        .from('profiles')
        .update({ username: username.toLowerCase(), coins: 100 })
        .eq('id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, newUser: true })
})
