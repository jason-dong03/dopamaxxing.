/**
 * Server-side helper: merges pack_metadata from Supabase into the static PACKS array.
 * Uses a module-level 5-minute cache so pack-open routes don't hit the DB every time.
 */
import { PACKS, type Pack } from './packs'
import type { SupabaseClient } from '@supabase/supabase-js'

type PackMeta = {
    id: string
    cost: number
    name: string | null
    description: string | null
    special: boolean | null
    card_count: number | null
}

type CacheEntry = { data: Pack[]; expires: number }
let cache: CacheEntry | null = null

export async function getMergedPacks(supabase: SupabaseClient): Promise<Pack[]> {
    if (cache && Date.now() < cache.expires) return cache.data

    const { data } = await supabase.from('pack_metadata').select('*')
    const rows = (data ?? []) as PackMeta[]
    const metaById = new Map(rows.map((r) => [r.id, r]))

    const merged: Pack[] = PACKS.map((p) => {
        const meta = metaById.get(p.id)
        if (!meta) return p
        return {
            ...p,
            cost: meta.cost,
            ...(meta.name != null && { name: meta.name }),
            ...(meta.description != null && { description: meta.description }),
            ...(meta.special != null && { special: meta.special }),
            ...(meta.card_count != null && { card_count: meta.card_count }),
        }
    })

    cache = { data: merged, expires: Date.now() + 5 * 60 * 1000 }
    return merged
}

/** Call this after any admin update to bust the in-process cache. */
export function bustPackMetaCache() {
    cache = null
}
