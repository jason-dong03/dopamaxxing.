import { Card } from '@/components/pack/utils'
import type React from 'react'
import { UserCard } from './types'

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

// Slots 1–4: heavy commons, small chance of anything better (duds most of the time)
// ~91.5% Common, ~6.5% Uncommon, ~2% Rare+
export const WEIGHTS_BULK: Record<string, number> = {
    Common: 91.5,
    Uncommon: 6.5,
    Rare: 1.6,
    Epic: 0.28,
    Mythical: 0.08,
    Legendary: 0.025,
    Divine: 0.008,
    Celestial: 0.003,
    '???': 0.001,
}

// Slot 5: guaranteed uncommon+ — mostly Uncommon, Rare is a treat, Epic+ is rare
// ~72% Uncommon, ~22% Rare, ~6% Epic+
export const WEIGHTS_UNCOMMON_PLUS: Record<string, number> = {
    Uncommon: 72,
    Rare: 22,
    Epic: 4.5,
    Mythical: 1.1,
    Legendary: 0.3,
    Divine: 0.07,
    Celestial: 0.02,
    '???': 0.005,
}

// Bonus 6th card & event bonus: guaranteed rare+
export const WEIGHTS_RARE_PLUS: Record<string, number> = {
    Rare: 68,
    Epic: 20,
    Mythical: 7.5,
    Legendary: 3.0,
    Divine: 1.0,
    Celestial: 0.3,
    '???': 0.05,
}

// Chance of a hidden 6th card per pack (rare+ guaranteed if hit)
export const BONUS_CARD_CHANCE = 0.05 // 5% (down from 8%)

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

export const USER_LEVEL_K = 100
export const MAX_USER_LEVEL = 100

/** XP required to advance FROM a given profile level to the next */
export function xpForLevel(level: number): number {
    return USER_LEVEL_K * level * level
}
// Spot-check: xpForLevel(1)=100, xpForLevel(10)=10000,
//             xpForLevel(25)=62500, xpForLevel(50)=250000, xpForLevel(100)=1000000

/** XP awarded for opening a pack (base) */
export const XP_PER_PACK = 15

/** XP awarded for opening a pack, scaled by player level (sqrt scaling) */
export function packXpGain(level: number): number {
    return Math.round(XP_PER_PACK * Math.sqrt(level))
}

/** Apply XP to a profile (not a card), handling multi-level-ups. */
export function applyProfileXP(
    currentXp: number,
    currentLevel: number,
    gained: number,
): { xp: number; level: number } {
    let xp = currentXp + gained
    let level = currentLevel
    while (xp >= xpForLevel(level) && level < MAX_USER_LEVEL) {
        xp -= xpForLevel(level)
        level += 1
    }
    if (level >= MAX_USER_LEVEL) {
        level = MAX_USER_LEVEL
        xp = 0
    }
    return { xp, level }
}

// ─── leveling ─────────────────────────────────────────────────────────────────
export const MAX_CARD_LEVEL = 100

// XP granted to the target card when a card of this rarity is fed to it.
// All cards share the same Erratic level-up threshold — rarity only affects
// how much XP a fed card contributes (higher rarity = dramatic boost).
export const RARITY_XP: Record<string, number> = {
    Common: 10,
    Uncommon: 30,
    Rare: 100,
    Epic: 300,
    Mythical: 800,
    Legendary: 2_000,
    Divine: 5_000,
    Celestial: 12_000,
    '???': 30_000,
}

// ─── Erratic XP growth curve ──────────────────────────────────────────────────
// Standard Pokémon Erratic experience group — piecewise formula.
// erraticXP(L) = total cumulative XP required to reach level L (1–100).
// Curve is fast at early levels, expensive in the mid-range, and tapers
// at the very end — giving a satisfying "early rush / late grind" feel.
//
//   1 ≤ L ≤ 50 : floor( L³ × (100 − L) / 50 )
//  51 ≤ L ≤ 68 : floor( L³ × (150 − L) / 100 )
//  69 ≤ L ≤ 98 : floor( L³ × floor((1911 − 10L) / 3) / 500 )
//  99 ≤ L ≤ 100: floor( L³ × (160 − L) / 100 )
//
// Canonical values: erraticXP(1)=1, erraticXP(50)=125000, erraticXP(100)=600000

