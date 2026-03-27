// ─── Sprite URL helpers for Pokemon Showdown animated sprites ────────────────

const SUFFIX_STRIP =
    /\b(ex|gx|v|vmax|vstar|mega|radiant|prism|break|star|delta|alolan|galarian|hisuian|paldean|tag\s+team|restored|origin|therian|sky|land|wash|heat|fan|frost|mow|speed|white|black|dawn|dusk|midnight|original|complete|ultra|eternamax|crowned|single|rapid|ice)\b/g

/** Strip franchise prefixes like "Team Rocket's", "Dark ", "Light ", etc. */
const PREFIX_STRIP = /^(team\s+\w+['']s\s+|\w+['']s\s+|dark\s+|light\s+|shadow\s+|rocket['']s\s+)/i

function cleanName(name: string): string {
    return name
        .toLowerCase()
        .replace(PREFIX_STRIP, '')     // strip franchise prefixes first
        .replace(SUFFIX_STRIP, '')     // strip card suffixes
        .replace(/['''`]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
}

const BASE = 'https://play.pokemonshowdown.com/sprites'

/** Back-facing animated sprite (player's pokemon) */
export function backSprite(name: string): string {
    return `${BASE}/ani-back/${cleanName(name)}.gif`
}

/** Front-facing animated sprite (enemy pokemon) */
export function frontSprite(name: string): string {
    return `${BASE}/ani/${cleanName(name)}.gif`
}
