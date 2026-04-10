import type { SupabaseClient } from '@supabase/supabase-js'

const RARITY_WEIGHT: Record<string, number> = {
    '???':       10,
    Celestial:   8,
    Divine:      6,
    Legendary:   4,
    Mythical:    3,
    Epic:        2.5,
    Rare:        2,
    Uncommon:    1.5,
    Common:      1,
}

export type BPTier = {
    label: string
    color: string
    min: number
}

export const BP_TIERS: BPTier[] = [
    { label: 'Bronze',    color: '#cd7f32', min: 0 },
    { label: 'Silver',    color: '#94a3b8', min: 1_000 },
    { label: 'Gold',      color: '#eab308', min: 5_000 },
    { label: 'Platinum',  color: '#67e8f9', min: 20_000 },
    { label: 'Diamond',   color: '#a78bfa', min: 60_000 },
    { label: 'Legendary', color: '#f97316', min: 150_000 },
]

export function getBPTier(bp: number): BPTier {
    for (let i = BP_TIERS.length - 1; i >= 0; i--) {
        if (bp >= BP_TIERS[i].min) return BP_TIERS[i]
    }
    return BP_TIERS[0]
}

export function formatBP(bp: number, full = false): string {
    if (full) return bp.toLocaleString()
    if (bp >= 1_000_000) return `${(bp / 1_000_000).toFixed(1)}M`
    if (bp >= 100_000) return `${Math.round(bp / 1_000)}K`
    if (bp >= 1_000) return `${(bp / 1_000).toFixed(1)}K`
    return String(bp)
}

/**
 * Recalculates and stores battle_power for a user.
 * Uses the top 30 cards by effective score: worth * card_level * rarity_weight.
 * Fire-and-forget safe (errors are swallowed).
 */
export async function recalcBattlePower(
    supabase: SupabaseClient,
    userId: string,
): Promise<void> {
    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('level')
            .eq('id', userId)
            .single()

        const { data: cards } = await supabase
            .from('user_cards')
            .select('worth, card_level, cards(rarity)')
            .eq('user_id', userId)
            .order('worth', { ascending: false })
            .limit(30)

        let bp = (profile?.level ?? 1) * 10

        for (const uc of (cards ?? []) as any[]) {
            const rarity = (uc.cards?.rarity as string) ?? 'Common'
            const weight = RARITY_WEIGHT[rarity] ?? 1
            const worth = Number(uc.worth ?? 0)
            const lvl = Number(uc.card_level ?? 1)
            bp += Math.round(worth * lvl * weight)
        }

        await supabase
            .from('profiles')
            .update({ battle_power: bp })
            .eq('id', userId)
    } catch {
        // Non-critical — don't let BP errors break pack opens
    }
}
