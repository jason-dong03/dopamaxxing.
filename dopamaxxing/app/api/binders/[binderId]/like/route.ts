// POST /api/binders/[binderId]/like - toggle like
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
    _request: NextRequest,
    { params }: { params: Promise<{ binderId: string }> },
) {
    const { binderId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // toggle: if liked, unlike; if not liked, like
    const { data: existing } = await supabase
        .from('binder_likes')
        .select('id')
        .eq('binder_id', binderId)
        .eq('user_id', user.id)
        .single()

    if (existing) {
        await supabase.from('binder_likes').delete().eq('id', existing.id)
        return NextResponse.json({ liked: false })
    } else {
        await supabase.from('binder_likes').insert({ binder_id: binderId, user_id: user.id })
        return NextResponse.json({ liked: true })
    }
}
