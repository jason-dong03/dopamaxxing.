// ─── Pokemon Stats & Nature System ──────────────────────────────────────────

export type CardStats = {
    stat_atk: number
    stat_def: number
    stat_spatk: number
    stat_spdef: number
    stat_spd: number
    stat_accuracy: number
    stat_evasion: number
}

export type NatureTier = 'regular' | 'legendary' | 'divine' | 'celestial' | '???'

export type Nature = {
    name: string
    tier: NatureTier
    effect: string // e.g. "+ATK / -DEF"
    modifiers: Partial<Record<keyof CardStats, number>> // 1.1 = +10%
}

// ─── PokeAPI base stats shape ─────────────────────────────────────────────
export type PokeBaseStats = {
    hp: number
    attack: number
    defense: number
    special_attack: number
    special_defense: number
    speed: number
}

// ─── Rarity multipliers applied on top of base stats ─────────────────────
// A Legendary card of a weak pokemon still outpaces a Common of a strong one
// at similar base levels, but the base stat gap is preserved.
export const RARITY_MULTIPLIER: Record<string, number> = {
    Common:    0.80,
    Uncommon:  1.00,
    Rare:      1.25,
    Epic:      1.55,
    Mythical:  1.85,
    Legendary: 2.20,
    Divine:    2.60,
    Celestial: 3.00,
    '???':     3.50,
}

// ─── Fallback flat ranges (used when no dex number is available) ──────────
const STAT_RANGES: Record<string, { min: number; max: number }> = {
    Common:    { min: 10, max: 45 },
    Uncommon:  { min: 15, max: 60 },
    Rare:      { min: 25, max: 75 },
    Epic:      { min: 35, max: 90 },
    Mythical:  { min: 50, max: 105 },
    Legendary: { min: 60, max: 115 },
    Divine:    { min: 75, max: 130 },
    Celestial: { min: 85, max: 145 },
    '???':     { min: 100, max: 160 },
}

function rand(min: number, max: number): number {
    return min + Math.floor(Math.random() * (max - min + 1))
}

/** ±15% variance around the scaled base stat */
function vary(base: number): number {
    return Math.round(base * (0.85 + Math.random() * 0.30))
}

/**
 * Roll stats for a card.
 *
 * When `pokeBase` is provided (fetched from PokeAPI), the formula is:
 *   stat = round(pokeBaseStat × rarityMultiplier × variance(±15%))
 *
 * Dragonite base ATK = 134  →  Legendary: 134 × 2.20 × ~1.0 ≈ 295
 * Caterpie  base ATK = 30   →  Legendary:  30 × 2.20 × ~1.0 ≈  66
 *
 * Without `pokeBase`, falls back to flat rarity-based ranges (old behaviour).
 */
export function rollStats(rarity: string, pokeBase?: PokeBaseStats): CardStats {
    const mult = RARITY_MULTIPLIER[rarity] ?? 1.0

    if (pokeBase) {
        // accuracy/evasion aren't real base stats — derive them from speed
        const accBase  = Math.min(100, Math.max(45, Math.round(pokeBase.speed * 0.55 + 42)))
        const evaBase  = Math.min(75,  Math.max(5,  Math.round(pokeBase.speed * 0.35 + 12)))
        return {
            stat_atk:      vary(pokeBase.attack          * mult),
            stat_def:      vary(pokeBase.defense         * mult),
            stat_spatk:    vary(pokeBase.special_attack  * mult),
            stat_spdef:    vary(pokeBase.special_defense * mult),
            stat_spd:      vary(pokeBase.speed           * mult),
            stat_accuracy: vary(accBase                  * mult),
            stat_evasion:  vary(evaBase                  * mult),
        }
    }

    // Fallback: no dex data available
    const { min, max } = STAT_RANGES[rarity] ?? { min: 10, max: 45 }
    return {
        stat_atk:      rand(min, max),
        stat_def:      rand(min, max),
        stat_spatk:    rand(min, max),
        stat_spdef:    rand(min, max),
        stat_spd:      rand(min, max),
        stat_accuracy: rand(Math.max(min, 45), Math.min(max + 5, 100)),
        stat_evasion:  rand(Math.max(min - 5, 5), Math.min(max - 5, 75)),
    }
}

