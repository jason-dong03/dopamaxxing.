import { createAdminClient } from '@/lib/supabase/admin'

export type EventEffect =
    | 'xp_boost'
    | 'coin_boost'
    | 'luck_boost'
    | 'cheap_packs'
    | 'extra_card'
    | 'attr_boost'

export type EventRarity = 'common' | 'rare' | 'legendary' | '???'

export type DailyEvent = {
    id: string
    name: string
    description: string
    icon: string
    effect: EventEffect
    magnitude: number
    color: string
    accentColor: string
    eventRarity: EventRarity
    // duration range in minutes
    durationRange: [number, number]
    // selection weight — higher = appears more often
    weight: number
}

// ─── rarity meta ──────────────────────────────────────────────────────────────

export const EVENT_RARITY_LABEL: Record<EventRarity, string> = {
    common: 'Common',
    rare: 'Rare',
    legendary: 'Legendary',
    '???': '???',
}

export const EVENT_RARITY_COLOR: Record<EventRarity, string> = {
    common: '#9ca3af',
    rare: '#60a5fa',
    legendary: '#eab308',
    '???': '#e879f9',
}

// ─── slot system ──────────────────────────────────────────────────────────────

const SLOT_MS = 60_000   // 1 minute slots
const FIRE_MOD = 7       // 1-in-7 chance of firing

function slotHash(slot: number): number {
    let h = 0x811c9dc5
    const s = String(slot)
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i)
        h = (h * 0x01000193) & 0xffffffff
    }
    return Math.abs(h)
}

function weightedPick(events: DailyEvent[], seed: number): DailyEvent {
    const total = events.reduce((s, e) => s + e.weight, 0)
    let roll = ((seed % 10000) / 10000) * total
    for (const ev of events) {
        roll -= ev.weight
        if (roll <= 0) return ev
    }
    return events[events.length - 1]
}

/**
 * Returns the currently-active event (if any).
 * Fetches active events from Supabase, checks force_active_until,
 * then runs the slot logic to determine what's currently active.
 */
export async function getActiveEvents(): Promise<(DailyEvent & { expiresAt: string })[]> {
    const admin = createAdminClient()
    const { data: rows } = await admin
        .from('events')
        .select('*')
        .eq('is_active', true)

    if (!rows || rows.length === 0) return []

    // Map DB rows (snake_case) to DailyEvent
    const events: DailyEvent[] = rows.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        icon: row.icon,
        effect: row.effect as EventEffect,
        magnitude: row.magnitude,
        color: row.color,
        accentColor: row.accent_color,
        eventRarity: row.event_rarity as EventRarity,
        durationRange: [row.duration_min, row.duration_max] as [number, number],
        weight: row.weight,
    }))

    const now = Date.now()

    // Check for any force_active_until overrides
    for (const row of rows) {
        if (row.force_active_until) {
            const forceUntil = new Date(row.force_active_until).getTime()
            if (forceUntil > now) {
                const ev = events.find((e) => e.id === row.id)
                if (ev) {
                    return [{ ...ev, expiresAt: row.force_active_until }]
                }
            }
        }
    }

    // Slot-based logic
    const currentSlot = Math.floor(now / SLOT_MS)
    const MAX_LOOKBACK = 15

    for (let s = currentSlot; s >= currentSlot - MAX_LOOKBACK; s--) {
        const h = slotHash(s)
        if (h % FIRE_MOD !== 0) continue // this slot didn't fire

        const ev = weightedPick(events, h >> 4)
        const slotStart = s * SLOT_MS
        const expiryMs = slotStart + ev.durationRange[0] * 60_000

        if (expiryMs > now) {
            return [{ ...ev, expiresAt: new Date(expiryMs).toISOString() }]
        }
        // Found the most recent fired slot but event already expired — no active event
        break
    }

    return []
}

// ─── backwards-compat shims used by API routes ────────────────────────────────

export async function getTodayEvents(): Promise<DailyEvent[]> {
    return await getActiveEvents()
}

export function getEventExpiresAt(
    event: DailyEvent,
    _dateStr?: string,
): string {
    // Synchronous shim — callers should prefer using the result of getActiveEvents() directly
    return new Date(Date.now() + event.durationRange[0] * 60_000).toISOString()
}

export function getEventDurationMinutes(
    event: DailyEvent,
    _dateStr?: string,
): number {
    return event.durationRange[0]
}

/** Get the current combined magnitude for a specific effect (1.0 = no boost) */
export async function getEventMagnitude(effect: EventEffect): Promise<number> {
    const now = Date.now()
    let mag = 1.0
    for (const ev of await getActiveEvents()) {
        if (ev.effect !== effect) continue
        if (now > new Date(ev.expiresAt).getTime()) continue
        if (effect === 'cheap_packs') mag *= ev.magnitude
        else mag = Math.max(mag, ev.magnitude)
    }
    return mag
}
