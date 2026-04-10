export const APP_VERSION = '1.3.0'

export type ChangelogEntry = {
    version: string
    date: string
    changes: string[]
}

export const CHANGELOG: ChangelogEntry[] = [
    {
        version: '1.3.0',
        date: '2026-04-09',
        changes: [
            'Pack unlock gates: packs now unlock every 10 levels',
            'White Flare & Black Bolt unlock together at the same level',
            'Special boxes unlock at level 40, crates at level 50',
            'x10 and x100 pack opening options added',
            'Multiple active events now stack in the corner',
            'Backfill: cards spawned at higher levels receive all legal moves',
            'XP overflow now correctly chains multi-level-ups',
        ],
    },
    {
        version: '1.2.0',
        date: '2026-04-04',
        changes: [
            'Battle system rework: support for custom trainers',
            'Battles now gated at level 10',
            'Profile mobile loading skeleton added',
            'Pack repricing overhaul',
            'Pack XP UI improvements',
        ],
    },
    {
        version: '1.1.0',
        date: '2026-03-20',
        changes: [
            'Dashboard 3D card view',
            'Quest system improvements',
            'Passive coin generation',
        ],
    },
]