// ─── 24 Custom Natures ────────────────────────────────────────────────────
export const NATURES: Nature[] = [
    // ─── ??? rarity (1) ──────────────────────────────────────────────────
    {
        name: 'Primordial',
        tier: '???',
        effect: 'All stats +12%',
        modifiers: {
            stat_atk: 1.12, stat_def: 1.12, stat_spatk: 1.12,
            stat_spdef: 1.12, stat_spd: 1.12,
            stat_accuracy: 1.12, stat_evasion: 1.12,
        },
    },
    // ─── Celestial rarity (1) ─────────────────────────────────────────────
    {
        name: 'Transcendent',
        tier: 'celestial',
        effect: '+ATK +SPATK +SPD / -DEF -SPDEF',
        modifiers: { stat_atk: 1.25, stat_spatk: 1.25, stat_spd: 1.15, stat_def: 0.80, stat_spdef: 0.85 },
    },
    // ─── Divine rarity (1) ────────────────────────────────────────────────
    {
        name: 'Radiant',
        tier: 'divine',
        effect: '+SPATK +SPDEF / -ATK -SPD',
        modifiers: { stat_spatk: 1.20, stat_spdef: 1.15, stat_atk: 0.85, stat_spd: 0.90 },
    },
    // ─── Legendary rarity (1) ─────────────────────────────────────────────
    {
        name: 'Valiant',
        tier: 'legendary',
        effect: '+ATK +SPD / -SPDEF',
        modifiers: { stat_atk: 1.20, stat_spd: 1.15, stat_spdef: 0.85 },
    },
    // ─── Regular natures (20) — all +10% / -10% single-stat pairs ─────────
    { name: 'Fierce',    tier: 'regular', effect: '+ATK / -DEF',   modifiers: { stat_atk: 1.1, stat_def: 0.9 } },
    { name: 'Reckless',  tier: 'regular', effect: '+ATK / -SPATK', modifiers: { stat_atk: 1.1, stat_spatk: 0.9 } },
    { name: 'Brave',     tier: 'regular', effect: '+ATK / -SPDEF', modifiers: { stat_atk: 1.1, stat_spdef: 0.9 } },
    { name: 'Hasty',     tier: 'regular', effect: '+ATK / -SPD',   modifiers: { stat_atk: 1.1, stat_spd: 0.9 } },
    { name: 'Stalwart',  tier: 'regular', effect: '+DEF / -ATK',   modifiers: { stat_def: 1.1, stat_atk: 0.9 } },
    { name: 'Resilient', tier: 'regular', effect: '+DEF / -SPATK', modifiers: { stat_def: 1.1, stat_spatk: 0.9 } },
    { name: 'Stoic',     tier: 'regular', effect: '+DEF / -SPDEF', modifiers: { stat_def: 1.1, stat_spdef: 0.9 } },
    { name: 'Guarded',   tier: 'regular', effect: '+DEF / -SPD',   modifiers: { stat_def: 1.1, stat_spd: 0.9 } },
    { name: 'Sage',      tier: 'regular', effect: '+SPATK / -ATK', modifiers: { stat_spatk: 1.1, stat_atk: 0.9 } },
    { name: 'Cunning',   tier: 'regular', effect: '+SPATK / -DEF', modifiers: { stat_spatk: 1.1, stat_def: 0.9 } },
    { name: 'Mystic',    tier: 'regular', effect: '+SPATK / -SPDEF', modifiers: { stat_spatk: 1.1, stat_spdef: 0.9 } },
    { name: 'Swift',     tier: 'regular', effect: '+SPATK / -SPD', modifiers: { stat_spatk: 1.1, stat_spd: 0.9 } },
    { name: 'Serene',    tier: 'regular', effect: '+SPDEF / -ATK', modifiers: { stat_spdef: 1.1, stat_atk: 0.9 } },
    { name: 'Resolute',  tier: 'regular', effect: '+SPDEF / -DEF', modifiers: { stat_spdef: 1.1, stat_def: 0.9 } },
    { name: 'Temperate', tier: 'regular', effect: '+SPDEF / -SPATK', modifiers: { stat_spdef: 1.1, stat_spatk: 0.9 } },
    { name: 'Careful',   tier: 'regular', effect: '+SPDEF / -SPD', modifiers: { stat_spdef: 1.1, stat_spd: 0.9 } },
    { name: 'Agile',     tier: 'regular', effect: '+SPD / -ATK',   modifiers: { stat_spd: 1.1, stat_atk: 0.9 } },
    { name: 'Nimble',    tier: 'regular', effect: '+SPD / -DEF',   modifiers: { stat_spd: 1.1, stat_def: 0.9 } },
    { name: 'Fleet',     tier: 'regular', effect: '+SPD / -SPATK', modifiers: { stat_spd: 1.1, stat_spatk: 0.9 } },
    { name: 'Vigilant',  tier: 'regular', effect: '+SPD / -SPDEF', modifiers: { stat_spd: 1.1, stat_spdef: 0.9 } },
]

