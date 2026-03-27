// ─── pack pools by level tier ─────────────────────────────────────────────────
// All standard + classic packs included. Crates (aspect:'box') have a flat
// 0.04% drop chance at any level regardless of tier.
const CRATE_IDS = ['theme-legendary', 'theme-shiny', 'xy-p-poncho']
const CRATE_CHANCE = 0.0004 // 0.04%

const PACK_TIERS: { minLevel: number; packIds: string[] }[] = [
    { minLevel: 1,  packIds: ['sv10.5b', 'sv10.5w', 'sv03.5'] },
    { minLevel: 5,  packIds: ['sv03.5', 'sv08.5', 'sv04.5', 'swsh12.5'] },
    { minLevel: 10, packIds: ['me02.5', 'sv08.5', 'swsh12.5', 'sv04.5'] },
    { minLevel: 15, packIds: ['theme-charizard', 'base1', 'me02.5'] },      // classic starts
    { minLevel: 20, packIds: ['theme-charizard', 'base1', 'base1-1ed'] },
    { minLevel: 30, packIds: ['theme-charizard', 'base1-1ed', 'base1'] },
    { minLevel: 50, packIds: ['base1-1ed', 'theme-charizard', 'base1'] },
]

/**
 * Coins rewarded on level-up.
 * Base scales linearly + milestone bonus every 5 levels.
 *   Lv 1  → 90    Lv 5  → 275   Lv 10 → 450
 *   Lv 20 → 900   Lv 50 → 2150
 */
export function levelUpCoins(level: number): number {
    const base = 75 + level * 15
    const milestone = Math.floor(level / 5) * 100
    return Math.floor(base + milestone)
}

/** Returns a pack ID for the given level, with 0.04% crate chance. */
export function levelUpPackId(level: number): string {
    // Crate roll — 0.04% regardless of level
    if (Math.random() < CRATE_CHANCE) {
        return CRATE_IDS[Math.floor(Math.random() * CRATE_IDS.length)]
    }
    const tier = [...PACK_TIERS].reverse().find(t => level >= t.minLevel) ?? PACK_TIERS[0]
    return tier.packIds[Math.floor(Math.random() * tier.packIds.length)]
}

export function getLevelReward(level: number): { coins: number; packId: string } {
    return { coins: levelUpCoins(level), packId: levelUpPackId(level) }
}
