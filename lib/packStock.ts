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

type PackGroup = 'classic' | 'special' | 'box'

function groupOf(pack: Pack): PackGroup {
    if (pack.aspect === 'box') return 'box'
    if (pack.special || (pack.theme_pokedex_ids && pack.theme_pokedex_ids.length))
        return 'special'
    return 'classic'
}

/** Allocate the total cap proportionally across groups (skipping empty ones). */
function splitCapAcrossGroups(
    cap: number,
    counts: Record<PackGroup, number>,
): Record<PackGroup, number> {
    const desired: Record<PackGroup, number> = {
        classic: 0.6,
        special: 0.3,
        box: 0.1,
    }
    let active: PackGroup[] = (Object.keys(desired) as PackGroup[]).filter(
        (g) => counts[g] > 0,
    )
    if (active.length === 0) return { classic: 0, special: 0, box: 0 }
    // Box group: 50% chance to skip entirely (boxes are rare on purpose)
    if (active.includes('box') && Math.random() < 0.5) {
        active = active.filter((g) => g !== 'box')
    }
    const totalShare = active.reduce((s, g) => s + desired[g], 0)
    const out: Record<PackGroup, number> = { classic: 0, special: 0, box: 0 }
    let remaining = cap
    active.forEach((g, i) => {
        const isLast = i === active.length - 1
        const slice = isLast
            ? remaining
            : Math.round((desired[g] / totalShare) * cap)
        out[g] = Math.max(1, Math.min(slice, remaining))
        remaining -= out[g]
    })
    return out
}

/**
 * Distribute a per-group budget all-or-nothing across the group's packs.
 * Picks 1-2 winners (biased to 1) and pours the budget in.
 */
function distributeWithinGroup(
    packs: Pack[],
    budget: number,
): Record<string, number> {
    const out: Record<string, number> = {}
    if (packs.length === 0 || budget <= 0) return out

    const numWinners = Math.min(
        packs.length,
        Math.random() < 0.65 ? 1 : 2, // 65% one winner, 35% two
    )
    const shuffled = [...packs]
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    const winners = shuffled.slice(0, numWinners)

    const weights = winners.map(
        (_, i) => Math.pow(0.55, i) * (0.7 + Math.random() * 0.6),
    )
    const wSum = weights.reduce((a, b) => a + b, 0)

    let remaining = Math.min(budget, PER_PACK_CAP * winners.length)
    for (let i = 0; i < winners.length; i++) {
        const isLast = i === winners.length - 1
        const portion = isLast
            ? remaining
            : Math.round((weights[i] / wSum) * budget)
        const qty = Math.max(1, Math.min(portion, remaining, PER_PACK_CAP))
        out[winners[i].id] = qty
        remaining -= qty
        if (remaining <= 0) break
    }
    return out
}

/**
 * Tab-aware all-or-nothing distribution:
 *   • Classic tab gets ~60% of the cap, Special ~30%, Crates ~10% (and 50% of
 *     the time crates are skipped entirely so they stay rare).
 *   • Within each group: pick 1-2 winners (biased to 1) and pour the budget
 *     in. Other packs in the group → 0.
 *
 * Result: most tabs have at least one stocked pack each cycle so the user
 * never lands on a completely empty shop.
 */
function distributeStock(
    unlockedPacks: Pack[],
    cap: number,
    surgeMult: number,
): Record<string, number> {
    const stock: Record<string, number> = {}
    for (const p of unlockedPacks) stock[p.id] = 0
    if (unlockedPacks.length === 0 || cap <= 0) return stock

    const groups: Record<PackGroup, Pack[]> = {
        classic: [],
        special: [],
        box: [],
    }
    for (const p of unlockedPacks) groups[groupOf(p)].push(p)
    const counts: Record<PackGroup, number> = {
        classic: groups.classic.length,
        special: groups.special.length,
        box: groups.box.length,
    }

    const effectiveCap = Math.round(cap * (surgeMult > 1 ? surgeMult : 1))
    const budgets = splitCapAcrossGroups(effectiveCap, counts)

    for (const g of ['classic', 'special', 'box'] as PackGroup[]) {
        const groupStock = distributeWithinGroup(groups[g], budgets[g])
        Object.assign(stock, groupStock)
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
    let totalQty = 0
    for (const pack of unlockedPacks) {
        const row = rowMap.get(pack.id)
        if (row) {
            const t = new Date(row.refreshed_at).getTime()
            if (t > poolRefreshed) poolRefreshed = t
            totalQty += Number(row.quantity) || 0
        }
    }
    // Force regenerate if the user has consumed everything — they shouldn't
    // be locked out for the full 5-min cooldown if there's nothing left to buy.
    const exhausted = poolRefreshed > 0 && totalQty === 0
    const expired =
        poolRefreshed === 0 ||
        now - poolRefreshed >= REFRESH_MS ||
        exhausted

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
