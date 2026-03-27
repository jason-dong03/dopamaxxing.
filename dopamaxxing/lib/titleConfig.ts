// Title rarity tiers and colors
// Titles are granted via quest rewards and displayed in profile/header

export type TitleRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'divine'

const TITLE_RARITY_MAP: Record<string, TitleRarity> = {
    // N Chain (endgame)
    "N's Champion": 'legendary',
    // Pack chain
    "the Collector": 'rare',
    "Pack Fiend": 'epic',
    // Feeder chain
    "the Feeder": 'uncommon',
    // Discord
    "the Connected": 'common',
    // Misc quest titles — add as quests are created
    "Early Adopter": 'rare',
    "the Devoted": 'uncommon',
    "Liberator": 'epic',
}

const RARITY_COLORS: Record<TitleRarity, string> = {
    common: 'var(--app-text-muted)',
    uncommon: '#4ade80',      // green
    rare: '#60a5fa',          // blue
    epic: '#c084fc',          // purple
    legendary: '#fbbf24',     // gold
    divine: '#f0abfc',        // rainbow-ish pink
}

export function getTitleColor(title: string): string {
    const rarity = TITLE_RARITY_MAP[title] ?? 'common'
    return RARITY_COLORS[rarity]
}

export function getTitleRarity(title: string): TitleRarity {
    return TITLE_RARITY_MAP[title] ?? 'common'
}
