export type Pack = {
    id: string
    name: string
    image: string
    description: string
    aspect: 'pack' | 'box'
    cost: number
    theme_pokedex_ids?: number[]
    theme_label?: string
    theme_label_color?: string
    test_override_url?: string
    idle_aura?: string
    special?: boolean
    card_count?: number
    /** Dev-only: skip all DB calls and use mock cards */
    test?: boolean
}

export const LEGENDARY_DEX_IDS: number[] = [
    // Gen 1
    144, 145, 146, 150, 151,
    // Gen 2
    243, 244, 245, 249, 250, 251,
    // Gen 3
    377, 378, 379, 380, 381, 382, 383, 384, 385, 386,
    // Gen 4
    480, 481, 482, 483, 484, 485, 486, 487, 488, 489, 490, 491, 492, 493,
    // Gen 5
    494, 638, 639, 640, 641, 642, 643, 644, 645, 646, 647, 648, 649,
    // Gen 6
    716, 717, 718, 719, 720, 721,
    // Gen 7
    789, 790, 791, 792, 800, 801, 802, 807, 808, 809,
    // Gen 8
    888, 889, 890, 891, 892, 893, 894, 895, 896, 897, 898,
]

export const PACKS: Pack[] = [
    {
        id: 'sv03.5',
        name: '151',
        image: '/packs/151.jpg',
        description: 'S & V — 151',
        aspect: 'pack',
        cost: 25.1,
    },
    {
        id: 'sv08.5',
        name: 'Prismatic Evolutions',
        image: '/packs/prismatic-pack.png',
        description: 'S & V — Prismatic Evolutions',
        aspect: 'pack',
        cost: 11.58,
    },
    {
        id: 'sv04.5',
        name: 'Paldean Fates',
        image: '/packs/paldean-pack.png',
        description: 'S & V - Paldean Fates',
        aspect: 'pack',
        cost: 16.32,
    },
    {
        id: 'swsh12.5',
        name: 'Crown Zenith',
        image: '/packs/zenith-pack.png',
        description: 'S & V — Crown Zenith',
        aspect: 'pack',
        cost: 18.73,
    },
    {
        id: 'sv10.5b',
        name: 'Black Bolt',
        image: '/packs/black-bolt.jpg',
        description: 'S & V — Black Bolt',
        aspect: 'pack',
        cost: 9.5,
    },
    {
        id: 'sv10.5w',
        name: 'White Flare',
        image: '/packs/white-flare.jpg',
        description: 'S & V — White Flare',
        aspect: 'pack',
        cost: 9.5,
    },
    {
        id: 'me02.5',
        name: 'Ascended Heroes',
        image: '/packs/ascended-pack.png',
        description: 'Mega Evolutions — Ascended Heroes',
        aspect: 'pack',
        cost: 11.43,
    },
    {
        id: 'base1',
        name: 'Base Set',
        image: '/packs/base-set.jpg',
        description: 'Classic — Base Set',
        aspect: 'pack',
        cost: 565.64,
        special: true,
        card_count: 11,
        theme_label: 'CLASSIC',
        theme_label_color: '#a78bfa',
    },
    {
        id: 'base1-1ed',
        name: 'Base Set 1st Edition',
        image: '/packs/first-edition-base-set-pack.jpg',
        description: 'Classic — Base Set · First Edition',
        aspect: 'pack',
        cost: 790.0,
        theme_label: '1st EDITION',
        theme_label_color: '#d4a017',
        idle_aura: 'pack-aura-celestial',
        special: true,
        card_count: 11,
    },
    {
        id: 'theme-charizard',
        name: 'Charizard Pack',
        image: '/packs/charizard-pack.png',
        description: 'All Charizard cards — across every era',
        aspect: 'pack',
        cost: 85,
        theme_pokedex_ids: [6],
        theme_label: 'CHARIZARD',
        theme_label_color: '#f97316',
        idle_aura: 'pack-aura-epic',
    },
    {
        id: 'theme-legendary',
        name: 'Legendary Box',
        image: '/packs/legendary-box.png',
        description: 'Legendary & Mythical Pokémon only',
        aspect: 'box',
        cost: 200,
        theme_pokedex_ids: LEGENDARY_DEX_IDS,
        theme_label: 'LEGENDARY',
        theme_label_color: '#facc15',
        idle_aura: 'pack-aura-legendary',
    },
    {
        id: 'theme-shiny',
        name: 'Shiny Crate',
        image: '/packs/shiny-pack.png',
        description: 'Shining Fates — ultra-rare shiny Pokémon',
        aspect: 'box',
        cost: 2500,
        theme_label: 'SHINY',
        theme_label_color: '#67e8f9',
        idle_aura: 'pack-aura-mystery',
    },
    {
        id: 'xy-p-poncho',
        name: 'Poncho Pikachu',
        image: '/packs/pikachu-poncho.png',
        description: 'XY Promo — Poncho Pikachu',
        aspect: 'box',
        cost: 4250.3,
        idle_aura: 'pack-aura-celestial',
    },
    // ── DEV TEST PACK — no DB calls ──────────────────────────────────────────────
    {
        id: 'test-rarity',
        name: '✦ Rarity Test',
        image: '/packs/charizard-pack.png',
        description: 'Dev — cycles Legendary → Divine → Celestial → ???',
        aspect: 'pack',
        cost: 0,
        idle_aura: 'pack-aura-mystery',
        test: true,
    },
]
