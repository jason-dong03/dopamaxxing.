import type { SupabaseClient } from '@supabase/supabase-js'
import { PACKS } from '@/lib/packs'
import { getEventMagnitude } from '@/lib/dailyEvents'

// Each group refreshes on its own independent timer
export const REFRESH_MS = {
    standard: 5  * 60 * 1000,  // 5 min
    special:  8  * 60 * 1000,  // 8 min
    box:      15 * 60 * 1000,  // 15 min
}

const PACK_UNLOCK_LEVEL: Record<string, number> = {
    'sv02':            1,
    'sv03':            1,
    'sv03.5':          1,
    'sv04.5':          1,
    'sv08':            1,
    'sv08.5':          1,
    'sv10':            1,
    'sv10.5b':         10,
    'sv10.5w':         10,
    'swsh1':           5,
    'swsh11':          5,
    'swsh12.5':        5,
    'me02':            10,
    'me02.5':          10,
    'base1':           15,
    'base5':           15,
    'ex4':             20,
    'ex7':             20,
    'xy7':             20,
    'theme-charizard': 15,
    'base1-1ed':       25,
    'theme-legendary': 50,
    'xy-p-poncho':     50,
}

type Group = 'standard' | 'special' | 'box'

function getGroup(pack: { aspect?: string; special?: boolean; theme_pokedex_ids?: number[] }): Group {
    if (pack.aspect === 'box') return 'box'
    if (pack.special || pack.theme_pokedex_ids?.length) return 'special'
    return 'standard'
}

/** Random stock roll per pack — up to 8 for standard, scarcer for rarer types */
function rollStock(packId: string, surgeMult: number = 1): number {
    const pack = PACKS.find(p => p.id === packId)
    if (!pack) return 0

    const r = Math.random()
    let qty: number

    // Crates/boxes: extremely rare — 90% chance of 0, 10% chance of 1
    if (pack.aspect === 'box') {
        qty = r < 0.90 ? 0 : 1
    } else if (packId.includes('base')) {
        // Base sets: rare
        if (r < 0.25) qty = 0
        else if (r < 0.55) qty = 1
        else if (r < 0.80) qty = 2
        else if (r < 0.95) qty = 3
        else qty = 4
    } else if (pack.special || pack.theme_pokedex_ids?.length) {
        // Special / themed packs: moderate scarcity
        if (r < 0.12) qty = 0
        else if (r < 0.35) qty = 1
        else if (r < 0.60) qty = 2
        else if (r < 0.80) qty = 3
        else if (r < 0.93) qty = 4
        else qty = 5
    } else {
        // Standard packs: dramatic variance, up to 8
        if (r < 0.05) qty = 1
        else if (r < 0.15) qty = 2
        else if (r < 0.35) qty = 3
        else if (r < 0.55) qty = 4
        else if (r < 0.72) qty = 5
        else if (r < 0.85) qty = 6
        else if (r < 0.94) qty = 7
        else qty = 8
    }

    if (surgeMult > 1 && qty > 0) {
        qty = Math.min(Math.round(qty * surgeMult), 50)
    }
    return qty
}

export type StockResult = {
    stock: Record<string, number>
    discounts: Record<string, number>
    nextRefreshAt: { standard: string; special: string; box: string }
}

/**
 * Deterministically compute a per-pack discount for the current refresh cycle.
 * Uses a hash of (packId + refreshedAt) so the same pack/refresh always returns
 * the same value — consistent across server and client without a DB column.
 * Returns 0 (no discount) ~65% of the time, otherwise 5/10/15/20%.
 */
export function computePackDiscount(packId: string, refreshedAt: string): number {
    let h = 0x811c9dc5
    const s = packId + '|' + refreshedAt
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i)
        h = (h * 0x01000193) & 0xffffffff
    }
    const roll = Math.abs(h) % 100
    if (roll < 5)  return 0.20   // 5% chance of 20% off
    if (roll < 12) return 0.15   // 7% chance of 15% off
    if (roll < 22) return 0.10   // 10% chance of 10% off
    if (roll < 35) return 0.05   // 13% chance of 5% off
    return 0                     // 65% no discount
}