/**
 * Total cumulative XP required to reach level L using the Erratic growth formula.
 * @param L integer in [1, 100]
 */
export function erraticXP(L: number): number {
    if (!Number.isInteger(L) || L < 1 || L > 100) {
        throw new RangeError(
            `erraticXP: L must be an integer in [1, 100], got ${L}`,
        )
    }
    const L3 = L * L * L
    if (L <= 50) return Math.floor((L3 * (100 - L)) / 50)
    if (L <= 68) return Math.floor((L3 * (150 - L)) / 100)
    if (L <= 98) return Math.floor((L3 * Math.floor((1911 - 10 * L) / 3)) / 500)
    return Math.floor((L3 * (160 - L)) / 100) // L = 99 or 100
}

/**
 * Incremental XP needed to advance from level L to L+1 (Erratic curve).
 * Equivalent to erraticXP(L+1) − erraticXP(L).
 * @param L integer in [1, 99]
 */
export function erraticXpToNext(L: number): number {
    if (!Number.isInteger(L) || L < 1 || L >= 100) {
        throw new RangeError(
            `erraticXpToNext: L must be an integer in [1, 99], got ${L}`,
        )
    }
    return erraticXP(L + 1) - erraticXP(L)
}

// XP required to advance from `level` to `level+1`.
// All rarities share the same Erratic threshold — rarity affects only
// what gets fed, not how much is needed to level up.
export function xpToNextLevel(_rarity: string, level: number): number {
    const clampedLevel = Math.min(Math.max(level, 1), 99)
    return erraticXpToNext(clampedLevel)
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

export const HOT_MARKET_CHANCE = 0.05 // 5% chance of hot market
export const HOT_MARKET_MULTIPLIER = 1.25 // +25% coins on hot market
export const FIRST_EDITION_MULTIPLIER = 2.5 // 1st edition cards are worth 2.5× base buyback

export type Attrs = {
    attr_centering: number
    attr_corners: number
    attr_edges: number
    attr_surface: number
}
const ATTR_W = { centering: 0.25, corners: 0.3, edges: 0.25, surface: 0.2 }

/** Weighted average condition value (1–10) from attrs. */
export function weightedCondition(attrs: Attrs | null): number {
    if (attrs == null) return -1
    return (
        attrs.attr_centering * ATTR_W.centering +
        attrs.attr_corners * ATTR_W.corners +
        attrs.attr_edges * ATTR_W.edges +
        attrs.attr_surface * ATTR_W.surface
    )
}

/*
Condition multipliers based on condition of card
 */
export function conditionMultFunction(cond: number): number {
    if (cond >= 10) return 2.5
    if (cond >= 9) return 1.85
    if (cond >= 8) return 1.73
    if (cond >= 7) return 1.25
    if (cond >= 6) return 1
    if (cond >= 5) return 0.75
    if (cond >= 4) return 0.5
    if (cond >= 3) return 0.3
    if (cond >= 2) return 0.15
    return 1
}
export function getCardWorth(card: Card): number {
    const rate = tierBuyBack(card.rarity as string)
    return parseFloat(((card.worth ?? 0) * rate).toFixed(2))
}

export function getBuyback(
    card: Card | null,
    userCard: UserCard | null,
): number {
    if (card) {
        const isFirstEdition =
            (card.set_id as string | undefined)?.endsWith('-1ed') ?? false
        return calculateBuyback(card.rarity, card.worth ?? 0, isFirstEdition)
            .amount
    } else if (userCard) {
        // worth is already the correct sell price (tierRate applied at pack open, condMult applied on grade)
        return userCard.worth ?? 0
    }
    return 0
}
export function tierBuyBack(rarity: string): number {
    if (rarity === '???') return 3.5
    if (rarity === 'Celestial') return 2.5
    if (rarity === 'Divine') return 1.75
    if (rarity === 'Legendary') return 1
    if (rarity === 'Mythical') return 0.85
    if (rarity === 'Epic') return 0.65
    if (rarity === 'Rare') return 0.45
    return 0.2
}
/**
 * Returns the starting level for a newly pulled card.
 * 70% chance of level 1 (less for higher rarities), rest exponentially distributed 2–100.
 * Expected level for non-1 draws scales with rarity.
 */
export function randomCardLevel(rarity: string): number {
    const configs: Record<
        string,
        { level1Prob: number; expectedLevel: number }
    > = {
        Common: { level1Prob: 0.7, expectedLevel: 3 },
        Uncommon: { level1Prob: 0.65, expectedLevel: 4 },
        Rare: { level1Prob: 0.58, expectedLevel: 6 },
        Epic: { level1Prob: 0.5, expectedLevel: 10 },
        Legendary: { level1Prob: 0.42, expectedLevel: 16 },
        Mythical: { level1Prob: 0.35, expectedLevel: 25 },
        Divine: { level1Prob: 0.28, expectedLevel: 38 },
        Celestial: { level1Prob: 0.22, expectedLevel: 55 },
        '???': { level1Prob: 0.15, expectedLevel: 75 },
    }
    const cfg = configs[rarity] ?? configs['Common']!
    if (Math.random() < cfg.level1Prob) return 1

    // Geometric decay: P(k) ∝ r^(k-2) for k in [2,100]
    // r chosen so E[k | k≥2] ≈ expectedLevel: r = (E-2)/(E-1)
    const r = Math.min(0.99, (cfg.expectedLevel - 2) / (cfg.expectedLevel - 1))
    const norm = (1 - Math.pow(r, 99)) / (1 - r)
    const rand = Math.random()
    let cumulative = 0
    for (let k = 2; k <= 100; k++) {
        cumulative += Math.pow(r, k - 2) / norm
        if (rand <= cumulative) return k
    }
    return 100
}

/**
 * Level multiplier for buyback (step tiers):
 *   1 → 1×  |  2–10 → 1.5×  |  11–25 → 1.75×  |  26–50 → 2.25×
 *   51–75 → 2.75×  |  76–99 → 3×  |  100 → 6×
 */
export function levelBuybackMult(level: number): number {
    if (level >= 100) return 3.5
    if (level >= 76) return 2.75
    if (level >= 51) return 2.25
    if (level >= 26) return 1.75
    if (level >= 11) return 1.35
    if (level >= 2) return 1.15
    return 0.85
}

/**
 * Calculates buyback value.
 *   storedWorth = base × tierRate  (saved to user_cards.worth)
 *   amount      = storedWorth × editionMult × hotMult  (shown as coins at pack open)
 *   After grading: worth is multiplied by conditionMult in grade-card route.
 */
export function calculateBuyback(
    rarity: string,
    _marketPrice = 0,
    isFirstEdition = false,
): {
    amount: number
    storedWorth: number
    rate: number
    isHot: boolean
} {
    const rate = tierBuyBack(rarity)
    const editionMult = isFirstEdition ? FIRST_EDITION_MULTIPLIER : 1
    const isHot = Math.random() < HOT_MARKET_CHANCE
    const storedWorth = parseFloat((_marketPrice * rate).toFixed(2))
    let amount = parseFloat(
        (
            storedWorth *
            editionMult *
            (isHot ? HOT_MARKET_MULTIPLIER : 1)
        ).toFixed(2),
    )
    if (amount < 0.01) amount = 0.01
    if (storedWorth < 0.01 && storedWorth !== 0) {
        return { amount, storedWorth: 0.01, rate, isHot }
    }
    return { amount, storedWorth, rate, isHot }
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
