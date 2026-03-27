import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data } = await supabase
        .from('user_items')
        .select('item_id, quantity')
        .eq('user_id', user.id)
        .gt('quantity', 0)

    // Return as { [item_id]: quantity }
    const inventory: Record<string, number> = {}
    for (const row of data ?? []) {
        inventory[row.item_id] = row.quantity
    }

    return NextResponse.json({ inventory })
}
