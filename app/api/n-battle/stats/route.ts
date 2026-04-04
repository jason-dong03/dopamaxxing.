import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [{ count }, { data: lastWon }] = await Promise.all([
        supabase
            .from('n_battles')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('status', 'won'),
        supabase
            .from('n_battles')
            .select('updated_at')
            .eq('user_id', user.id)
            .eq('status', 'won')
            .order('updated_at', { ascending: false })
            .limit(1)
            .single(),
    ])

    return NextResponse.json({
        battlesWon:  count ?? 0,
        lastWonAt:   lastWon?.updated_at ?? null,
    })
}
