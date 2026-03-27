export type ActiveTab = 'all' | 'recurring' | 'ingame' | 'story' | 'completed'

export const TAB_ACCENT: Record<ActiveTab, string> = {
    all: '#94a3b8',
    recurring: '#fbbf24',
    ingame: '#60a5fa',
    story: '#f87171',
    completed: '#34d399',
}

// ─── helpers ──────────────────────────────────────────────────────────────────

export function msLeft(lastAt: string, cooldownHours: number): number {
    return cooldownHours * 3_600_000 - (Date.now() - new Date(lastAt).getTime())
}

export function formatCooldown(ms: number): string {
    if (ms <= 0) return 'Ready'
    const h = Math.floor(ms / 3_600_000)
    const m = Math.floor((ms % 3_600_000) / 60_000)
    if (h > 0) return `${h}h ${m}m`
    return `${m}m`
}
