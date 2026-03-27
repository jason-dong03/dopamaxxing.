import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// N-themed phrases about freedom, liberation, and the bond between people and pokemon
const PHRASES = [
    'liberation is the truth',
    'freedom cannot be caged',
    'the ideal world awaits',
    'bonds are never chains',
    'every heart deserves freedom',
    'the pokemon cry out for us',
    'truth and ideals unite',
    'the black stone remembers',
    'the white stone endures',
    'nature speaks if you listen',
    'oppression ends with us',
    'the wild calls us home',
    'no bars can hold the spirit',
    'their voices guided me here',
    'a world without trainers',
    'the dream lives in you',
    'reshiram heard my truth',
    'zekrom chose my ideal',
    'the castle was never the answer',
    'freedom is our birthright',
    'the journey is the liberation',
    'every step forward is defiance',
    'the storm bends to no king',
    'what is caught cannot stay caught',
    'i chose them and they chose me',
]

function generatePhrase(): string {
    return PHRASES[Math.floor(Math.random() * PHRASES.length)]
}

export async function POST() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const phrase = generatePhrase()

        await supabase
            .from('n_quest_progress')
            .upsert({ user_id: user.id, found_liberator_phrase: true }, { onConflict: 'user_id' })

        return NextResponse.json({ phrase })
    } catch {
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
}