/**
 * Returns current stock, regenerating each group independently when expired.
 * Never bypasses the stock cap — expired stock is always regenerated before use.
 */
export async function getOrRefreshStock(
    supabase: SupabaseClient,
    userId: string,
): Promise<StockResult> {
    const [{ data: profile }, { data: existingRows }] = await Promise.all([
        supabase.from('profiles').select('level').eq('id', userId).single(),
        supabase.from('pack_stock').select('pack_id, quantity, refreshed_at').eq('user_id', userId),
    ])

    const userLevel = profile?.level ?? 1
    const rows = existingRows ?? []
    const rowMap = new Map(rows.map(r => [r.pack_id as string, r]))

    const unlockedPacks = PACKS
        .filter(p => !p.test)
        .filter(p => userLevel >= (PACK_UNLOCK_LEVEL[p.id] ?? 1))

    const now = Date.now()
    const newRefreshedAt = new Date().toISOString()

    const stock: Record<string, number> = {}
    const packRefreshedAt: Record<string, string> = {}
    const upsertRows: { user_id: string; pack_id: string; quantity: number; refreshed_at: string }[] = []

    // Track the oldest refreshed_at per group (to determine next refresh time)
    const groupRefreshed: Record<Group, number> = { standard: 0, special: 0, box: 0 }
    const groupExpired: Record<Group, boolean> = { standard: false, special: false, box: false }

    // Determine which groups are expired based on existing rows
    for (const pack of unlockedPacks) {
        const group = getGroup(pack)
        const row = rowMap.get(pack.id)
        const refreshedAt = row ? new Date(row.refreshed_at).getTime() : 0
        if (refreshedAt > groupRefreshed[group]) groupRefreshed[group] = refreshedAt
    }
    for (const g of ['standard', 'special', 'box'] as Group[]) {
        groupExpired[g] = now - groupRefreshed[g] >= REFRESH_MS[g]
    }

    // Check for active stock surge event (only when regenerating)
    const anyExpired = Object.values(groupExpired).some(Boolean)
    const surgeMult = anyExpired ? await getEventMagnitude('stock_surge') : 1

    // Build stock: use existing for fresh groups, regenerate for expired groups
    for (const pack of unlockedPacks) {
        const group = getGroup(pack)
        if (groupExpired[group]) {
            const qty = rollStock(pack.id, surgeMult)
            stock[pack.id] = qty
            packRefreshedAt[pack.id] = newRefreshedAt
            upsertRows.push({ user_id: userId, pack_id: pack.id, quantity: qty, refreshed_at: newRefreshedAt })
        } else {
            const row = rowMap.get(pack.id)
            stock[pack.id] = row ? Number(row.quantity) : 0
            packRefreshedAt[pack.id] = row?.refreshed_at ?? newRefreshedAt
        }
    }

    // Persist regenerated rows
    if (upsertRows.length > 0) {
        await supabase.from('pack_stock').upsert(upsertRows, { onConflict: 'user_id,pack_id' })
        // Remove stale rows for packs no longer unlocked
        const unlockedIds = new Set(unlockedPacks.map(p => p.id))
        const oldIds = rows.map(r => r.pack_id as string).filter(id => !unlockedIds.has(id))
        if (oldIds.length > 0) {
            await supabase.from('pack_stock').delete().eq('user_id', userId).in('pack_id', oldIds)
        }
    }

    // Compute next refresh time for each group
    const nextRefreshAt = {
        standard: new Date((groupExpired.standard ? now : groupRefreshed.standard) + REFRESH_MS.standard).toISOString(),
        special:  new Date((groupExpired.special  ? now : groupRefreshed.special)  + REFRESH_MS.special).toISOString(),
        box:      new Date((groupExpired.box      ? now : groupRefreshed.box)      + REFRESH_MS.box).toISOString(),
    }

    // Compute per-pack discounts from the deterministic hash
    const discounts: Record<string, number> = {}
    for (const pack of unlockedPacks) {
        const ra = packRefreshedAt[pack.id]
        if (ra) discounts[pack.id] = computePackDiscount(pack.id, ra)
    }

    return { stock, discounts, nextRefreshAt }
}
