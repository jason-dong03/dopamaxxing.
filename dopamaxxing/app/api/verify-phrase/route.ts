import { createClient } from '@/lib/supabase/server'
import { applyProfileXP } from '@/lib/rarityConfig'
import { NextResponse, NextRequest } from 'next/server'

// Must match the generation logic in /api/liberator-phrase/route.ts
const WORDS_A = ['shadow', 'ancient', 'hidden', 'sacred', 'lost', 'frozen', 'burning', 'endless', 'broken', 'rising', 'silent', 'shattered']
const WORDS_B = ['dragon', 'flame', 'stone', 'truth', 'ideal', 'storm', 'void', 'light', 'echo', 'tide', 'crown', 'veil']
const WORDS_C = ['awakens', 'whispers', 'endures', 'ascends', 'returns', 'prevails', 'remains', 'converges', 'persists', 'transcends', 'beckons', 'unfolds']

function hashString(str: string): number {
    let h = 2166136261
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i)
        h = Math.imul(h, 16777619)
    }
    return h >>> 0
}

function generatePhrase(userId: string): string {
    const h = hashString(userId)
    return `${WORDS_A[h % WORDS_A.length]} ${WORDS_B[(h >>> 4) % WORDS_B.length]} ${WORDS_C[(h >>> 8) % WORDS_C.length]}`
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { questId, phrase } = await request.json()
        if (!questId || !phrase) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

        // Phrase is deterministic per user — same algorithm as the easter egg
        const expected = generatePhrase(user.id)
        if (phrase.toLowerCase().trim() !== expected.toLowerCase()) {
            return NextResponse.json({ error: 'wrong_phrase' }, { status: 400 })
        }

        // Fetch quest
        const { data: quest } = await supabase
            .from('quests')
            .select('*')
            .eq('id', questId)
            .eq('is_active', true)
            .maybeSingle()

        if (!quest) return NextResponse.json({ error: 'Quest not found' }, { status: 404 })

        // Skip if already completed
        const { data: existing } = await supabase
            .from('user_quests')
            .select('id')
            .eq('user_id', user.id)
            .eq('quest_id', questId)
            .eq('status', 'completed')
            .maybeSingle()

        if (existing) return NextResponse.json({ error: 'already_completed' }, { status: 409 })

        const now = new Date().toISOString()

        // Record completion + set profile flag in parallel
        const { data: profile } = await supabase
            .from('profiles')
            .select('coins, xp, level')
            .eq('id', user.id)
            .single()

        const { xp: newXP, level: newLevel } = applyProfileXP(
            profile?.xp ?? 0,
            profile?.level ?? 1,
            quest.xp_reward,
        )

        await Promise.all([
            supabase.from('user_quests').insert({
                user_id: user.id,
                quest_id: questId,
                status: 'completed',
                started_at: now,
                completed_at: now,
                notes: 'phrase verified',
            }),
            supabase.from('profiles').update({
                coins: (profile?.coins ?? 0) + quest.coin_reward,
                xp: newXP,
                level: newLevel,
            }).eq('id', user.id),
            supabase.from('n_quest_progress').upsert(
                { user_id: user.id, found_liberator_phrase: true },
                { onConflict: 'user_id' }
            ),
        ])

        return NextResponse.json({
            success: true,
            reward: { coins: quest.coin_reward, xp: quest.xp_reward },
            newCoins: (profile?.coins ?? 0) + quest.coin_reward,
            newXP,
            newLevel,
        })
    } catch (err) {
        console.error('[verify-phrase] error:', err)
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
}
