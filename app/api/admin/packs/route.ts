import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { bustPackMetaCache } from '@/lib/packMeta'

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()
    return profile?.is_admin ? user : null
}

export async function GET() {
    const supabase = await createClient()
    if (!await requireAdmin(supabase)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { data, error } = await supabase
        .from('pack_metadata')
        .select('*')
        .order('id')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ packs: data })
}

export async function POST(req: NextRequest) {
    const supabase = await createClient()
    if (!await requireAdmin(supabase)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const body = await req.json()
    const { id, cost, name, description, special, card_count } = body
    if (!id || cost == null) {
        return NextResponse.json({ error: 'id and cost are required' }, { status: 400 })
    }
    const { error } = await supabase
        .from('pack_metadata')
        .upsert({
            id,
            cost: Number(cost),
            name: name ?? null,
            description: description ?? null,
            special: special ?? null,
            card_count: card_count != null ? Number(card_count) : null,
            updated_at: new Date().toISOString(),
        })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    bustPackMetaCache()
    return NextResponse.json({ ok: true })
}
