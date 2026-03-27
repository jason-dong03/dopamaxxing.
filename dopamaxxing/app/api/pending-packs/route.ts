import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data } = await supabase
        .from('pending_packs')
        .select('id, pack_id, source, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

    return NextResponse.json({ packs: data ?? [] })
}

export async function DELETE(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await req.json()
    await supabase.from('pending_packs').delete().eq('id', id).eq('user_id', user.id)
    return NextResponse.json({ success: true })
}
