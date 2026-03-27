import type React from 'react'

// ─── rarity order (highest → lowest) ─────────────────────────────────────────
export const RARITY_ORDER = [
    '???',
    'Celestial',
    'Divine',
    'Legendary',
    'Mythical',
    'Epic',
    'Rare',
    'Uncommon',
    'Common',
] as const

export type Rarity = (typeof RARITY_ORDER)[number]

// ─── display ──────────────────────────────────────────────────────────────────
export const RARITY_GLOW: Record<string, string> = {
    Common: '156, 163, 175',
    Uncommon: '74, 222, 128',
    Rare: '96, 165, 250',
    Epic: '168, 85, 247',
    Mythical: '244, 114, 182',
    Legendary: '234, 179, 8',
    Divine: '220, 38, 38',
    Celestial: '220, 220, 220',
    '???': 'rainbow',
}

export const RARITY_COLOR: Record<Rarity, string> = {
    Common: '#9ca3af',
    Uncommon: '#4ade80',
    Rare: '#60a5fa',
    Epic: '#a855f7',
    Mythical: '#f472b4',
    Legendary: '#eab308',
    Divine: '#ef4444',
    Celestial: '#e8e8e8',
    '???': 'rainbow',
}

// ─── pull weights ─────────────────────────────────────────────────────────────

// Legacy / event boost reference table (kept for luckBoost calculations)
export const WEIGHTS: Record<string, number> = {
    Common: 60,
    Uncommon: 25,
    Rare: 10,
    Epic: 3,
    Mythical: 1.5,
    Legendary: 0.4,
    Divine: 0.1,
    Celestial: 0.05,
    '???': 0.01,
}

// Slots 1–4: mostly bulk, small uncommon+ chance
export const WEIGHTS_BULK: Record<string, number> = {
    Common: 78,
    Uncommon: 16,
    Rare: 4.5,
    Epic: 1.0,
    Mythical: 0.3,
    Legendary: 0.12,
    Divine: 0.05,
    Celestial: 0.02,
    '???': 0.01,
}

// Slot 5: guaranteed uncommon+ (no Common)
export const WEIGHTS_UNCOMMON_PLUS: Record<string, number> = {
    Uncommon: 58,
    Rare: 28,
    Epic: 9,
    Mythical: 3,
    Legendary: 1.4,
    Divine: 0.45,
    Celestial: 0.1,
    '???': 0.05,
}

// Bonus 6th card & event bonus: guaranteed rare+
export const WEIGHTS_RARE_PLUS: Record<string, number> = {
    Rare: 62,
    Epic: 22,
    Mythical: 9,
    Legendary: 4.5,
    Divine: 1.5,
    Celestial: 0.45,
    '???': 0.05,
}

// Chance of a hidden 6th card per pack (rare+ guaranteed if hit)
export const BONUS_CARD_CHANCE = 0.08 // 8%

// Generic weighted pick from any weight table
export function pickRarityFromWeights(weights: Record<string, number>): string {
    const total = Object.values(weights).reduce((a, b) => a + b, 0)
    let roll = Math.random() * total
    for (const [rarity, w] of Object.entries(weights)) {
        roll -= w
        if (roll <= 0) return rarity
    }
    return Object.keys(weights)[0]
}

// ─── profile leveling ─────────────────────────────────────────────────────────

/** XP required to advance FROM a given profile level to the next */
export function xpForLevel(level: number): number {
    return level * 100
}

/** XP awarded for opening a pack */
export const XP_PER_PACK = 15

/** Apply XP to a profile (not a card), handling multi-level-ups. */
export function applyProfileXP(
    currentXp: number,
    currentLevel: number,
    gained: number,
): { xp: number; level: number } {
    let xp = currentXp + gained
    let level = currentLevel
    while (xp >= xpForLevel(level)) {
        xp -= xpForLevel(level)
        level += 1
    }
    return { xp, level }
}

// ─── leveling ─────────────────────────────────────────────────────────────────
export const MAX_CARD_LEVEL = 100

// xp gained when feeding a card of this rarity
export const RARITY_XP: Record<string, number> = {
    Common: 10,
    Uncommon: 20,
    Rare: 35,
    Epic: 55,
    Mythical: 80,
    Legendary: 120,
    Divine: 175,
    Celestial: 250,
    '???': 500,
}

// xp required to reach the next level
export function xpToNextLevel(rarity: string, level: number): number {
    const multipliers: Record<string, number> = {
        Common: 100,
        Uncommon: 100,
        Rare: 100,
        Epic: 20,
        Mythical: 20,
        Legendary: 20,
        Divine: 5,
        Celestial: 2,
        '???': 1,
    }
    return level * (multipliers[rarity] ?? 100)
}

