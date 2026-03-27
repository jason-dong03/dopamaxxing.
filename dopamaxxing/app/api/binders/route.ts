// GET /api/binders - list my binders (or ?userId=x for another user's)
// POST /api/binders - create a binder
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { awardAchievements, getEarnedAchievements } from '@/lib/awardAchievement'

export async function GET(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = request.nextUrl.searchParams.get('userId') ?? user.id

    const { data, error } = await supabase
        .from('binders')
        .select(`
            id, name, color, include_slabs, created_at, updated_at,
            binder_cards(count),
            binder_likes(count)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ binders: data ?? [] })
}

export async function POST(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { name, color, includeSlabs } = await request.json()
    if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 })

    const { data, error } = await supabase
        .from('binders')
        .insert({ user_id: user.id, name: name.trim(), color: color ?? '#3b82f6', include_slabs: includeSlabs ?? false })
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // award binder_creator achievement
    const earned = await getEarnedAchievements(user.id)
    if (!earned.has('binder_creator')) {
        await awardAchievements(user.id, ['binder_creator'])
    }

    return NextResponse.json({ binder: data })
}
