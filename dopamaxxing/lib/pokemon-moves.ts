// ─── PokeAPI move learning system ─────────────────────────────────────────

export type StoredMove = {
    name: string
    displayName: string
    learnedAt: number   // level the move is learned at
    pp: number
    power: number | null
    accuracy: number | null
    type: string
    damageClass: 'physical' | 'special' | 'status'
    effect: string      // short description
    // Optional battle extras (classified by Groq for status/utility moves)
    healFraction?: number
    statusInflict?: string
    alwaysInflict?: boolean
    selfStatusInflict?: string
    selfDamage?: number
    selfBoosts?: { stat: string; stages: number }[]
    enemyDrops?: { stat: string; stages: number }[]
    priority?: number   // turn order priority (+1, 0, -1)
}

type PokeApiLevelMove = { name: string; learnedAt: number }

type MoveExtras = Pick<StoredMove, 'healFraction' | 'statusInflict' | 'alwaysInflict' | 'selfStatusInflict' | 'selfDamage' | 'selfBoosts' | 'enemyDrops' | 'priority'>

/**
 * Ask Groq to classify a Pokemon move's battle extras (heal fraction, status effects, etc.)
 * Only called for status/utility moves not already in the hardcoded MOVE_EXTRAS table.
 */
async function classifyMoveExtras(
    moveName: string,
    effectText: string,
    power: number | null,
    damageClass: string,
): Promise<MoveExtras> {
    try {
        const { default: Groq } = await import('groq-sdk')
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

        const prompt = `You are a Pokemon game mechanics expert. Given a Pokemon move, extract its battle extras as JSON.

Move: ${moveName}
Effect: ${effectText}
Power: ${power ?? 'none'}
Damage class: ${damageClass}

Return ONLY a JSON object with these optional fields (omit fields that don't apply):
- healFraction: number (fraction of max HP restored, e.g. 0.5 for 50%, 0.25 for 25%)
- statusInflict: string (one of: "burn", "poison", "paralysis", "sleep", "confusion")
- alwaysInflict: boolean (true if status always inflicts, false if chance-based)
- selfStatusInflict: string (one of the status strings above, if the move inflicts status on the user)
- selfDamage: number (flat HP damage to self as recoil)
- selfBoosts: array of {stat, stages} where stat is "attack"|"defense"|"speed" and stages is +1 to +3 (boosts to the user's own stats)
- enemyDrops: array of {stat, stages} where stat is "attack"|"defense"|"speed" and stages is -1 to -3 (reductions to the target's stats)
- priority: integer turn-order priority (use +1 for moves that always go first like Quick Attack, Aqua Jet, Mach Punch, Bullet Punch, Ice Shard, Shadow Sneak; use -1 for moves that always go last like Trick Room, Counter; use 0 for everything else)

Example for Quick Attack: {"priority": 1}
Example for Swords Dance: {"selfBoosts": [{"stat": "attack", "stages": 2}]}
Example for Growl: {"enemyDrops": [{"stat": "attack", "stages": -1}]}
Return {} if the move has no special battle extras beyond its damage.
Return ONLY valid JSON, no explanation.`

        const chat = await groq.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0,
            max_tokens: 150,
        })

        const raw = chat.choices[0]?.message?.content?.trim() ?? '{}'
        const parsed = JSON.parse(raw)
        return parsed as MoveExtras
    } catch {
        return {}
    }
}

const POKEAPI = 'https://pokeapi.co/api/v2'
const FETCH_TIMEOUT_MS = 5000

function withTimeout(promise: Promise<Response>): Promise<Response> {
    return Promise.race([
        promise,
        new Promise<Response>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), FETCH_TIMEOUT_MS)
        ),
    ])
}

async function safeFetch(url: string): Promise<unknown | null> {
    try {
        const res = await withTimeout(fetch(url, { next: { revalidate: 86400 } }))
        if (!res.ok) return null
        return res.json()
    } catch {
        return null
    }
}

export type PokemonData = {
    baseStats: import('@/lib/pokemon-stats').PokeBaseStats
    levelMoves: PokeApiLevelMove[]
    primaryType: string
}

/**
 * Fetch a pokemon's base stats AND level-up moves in one API call.
 * Returns null if the request fails or times out.
 */
