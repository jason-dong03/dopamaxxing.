import { NextResponse } from 'next/server'
import { withExtensionAuth } from '@/lib/api/withExtensionAuth'

// Random drop chance per minute of active studying.
// Poncho is excluded here — it's gated to every 5th minute (see below).
export const CRATE_KEY_CHANCES: Record<string, { name: string; chance: number }> = {
    'theme-legendary': { name: 'Legendary Box Key', chance: 0.10 }, // ~1 per 10 min
}

// Rolled once every 5 minutes (when minutesAfter % 5 === 0).
const RARE_KEY_CHANCES: Record<string, { name: string; chance: number }> = {
    'xy-p-poncho': { name: 'Poncho Pikachu Key', chance: 0.01 }, // 1% per 5 min
}

// Free pack drops per minute of studying.
// level_required must match lib/packs.ts — only rolled when user meets the threshold.
// Higher level = rarer pack = lower drop chance.
export const PACK_DROP_CHANCES: Record<string, { name: string; chance: number; level_required: number }> = {
    // Level 1
    'sv02':     { name: 'Paldea Evolved',          chance: 0.030, level_required: 1  },
    'sv03':     { name: 'Obsidian Flames',          chance: 0.025, level_required: 1  },
    // Level 5
    'sv03.5':   { name: '151',                      chance: 0.020, level_required: 5  },
    'sv04.5':   { name: 'Paldean Fates',            chance: 0.018, level_required: 5  },
    'sv08':     { name: 'Surging Sparks',           chance: 0.020, level_required: 5  },
    'sv08.5':   { name: 'Prismatic Evolutions',     chance: 0.015, level_required: 5  },
    // Level 10
    'sv10':     { name: 'Destined Rivals',          chance: 0.015, level_required: 10 },
    'sv10.5b':  { name: 'Black Bolt',               chance: 0.010, level_required: 10 },
    'sv10.5w':  { name: 'White Flare',              chance: 0.010, level_required: 10 },
    // Level 15
    'swsh1':    { name: 'Sword & Shield',           chance: 0.010, level_required: 15 },
    // Level 20
    'swsh11':   { name: 'Lost Origin',              chance: 0.008, level_required: 20 },
    'swsh12.5': { name: 'Crown Zenith',             chance: 0.008, level_required: 20 },
    // Level 25
    'me02':     { name: 'Phantasmal Flames',        chance: 0.006, level_required: 25 },
    'me02.5':   { name: 'Ascended Heroes',          chance: 0.006, level_required: 25 },
    // Level 30
    'base1':    { name: 'Base Set',                 chance: 0.003, level_required: 30 },
    'base5':    { name: 'Team Rocket',              chance: 0.003, level_required: 30 },
    'ex4':      { name: 'Team Magma & Team Aqua',   chance: 0.002, level_required: 30 },
    'ex7':      { name: 'Team Rocket Returns',      chance: 0.001, level_required: 30 },
    // Level 35
    'sm9':      { name: 'Team Up',                  chance: 0.003, level_required: 35 },
    // Level 40
    'xy7':      { name: 'Ancient Origins',          chance: 0.002, level_required: 40 },
}

export const POST = withExtensionAuth(async ({ user, supabase }) => {
    const today = new Date().toISOString().slice(0, 10)

    // ── Update study minutes ────────────────────────────────────────────────────
    const { data: profile } = await supabase
        .from('profiles')
        .select('study_minutes_today, study_reset_date, level')
        .eq('id', user.id)
        .single()

    const isNewDay = profile?.study_reset_date !== today
    const minutesBefore = isNewDay ? 0 : (profile?.study_minutes_today ?? 0)
    const minutesAfter  = minutesBefore + 1
    const userLevel     = profile?.level ?? 1

    await supabase.from('profiles').update({
        study_minutes_today: minutesAfter,
        study_reset_date: today,
    }).eq('id', user.id)

    // ── Roll for crate keys ─────────────────────────────────────────────────────
    const { data: existing } = await supabase
        .from('crate_keys')
        .select('pack_id, quantity')
        .eq('user_id', user.id)

    const currentCounts = Object.fromEntries(
        (existing ?? []).map((r: { pack_id: string; quantity: number }) => [r.pack_id, r.quantity])
    )

    const keysEarned: { pack_id: string; name: string }[] = []
    const keyUpserts: Array<{ user_id: string; pack_id: string; quantity: number }> = []

    for (const [packId, { name, chance }] of Object.entries(CRATE_KEY_CHANCES)) {
        if (Math.random() < chance) {
            keysEarned.push({ pack_id: packId, name })
            const qty = (currentCounts[packId] ?? 0) + 1
            keyUpserts.push({ user_id: user.id, pack_id: packId, quantity: qty })
            currentCounts[packId] = qty
        }
    }

    // Rare keys: only roll on every 5th minute
    if (minutesAfter % 5 === 0) {
        for (const [packId, { name, chance }] of Object.entries(RARE_KEY_CHANCES)) {
            if (Math.random() < chance) {
                keysEarned.push({ pack_id: packId, name })
                const qty = (currentCounts[packId] ?? 0) + 1
                keyUpserts.push({ user_id: user.id, pack_id: packId, quantity: qty })
                currentCounts[packId] = qty
            }
        }
    }

    if (keyUpserts.length > 0) {
        await supabase.from('crate_keys').upsert(keyUpserts, { onConflict: 'user_id,pack_id' })
    }

    // ── Roll for free pack drops (only packs the user has unlocked) ─────────────
    const packsEarned: { pack_id: string; name: string }[] = []

    for (const [packId, { name, chance, level_required }] of Object.entries(PACK_DROP_CHANCES)) {
        if (userLevel >= level_required && Math.random() < chance) {
            packsEarned.push({ pack_id: packId, name })
        }
    }

    if (packsEarned.length > 0) {
        await supabase.from('study_pack_drops').insert(
            packsEarned.map(p => ({ user_id: user.id, pack_id: p.pack_id }))
        )
    }

    return NextResponse.json({
        study_minutes_today: minutesAfter,
        crate_keys: currentCounts,
        keys_earned: keysEarned,
        packs_earned: packsEarned,
    })
})

export const OPTIONS = withExtensionAuth(async () => NextResponse.json(null))
