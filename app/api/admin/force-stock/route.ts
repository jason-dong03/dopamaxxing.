import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
    return profile?.is_admin ? user : null
}

// POST /api/admin/force-stock { userId, packId, quantity }
export async function POST(req: NextRequest) {
    const supabase = await createClient()
    if (!await requireAdmin(supabase)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { userId, packId, quantity } = await req.json() as { userId: string; packId: string; quantity: number }
    if (!userId || !packId || quantity == null) {
        return NextResponse.json({ error: 'userId, packId and quantity are required' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { error } = await admin
        .from('pack_stock')
        .upsert({ user_id: userId, pack_id: packId, quantity: Number(quantity), refreshed_at: new Date().toISOString() }, { onConflict: 'user_id,pack_id' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
}
