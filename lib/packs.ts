export type Pack = {
    id: string
    name: string
    image: string
    description: string
    aspect: 'pack' | 'box'
    cost: number
    theme_pokedex_ids?: number[]
    theme_include_first_ed?: boolean
    theme_label?: string
    theme_label_color?: string
    test_override_url?: string
    idle_aura?: string
    special?: boolean
    card_count?: number
    /** Minimum player level required to open this pack */
    level_required?: number
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
        id: 'sv02',
        name: 'Paldea Evolved',
        image: '/packs/paldea-evolved.png',
        description: 'S & V — Paldea Evolved',
        aspect: 'pack',
        cost: 11.69,
    },
    {
        id: 'sv03',
        name: 'Obsidian Flames',
        image: '/packs/obsidian-flames.png',
        description: 'S & V — Obsidian Flames',
        aspect: 'pack',
        cost: 12.0,
    },
    {
        id: 'sv03.5',
        name: '151',
        image: '/packs/151.jpg',
        description: 'S & V — 151',
        aspect: 'pack',
        cost: 24.5,
    },
    {
        id: 'sv04.5',
        name: 'Paldean Fates',
        image: '/packs/paldean-pack.png',
        description: 'S & V - Paldean Fates',
        aspect: 'pack',
        cost: 19.75,
    },
    {
        id: 'sv08',
        name: 'Surging Sparks',
        image: '/packs/surging-sparks.png',
        description: 'S & V — Surging Sparks',
        aspect: 'pack',
        cost: 9.53,
    },
    {
        id: 'sv08.5',
        name: 'Prismatic Evolutions',
        image: '/packs/prismatic-pack.png',
        description: 'S & V — Prismatic Evolutions',
        aspect: 'pack',
        cost: 17.5,
    },
    {
        id: 'sv10',
        name: 'Destined Rivals',
        image: '/packs/destined-rivals.png',
        description: 'S & V - Destined Rivals',
        aspect: 'pack',
        cost: 9.15,
    },
    {
        id: 'sv10.5b',
        name: 'Black Bolt',
        image: '/packs/black-bolt.jpg',
        description: 'S & V — Black Bolt',
        aspect: 'pack',
        cost: 15.5,
    },
    {
        id: 'sv10.5w',
        name: 'White Flare',
        image: '/packs/white-flare.jpg',
        description: 'S & V — White Flare',
        aspect: 'pack',
        cost: 15.5,
    },
    {
        id: 'swsh1',
        name: 'Sword & Shield',
        image: '/packs/sword-shield.png',
        description: 'Sword & Shield — Crown Zenith',
        aspect: 'pack',
        cost: 9.19,
    },
    {
        id: 'swsh11',
        name: 'Lost Origin',
        image: '/packs/lost-origins.png',
        description: 'Sword & Shield — Lost Origin',
        aspect: 'pack',
        cost: 14.92,
    },
    {
        id: 'swsh12.5',
        name: 'Crown Zenith',
        image: '/packs/zenith-pack.png',
        description: 'Sword & Shield — Crown Zenith',
        aspect: 'pack',
        cost: 22.0,
    },
    {
        id: 'me02',
        name: 'Phantasmal Flames',
        image: '/packs/phantasmal-flames.png',
        description: 'Mega Evolutions — Phantasmal Flames',
        aspect: 'pack',
        cost: 15.75,
    },
    {
        id: 'me02.5',
        name: 'Ascended Heroes',
        image: '/packs/ascended-pack.png',
        description: 'Mega Evolutions — Ascended Heroes',
        aspect: 'pack',
        cost: 14.94,
    },
    {
        id: 'base1',
        name: 'Base Set',
        image: '/packs/base-set.jpg',
        description: 'Classic — Base Set',
        aspect: 'pack',
        cost: 386.83,
        card_count: 11,
    },
    {
        id: 'base5',
        name: 'Team Rocket',
        image: '/packs/team-rocket.jpg',
        description: 'Team Rocket Base Set',
        aspect: 'pack',
        cost: 320,
        card_count: 11,
    },
    {
        id: 'ex4',
        name: 'Team Magma & Team Aqua',
        image: '/packs/aqua-magma.jpg',
        description: 'EX Team Rocket Returns',
        aspect: 'pack',
        cost: 574.08,
        card_count: 11,
    },
    {
        id: 'ex7',
        name: 'Team Rocket Returns',
        image: '/packs/team-rocket-returns.jpg',
        description: 'EX Team Rocket Returns',
        aspect: 'pack',
        cost: 1805.77,
        card_count: 11,
    },
    {
        id: 'sm9',
        name: 'Team Up',
        image: '/packs/teamup-pack.png',
        description: 'Sun & Moon - Team Up',
        aspect: 'pack',
        cost: 102.92,
        card_count: 10,
    },
    {
        id: 'smp',
        name: 'SM Black Star Promos',
        image: '/packs/blackstar-promo.png',
        description: 'Sun & Moon - Black Star Promos',
        aspect: 'box',
        cost: 500,
    },
    {
        id: 'xy7',
        name: 'Ancient Origins',
        image: '/packs/ancient-origins.png',
        description: 'Ancient Origins',
        aspect: 'pack',
        cost: 120.98,
        card_count: 10,
    },
    {
        id: 'theme-charizard',
        name: 'Charizard Pack',
        image: '/packs/charizard-pack.png',
        description: 'All Charizard cards — across every era',
        aspect: 'pack',
        cost: 10,
        theme_pokedex_ids: [6],
        theme_label: 'CHARIZARD',
        theme_label_color: '#f97316',
        idle_aura: 'pack-aura-epic',
        theme_include_first_ed: true,
    },
    {
        id: 'base1-1ed',
        name: 'Base Set - 1st Edition',
        image: '/packs/first-edition-base-set-pack.jpg',
        description: 'Base Set · First Edition',
        aspect: 'pack',
        cost: 800,
        theme_label: '1st Edition',
        theme_label_color: '#d4a017',
        idle_aura: 'pack-aura-celestial',
        special: true,
        theme_include_first_ed: true,
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
        id: 'xy-p-poncho',
        name: 'Poncho Pikachu',
        image: '/packs/pikachu-poncho.png',
        description: 'XY Promo — Poncho Pikachu',
        aspect: 'box',
        cost: 4250.3,
        idle_aura: 'pack-aura-celestial',
    },
    /* ── DEV TEST PACK — no DB calls ──────────────────────────────────────────────
    {
        id: 'test-rarity',
        name: '✦ Rarity Test',
        image: '/packs/charizard-pack.png',
        description: 'Dev — cycles Legendary → Divine → Celestial → ???',
        aspect: 'pack',
        cost: 0,
        idle_aura: 'pack-aura-mystery',
        test: true,
    },*/
]
