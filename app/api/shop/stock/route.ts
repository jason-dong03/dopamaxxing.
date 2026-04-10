import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { PACKS } from '@/lib/packs'

const REFRESH_MS = 5 * 60 * 1000 // 5 minutes
const TOTAL_STOCK = 50

// Minimum level required to see each pack in the shop.
// White Flare (sv10.5w) and Black Bolt (sv10.5b) unlock together.
const PACK_UNLOCK_LEVEL: Record<string, number> = {
    'sv02':           1,
    'sv03':           1,
    'sv03.5':         1,
    'sv04.5':         1,
    'sv08':           1,
    'sv08.5':         1,
    'sv10':           1,
    'sv10.5b':        10, // Black Bolt — unlocks with White Flare
    'sv10.5w':        10, // White Flare
    'swsh1':          5,
    'swsh11':         5,
    'swsh12.5':       5,
    'me02':           10,
    'me02.5':         10,
    'base1':          15,
    'base5':          15,
    'ex4':            20,
    'ex7':            20,
    'xy7':            20,
    'theme-charizard':15,
    'base1-1ed':      25, // special
    'theme-legendary':50, // box/crate
    'xy-p-poncho':    50, // box/crate
}

// Stock weight: how much of the 50 total each pack type gets.
// Higher weight = more stock allocated. Rarer packs get less.
function packWeight(packId: string): number {
    const pack = PACKS.find(p => p.id === packId)
    if (!pack) return 2
    if (pack.aspect === 'box') return 1          // crates: very scarce
    if (pack.special) return 2                    // special edition: scarce
    if (pack.theme_pokedex_ids) return 3          // theme packs: limited
    return 8                                      // standard packs: plentiful
}

function distributeStock(unlockedPackIds: string[]): Record<string, number> {
    if (unlockedPackIds.length === 0) return {}

    const weights = unlockedPackIds.map(id => ({ id, w: packWeight(id) }))
    const totalWeight = weights.reduce((s, x) => s + x.w, 0)

    const result: Record<string, number> = {}
    let remaining = TOTAL_STOCK

    weights.forEach(({ id, w }, i) => {
        const isLast = i === weights.length - 1
        const raw = isLast ? remaining : Math.round((w / totalWeight) * TOTAL_STOCK)
        const qty = Math.max(1, Math.min(raw, remaining))
        result[id] = qty
        remaining -= qty
    })

    return result
}

export async function GET() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
        .from('profiles')
        .select('level')
        .eq('id', user.id)
        .single()
    const userLevel = profile?.level ?? 1

    // Check existing stock rows
    const { data: existingRows } = await supabase
        .from('pack_stock')
        .select('pack_id, quantity, refreshed_at')
        .eq('user_id', user.id)

    const rows = existingRows ?? []
    const now = Date.now()
    const refreshedAt = rows[0] ? new Date(rows[0].refreshed_at).getTime() : 0
    const expired = now - refreshedAt >= REFRESH_MS

    if (expired || rows.length === 0) {
        // Determine unlocked packs for this user's level
        const unlockedIds = PACKS
            .filter(p => !p.test)
            .filter(p => userLevel >= (PACK_UNLOCK_LEVEL[p.id] ?? 1))
            .map(p => p.id)

        const newStock = distributeStock(unlockedIds)
        const newRefreshedAt = new Date().toISOString()

        // Upsert new stock rows (replace all)
        if (Object.keys(newStock).length > 0) {
            await supabase.from('pack_stock').upsert(
                Object.entries(newStock).map(([pack_id, quantity]) => ({
                    user_id: user.id,
                    pack_id,
                    quantity,
                    refreshed_at: newRefreshedAt,
                })),
                { onConflict: 'user_id,pack_id' },
            )

            // Remove stale rows for packs no longer unlocked
            const oldIds = rows.map(r => r.pack_id).filter(id => !(id in newStock))
            if (oldIds.length > 0) {
                await supabase.from('pack_stock')
                    .delete()
                    .eq('user_id', user.id)
                    .in('pack_id', oldIds)
            }
        }

        const nextRefreshAt = new Date(Date.now() + REFRESH_MS).toISOString()
        return NextResponse.json({ stock: newStock, next_refresh_at: nextRefreshAt })
    }

    // Return existing stock
    const stock: Record<string, number> = {}
    for (const r of rows) stock[r.pack_id] = r.quantity

    const nextRefreshAt = new Date(refreshedAt + REFRESH_MS).toISOString()
    return NextResponse.json({ stock, next_refresh_at: nextRefreshAt })
}
