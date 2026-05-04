import type { SupabaseClient } from '@supabase/supabase-js'
import { PACKS, type Pack } from '@/lib/packs'
import { getEventMagnitude } from '@/lib/dailyEvents'

// Single unified refresh window for all unlocked packs
export const REFRESH_MS = 5 * 60 * 1000  // 5 min

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

/** Per-pack hard ceiling so a single "winning" pack can't dominate too hard */
const PER_PACK_CAP = 50

/** Total stock cap across all unlocked packs — grows with level */
export function computeStockCap(level: number): number {
    // L1 → 25, L10 → 35, L25 → 50, L50 → 75, capped at 80
    return Math.min(24 + level, 80)
}

/**
 * "All-or-nothing" distribution:
 *   • Pick a small number of "winner" packs (1–4, biased low).
 *   • Pour the cap into them with heavy weighting toward the first winner.
 *   • Everyone else gets 0.
 *
 * Result feels like: "30 of pack A, 12 of pack B, 0 for the rest."
 */
function distributeStock(
    unlockedPacks: Pack[],
    cap: number,
    surgeMult: number,
): Record<string, number> {
    const stock: Record<string, number> = {}
    for (const p of unlockedPacks) stock[p.id] = 0
    if (unlockedPacks.length === 0 || cap <= 0) return stock

    const r = Math.random()
    let numWinners: number
    if (r < 0.40)      numWinners = 1
    else if (r < 0.75) numWinners = 2
    else if (r < 0.92) numWinners = 3
    else               numWinners = 4
    numWinners = Math.min(numWinners, unlockedPacks.length)

    // Shuffle so picks are random
    const shuffled = [...unlockedPacks]
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    const winners = shuffled.slice(0, numWinners)

    // Heavy bias to first winner: weight i = 0.55^i * (0.7 + rand*0.6)
    const weights = winners.map((_, i) => Math.pow(0.55, i) * (0.7 + Math.random() * 0.6))
    const wSum = weights.reduce((a, b) => a + b, 0)

    const effectiveCap = Math.round(cap * (surgeMult > 1 ? surgeMult : 1))
    let remaining = Math.min(effectiveCap, PER_PACK_CAP * winners.length)

    for (let i = 0; i < winners.length; i++) {
        const isLast = i === winners.length - 1
        const portion = isLast
            ? remaining
            : Math.round((weights[i] / wSum) * effectiveCap)
        const qty = Math.max(1, Math.min(portion, remaining, PER_PACK_CAP))
        stock[winners[i].id] = qty
        remaining -= qty
        if (remaining <= 0) break
    }

    return stock
}

export type StockResult = {
    stock: Record<string, number>
    discounts: Record<string, number>
    nextRefreshAt: string
    cap: number
}

/**
 * Deterministically compute a per-pack discount for the current refresh cycle.
 */
export function computePackDiscount(packId: string, refreshedAt: string): number {
    let h = 0x811c9dc5
    const s = packId + '|' + refreshedAt
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i)
        h = (h * 0x01000193) & 0xffffffff
    }
    const roll = Math.abs(h) % 100
    if (roll < 5)  return 0.20
    if (roll < 12) return 0.15
    if (roll < 22) return 0.10
    if (roll < 35) return 0.05
    return 0
}

/**
 * Returns current stock, regenerating when expired.
 * All unlocked non-test packs share a single refresh window and a single
 * pooled cap that's distributed all-or-nothing across them.
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
    const cap = computeStockCap(userLevel)

    // Determine the pool's "refreshed_at": newest existing row across unlocked packs
    let poolRefreshed = 0
    for (const pack of unlockedPacks) {
        const row = rowMap.get(pack.id)
        if (row) {
            const t = new Date(row.refreshed_at).getTime()
            if (t > poolRefreshed) poolRefreshed = t
        }
    }
    const expired = poolRefreshed === 0 || now - poolRefreshed >= REFRESH_MS

    let stock: Record<string, number>
    let refreshedAtIso: string

    if (expired) {
        const surgeMult = await getEventMagnitude('stock_surge')
        stock = distributeStock(unlockedPacks, cap, surgeMult)
        refreshedAtIso = new Date().toISOString()

        const upsertRows = unlockedPacks.map(p => ({
            user_id: userId,
            pack_id: p.id,
            quantity: stock[p.id] ?? 0,
            refreshed_at: refreshedAtIso,
        }))
        await supabase.from('pack_stock').upsert(upsertRows, { onConflict: 'user_id,pack_id' })

        // Remove stale rows for packs no longer unlocked
        const unlockedIds = new Set(unlockedPacks.map(p => p.id))
        const oldIds = rows.map(r => r.pack_id as string).filter(id => !unlockedIds.has(id))
        if (oldIds.length > 0) {
            await supabase.from('pack_stock').delete().eq('user_id', userId).in('pack_id', oldIds)
        }
    } else {
        stock = {}
        for (const pack of unlockedPacks) {
            const row = rowMap.get(pack.id)
            stock[pack.id] = row ? Number(row.quantity) : 0
        }
        refreshedAtIso = new Date(poolRefreshed).toISOString()
    }

    const nextRefreshAt = new Date(
        (expired ? now : poolRefreshed) + REFRESH_MS,
    ).toISOString()

    const discounts: Record<string, number> = {}
    for (const pack of unlockedPacks) {
        discounts[pack.id] = computePackDiscount(pack.id, refreshedAtIso)
    }

    return { stock, discounts, nextRefreshAt, cap }
}
