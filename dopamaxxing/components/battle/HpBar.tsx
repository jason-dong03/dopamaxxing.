'use client'

export function HpBar({ hp, maxHp }: { hp: number; maxHp: number }) {
    const pct = Math.max(0, Math.min(100, (hp / Math.max(maxHp, 1)) * 100))
    const barColor = pct > 60 ? '#38c848' : pct > 35 ? '#f0b800' : '#e83820'
    return (
        <div style={{ width: '100%', height: 7, borderRadius: 3, background: '#303830', overflow: 'hidden', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 3, transition: 'width 300ms ease' }} />
        </div>
    )
}
