'use client'

import type { BattleCard } from '@/lib/n-battle'

export function TeamDots({ cards, activeIndex }: { cards: BattleCard[]; activeIndex: number }) {
    return (
        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            {cards.map((c, i) => {
                const fainted = c.hp <= 0
                const isActive = i === activeIndex
                const sz = isActive ? 11 : 8
                const top = fainted ? '#6b7280' : isActive ? '#dc2626' : '#ef4444'
                const bot = fainted ? '#9ca3af' : '#f5f5f5'
                return (
                    <div
                        key={i}
                        style={{
                            width: sz, height: sz, borderRadius: '50%', flexShrink: 0,
                            background: fainted
                                ? `linear-gradient(180deg, ${top} 50%, ${bot} 50%)`
                                : `radial-gradient(circle at 50% 50%, #1a1a1a 15%, transparent 15%), radial-gradient(circle at 50% 50%, #fff 27%, transparent 27%), linear-gradient(180deg, ${top} 50%, ${bot} 50%)`,
                            border: `1.5px solid ${fainted ? '#374151' : '#111'}`,
                            opacity: fainted ? 0.45 : 1,
                            transition: 'all 200ms',
                            boxShadow: isActive && !fainted ? '0 0 4px rgba(220,38,38,0.6)' : 'none',
                        }}
                    />
                )
            })}
        </div>
    )
}
