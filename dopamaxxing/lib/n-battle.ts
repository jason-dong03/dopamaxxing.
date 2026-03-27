// ─── Type effectiveness chart (Gen 6+) ───────────────────────────────────────
// Keys: attacking move type → defending pokemon type → damage multiplier
// Omitted entries default to 1× (neutral)
export const TYPE_EFFECTIVENESS: Record<string, Record<string, number>> = {
    normal:   { rock: 0.5, ghost: 0, steel: 0.5 },
    fire:     { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
    water:    { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
    electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
    grass:    { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
    ice:      { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
    fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
    poison:   { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
    ground:   { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
    flying:   { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
    psychic:  { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
    bug:      { fire: 0.5, grass: 2, fighting: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
    rock:     { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
    ghost:    { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
    dragon:   { dragon: 2, steel: 0.5, fairy: 0 },
    dark:     { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
    steel:    { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
    fairy:    { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 },
}

export function getTypeEffectiveness(attackType: string | undefined, defenderType: string | undefined): number {
    if (!attackType || !defenderType) return 1
    return TYPE_EFFECTIVENESS[attackType]?.[defenderType] ?? 1
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type BattleStatus = 'active' | 'won' | 'lost'
export type StatusEffect = 'none' | 'burn' | 'paralysis' | 'poison' | 'sleep' | 'confusion'

export type StatName = 'attack' | 'defense' | 'speed'

export type Attack = {
    name: string
    damage: number
    effect: string
    attackType?: string   // pokemon type of the move (e.g. 'fire', 'water') — used for effectiveness
    statusInflict?: StatusEffect
    selfDamage?: number
    damageBonus?: number
    bonusCondition?: 'hp_below_max' | 'self_damaged'
    copyLastAttack?: boolean
    speedBoost?: number
    maxPp?: number        // max PP for this move (display + client tracking)
    healFraction?: number
    selfStatusInflict?: StatusEffect
    alwaysInflict?: boolean
    selfBoosts?: { stat: StatName; stages: number }[]   // stat boosts to self (e.g. Nasty Plot, Swords Dance)
    enemyDrops?: { stat: StatName; stages: number }[]   // stat drops to enemy (e.g. Growl, Charm)
    moveAccuracy?: number | null  // move's own accuracy (null = always hits), for display only
    priority?: number             // turn order priority (+1 goes before 0; -1 goes after 0)
}

export type BattleCard = {
    id: string
    name: string
    level: number
    rarity: string
    hp: number
    maxHp: number
    image_url: string
    pokemon_type: string   // primary pokemon type — used for type effectiveness
    attacks: Attack[]
    statusEffect: StatusEffect
    statusTurns: number
    lastAttackDamage: number
    speed: number
    evasion: number
    accuracy: number
    exp?: number            // current EXP toward next level
    nature?: string
    attackStage?: number    // -6 to +6, affects outgoing damage (default 0)
    defenseStage?: number  // -6 to +6, affects incoming damage (default 0)
    speedStage?: number    // -6 to +6, affects turn order (default 0)
}

export type BattleLogEntry = {
    turn: number
    actor: 'user' | 'n'
    attackName: string
    damage: number
    effect?: string
    fainted?: string
    missed?: boolean
    typeEffectiveness?: number  // 0 = immune, 0.5 = not very effective, 2 = super effective
    statChanges?: string[]      // e.g. ["Gengar's ATK sharply rose!", "Gengar's SPD rose!"]
}

export type BattleState = {
    id: string
    status: BattleStatus
    user_cards: BattleCard[]
    n_cards: BattleCard[]
    user_active_index: number
    n_active_index: number
    turn: number
    n_next_move: { attackIndex: number } | null
    battle_log: BattleLogEntry[]
}

// ─── Level-based HP roll ──────────────────────────────────────────────────────

export function rollLevelHp(level: number): number {
    let hp = 30
    for (let i = 0; i < level; i++) {
        hp += 10 + Math.floor(Math.random() * 26) // +10 to +35 per level
    }
    return hp
}

export const RARITY_LEVEL: Record<string, number> = {
    Common: 5, Uncommon: 8, Rare: 12, Epic: 15,
    Mythical: 18, Legendary: 20, Divine: 23, Celestial: 26, '???': 30,
}

// ─── N's hardcoded team (buffed) ─────────────────────────────────────────────

type TeamTemplate = Omit<BattleCard, 'statusEffect' | 'statusTurns' | 'lastAttackDamage'>

export const N_TEAM: TeamTemplate[] = [
    {
        id: 'n-zoroark',
        name: 'Zoroark',
        level: 52,
        rarity: '???',
        nature: 'Timid',
        pokemon_type: 'dark',
        hp: 0, maxHp: 0,   // overridden by rollLevelHp at battle start
        speed: 105,
        evasion: 0.04,
        accuracy: 0.90,
        image_url: 'https://play.pokemonshowdown.com/sprites/ani/zoroark.gif',
        attacks: [
            { name: 'Foul Play',   damage: 0,  attackType: 'dark',   effect: "Mirrors the opponent's last attack.", copyLastAttack: true, maxPp: 15 },
            { name: 'Night Daze',  damage: 85, attackType: 'dark',   effect: 'A powerful dark pulse. May confuse.', statusInflict: 'confusion', maxPp: 10 },
            { name: 'Nasty Plot',  damage: 0,  attackType: 'dark',   effect: 'Sharply raises ATK.', selfBoosts: [{ stat: 'attack', stages: 2 }], maxPp: 20 },
            { name: 'Shadow Ball', damage: 80, attackType: 'ghost',  effect: 'A shadowy blob. May lower DEF.', enemyDrops: [{ stat: 'defense', stages: -1 }], maxPp: 15 },
        ],
    },
    {
        id: 'n-carracosta',
        name: 'Carracosta',
        level: 51,
        rarity: '???',
        nature: 'Relaxed',
        pokemon_type: 'water',
        hp: 0, maxHp: 0,
        speed: 32,
        evasion: 0.04,
        accuracy: 0.92,
        image_url: 'https://play.pokemonshowdown.com/sprites/ani/carracosta.gif',
        attacks: [
            { name: 'Brine',       damage: 65, attackType: 'water', effect: 'Power doubles when target is below half HP.', damageBonus: 65, bonusCondition: 'hp_below_max', maxPp: 10 },
            { name: 'Surf',        damage: 95, attackType: 'water', effect: 'A powerful wave crashes down.', maxPp: 15 },
            { name: 'Shell Smash', damage: 0,  attackType: 'normal', effect: 'Smashes its shell to sharply raise ATK and SPD.', selfBoosts: [{ stat: 'attack', stages: 2 }, { stat: 'speed', stages: 2 }], maxPp: 15 },
            { name: 'Aqua Jet',   damage: 40, attackType: 'water', effect: 'A surging strike that always goes first.', priority: 1, maxPp: 20 },
        ],
    },
    {
        id: 'n-archeops',
        name: 'Archeops',
        level: 51,
        rarity: '???',
        nature: 'Jolly',
        pokemon_type: 'rock',
        hp: 0, maxHp: 0,
        speed: 110,
        evasion: 0.06,
        accuracy: 0.90,
        image_url: 'https://play.pokemonshowdown.com/sprites/ani/archeops.gif',
        attacks: [
            { name: 'Stone Edge',  damage: 100, attackType: 'rock',   effect: 'High critical-hit ratio.', maxPp: 5 },
            { name: 'Acrobatics',  damage: 110, attackType: 'flying', effect: 'Swift aerial strike. Archeops grows faster.', speedBoost: 12, maxPp: 15 },
            { name: 'Dragon Claw', damage: 80,  attackType: 'dragon', effect: 'Sharp draconic claws.', maxPp: 15 },
            { name: 'Roost',       damage: 0,   attackType: 'flying', effect: 'Restores 50% HP.', healFraction: 0.5, maxPp: 10 },
        ],
    },
    {
        id: 'n-reshiram',
        name: 'Reshiram',
        level: 52,
        rarity: '???',
        nature: 'Modest',
        pokemon_type: 'dragon',
        hp: 0, maxHp: 0,
        speed: 90,
        evasion: 0.04,
        accuracy: 0.93,
        image_url: 'https://play.pokemonshowdown.com/sprites/ani/reshiram.gif',
        attacks: [
            { name: 'Outrage',        damage: 120, attackType: 'dragon', effect: '+15 per damage counter on Reshiram.', damageBonus: 15, bonusCondition: 'self_damaged', maxPp: 10 },
            { name: 'Blue Flare',     damage: 130, attackType: 'fire',   effect: 'Pillar of sacred fire. Burns. Reshiram takes 40 recoil.', statusInflict: 'burn', selfDamage: 40, maxPp: 5 },
            { name: 'Dragon Breath',  damage: 60,  attackType: 'dragon', effect: 'Exhales a powerful breath. May paralyze.', statusInflict: 'paralysis', maxPp: 20 },
            { name: 'Roost',          damage: 0,   attackType: 'flying', effect: 'Restores 50% HP.', healFraction: 0.5, maxPp: 10 },
        ],
    },
    {
        id: 'n-zekrom',
        name: 'Zekrom',
        level: 52,
        rarity: '???',
        nature: 'Adamant',
        pokemon_type: 'dragon',
        hp: 0, maxHp: 0,
        speed: 90,
        evasion: 0.04,
        accuracy: 0.93,
        image_url: 'https://play.pokemonshowdown.com/sprites/ani/zekrom.gif',
        attacks: [
            { name: 'Outrage',     damage: 120, attackType: 'dragon',   effect: '+15 per damage counter on Zekrom.', damageBonus: 15, bonusCondition: 'self_damaged', maxPp: 10 },
            { name: 'Bolt Strike', damage: 130, attackType: 'electric', effect: 'Devastating thunder. Paralyzes. Zekrom takes 40 recoil.', statusInflict: 'paralysis', selfDamage: 40, maxPp: 5 },
            { name: 'Dragon Claw', damage: 80,  attackType: 'dragon',   effect: 'Sharp draconic claws.', maxPp: 15 },
            { name: 'Hone Claws',  damage: 0,   attackType: 'dark',     effect: 'Sharpens claws to raise ATK.', selfBoosts: [{ stat: 'attack', stages: 1 }], maxPp: 15 },
        ],
    },
]

export function initBattleCard(template: TeamTemplate): BattleCard {
    return { ...template, statusEffect: 'none', statusTurns: 0, lastAttackDamage: 0, attackStage: 0, defenseStage: 0, speedStage: 0 }
}

// ─── N's core legendaries (always in team) ───────────────────────────────────

const N_CORE: TeamTemplate[] = [
    N_TEAM.find(t => t.id === 'n-zoroark')!,
    N_TEAM.find(t => t.id === 'n-reshiram')!,
    N_TEAM.find(t => t.id === 'n-zekrom')!,
]

// ─── N's random pool (Carracosta, Archeops + 6 new) ─────────────────────────

export const N_EXTRAS_POOL: TeamTemplate[] = [
    N_TEAM.find(t => t.id === 'n-carracosta')!,
    N_TEAM.find(t => t.id === 'n-archeops')!,
    {
        id: 'n-krookodile',
        name: 'Krookodile',
        level: 50,
        rarity: '???',
        nature: 'Jolly',
        pokemon_type: 'ground',
        hp: 0, maxHp: 0,
        speed: 92,
        evasion: 0.06,
        accuracy: 0.90,
        image_url: 'https://play.pokemonshowdown.com/sprites/ani/krookodile.gif',
        attacks: [
            { name: 'Crunch',      damage: 80,  attackType: 'dark',   effect: 'A vicious bite. May lower DEF.', enemyDrops: [{ stat: 'defense', stages: -1 }], maxPp: 15 },
            { name: 'Earthquake',  damage: 100, attackType: 'ground', effect: 'The ground shakes violently.', maxPp: 10 },
            { name: 'Dragon Claw', damage: 80,  attackType: 'dragon', effect: 'Sharp draconic claws.', maxPp: 15 },
            { name: 'Scary Face',  damage: 0,   attackType: 'normal', effect: 'A terrifying face lowers enemy SPD sharply.', enemyDrops: [{ stat: 'speed', stages: -2 }], maxPp: 10 },
        ],
    },
    {
        id: 'n-seismitoad',
        name: 'Seismitoad',
        level: 50,
        rarity: '???',
        nature: 'Bold',
        pokemon_type: 'water',
        hp: 0, maxHp: 0,
        speed: 74,
        evasion: 0.04,
        accuracy: 0.91,
        image_url: 'https://play.pokemonshowdown.com/sprites/ani/seismitoad.gif',
        attacks: [
            { name: 'Muddy Water', damage: 90, attackType: 'water',    effect: 'Murky water lowers accuracy.', statusInflict: 'confusion', maxPp: 10 },
            { name: 'Drain Punch', damage: 75, attackType: 'fighting', effect: "Saps the opponent's strength.", maxPp: 10 },
            { name: 'Sludge Bomb', damage: 90, attackType: 'poison',   effect: 'Hurls sludge. May poison.', statusInflict: 'poison', maxPp: 10 },
            { name: 'Toxic',       damage: 0,  attackType: 'poison',   effect: 'Badly poisons the target.', statusInflict: 'poison', alwaysInflict: true, maxPp: 10 },
        ],
    },
    {
        id: 'n-darmanitan',
        name: 'Darmanitan',
        level: 51,
        rarity: '???',
        nature: 'Adamant',
        pokemon_type: 'fire',
        hp: 0, maxHp: 0,
        speed: 95,
        evasion: 0.04,
        accuracy: 0.90,
        image_url: 'https://play.pokemonshowdown.com/sprites/ani/darmanitan.gif',
        attacks: [
            { name: 'Flare Blitz', damage: 120, attackType: 'fire',    effect: 'Reckless flame charge. Burns. Takes 40 recoil. Darmanitan accelerates.', selfDamage: 40, statusInflict: 'burn', speedBoost: 12, maxPp: 15 },
            { name: 'Hammer Arm',  damage: 100, attackType: 'fighting', effect: 'A crushing blow.', maxPp: 10 },
            { name: 'Fire Punch',  damage: 75,  attackType: 'fire',    effect: 'A flaming punch. May burn.', statusInflict: 'burn', maxPp: 15 },
            { name: 'Bulk Up',     damage: 0,   attackType: 'fighting', effect: 'Bulks up to raise ATK and DEF.', selfBoosts: [{ stat: 'attack', stages: 1 }, { stat: 'defense', stages: 1 }], maxPp: 20 },
        ],
    },
    {
        id: 'n-sigilyph',
        name: 'Sigilyph',
        level: 50,
        rarity: '???',
        nature: 'Timid',
        pokemon_type: 'psychic',
        hp: 0, maxHp: 0,
        speed: 97,
        evasion: 0.04,
        accuracy: 0.90,
        image_url: 'https://play.pokemonshowdown.com/sprites/ani/sigilyph.gif',
        attacks: [
            { name: 'Psychic',      damage: 90, attackType: 'psychic', effect: 'A telekinetic force. May confuse.', statusInflict: 'confusion', maxPp: 10 },
            { name: 'Air Slash',    damage: 75, attackType: 'flying',  effect: 'Slicing air blades. May paralyze.', statusInflict: 'paralysis', maxPp: 15 },
            { name: 'Cosmic Power', damage: 0,  attackType: 'psychic', effect: 'Draws in cosmic energy to raise DEF.', selfBoosts: [{ stat: 'defense', stages: 1 }], maxPp: 20 },
            { name: 'Roost',        damage: 0,  attackType: 'flying',  effect: 'Restores 50% HP.', healFraction: 0.5, maxPp: 10 },
        ],
    },
    {
        id: 'n-scrafty',
        name: 'Scrafty',
        level: 50,
        rarity: '???',
        nature: 'Careful',
        pokemon_type: 'dark',
        hp: 0, maxHp: 0,
        speed: 58,
        evasion: 0.05,
        accuracy: 0.92,
        image_url: 'https://play.pokemonshowdown.com/sprites/ani/scrafty.gif',
        attacks: [
            { name: 'Hi Jump Kick', damage: 130, attackType: 'fighting', effect: 'A soaring kick. User takes recoil on miss.', selfDamage: 30, maxPp: 10 },
            { name: 'Dark Pulse',   damage: 80,  attackType: 'dark',     effect: 'A pulse of dark energy. May confuse.', statusInflict: 'confusion', maxPp: 15 },
            { name: 'Bulk Up',      damage: 0,   attackType: 'fighting', effect: 'Bulks up to raise ATK and DEF.', selfBoosts: [{ stat: 'attack', stages: 1 }, { stat: 'defense', stages: 1 }], maxPp: 20 },
            { name: 'Dragon Dance', damage: 0,   attackType: 'dragon',   effect: 'A mystic dance that raises ATK and SPD.', selfBoosts: [{ stat: 'attack', stages: 1 }, { stat: 'speed', stages: 1 }], maxPp: 20 },
        ],
    },
    {
        id: 'n-liepard',
        name: 'Liepard',
        level: 51,
        rarity: '???',
        nature: 'Timid',
        pokemon_type: 'dark',
        hp: 0, maxHp: 0,
        speed: 106,
        evasion: 0.04,
        accuracy: 0.88,
        image_url: 'https://play.pokemonshowdown.com/sprites/ani/liepard.gif',
        attacks: [
            { name: 'Sucker Punch',  damage: 80, attackType: 'dark',   effect: 'Strikes before the opponent can act. Liepard gets in the zone.', priority: 1, speedBoost: 15, maxPp: 5 },
            { name: 'Play Rough',    damage: 90, attackType: 'fairy',  effect: 'A rough, unpredictable assault. May cause confusion.', statusInflict: 'confusion', maxPp: 10 },
            { name: 'Thunder Wave',  damage: 0,  attackType: 'electric', effect: 'Paralyzes with an electric charge.', statusInflict: 'paralysis', alwaysInflict: true, maxPp: 20 },
            { name: 'Charm',         damage: 0,  attackType: 'fairy',  effect: 'Charms the foe to sharply lower its ATK.', enemyDrops: [{ stat: 'attack', stages: -2 }], maxPp: 20 },
        ],
    },
]

/** Builds N's battle team: 5 randomly chosen from the full 11-pokemon roster.
 *  HP is rolled per-level: each level grants +10–35 HP, compensating for TCG energy bypass. */
export function buildNTeam(): BattleCard[] {
    const allN = [...N_CORE, ...N_EXTRAS_POOL]
    for (let i = allN.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[allN[i], allN[j]] = [allN[j], allN[i]]
    }
    return allN.slice(0, 5).map((t) => {
        const hp = rollLevelHp(t.level)
        return { ...initBattleCard(t), hp, maxHp: hp }
    })
}

// ─── NPC Trainer Teams ────────────────────────────────────────────────────────

export const GHETSIS_TEAM: TeamTemplate[] = [
    { id: 'gh-cofagrigus', name: 'Cofagrigus', level: 54, rarity: 'Legendary', pokemon_type: 'ghost',    hp: 200, maxHp: 200, speed: 30,  evasion: 0.05, accuracy: 0.90, image_url: 'https://play.pokemonshowdown.com/sprites/ani/cofagrigus.gif',  attacks: [{ name: 'Shadow Ball', damage: 80,  attackType: 'ghost', effect: 'A void of darkness. May lower DEF.', enemyDrops: [{ stat: 'defense', stages: -1 }] }, { name: 'Will-O-Wisp', damage: 0, attackType: 'fire', effect: 'Burns the foe.', statusInflict: 'burn', alwaysInflict: true }, { name: 'Nasty Plot', damage: 0, attackType: 'dark', effect: 'Sharply raises ATK.', selfBoosts: [{ stat: 'attack', stages: 2 }] }, { name: 'Hex', damage: 65, attackType: 'ghost', effect: 'Ghostly hex. Hits harder if foe has a status.' }] },
    { id: 'gh-seismitoad', name: 'Seismitoad', level: 54, rarity: 'Legendary', pokemon_type: 'water',    hp: 240, maxHp: 240, speed: 62,  evasion: 0.06, accuracy: 0.91, image_url: 'https://play.pokemonshowdown.com/sprites/ani/seismitoad.gif',  attacks: [{ name: 'Muddy Water', damage: 90, attackType: 'water', effect: 'Murky wave lowers accuracy.', statusInflict: 'confusion' }, { name: 'Drain Punch', damage: 100, attackType: 'fighting', effect: "Drains opponent's strength." }, { name: 'Sludge Wave', damage: 95, attackType: 'poison', effect: 'A wave of sludge. May poison.', statusInflict: 'poison' }, { name: 'Toxic', damage: 0, attackType: 'poison', effect: 'Badly poisons the target.', statusInflict: 'poison', alwaysInflict: true }] },
    { id: 'gh-bisharp',    name: 'Bisharp',    level: 56, rarity: 'Legendary', pokemon_type: 'dark',     hp: 215, maxHp: 215, speed: 70,  evasion: 0.04, accuracy: 0.92, image_url: 'https://play.pokemonshowdown.com/sprites/ani/bisharp.gif',     attacks: [{ name: 'Iron Head',    damage: 90,  attackType: 'steel',   effect: 'May cause flinch.', statusInflict: 'confusion' }, { name: 'Night Slash', damage: 110, attackType: 'dark', effect: 'High critical hit.' }, { name: 'Swords Dance', damage: 0, attackType: 'normal', effect: 'Sharply raises ATK.', selfBoosts: [{ stat: 'attack', stages: 2 }] }, { name: 'Sucker Punch', damage: 80, attackType: 'dark', effect: 'Priority strike.', priority: 1 }] },
    { id: 'gh-eelektross', name: 'Eelektross', level: 56, rarity: 'Legendary', pokemon_type: 'electric', hp: 230, maxHp: 230, speed: 50,  evasion: 0.04, accuracy: 0.90, image_url: 'https://play.pokemonshowdown.com/sprites/ani/eelektross.gif', attacks: [{ name: 'Thunderbolt', damage: 115, attackType: 'electric', effect: 'May paralyze.', statusInflict: 'paralysis' }, { name: 'Drain Punch', damage: 90, attackType: 'fighting', effect: "Drains health." }, { name: 'Wild Charge', damage: 120, attackType: 'electric', effect: 'Charges with power. Takes 30 recoil.', selfDamage: 30, statusInflict: 'paralysis' }, { name: 'Acid Spray', damage: 40, attackType: 'poison', effect: 'Corrodes the foe, sharply lowering DEF.', enemyDrops: [{ stat: 'defense', stages: -2 }] }] },
    { id: 'gh-hydreigon',  name: 'Hydreigon',  level: 58, rarity: '???',       pokemon_type: 'dragon',   hp: 300, maxHp: 300, speed: 98,  evasion: 0.05, accuracy: 0.92, image_url: 'https://play.pokemonshowdown.com/sprites/ani/hydreigon.gif',  attacks: [{ name: 'Dragon Rush', damage: 130, attackType: 'dragon', effect: 'A devastating charge.', statusInflict: 'confusion' }, { name: 'Dark Pulse', damage: 150, attackType: 'dark', effect: "Ghetsis's ace unleashes darkness.", statusInflict: 'confusion' }, { name: 'Fire Blast', damage: 110, attackType: 'fire', effect: 'A searing blast. May burn.', statusInflict: 'burn' }, { name: 'Hyper Voice', damage: 90, attackType: 'normal', effect: 'An echoing scream.' }] },
]

export const IRIS_TEAM: TeamTemplate[] = [
    { id: 'ir-druddigon', name: 'Druddigon', level: 57, rarity: 'Legendary', pokemon_type: 'dragon', hp: 240, maxHp: 240, speed: 48,  evasion: 0.06, accuracy: 0.88, image_url: 'https://play.pokemonshowdown.com/sprites/ani/druddigon.gif', attacks: [{ name: 'Dragon Claw', damage: 90, attackType: 'dragon', effect: 'Sharp dragon claws.' }, { name: 'Sucker Punch', damage: 85, attackType: 'dark', effect: 'Priority strike.', priority: 1 }, { name: 'Outrage', damage: 120, attackType: 'dragon', effect: 'A raging draconic assault.' }, { name: 'Scary Face', damage: 0, attackType: 'normal', effect: 'Lowers enemy SPD sharply.', enemyDrops: [{ stat: 'speed', stages: -2 }] }] },
    { id: 'ir-lapras',    name: 'Lapras',    level: 55, rarity: 'Legendary', pokemon_type: 'water',  hp: 300, maxHp: 300, speed: 60,  evasion: 0.04, accuracy: 0.93, image_url: 'https://play.pokemonshowdown.com/sprites/ani/lapras.gif',    attacks: [{ name: 'Ice Beam', damage: 105, attackType: 'ice', effect: 'May freeze.', statusInflict: 'paralysis' }, { name: 'Surf', damage: 110, attackType: 'water', effect: 'A powerful wave.' }, { name: 'Thunder Wave', damage: 0, attackType: 'electric', effect: 'Paralyzes with electricity.', statusInflict: 'paralysis', alwaysInflict: true }, { name: 'Blizzard', damage: 110, attackType: 'ice', effect: 'A freezing blizzard. May paralyze.', statusInflict: 'paralysis' }] },
    { id: 'ir-aggron',    name: 'Aggron',    level: 55, rarity: 'Legendary', pokemon_type: 'steel',  hp: 210, maxHp: 210, speed: 50,  evasion: 0.04, accuracy: 0.92, image_url: 'https://play.pokemonshowdown.com/sprites/ani/aggron.gif',    attacks: [{ name: 'Iron Tail', damage: 115, attackType: 'steel', effect: 'A steel-hard tail slam.' }, { name: 'Rock Slide', damage: 90, attackType: 'rock', effect: 'May cause flinch.', statusInflict: 'confusion' }, { name: 'Iron Defense', damage: 0, attackType: 'steel', effect: 'Hardens body to sharply raise DEF.', selfBoosts: [{ stat: 'defense', stages: 2 }] }, { name: 'Heavy Slam', damage: 100, attackType: 'steel', effect: 'Crushes foe with massive weight.' }] },
    { id: 'ir-archeops',  name: 'Archeops',  level: 59, rarity: 'Legendary', pokemon_type: 'rock',   hp: 200, maxHp: 200, speed: 115, evasion: 0.05, accuracy: 0.90, image_url: 'https://play.pokemonshowdown.com/sprites/ani/archeops.gif',  attacks: [{ name: 'Acrobatics', damage: 110, attackType: 'flying', effect: 'Swift aerial attack.' }, { name: 'Stone Edge', damage: 130, attackType: 'rock', effect: 'High critical hit ratio.' }, { name: 'Dragon Claw', damage: 80, attackType: 'dragon', effect: 'Sharp draconic claws.' }, { name: 'Roost', damage: 0, attackType: 'flying', effect: 'Restores 50% HP.', healFraction: 0.5 }] },
    { id: 'ir-haxorus',   name: 'Haxorus',   level: 62, rarity: '???',       pokemon_type: 'dragon', hp: 260, maxHp: 260, speed: 97,  evasion: 0.04, accuracy: 0.92, image_url: 'https://play.pokemonshowdown.com/sprites/ani/haxorus.gif',   attacks: [{ name: 'Dragon Dance', damage: 0, attackType: 'dragon', effect: "Iris's ace raises ATK and SPD.", selfBoosts: [{ stat: 'attack', stages: 1 }, { stat: 'speed', stages: 1 }] }, { name: 'Outrage', damage: 160, attackType: 'dragon', effect: 'Unstoppable draconic rage.' }, { name: 'Earthquake', damage: 100, attackType: 'ground', effect: 'The ground shakes violently.' }, { name: 'Iron Tail', damage: 100, attackType: 'steel', effect: 'A steel-hard tail slam.' }] },
]

export const COLRESS_TEAM: TeamTemplate[] = [
    { id: 'co-klinklang',  name: 'Klinklang',  level: 54, rarity: 'Legendary', pokemon_type: 'steel',    hp: 195, maxHp: 195, speed: 90, evasion: 0.04, accuracy: 0.90, image_url: 'https://play.pokemonshowdown.com/sprites/ani/klinklang.gif',  attacks: [{ name: 'Gear Grind', damage: 80,  attackType: 'steel',    effect: 'Metal gears tear into the foe.' }, { name: 'Flash Cannon', damage: 100, attackType: 'steel', effect: 'Steel energy burst.' }, { name: 'Shift Gear', damage: 0, attackType: 'steel', effect: 'Cranks its gears to raise ATK and sharply raise SPD.', selfBoosts: [{ stat: 'attack', stages: 1 }, { stat: 'speed', stages: 2 }] }, { name: 'Volt Switch', damage: 70, attackType: 'electric', effect: 'Strikes with electricity.' }] },
    { id: 'co-magnezone',  name: 'Magnezone',  level: 54, rarity: 'Legendary', pokemon_type: 'electric', hp: 215, maxHp: 215, speed: 60, evasion: 0.04, accuracy: 0.92, image_url: 'https://play.pokemonshowdown.com/sprites/ani/magnezone.gif',  attacks: [{ name: 'Thunderbolt', damage: 115, attackType: 'electric', effect: 'May paralyze.', statusInflict: 'paralysis' }, { name: 'Flash Cannon', damage: 90, attackType: 'steel', effect: 'Steel beam.' }, { name: 'Thunder Wave', damage: 0, attackType: 'electric', effect: 'Paralyzes with electricity.', statusInflict: 'paralysis', alwaysInflict: true }, { name: 'Mirror Shot', damage: 65, attackType: 'steel', effect: 'A steel mirror shot. May lower ATK.', enemyDrops: [{ stat: 'attack', stages: -1 }] }] },
    { id: 'co-beheeyem',   name: 'Beheeyem',   level: 56, rarity: 'Legendary', pokemon_type: 'psychic',  hp: 210, maxHp: 210, speed: 40, evasion: 0.04, accuracy: 0.94, image_url: 'https://play.pokemonshowdown.com/sprites/ani/beheeyem.gif',   attacks: [{ name: 'Psychic', damage: 120, attackType: 'psychic', effect: 'A crushing psychic force.', statusInflict: 'confusion' }, { name: 'Thunder Wave', damage: 0, attackType: 'electric', effect: 'Paralyzes the foe.', statusInflict: 'paralysis', alwaysInflict: true }, { name: 'Shadow Ball', damage: 80, attackType: 'ghost', effect: 'A shadowy blob. May lower DEF.', enemyDrops: [{ stat: 'defense', stages: -1 }] }, { name: 'Recover', damage: 0, attackType: 'normal', effect: 'Restores 50% HP.', healFraction: 0.5 }] },
    { id: 'co-electivire', name: 'Electivire', level: 56, rarity: 'Legendary', pokemon_type: 'electric', hp: 235, maxHp: 235, speed: 95, evasion: 0.04, accuracy: 0.90, image_url: 'https://play.pokemonshowdown.com/sprites/ani/electivire.gif', attacks: [{ name: 'Wild Charge', damage: 120, attackType: 'electric', effect: 'Charges with power. Takes 30 recoil.', selfDamage: 30, statusInflict: 'paralysis' }, { name: 'Cross Chop', damage: 110, attackType: 'fighting', effect: 'A precise cross blow.' }, { name: 'Thunder Punch', damage: 75, attackType: 'electric', effect: 'An electrified punch. May paralyze.', statusInflict: 'paralysis' }, { name: 'Earthquake', damage: 100, attackType: 'ground', effect: 'The ground shakes violently.' }] },
    { id: 'co-metagross',  name: 'Metagross',  level: 58, rarity: '???',       pokemon_type: 'steel',    hp: 275, maxHp: 275, speed: 70, evasion: 0.04, accuracy: 0.94, image_url: 'https://play.pokemonshowdown.com/sprites/ani/metagross.gif',  attacks: [{ name: 'Meteor Mash', damage: 135, attackType: 'steel', effect: 'A steel meteor strike.', speedBoost: 10 }, { name: 'Psychic', damage: 140, attackType: 'psychic', effect: "Colress's ace unleashes psychic annihilation." }, { name: 'Bullet Punch', damage: 40, attackType: 'steel', effect: 'A steel fist that always goes first.', priority: 1 }, { name: 'Earthquake', damage: 100, attackType: 'ground', effect: 'The ground shakes violently.' }] },
]

export type TrainerId = 'n' | 'ghetsis' | 'iris' | 'colress'

export const TRAINER_INFO: Record<TrainerId, { name: string; title: string; sprite: string; color: string; types: string[] }> = {
    n:       { name: 'N',       title: 'Natural Harmonia',  sprite: '/trainers/N-masters.gif',  color: '#4ade80', types: ['dark', 'dragon', 'water', 'rock'] },
    ghetsis: { name: 'Ghetsis', title: 'Shadow Ruler',      sprite: 'https://play.pokemonshowdown.com/sprites/trainers/ghetsis.png', color: '#c084fc', types: ['ghost', 'dark', 'dragon', 'electric'] },
    iris:    { name: 'Iris',    title: 'Dragon Master',     sprite: 'https://play.pokemonshowdown.com/sprites/trainers/iris.png',    color: '#60a5fa', types: ['dragon', 'water', 'steel', 'rock'] },
    colress: { name: 'Colress', title: 'Plasma Scientist',  sprite: 'https://play.pokemonshowdown.com/sprites/trainers/colress.png', color: '#38bdf8', types: ['steel', 'electric', 'psychic'] },
}

export function getDailyTrainerId(): TrainerId {
    const trainers: TrainerId[] = ['n', 'ghetsis', 'iris', 'colress']
    const dayIndex = Math.floor(Date.now() / 86400000)
    return trainers[dayIndex % trainers.length]
}

function shuffleSlice(arr: TeamTemplate[], count: number, userLevel?: number): BattleCard[] {
    const pool = [...arr]
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[pool[i], pool[j]] = [pool[j], pool[i]]
    }
    // If userLevel provided, scale: base = userLevel ±10, each pokemon ±2
    const baseLevel = userLevel != null
        ? Math.max(1, userLevel - 10 + Math.floor(Math.random() * 21))  // userLevel ±10
        : null
    return pool.slice(0, count).map((t) => {
        const level = baseLevel != null
            ? Math.max(1, baseLevel + Math.floor(Math.random() * 5) - 2)  // base ±2
            : t.level
        const hp = rollLevelHp(level)
        return { ...initBattleCard(t), level, hp, maxHp: hp }
    })
}

export function buildTrainerTeam(trainerId: TrainerId | string, userLevel?: number): BattleCard[] {
    if (trainerId === 'ghetsis') return shuffleSlice(GHETSIS_TEAM, 5, userLevel)
    if (trainerId === 'iris')    return shuffleSlice(IRIS_TEAM, 5, userLevel)
    if (trainerId === 'colress') return shuffleSlice(COLRESS_TEAM, 5, userLevel)
    // N: use existing buildNTeam but scale if userLevel provided
    if (userLevel != null) {
        const allN = [...N_CORE, ...N_EXTRAS_POOL]
        return shuffleSlice(allN, 5, userLevel)
    }
    return buildNTeam()
}

/** Returns all possible pokemon a trainer can field (their full pool).
 *  If userLevel is provided, levels are scaled to userLevel ± 10 (same logic as battle). */
export function getTrainerPool(trainerId: TrainerId | string, userLevel?: number): { name: string; image_url: string; pokemon_type: string; level: number }[] {
    let pool: TeamTemplate[]
    if (trainerId === 'ghetsis') pool = GHETSIS_TEAM
    else if (trainerId === 'iris') pool = IRIS_TEAM
    else if (trainerId === 'colress') pool = COLRESS_TEAM
    else pool = N_TEAM
    return pool.map((t, i) => ({
        name: t.name,
        image_url: t.image_url,
        pokemon_type: t.pokemon_type,
        // Show a stable spread around userLevel using index offset (-2 to +2)
        level: userLevel != null ? Math.max(1, userLevel + (i % 5) - 2) : t.level,
    }))
}

// ─── Move extras (source of truth) ───────────────────────────────────────────
// Extra battle properties keyed by PokeAPI move name (lowercase-hyphen).
// Spread onto Attack objects when loading user cards from DB.

export type MoveExtra = Partial<Omit<Attack, 'name' | 'damage' | 'attackType' | 'effect' | 'maxPp'>>

export const MOVE_EXTRAS: Record<string, MoveExtra> = {
    // ── Healing ───────────────────────────────────────────────────────────────
    'roost':             { healFraction: 0.5 },
    'rest':              { healFraction: 1.0, selfStatusInflict: 'sleep' },
    'recover':           { healFraction: 0.5 },
    'soft-boiled':       { healFraction: 0.5 },
    'milk-drink':        { healFraction: 0.5 },
    'moonlight':         { healFraction: 0.5 },
    'morning-sun':       { healFraction: 0.5 },
    'synthesis':         { healFraction: 0.5 },
    'slack-off':         { healFraction: 0.5 },
    'wish':              { healFraction: 0.5 },
    'aqua-ring':         { healFraction: 0.25 },
    'life-dew':          { healFraction: 0.25 },
    'shore-up':          { healFraction: 0.5 },
    'heal-order':        { healFraction: 0.5 },
    'jungle-healing':    { healFraction: 0.25 },
    'floral-healing':    { healFraction: 0.5 },
    'lunar-blessing':    { healFraction: 0.25 },
    'strength-sap':      { healFraction: 0.5 },
    'swallow':           { healFraction: 0.5 },
    'ingrain':           { healFraction: 0.0625 },
    'leech-seed':        { healFraction: 0.125 },

    // ── Always-inflict paralysis ───────────────────────────────────────────────
    'thunder-wave':  { statusInflict: 'paralysis', alwaysInflict: true },
    'glare':         { statusInflict: 'paralysis', alwaysInflict: true },
    'stun-spore':    { statusInflict: 'paralysis', alwaysInflict: true },

    // ── Always-inflict poison ─────────────────────────────────────────────────
    'toxic':         { statusInflict: 'poison', alwaysInflict: true },
    'poison-powder': { statusInflict: 'poison', alwaysInflict: true },
    'poison-gas':    { statusInflict: 'poison', alwaysInflict: true },

    // ── Always-inflict sleep ──────────────────────────────────────────────────
    'sleep-powder':  { statusInflict: 'sleep', alwaysInflict: true },
    'hypnosis':      { statusInflict: 'sleep', alwaysInflict: true },
    'spore':         { statusInflict: 'sleep', alwaysInflict: true },
    'sing':          { statusInflict: 'sleep', alwaysInflict: true },
    'lovely-kiss':   { statusInflict: 'sleep', alwaysInflict: true },
    'grass-whistle': { statusInflict: 'sleep', alwaysInflict: true },
    'dark-void':     { statusInflict: 'sleep', alwaysInflict: true },

    // ── Always-inflict burn ───────────────────────────────────────────────────
    'will-o-wisp':   { statusInflict: 'burn', alwaysInflict: true },

    // ── Always-inflict confusion ──────────────────────────────────────────────
    'confuse-ray':   { statusInflict: 'confusion', alwaysInflict: true },
    'supersonic':    { statusInflict: 'confusion', alwaysInflict: true },
    'swagger':       { statusInflict: 'confusion', alwaysInflict: true },
    'teeter-dance':  { statusInflict: 'confusion', alwaysInflict: true },
    'flatter':       { statusInflict: 'confusion', alwaysInflict: true },
    'sweet-kiss':    { statusInflict: 'confusion', alwaysInflict: true },

    // ── Self ATK boosts ───────────────────────────────────────────────────────
    'swords-dance':    { selfBoosts: [{ stat: 'attack',  stages: 2 }] },
    'nasty-plot':      { selfBoosts: [{ stat: 'attack',  stages: 2 }] },
    'hone-claws':      { selfBoosts: [{ stat: 'attack',  stages: 1 }] },
    'work-up':         { selfBoosts: [{ stat: 'attack',  stages: 1 }] },
    'growth':          { selfBoosts: [{ stat: 'attack',  stages: 1 }] },
    'tail-glow':       { selfBoosts: [{ stat: 'attack',  stages: 3 }] },
    'shell-smash':     { selfBoosts: [{ stat: 'attack',  stages: 2 }, { stat: 'speed', stages: 2 }] },

    // ── Self DEF boosts ───────────────────────────────────────────────────────
    'iron-defense':    { selfBoosts: [{ stat: 'defense', stages: 2 }] },
    'barrier':         { selfBoosts: [{ stat: 'defense', stages: 2 }] },
    'acid-armor':      { selfBoosts: [{ stat: 'defense', stages: 2 }] },
    'stockpile':       { selfBoosts: [{ stat: 'defense', stages: 1 }] },
    'bulk-up':         { selfBoosts: [{ stat: 'attack',  stages: 1 }, { stat: 'defense', stages: 1 }] },
    'calm-mind':       { selfBoosts: [{ stat: 'attack',  stages: 1 }, { stat: 'defense', stages: 1 }] },
    'cosmic-power':    { selfBoosts: [{ stat: 'defense', stages: 1 }] },
    'quiver-dance':    { selfBoosts: [{ stat: 'attack',  stages: 1 }, { stat: 'defense', stages: 1 }, { stat: 'speed', stages: 1 }] },

    // ── Self SPD boosts ───────────────────────────────────────────────────────
    'agility':         { selfBoosts: [{ stat: 'speed',   stages: 2 }] },
    'rock-polish':     { selfBoosts: [{ stat: 'speed',   stages: 2 }] },
    'dragon-dance':    { selfBoosts: [{ stat: 'attack',  stages: 1 }, { stat: 'speed', stages: 1 }] },
    'shift-gear':      { selfBoosts: [{ stat: 'attack',  stages: 1 }, { stat: 'speed', stages: 2 }] },

    // ── Enemy ATK drops ───────────────────────────────────────────────────────
    'growl':           { enemyDrops: [{ stat: 'attack',  stages: -1 }] },
    'charm':           { enemyDrops: [{ stat: 'attack',  stages: -2 }] },
    'feather-dance':   { enemyDrops: [{ stat: 'attack',  stages: -2 }] },
    'play-nice':       { enemyDrops: [{ stat: 'attack',  stages: -1 }] },

    // ── Enemy DEF drops ───────────────────────────────────────────────────────
    'leer':            { enemyDrops: [{ stat: 'defense', stages: -1 }] },
    'tail-whip':       { enemyDrops: [{ stat: 'defense', stages: -1 }] },
    'screech':         { enemyDrops: [{ stat: 'defense', stages: -2 }] },
    'fake-tears':      { enemyDrops: [{ stat: 'defense', stages: -2 }] },
    'metal-sound':     { enemyDrops: [{ stat: 'defense', stages: -2 }] },
    'tickle':          { enemyDrops: [{ stat: 'attack',  stages: -1 }, { stat: 'defense', stages: -1 }] },

    // ── Enemy SPD drops ───────────────────────────────────────────────────────
    'scary-face':      { enemyDrops: [{ stat: 'speed',   stages: -2 }] },
    'cotton-spore':    { enemyDrops: [{ stat: 'speed',   stages: -2 }] },
    'string-shot':     { enemyDrops: [{ stat: 'speed',   stages: -1 }] },

    // ── Priority +1 (always move first within same priority bracket) ──────────
    'quick-attack':    { priority: 1 },
    'aqua-jet':        { priority: 1 },
    'mach-punch':      { priority: 1 },
    'bullet-punch':    { priority: 1 },
    'ice-shard':       { priority: 1 },
    'shadow-sneak':    { priority: 1 },
    'sucker-punch':    { priority: 1 },
    'vacuum-wave':     { priority: 1 },
    'water-shuriken':  { priority: 1 },
    'extreme-speed':   { priority: 2 },
    'feint':           { priority: 2 },

    // ── Priority -1 (always move last) ───────────────────────────────────────
    'counter':         { priority: -1 },
    'mirror-coat':     { priority: -1 },
    'circle-throw':    { priority: -6 },
    'dragon-tail':     { priority: -6 },
}

// ─── Synthetic attacks and stats for user cards ───────────────────────────────

const RARITY_MULT: Record<string, number> = {
    Common: 0.8, Uncommon: 0.9, Rare: 1.0, Epic: 1.1,
    Mythical: 1.2, Legendary: 1.4, Divine: 1.55, Celestial: 1.7, '???': 1.9,
}

const RARITY_SPEED: Record<string, number> = {
    Common: 45, Uncommon: 55, Rare: 60, Epic: 65,
    Mythical: 70, Legendary: 78, Divine: 84, Celestial: 88, '???': 92,
}

const RARITY_EVASION: Record<string, number> = {
    Common: 0, Uncommon: 0.02, Rare: 0.03, Epic: 0.04,
    Mythical: 0.05, Legendary: 0.06, Divine: 0.07, Celestial: 0.08, '???': 0.10,
}

export function getUserCardStats(rarity: string): { speed: number; evasion: number; accuracy: number } {
    return {
        speed:    RARITY_SPEED[rarity]   ?? 60,
        evasion:  RARITY_EVASION[rarity] ?? 0,
        accuracy: 0.95,
    }
}

export function getSyntheticAttacks(hp: number, rarity: string): Attack[] {
    const m = RARITY_MULT[rarity] ?? 1.0
    const safe = Math.max(hp, 30)
    const base  = Math.floor(safe * 0.12 * m)
    const power = Math.floor(safe * 0.22 * m)
    const ultra = Math.floor(safe * 0.35 * m)

    const attacks: Attack[] = [
        { name: 'Quick Strike', damage: base,  effect: 'A swift, reliable attack.',                                                          maxPp: 35 },
        { name: 'Power Slam',   damage: power, effect: 'A heavy blow. May paralyze.', statusInflict: 'paralysis',                            maxPp: 20 },
    ]

    if (['Legendary', 'Divine', 'Celestial', '???'].includes(rarity)) {
        attacks.push({
            name: 'Ultimate Blast',
            damage: ultra,
            effect: 'Only a legendary can land this. Takes recoil.',
            selfDamage: Math.max(5, Math.floor(safe * 0.05)),
            maxPp: 5,
        })
    }

    return attacks
}

// ─── Map raw TCGdex attacks → Battle Attack type ─────────────────────────────
// TCGdex damage is a string like "90", "90+", "90×", or missing.
// Non-damaging attacks (draw cards, heal, etc.) get a small fallback value.
export function mapTcgdexAttacks(
    rawAttacks: Array<{ name: string; damage?: string | number; effect?: string }>,
    hp: number,
    rarity: string,
    cardType?: string,
): Attack[] {
    if (!rawAttacks?.length) return getSyntheticAttacks(hp, rarity)

    const m = RARITY_MULT[rarity] ?? 1.0
    const fallback = Math.floor(Math.max(hp, 30) * 0.10 * m) // small tap for utility moves

    return rawAttacks
        .filter((a) => !!a.name)
        .slice(0, 3)
        .map((a) => {
            const rawDmg = a.damage
            let dmg: number
            if (typeof rawDmg === 'number') {
                dmg = rawDmg
            } else if (typeof rawDmg === 'string') {
                dmg = parseInt(rawDmg.replace(/[^0-9]/g, ''), 10) || fallback
            } else {
                dmg = fallback
            }
            const maxPp = dmg === 0 ? 20 : dmg < 40 ? 35 : dmg < 80 ? 25 : dmg < 120 ? 15 : 5
            return {
                name:       a.name,
                damage:     dmg,
                effect:     a.effect ?? 'A standard attack.',
                attackType: cardType,
                maxPp,
            }
        })
}

// ─── Stat stage multiplier ────────────────────────────────────────────────────
// Stage -6 → 0.25×, 0 → 1.0×, +6 → 4.0× (standard Pokemon formula)
export function statStageMult(stage: number): number {
    const s = Math.max(-6, Math.min(6, stage ?? 0))
    return s >= 0 ? (2 + s) / 2 : 2 / (2 - s)
}

// ─── Hit check ────────────────────────────────────────────────────────────────

export function checkHit(attacker: BattleCard, defender: BattleCard): boolean {
    const acc = attacker.accuracy ?? 0.95
    const eva = defender.evasion ?? 0
    return Math.random() < acc * (1 - eva)
}

// ─── Battle math ──────────────────────────────────────────────────────────────

export function calcDamage(attack: Attack, attacker: BattleCard, defender: BattleCard): number {
    let dmg = attack.damage

    if (attack.copyLastAttack) {
        dmg = Math.max(defender.lastAttackDamage, 30)
    }

    if (attack.damageBonus && attack.bonusCondition) {
        if (attack.bonusCondition === 'hp_below_max' && defender.hp < defender.maxHp) {
            dmg += attack.damageBonus
        }
        if (attack.bonusCondition === 'self_damaged' && attacker.hp < attacker.maxHp) {
            const counters = Math.floor((attacker.maxHp - attacker.hp) / 10)
            dmg += attack.damageBonus * counters
        }
    }

    // Apply stat stages: attacker's attack stage vs defender's defense stage
    const atkMult = statStageMult(attacker.attackStage ?? 0)
    const defMult = statStageMult(defender.defenseStage ?? 0)
    dmg = Math.round(dmg * atkMult / defMult)

    // Symmetric level scaling: attacker level raises damage, defender level reduces it.
    // Equal levels → 1.0×.  Level 100 vs 50 → 2×.  Level 50 vs 100 → 0.5×.
    dmg = Math.round(dmg * Math.max(1, attacker.level) / Math.max(1, defender.level))

    // Apply type effectiveness: move type vs defender's pokemon type
    const effectiveness = getTypeEffectiveness(attack.attackType, defender.pokemon_type)
    dmg = Math.round(dmg * effectiveness)

    return Math.max(0, dmg)
}

/** Returns { damage, skip, woke, confusionSelfHit } where skip=true means the card can't act this turn */
export function tickStatus(card: BattleCard): { damage: number; skip: boolean; woke: boolean; confusionSelfHit: number } {
    let damage = 0
    let skip   = false
    let woke   = false
    let confusionSelfHit = 0

    if (card.statusEffect === 'burn')      damage = 35
    if (card.statusEffect === 'poison')    damage = 25
    if (card.statusEffect === 'sleep')     skip = Math.random() >= 0.4
    if (card.statusEffect === 'paralysis') skip = Math.random() < 0.45
    if (card.statusEffect === 'confusion') skip = Math.random() < 0.5

    if (card.statusEffect === 'sleep' && !skip) { woke = true }

    if (card.statusEffect === 'confusion' && skip) {
        // 5–10% of max HP self-hit
        confusionSelfHit = Math.floor(card.maxHp * (0.05 + Math.random() * 0.05))
    }

    return { damage, skip, woke, confusionSelfHit }
}

export function decrementStatus(card: BattleCard): BattleCard {
    if (card.statusTurns <= 0) return card
    const next = card.statusTurns - 1
    return {
        ...card,
        statusTurns: next,
        statusEffect: next === 0 && card.statusEffect !== 'burn' && card.statusEffect !== 'poison' && card.statusEffect !== 'paralysis'
            ? 'none'
            : card.statusEffect,
    }
}

export function nextAlive(cards: BattleCard[], after: number): number {
    for (let i = after + 1; i < cards.length; i++) {
        if (cards[i].hp > 0) return i
    }
    return -1
}
