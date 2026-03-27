export type Card = {
    id: string
    name: string
    image_url: string
    rarity: string
    national_pokedex_number: number
    worth: number
    isNew: boolean
    coins: number
    isHot: boolean
    attr_centering?: number
    attr_corners?: number
    attr_edges?: number
    attr_surface?: number
    set_id?: string
    preview_stats?: CardStats
    preview_nature?: string | null
}

export type CardStats = {
    stat_atk: number; stat_def: number; stat_spatk: number
    stat_spdef: number; stat_spd: number; stat_accuracy: number; stat_evasion: number
}

export type UserCopy = {
    id: string
    card_level: number
    card_xp: number
    grade: number | null
}

export const RARITY_TIERS = [
    'Common',
    'Uncommon',
    'Rare',
    'Rare Holo',
    'Rare Holo V',
    'Rare Holo VMAX',
    'Rare Ultra',
    'Epic',
    'Mythical',
    'Legendary',
    'Divine',
    'Celestial',
    '???',
]

export function getPackAura(cards: Card[]): {
    cls: string | null
    rarity: string | null
} {
    let best = -1
    let bestRarity: string | null = null
    for (const c of cards) {
        const idx = RARITY_TIERS.indexOf(c.rarity)
        if (idx > best) {
            best = idx
            bestRarity = c.rarity
        }
    }
    if (best < RARITY_TIERS.indexOf('Rare'))
        return { cls: null, rarity: null }
    const r = RARITY_TIERS[best]
    const cls =
        r === '???'
            ? 'pack-aura-mystery'
            : r === 'Celestial'
              ? 'pack-aura-celestial'
              : r === 'Divine'
                ? 'pack-aura-divine'
                : r === 'Legendary'
                  ? 'pack-aura-legendary'
                  : r === 'Mythical'
                    ? 'pack-aura-mythical'
                    : r === 'Epic'
                      ? 'pack-aura-epic'
                      : 'pack-aura-rare'
    return { cls, rarity: bestRarity }
}