export async function fetchPokemonData(dexNumber: number): Promise<PokemonData | null> {
    const data = await safeFetch(`${POKEAPI}/pokemon/${dexNumber}`) as any
    if (!data) return null

    const get = (name: string) =>
        ((data.stats ?? []) as Array<{ base_stat: number; stat: { name: string } }>)
            .find(s => s.stat.name === name)?.base_stat ?? 0

    const baseStats = {
        hp:              get('hp'),
        attack:          get('attack'),
        defense:         get('defense'),
        special_attack:  get('special-attack'),
        special_defense: get('special-defense'),
        speed:           get('speed'),
    }

    const rawTypes = (data.types ?? []) as Array<{ slot: number; type: { name: string } }>
    const primaryType = rawTypes.find(t => t.slot === 1)?.type.name ?? 'normal'

    const seen = new Set<string>()
    const levelMoves: PokeApiLevelMove[] = []
    for (const entry of (data.moves ?? [])) {
        for (const vg of (entry.version_group_details ?? [])) {
            if (
                vg.move_learn_method?.name === 'level-up' &&
                typeof vg.level_learned_at === 'number'
            ) {
                if (!seen.has(entry.move.name)) {
                    seen.add(entry.move.name)
                    levelMoves.push({ name: entry.move.name, learnedAt: vg.level_learned_at })
                }
                break
            }
        }
    }
    levelMoves.sort((a, b) => a.learnedAt - b.learnedAt)

    return { baseStats, levelMoves, primaryType }
}

/** Fetch all level-up moves for a pokemon by national dex number. */
async function fetchLevelMoveList(dexNumber: number): Promise<PokeApiLevelMove[]> {
    const result = await fetchPokemonData(dexNumber)
    return result?.levelMoves ?? []
}

/** Fetch detailed stats for a single move. */
async function fetchMoveDetail(name: string, learnedAt: number): Promise<StoredMove | null> {
    const [d, { MOVE_EXTRAS }] = await Promise.all([
        safeFetch(`${POKEAPI}/move/${name}`) as Promise<any>,
        import('@/lib/pokemon-status-moves'),
    ])
    if (!d) return null

    const effectEntry = d.effect_entries?.find((e: any) => e.language?.name === 'en')
    const effect = (effectEntry?.short_effect ?? '').slice(0, 120)
    const damageClass = (d.damage_class?.name ?? 'status') as StoredMove['damageClass']
    const power: number | null = d.power ?? null

    // Classify extras via Groq for status/utility moves not in the hardcoded table
    let extras: MoveExtras = {}
    if (!MOVE_EXTRAS[name] && (damageClass === 'status' || power === null)) {
        extras = await classifyMoveExtras(name, effect, power, damageClass)
    }

    return {
        name: d.name,
        displayName: d.name
            .replace(/-/g, ' ')
            .replace(/\b\w/g, (c: string) => c.toUpperCase()),
        learnedAt,
        pp: d.pp ?? 10,
        power,
        accuracy: d.accuracy ?? null,
        type: d.type?.name ?? 'normal',
        damageClass,
        effect,
        ...extras,
    }
}

/**
 * Get the initial 4 moves for a pokemon at a given level.
 * Takes the most recently learnable moves up to `level`.
 */
export async function getInitialMoves(
    dexNumber: number,
    level: number = 1,
): Promise<StoredMove[]> {
    if (!dexNumber || dexNumber <= 0) return []

    const allMoves = await fetchLevelMoveList(dexNumber)
    const available = allMoves.filter(m => m.learnedAt <= Math.max(level, 1))

    // Take the last 4 (most recently learnable at this level)
    const picks = available.slice(-4)
    if (picks.length === 0) {
        // Fallback: take the first 4 moves regardless of level
        const fallback = allMoves.slice(0, 4)
        const results = await Promise.all(fallback.map(p => fetchMoveDetail(p.name, p.learnedAt)))
        return results.filter(Boolean) as StoredMove[]
    }

    const results = await Promise.all(picks.map(p => fetchMoveDetail(p.name, p.learnedAt)))
    return results.filter(Boolean) as StoredMove[]
}

/**
 * Get moves newly learnable when going from fromLevel to toLevel.
 * Used on level-up to populate pending_moves.
 */
export async function getNewMovesInRange(
    dexNumber: number,
    fromLevel: number,
    toLevel: number,
): Promise<StoredMove[]> {
    if (!dexNumber || dexNumber <= 0 || toLevel <= fromLevel) return []

    const allMoves = await fetchLevelMoveList(dexNumber)
    const newMoves = allMoves.filter(
        m => m.learnedAt > fromLevel && m.learnedAt <= toLevel
    )
    if (newMoves.length === 0) return []

    const results = await Promise.all(newMoves.map(p => fetchMoveDetail(p.name, p.learnedAt)))
    return results.filter(Boolean) as StoredMove[]
}

/** Pokemon type colors for display. */
export const TYPE_COLOR: Record<string, string> = {
    normal:   '#a8a878', fire:     '#f08030', water:    '#6890f0',
    electric: '#f8d030', grass:    '#78c850', ice:      '#98d8d8',
    fighting: '#c03028', poison:   '#a040a0', ground:   '#e0c068',
    flying:   '#a890f0', psychic:  '#f85888', bug:      '#a8b820',
    rock:     '#b8a038', ghost:    '#705898', dragon:   '#7038f8',
    dark:     '#705848', steel:    '#b8b8d0', fairy:    '#ee99ac',
}
