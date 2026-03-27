import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { count } = await supabase
        .from('n_battles')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'won')

    return NextResponse.json({ battlesWon: count ?? 0 })
}
