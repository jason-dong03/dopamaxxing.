import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getMergedPacks } from '@/lib/packMeta'

const STARTER_PACK_IDS = ['sv10.5b', 'sv10.5w', 'sv08.5', 'sv03.5', 'me02.5']

// POST /api/claim-starter-pack { packId }
// One-time free pack given during tutorial. Requires starter_pack_claimed column:
//   ALTER TABLE profiles ADD COLUMN IF NOT EXISTS starter_pack_claimed boolean NOT NULL DEFAULT false;
export async function POST(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { packId } = await request.json() as { packId: string }

    if (!STARTER_PACK_IDS.includes(packId)) {
        return NextResponse.json({ error: 'Invalid starter pack' }, { status: 400 })
    }

    const allPacks = await getMergedPacks(supabase)
    const validPack = allPacks.find(p => p.id === packId)
    if (!validPack) return NextResponse.json({ error: 'Pack not found' }, { status: 400 })

    // Check if already claimed
    const { data: profile } = await supabase
        .from('profiles')
        .select('starter_pack_claimed')
        .eq('id', user.id)
        .single()

    if (profile?.starter_pack_claimed) {
        return NextResponse.json({ error: 'Starter pack already claimed' }, { status: 400 })
    }

    // Mark claimed + insert pending pack
    const [claimResult] = await Promise.all([
        supabase
            .from('profiles')
            .update({ starter_pack_claimed: true })
            .eq('id', user.id),
        supabase
            .from('pending_packs')
            .insert({ user_id: user.id, pack_id: packId, source: 'starter_gift' }),
    ])

    if (claimResult.error) {
        return NextResponse.json({ error: claimResult.error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, packName: validPack.name })
}
