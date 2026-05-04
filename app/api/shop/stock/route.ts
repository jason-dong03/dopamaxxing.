import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getOrRefreshStock } from '@/lib/packStock'

export async function GET() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { stock, discounts, nextRefreshAt, cap } = await getOrRefreshStock(supabase, user.id)
    return NextResponse.json({
        stock,
        discounts,
        cap,
        next_refresh_at: nextRefreshAt,
    })
}
