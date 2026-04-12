import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getMergedPacks } from '@/lib/packMeta'

// 5-minute ISR cache at the edge
export const revalidate = 300

export async function GET() {
    const supabase = await createClient()
    const packs = await getMergedPacks(supabase)
    return NextResponse.json({ packs })
}
