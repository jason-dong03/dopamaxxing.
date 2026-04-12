import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getOrRefreshStock } from '@/lib/packStock'

export async function GET() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { stock, discounts, nextRefreshAt } = await getOrRefreshStock(supabase, user.id)
    return NextResponse.json({
        stock,
        discounts,
        next_refresh_standard: nextRefreshAt.standard,
        next_refresh_special:  nextRefreshAt.special,
        next_refresh_box:      nextRefreshAt.box,
    })
}
