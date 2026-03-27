// Pokemon 3D model and sprite URL utilities
//
// To enable 3D models:
//   1. Get GLB files extracted from Pokemon HOME (community sources) or
//      host your own converted from Pokemon Showdown's model data
//   2. Set NEXT_PUBLIC_POKEMON_MODEL_BASE_URL in your .env.local
//      pointing to the directory where your .glb files live, named by dex number
//      e.g. NEXT_PUBLIC_POKEMON_MODEL_BASE_URL=https://your-cdn.com/pokemon-models
//      Expected file names: 0001.glb, 0025.glb, 0151.glb, etc.

export function getPokemonModelUrl(dexNumber: number): string | null {
    const base = process.env.NEXT_PUBLIC_POKEMON_MODEL_BASE_URL
    if (!base) return null
    return `${base}/${dexNumber}.glb`
}

// Animated Gen 5 sprite via PokeAPI (uses dex number)
export function getPokemonAnimatedSpriteUrl(dexNumber: number): string {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${dexNumber}.gif`
}

// Animated sprite via Pokemon Showdown (uses lowercase name, e.g. "pikachu", "charizard-mega-x")
// Covers all gens. Naming: lowercase, spaces → hyphens, strip punctuation.
// Forms: "Rotom-W" → "rotom-wash" (Showdown-specific aliases won't auto-resolve, but base names work)
export function getPokemonShowdownSpriteUrl(name: string): string {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    return `https://play.pokemonshowdown.com/sprites/ani/${slug}.gif`
}

// Static PNG fallback (PokeAPI)
export function getPokemonSpriteUrl(dexNumber: number): string {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dexNumber}.png`
}
