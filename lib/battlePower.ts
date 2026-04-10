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

// Nature tier → BP multiplier bonus
const NATURE_TIER_MULT: Record<string, number> = {
    'regular':   1.00,
    'legendary': 1.10,
    'divine':    1.18,
    'celestial': 1.26,
    '???':       1.35,
}

/**
 * Calculates BP contribution for a single card.
 *
 * Formula:
 *   base     = worth × card_level × rarity_weight
 *   quality  = avg(attr_centering, attr_corners, attr_edges, attr_surface) / 7.5
 *              (default attrs = 7.0 → quality ≈ 0.93; PSA-10 style → quality up to 1.33)
 *   grade    = grade ? 1 + (grade - 5) × 0.04 : 1   (grade 10 → ×1.20, grade 1 → ×0.84)
 *   nature   = NATURE_TIER_MULT[nature_tier] or 1.0
 *   bp_card  = round(base × quality × grade × nature)
 */
export function cardBP(card: {
    worth: number | null
    card_level: number | null
    rarity: string
    attr_centering?: number | null
    attr_corners?: number | null
    attr_edges?: number | null
    attr_surface?: number | null
    grade?: number | null
    nature_tier?: string | null
}): number {
    const weight = RARITY_WEIGHT[card.rarity] ?? 1
    const worth = Number(card.worth ?? 0)
    const lvl = Number(card.card_level ?? 1)

    const attrs = [card.attr_centering, card.attr_corners, card.attr_edges, card.attr_surface]
        .map(v => Number(v ?? 7.0))
    const avgAttr = attrs.reduce((a, b) => a + b, 0) / attrs.length
    const qualityMult = avgAttr / 7.5

    const grade = card.grade ? Number(card.grade) : null
    const gradeMult = grade !== null ? 1 + (grade - 5) * 0.04 : 1

    const natureMult = NATURE_TIER_MULT[card.nature_tier ?? 'regular'] ?? 1

    return Math.round(worth * lvl * weight * qualityMult * gradeMult * natureMult)
}

/**
 * Recalculates and stores battle_power for a user.
 * Formula per card: worth × card_level × rarity_weight × quality × grade × nature
 * Top 30 cards by effective score contribute.
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
            .select('worth, card_level, attr_centering, attr_corners, attr_edges, attr_surface, grade, nature_tier, cards(rarity)')
            .eq('user_id', userId)
            .order('worth', { ascending: false })
            .limit(100) // fetch more, compute top 30 by effective bp

        let bp = (profile?.level ?? 1) * 10

        const scored = ((cards ?? []) as any[]).map((uc) => ({
            ...uc,
            rarity: (uc.cards?.rarity as string) ?? 'Common',
        })).map((uc) => ({ uc, score: cardBP(uc) }))

        scored.sort((a, b) => b.score - a.score)
        for (const { score } of scored.slice(0, 30)) {
            bp += score
        }

        await supabase
            .from('profiles')
            .update({ battle_power: bp })
            .eq('id', userId)
    } catch {
        // Non-critical — don't let BP errors break pack opens
    }
}