// applies xp gain and handles multi-level-ups, capped at MAX_CARD_LEVEL
export function applyXP(
    currentLevel: number,
    currentXP: number,
    xpGained: number,
    rarity: string,
): { newLevel: number; newXP: number } {
    let level = currentLevel
    let xp = currentXP + xpGained

    while (level < MAX_CARD_LEVEL) {
        const threshold = xpToNextLevel(rarity, level)
        if (xp >= threshold) {
            xp -= threshold
            level++
        } else {
            break
        }
    }

    return { newLevel: level, newXP: xp }
}

// ─── buyback / coin economy ───────────────────────────────────────────────────

// Rarities that get a higher guaranteed floor
const HIGH_TIER_RARITIES = new Set(['Legendary', 'Divine', 'Celestial', '???'])

export const HOT_MARKET_CHANCE = 0.05 // 5% chance of hot market
export const HOT_MARKET_MULTIPLIER = 1.25 // +25% coins on hot market
export const FIRST_EDITION_MULTIPLIER = 2.5 // 1st edition cards are worth 2.5× base buyback

// Base flat ranges by rarity (before condition + tier rate are applied).
export const BUYBACK_RANGE: Record<string, [number, number]> = {
    Common:    [0.10, 0.40],
    Uncommon:  [0.50, 1.50],
    Rare:      [2.00, 7.00],
    Epic:      [8.00, 29.00],
    Mythical:  [30,   60],
    Legendary: [100,  200],
    Divine:    [300,  550],
    Celestial: [700,  1200],
    '???':     [2000, 4000],
}

function randBetween(min: number, max: number) {
    return Math.random() * (max - min) + min
}

export type Attrs = { attr_centering: number; attr_corners: number; attr_edges: number; attr_surface: number }
const ATTR_W = { centering: 0.25, corners: 0.30, edges: 0.25, surface: 0.20 }

// Whether this rarity counts as "high" for better condition multipliers at the top end.
const HIGH_RARITY_SET = new Set(['Mythical', 'Legendary', 'Divine', 'Celestial', '???'])

/** Weighted average condition value (1–10) from attrs. */
export function weightedCondition(attrs: Attrs): number {
    return (
        attrs.attr_centering * ATTR_W.centering +
        attrs.attr_corners   * ATTR_W.corners +
        attrs.attr_edges     * ATTR_W.edges +
        attrs.attr_surface   * ATTR_W.surface
    )
}

/**
 * Condition multiplier brackets (applied to base before buyback rate).
 * High rarities (Mythical+) get a stronger top-end at condition 9–10.
 * Each bracket has a [min, max] for slight randomization.
 *   cond 1      → [0.90, 1.10]   (baseline)
 *   cond 2–3    → [1.10, 1.30]   (+0.2 increase)
 *   cond 3–5    → [1.25, 1.55]   (+0.4 increase)
 *   cond 5–7    → [1.60, 1.90]   (+0.75 increase)
 *   cond 7–9    → [2.00, 2.50]   (+1.25 increase)
 *   cond 9–9.9  → [2.80, 3.20] / [3.00, 3.50] high  (2x increase)
 *   cond 10     → [3.00, 3.50] / [3.50, 4.00] high  (2–3x increase)
 */
export function conditionMultiplierRange(rarity: string, cond: number): [number, number] {
    const hi = HIGH_RARITY_SET.has(rarity)
    if (cond >= 10)      return hi ? [3.50, 4.00] : [3.00, 3.50]
    if (cond >= 9)       return hi ? [3.00, 3.50] : [2.80, 3.20]
    if (cond >= 7)       return hi ? [2.10, 2.60] : [2.00, 2.50]
    if (cond >= 5)       return hi ? [1.65, 2.00] : [1.60, 1.90]
    if (cond >= 3)       return hi ? [1.30, 1.60] : [1.25, 1.55]
    if (cond >= 2)       return hi ? [1.15, 1.35] : [1.10, 1.30]
    return [0.90, 1.10]
}

function conditionMultiplier(rarity: string, attrs?: Attrs | null): number {
    if (!attrs) return 1.4  // unknown → reasonable middle
    const cond = weightedCondition(attrs)
    const [lo, hi] = conditionMultiplierRange(rarity, cond)
    return randBetween(lo, hi)
}

/**
 * Tier buyback rate — random roll within rarity tier's range.
 *   sub-Legendary: 60–80%
 *   Legendary / Divine: 80–95%
 *   Celestial / ???: 95–100%
 */
