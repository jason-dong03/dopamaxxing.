export type ItemId = 'full-heal' | 'potion' | 'super-potion' | 'revive'

export type ItemDef = {
    id: ItemId
    name: string
    description: string
    icon: string          // emoji fallback until real images arrive
    shopCost: number      // coins
    inBattle: boolean     // usable during battle
}

export const ITEMS: ItemDef[] = [
    {
        id:          'full-heal',
        name:        'Full Heal',
        description: 'Cures all status conditions (burn, poison, sleep, paralysis, confusion).',
        icon:        '💊',
        shopCost:    300,
        inBattle:    true,
    },
    {
        id:          'potion',
        name:        'Potion',
        description: 'Restores 20 HP to one Pokémon.',
        icon:        '🧪',
        shopCost:    200,
        inBattle:    true,
    },
    {
        id:          'super-potion',
        name:        'Super Potion',
        description: 'Restores 50 HP to one Pokémon.',
        icon:        '⚗️',
        shopCost:    500,
        inBattle:    true,
    },
    {
        id:          'revive',
        name:        'Revive',
        description: 'Revives a fainted Pokémon with half its HP.',
        icon:        '✨',
        shopCost:    1500,
        inBattle:    true,
    },
]

export const ITEM_MAP = Object.fromEntries(ITEMS.map(i => [i.id, i])) as Record<ItemId, ItemDef>
