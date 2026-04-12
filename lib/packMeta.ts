/**
 * Server-side helper: reads packs from the `packs` DB table (full schema).
 * Falls back to merging static PACKS + pack_metadata if the table is empty.
 * Uses a module-level 5-minute cache so pack-open routes don't hit the DB every call.
 */
import { PACKS, type Pack } from './packs'
import type { SupabaseClient } from '@supabase/supabase-js'

// ─── Legacy pack_metadata shape (fallback) ───────────────────────────────────
type PackMeta = {
    id: string
    cost: number
    name: string | null
    description: string | null
    special: boolean | null
    card_count: number | null
}

// ─── Full DB row shape ────────────────────────────────────────────────────────
export type DbPackRow = {
    id: string
    name: string
    description: string
    aspect: string
    cost: number
    image_url: string
    level_required: number | null
    card_count: number | null
    theme_pokedex_ids: number[] | null
    theme_include_first_ed: boolean
    theme_label: string | null
    theme_label_color: string | null
    idle_aura: string | null
    special: boolean
    is_active: boolean
    sort_order: number
}

export function dbRowToPack(row: DbPackRow): Pack {
    return {
        id: row.id,
        name: row.name,
        image: row.image_url,
        description: row.description,
        aspect: row.aspect as 'pack' | 'box',
        cost: Number(row.cost),
        ...(row.level_required != null  && { level_required: row.level_required }),
        ...(row.card_count != null      && { card_count: row.card_count }),
        ...(row.theme_pokedex_ids?.length && { theme_pokedex_ids: row.theme_pokedex_ids }),
        ...(row.theme_include_first_ed  && { theme_include_first_ed: true }),
        ...(row.theme_label             && { theme_label: row.theme_label }),
        ...(row.theme_label_color       && { theme_label_color: row.theme_label_color }),
        ...(row.idle_aura               && { idle_aura: row.idle_aura }),
        ...(row.special                 && { special: true }),
    }
}

type CacheEntry = { data: Pack[]; expires: number }
let cache: CacheEntry | null = null

export async function getMergedPacks(supabase: SupabaseClient): Promise<Pack[]> {
    if (cache && Date.now() < cache.expires) return cache.data

    // ── Primary: full packs table ─────────────────────────────────────────────
    try {
        const { data, error } = await supabase
            .from('packs')
            .select('*')
            .eq('is_active', true)
            .order('sort_order')

        if (!error && data && data.length > 0) {
            const packs = (data as DbPackRow[]).map(dbRowToPack)
            cache = { data: packs, expires: Date.now() + 5 * 60 * 1000 }
            return packs
        }
    } catch { /* fall through */ }

    // ── Fallback: static PACKS merged with pack_metadata overrides ────────────
    const { data: metaData } = await supabase.from('pack_metadata').select('*')
    const rows = (metaData ?? []) as PackMeta[]
    const metaById = new Map(rows.map((r) => [r.id, r]))

    const merged: Pack[] = PACKS.map((p) => {
        const meta = metaById.get(p.id)
        if (!meta) return p
        return {
            ...p,
            cost: meta.cost,
            ...(meta.name        != null && { name: meta.name }),
            ...(meta.description != null && { description: meta.description }),
            ...(meta.special     != null && { special: meta.special }),
            ...(meta.card_count  != null && { card_count: meta.card_count }),
        }
    })

    cache = { data: merged, expires: Date.now() + 5 * 60 * 1000 }
    return merged
}

/** Call this after any admin update to bust the in-process cache. */
export function bustPackMetaCache() {
    cache = null
}