export function tierBuybackRateRange(rarity: string): [number, number] {
    if (rarity === 'Celestial' || rarity === '???') return [0.95, 1.00]
    if (rarity === 'Legendary' || rarity === 'Divine') return [0.80, 0.95]
    return [0.60, 0.80]
}

/**
 * Calculates buyback value.
 *   1. base    = random within BUYBACK_RANGE[rarity]
 *   2. × conditionMultiplier  (1x–4x based on condition bracket + rarity)
 *   3. × tierBuybackRate      (60–80% sub-legendary, 80–95% legendary+, 95–100% celestial+)
 */
export function calculateBuyback(rarity: string, _marketPrice = 0, attrs?: Attrs | null, isFirstEdition = false): {
    coins: number
    isHot: boolean
} {
    const range = BUYBACK_RANGE[rarity] ?? [0.10, 0.40]
    const base = randBetween(range[0], range[1])
    const condMult = conditionMultiplier(rarity, attrs)
    const [rateMin, rateMax] = tierBuybackRateRange(rarity)
    const rate = randBetween(rateMin, rateMax)
    const editionMult = isFirstEdition ? FIRST_EDITION_MULTIPLIER : 1

    const isHot = Math.random() < HOT_MARKET_CHANCE
    const coins = parseFloat((base * condMult * rate * editionMult * (isHot ? HOT_MARKET_MULTIPLIER : 1)).toFixed(2))
    return { coins, isHot }
}

// ─── gacha ────────────────────────────────────────────────────────────────────

// weighted random rarity pick
export function pickRarity(): string {
    const totalWeights = Object.values(WEIGHTS).reduce((a, b) => a + b, 0)
    let roll = Math.random() * totalWeights

    for (const [rarity, weight] of Object.entries(WEIGHTS)) {
        roll -= weight
        if (roll <= 0) return rarity
    }

    return 'Common'
}

// returns "1 / X (Y%)" odds string for a given rarity
export function rarityToOdds(rarity: string): string {
    const totalWeight = Object.values(WEIGHTS).reduce((a, b) => a + b, 0)
    const weight = WEIGHTS[rarity] ?? 60
    const pct = ((weight / totalWeight) * 100).toFixed(2)
    const rounded = Math.round(totalWeight / weight)
    return `1 / ${rounded.toLocaleString()} (${pct}%)`
}

// ─── helpers ──────────────────────────────────────────────────────────────────

export function isRainbow(rarity: Rarity | string): boolean {
    return RARITY_GLOW[rarity] === 'rainbow'
}

// ─── style helpers ────────────────────────────────────────────────────────────

// Returns the rgb string (e.g. "96, 165, 250") for a rarity's glow colour.
// For '???' / rainbow returns a purple fallback for rgb-only contexts.
// Use rarityGlowClass() + skip inline boxShadow when you can use CSS classes.
export function rarityGlowRgb(rarity: string): string {
    const glow = RARITY_GLOW[rarity]
    if (!glow || glow === 'rainbow') return '255,255,255'
    return glow
}

// Returns the CSS class to apply for animated rarity glows.
// '???' → 'glow-rainbow' (animated cycling box-shadow in globals.css)
// all others → '' (apply boxShadow inline via rarityGlowShadow instead)
export function rarityGlowClass(rarity: string): string {
    return isRainbow(rarity) ? 'glow-rainbow' : ''
}

export const RAINBOW_TEXT_STYLE: React.CSSProperties = {
    background:
        'linear-gradient(90deg,#f87171,#fb923c,#facc15,#4ade80,#60a5fa,#a855f7,#f472b4)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
}

export function rarityTextStyle(rarity: string): React.CSSProperties {
    if (isRainbow(rarity as Rarity)) return RAINBOW_TEXT_STYLE
    if (rarity === 'Celestial') return { color: '#e8e8e8' }
    return { color: RARITY_COLOR[rarity as Rarity] ?? '#9ca3af' }
}

// Returns a box-shadow string for a rarity's glow at the given intensity.
// Returns '' for '???' — rainbow must use the .glow-rainbow CSS class instead,
// because an inline box-shadow would override and kill the CSS animation.
export function rarityGlowShadow(
    rarity: Rarity | string,
    intensity: 'sm' | 'md' | 'lg' = 'md',
): string {
    if (isRainbow(rarity)) return ''
    const rgb = RARITY_GLOW[rarity]
    const sizes = {
        sm: ['6px 1px', 0.25],
        md: ['14px 3px', 0.5],
        lg: ['32px 8px', 0.45],
    } as const
    const [size, alpha] = sizes[intensity]
    return `0 0 ${size} rgba(${rgb}, ${alpha})`
}
