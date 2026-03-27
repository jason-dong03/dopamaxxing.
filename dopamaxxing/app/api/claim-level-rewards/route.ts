import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // Optional: claim only specific row IDs (single-claim); omit to claim all
        let filterIds: string[] | null = null
        try {
            const body = await req.json()
            if (Array.isArray(body?.ids) && body.ids.length > 0) filterIds = body.ids
        } catch { /* no body = claim all */ }

        let query = supabase
            .from('level_up_stash')
            .select('*')
            .eq('user_id', user.id)
            .is('claimed_at', null)
            .order('level_reached', { ascending: true })
        if (filterIds) query = query.in('id', filterIds)
        const { data: rows, error } = await query

        if (error || !rows?.length) {
            return NextResponse.json({ claimed: 0, coins: 0, packs: [] })
        }

        const totalCoins = rows.reduce((s, r) => s + r.coins, 0)
        const packIds = rows.map((r: { pack_id: string }) => r.pack_id)
        const ids = rows.map((r: { id: string }) => r.id)
        const now = new Date().toISOString()

       
        const { data: profile } = await supabase
            .from('profiles')
            .select('coins')
            .eq('id', user.id)
            .single()

        const pendingPackRows = packIds
            .filter((id: string) => !!id)
            .map((pack_id: string) => ({ user_id: user.id, pack_id, source: 'levelup' }))

        const [,, insertResult] = await Promise.all([
            supabase
                .from('level_up_stash')
                .update({ claimed_at: now })
                .in('id', ids),
            supabase
                .from('profiles')
                .update({ coins: (profile?.coins ?? 0) + totalCoins })
                .eq('id', user.id),
            pendingPackRows.length > 0
                ? supabase.from('pending_packs').insert(pendingPackRows).select('id, pack_id, source, created_at')
                : Promise.resolve({ data: [] }),
        ])

        const insertedPacks = (insertResult as { data: { id: string; pack_id: string; source: string; created_at: string }[] | null })?.data ?? []

        return NextResponse.json({
            claimed: rows.length,
            coins: totalCoins,
            packs: packIds,
            pendingPacks: insertedPacks,
            levels: rows.map((r: { level_reached: number }) => r.level_reached),
        })
    } catch (err) {
        console.error('[claim-level-rewards]', err)
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
}