export const NATURE_BY_NAME = Object.fromEntries(NATURES.map(n => [n.name, n]))

const REGULAR_NATURES = NATURES.filter(n => n.tier === 'regular')

// ─── Nature roll chance by rarity ─────────────────────────────────────────
const NATURE_CHANCE: Record<string, number> = {
    Common: 0.40, Uncommon: 0.50, Rare: 0.60, Epic: 0.70,
    Mythical: 0.75, Legendary: 0.85, Divine: 0.90, Celestial: 0.95, '???': 1.0,
}

// ─── Nature tier probabilities per card rarity ────────────────────────────
function rollNatureTier(rarity: string): NatureTier {
    const r = Math.random()
    switch (rarity) {
        case '???':
            if (r < 0.20) return '???'
            if (r < 0.35) return 'celestial'
            if (r < 0.55) return 'divine'
            if (r < 0.75) return 'legendary'
            return 'regular'
        case 'Celestial':
            if (r < 0.12) return 'celestial'
            if (r < 0.27) return 'divine'
            if (r < 0.47) return 'legendary'
            return 'regular'
        case 'Divine':
            if (r < 0.15) return 'divine'
            if (r < 0.30) return 'legendary'
            return 'regular'
        case 'Legendary':
        case 'Mythical':
            if (r < 0.20) return 'legendary'
            return 'regular'
        default:
            return 'regular'
    }
}

export function rollNature(rarity: string): string | null {
    const chance = NATURE_CHANCE[rarity] ?? 0.40
    if (Math.random() > chance) return null

    const tier = rollNatureTier(rarity)
    const candidates = NATURES.filter(n => n.tier === tier)
    const pool = candidates.length > 0 ? candidates : REGULAR_NATURES
    return pool[Math.floor(Math.random() * pool.length)].name
}

export function applyNatureToStats(stats: CardStats, natureName: string | null): CardStats {
    if (!natureName) return stats
    const nature = NATURE_BY_NAME[natureName]
    if (!nature) return stats
    const result = { ...stats }
    for (const [key, mult] of Object.entries(nature.modifiers)) {
        const k = key as keyof CardStats
        result[k] = Math.round(result[k] * (mult as number))
    }
    return result
}

// ─── Nature tier display colors ───────────────────────────────────────────
export const NATURE_TIER_COLOR: Record<NatureTier, string> = {
    regular:   '#94a3b8',
    legendary: '#f59e0b',
    divine:    '#a78bfa',
    celestial: '#38bdf8',
    '???':     '#f472b6',
}
