import type { SupabaseClient } from '@supabase/supabase-js'

// Rarity weight — exponential spread so rarity meaningfully separates cards
export const RARITY_WEIGHT: Record<string, number> = {
    Common:    1,
    Uncommon:  3,
    Rare:      8,
    Epic:      20,
    Mythical:  50,
    Legendary: 100,
    Divine:    160,
    Celestial: 210,
    '???':     260,
}

export type BRTier = {
    label: string
    color: string
    min: number
}

export const BR_TIERS: BRTier[] = [
    { label: 'Bronze',    color: '#cd7f32',  min: 0 },
    { label: 'Silver',    color: '#94a3b8',  min: 10_000 },
    { label: 'Gold',      color: '#eab308',  min: 50_000 },
    { label: 'Platinum',  color: '#67e8f9',  min: 200_000 },
    { label: 'Diamond',   color: '#a78bfa',  min: 600_000 },
    { label: 'Legendary', color: '#f97316',  min: 1_500_000 },
]

export function getBRTier(bp: number): BRTier {
    for (let i = BR_TIERS.length - 1; i >= 0; i--) {
        if (bp >= BR_TIERS[i].min) return BR_TIERS[i]
    }
    return BR_TIERS[0]
}

export function formatBR(bp: number, full = false): string {
    if (full) return bp.toLocaleString()
    if (bp >= 1_000_000_000) {
        const s = (bp / 1_000_000_000).toFixed(2).replace(/\.?0+$/, '')
        return `${s}B`
    }
    if (bp >= 1_000_000) {
        const s = (bp / 1_000_000).toFixed(2).replace(/\.?0+$/, '')
        return `${s}M`
    }
    if (bp >= 100_000) return `${Math.round(bp / 1_000)}K`
    if (bp >= 1_000) return `${(bp / 1_000).toFixed(1)}K`
    return String(bp)
}

// Nature tier → BR multiplier
const NATURE_TIER_MULT: Record<string, number> = {
    'regular':   1.00,
    'legendary': 1.12,
    'divine':    1.25,
    'celestial': 1.40,
    '???':       1.60,
}

/**
 * Calculates BR contribution for a single card.
 *
 * Formula:
 *   stats_sum   = atk + def + spatk + spdef + spd + accuracy + evasion
 *   level_score = card_level × 10
 *   card_BR     = round(level_score × stats_sum × rarity_weight × nature_mult)
 *
 * Drivers (in order of weight): card level > stats > rarity > nature
 *
 * Example ranges:
 *   Common   Lv1  low stats  →     ~2K BR
 *   Common   Lv50 avg stats  →   ~100K BR
 *   Legendary Lv50 avg stats →    ~45M BR
 *   ???      Lv100 celestial →   ~500M BR
 */
export function cardBR(card: {
    card_level: number | null
    rarity: string
    stat_atk?: number | null
    stat_def?: number | null
    stat_spatk?: number | null
    stat_spdef?: number | null
    stat_spd?: number | null
    stat_accuracy?: number | null
    stat_evasion?: number | null
    nature_tier?: string | null
}): number {
    const weight = RARITY_WEIGHT[card.rarity] ?? 1
    const lvl = Math.max(1, Number(card.card_level ?? 1))
    const levelScore = lvl * 10

    const statsSum =
        Number(card.stat_atk      ?? 0) +
        Number(card.stat_def      ?? 0) +
        Number(card.stat_spatk    ?? 0) +
        Number(card.stat_spdef    ?? 0) +
        Number(card.stat_spd      ?? 0) +
        Number(card.stat_accuracy ?? 0) +
        Number(card.stat_evasion  ?? 0)

    // If stats haven't been rolled yet, use a rarity-appropriate default
    const effectiveStats = statsSum > 0 ? statsSum : weight * 50

    const natureMult = NATURE_TIER_MULT[card.nature_tier ?? 'regular'] ?? 1

    return Math.round(levelScore * effectiveStats * weight * natureMult)
}

/**
 * Recalculates and stores battle_power for a user.
 */
export async function recalcBattleRating(
    supabase: SupabaseClient,
    userId: string,
): Promise<number> {
    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('level')
            .eq('id', userId)
            .single()

        const { data: cards } = await supabase
            .from('user_cards')
            .select('card_level, stat_atk, stat_def, stat_spatk, stat_spdef, stat_spd, stat_accuracy, stat_evasion, nature_tier, cards(rarity)')
            .eq('user_id', userId)

        let bp = (profile?.level ?? 1) * 1000  // small level baseline

        for (const uc of (cards ?? []) as any[]) {
            const rarity = (uc.cards?.rarity as string) ?? 'Common'
            bp += cardBR({ ...uc, rarity })
        }

        await supabase
            .from('profiles')
            .update({ battle_power: bp })
            .eq('id', userId)

        return bp
    } catch {
        return 0
    }
}
