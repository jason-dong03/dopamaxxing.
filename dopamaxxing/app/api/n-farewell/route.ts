import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const PHRASE = "Everything's ruined. The ideals and truths I've held… The dreams Pokémon shared…"

export async function POST() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        await supabase
            .from('n_quest_progress')
            .upsert({ user_id: user.id, found_n_farewell: true }, { onConflict: 'user_id' })

        return NextResponse.json({ phrase: PHRASE })
    } catch {
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
}
