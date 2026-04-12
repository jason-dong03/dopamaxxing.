import { NextResponse } from 'next/server'
import { withExtensionAuth } from '@/lib/api/withExtensionAuth'

// Random drop chance per minute of active studying (per crate).
// e.g. 0.10 = ~1 key per 10 minutes on average.
export const CRATE_KEY_CHANCES: Record<string, { name: string; chance: number }> = {
    'theme-legendary': { name: 'Legendary Box Key',  chance: 0.10  }, // ~1 per 10 min
    'smp':             { name: 'SM Black Star Key',   chance: 0.06  }, // ~1 per 17 min
    'xy-p-poncho':     { name: 'Poncho Pikachu Key',  chance: 0.025 }, // ~1 per 40 min
}

export const POST = withExtensionAuth(async ({ user, supabase }) => {
    const today = new Date().toISOString().slice(0, 10)

    // Update study minutes
    const { data: profile } = await supabase
        .from('profiles')
        .select('study_minutes_today, study_reset_date')
        .eq('id', user.id)
        .single()

    const isNewDay = profile?.study_reset_date !== today
    const minutesAfter = (isNewDay ? 0 : (profile?.study_minutes_today ?? 0)) + 1

    await supabase.from('profiles').update({
        study_minutes_today: minutesAfter,
        study_reset_date: today,
    }).eq('id', user.id)

    // Fetch existing crate key counts for this user
    const { data: existing } = await supabase
        .from('crate_keys')
        .select('pack_id, quantity')
        .eq('user_id', user.id)

    const currentCounts = Object.fromEntries(
        (existing ?? []).map((r: { pack_id: string; quantity: number }) => [r.pack_id, r.quantity])
    )

    // Roll for each crate key independently
    const keysEarned: { pack_id: string; name: string }[] = []
    const upserts: Array<{ user_id: string; pack_id: string; quantity: number }> = []

    for (const [packId, { name, chance }] of Object.entries(CRATE_KEY_CHANCES)) {
        if (Math.random() < chance) {
            keysEarned.push({ pack_id: packId, name })
            upserts.push({
                user_id: user.id,
                pack_id: packId,
                quantity: (currentCounts[packId] ?? 0) + 1,
            })
            currentCounts[packId] = (currentCounts[packId] ?? 0) + 1
        }
    }

    if (upserts.length > 0) {
        await supabase.from('crate_keys').upsert(upserts, { onConflict: 'user_id,pack_id' })
    }

    return NextResponse.json({
        study_minutes_today: minutesAfter,
        crate_keys: currentCounts,
        keys_earned: keysEarned,
    })
})

export const OPTIONS = withExtensionAuth(async () => NextResponse.json(null))
