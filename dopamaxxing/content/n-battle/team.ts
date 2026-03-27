// ─── N's team reveal data ─────────────────────────────────────────────────
// Fixed legendaries always appear; random pool fills the remaining 3 slots.

export type TeamRevealEntry = {
    name: string
    sprite: string
    glowColor: string // CSS rgb string, e.g. "160,80,200"
}

export const N_FIXED_REVEAL: TeamRevealEntry[] = [
    { name: 'Reshiram', sprite: 'reshiram', glowColor: '255,200,100' },
    { name: 'Zekrom',   sprite: 'zekrom',   glowColor: '100,160,255' },
]

export const N_RANDOM_POOL: TeamRevealEntry[] = [
    { name: 'Zoroark',    sprite: 'zoroark',    glowColor: '160,80,200' },
    { name: 'Carracosta', sprite: 'carracosta', glowColor: '60,140,220' },
    { name: 'Archeops',   sprite: 'archeops',   glowColor: '180,160,80' },
    { name: 'Liepard',    sprite: 'liepard',    glowColor: '191,191,191' },
    { name: 'Seismitoad', sprite: 'seismitoad', glowColor: '80,104,200' },
    { name: 'Scrafty',    sprite: 'scrafty',    glowColor: '33,33,33' },
    { name: 'Darmanitan', sprite: 'darmanitan', glowColor: '125,26,26' },
    { name: 'Krookodile', sprite: 'krookodile', glowColor: '33,33,33' },
    { name: 'Sigilyph',   sprite: 'sigilyph',   glowColor: '180,160,80' },
]

/** Build a 5-entry reveal list: 2 fixed legendaries + 3 random from pool */
export function buildRevealTeam(): TeamRevealEntry[] {
    const shuffled = [...N_RANDOM_POOL].sort(() => Math.random() - 0.5)
    return [...N_FIXED_REVEAL, ...shuffled.slice(0, 3)]
}
