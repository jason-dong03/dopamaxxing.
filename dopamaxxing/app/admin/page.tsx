'use client'

import { useState } from 'react'
import AchievementsTab from '@/components/admin/AchievementsTab'
import EventsTab from '@/components/admin/EventsTab'
import QuestsTab from '@/components/admin/QuestsTab'
import PacksTab from '@/components/admin/PacksTab'
import BackfillTab from '@/components/admin/BackfillTab'
const TABS = ['Achievements', 'Events', 'Quests', 'Packs', 'Backfill'] as const
type Tab = (typeof TABS)[number]

export default function AdminPage() {
    const [tab, setTab] = useState<Tab>('Achievements')

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#e2e8f0', margin: '0 0 20px 0' }}>
                Admin Panel
            </h1>

            {/* Tab bar */}
            <div
                style={{
                    display: 'flex',
                    gap: 4,
                    borderBottom: '1px solid #1e1e30',
                    marginBottom: 24,
                }}
            >
                {TABS.map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '8px 16px',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            color: tab === t ? '#e2e8f0' : '#64748b',
                            borderBottom: tab === t ? '2px solid #60a5fa' : '2px solid transparent',
                            marginBottom: -1,
                            transition: 'color 0.15s',
                        }}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {/* Active tab content */}
            {tab === 'Achievements' && <AchievementsTab />}
            {tab === 'Events' && <EventsTab />}
            {tab === 'Quests' && <QuestsTab />}
            {tab === 'Packs' && <PacksTab />}
            {tab === 'Backfill' && <BackfillTab />}
        </div>
    )
}
