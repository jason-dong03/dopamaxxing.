'use client'

import QuestsView from '@/components/QuestsView'
import CoinDisplay from '@/components/ui/CoinDisplay'
import PassiveCoins from '@/components/ui/PassiveCoins'
import type { Quest, AllMetrics } from '@/lib/quests'
import type { OwnedCard } from '@/lib/types'
import { usePageCache } from '@/hooks/usePageCache'

type QuestsData = {
    quests: Quest[]
    completedQuestIds: string[]
    lastCompletedAt: Record<string, string>
    metrics: AllMetrics
    playerLevel: number
    ownedCards: OwnedCard[]
    coins: number
    level: number
    xp: number
    xpNeeded: number
    xpPct: number
}

export default function QuestsPage() {
    const { data, loading, refresh } = usePageCache<QuestsData>('/api/quests-data')

    if (loading || !data) return <QuestsLoadingSkeleton />

    const { quests, completedQuestIds, lastCompletedAt, metrics, playerLevel, ownedCards, coins, level, xp, xpNeeded, xpPct } = data

    return (
        <div className="min-h-screen">
            <PassiveCoins />
            <div style={{ width: '100%', background: 'var(--app-bg)', borderBottom: '1px solid var(--app-border)', position: 'sticky', top: 0, zIndex: 40 }}>
                <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px', height: 50, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--app-text)', letterSpacing: '0.02em' }}>Quests</span>
                    <div style={{ flex: 1 }} />
                    <CoinDisplay initialCoins={coins} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, background: 'var(--app-surface-2)', border: '1px solid var(--app-border)', borderRadius: 20, padding: '3px 10px' }}>
                            <span style={{ fontSize: '0.6rem', fontWeight: 500, color: 'var(--app-text-muted)' }}>Lv</span>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--lv-green)' }}>{level}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, position: 'relative', top: 5 }}>
                            <div style={{ width: 100, height: 5, borderRadius: 3, background: 'var(--app-border)', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${xpPct}%`, background: 'var(--lv-green)', borderRadius: 3, transition: 'width 600ms ease' }} />
                            </div>
                            <span style={{ fontSize: '0.5rem', color: 'var(--app-text-muted)', whiteSpace: 'nowrap' }}>{xp} / {xpNeeded} XP</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="p-4">
                <QuestsView
                    quests={quests}
                    completedQuestIds={new Set(completedQuestIds)}
                    lastCompletedAt={lastCompletedAt}
                    metrics={metrics}
                    playerLevel={playerLevel}
                    ownedCards={ownedCards}
                    onRefresh={refresh}
                />
            </div>
        </div>
    )
}

function QuestsLoadingSkeleton() {
    return (
        <div className="min-h-screen p-4" style={{ width: '100%', maxWidth: 680, margin: '0 auto' }}>
            <div className="flex justify-between items-center mb-5">
                <div>
                    <div className="rounded animate-pulse" style={{ width: 80, height: 18, background: 'rgba(255,255,255,0.06)', marginBottom: 6 }} />
                    <div className="rounded animate-pulse" style={{ width: 160, height: 10, background: 'rgba(255,255,255,0.04)' }} />
                </div>
                <div className="rounded animate-pulse" style={{ width: 110, height: 28, background: 'rgba(255,255,255,0.04)' }} />
            </div>
            <div className="flex gap-2 mb-5">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-full animate-pulse" style={{ width: 70, height: 28, background: 'rgba(255,255,255,0.04)', flexShrink: 0 }} />
                ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="animate-pulse rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '14px 16px', display: 'flex', gap: 12 }}>
                        <div className="rounded-lg" style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                            <div className="rounded" style={{ width: `${45 + (i % 3) * 20}%`, height: 13, background: 'rgba(255,255,255,0.06)', marginBottom: 8 }} />
                            <div className="rounded" style={{ width: '80%', height: 10, background: 'rgba(255,255,255,0.04)', marginBottom: 10 }} />
                            <div className="rounded" style={{ width: 80, height: 8, background: 'rgba(255,255,255,0.04)' }} />
                        </div>
                        <div className="rounded-lg" style={{ width: 72, height: 28, background: 'rgba(255,255,255,0.04)', flexShrink: 0 }} />
                    </div>
                ))}
            </div>
        </div>
    )
}
