import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getMergedPacks } from '@/lib/packMeta'

export async function GET() {
    const supabase = await createClient()
    const packs = await getMergedPacks(supabase)
    // Return only the fields PackSelector needs (omit theme/internal fields)
    const prices = packs.map(({ id, cost, name, description, special, card_count }) => ({
        id,
        cost,
        name,
        description,
        special,
        card_count,
    }))
    return NextResponse.json({ prices }, {
        headers: { 'Cache-Control': 'public, max-age=300' },
    })
}
