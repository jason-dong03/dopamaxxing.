'use client'

import { useState } from 'react'
import AchievementsTab from '@/components/admin/AchievementsTab'
import EventsTab from '@/components/admin/EventsTab'
import QuestsTab from '@/components/admin/QuestsTab'
import PacksTab from '@/components/admin/PacksTab'
import UsersTab from '@/components/admin/UsersTab'
import RepriceTab from '@/components/admin/RepriceTab'
import CardMovesTab from '@/components/admin/CardMovesTab'
import SeedMovesTab from '@/components/admin/SeedMovesTab'
import BackfillTypesTab from '@/components/admin/BackfillTypesTab'
const TABS = [
    'Users',
    'Achievements',
    'Events',
    'Quests',
    'Packs',
    'Reprice',
    'CardMoves',
    'SeedMoves',
    'BackfillTypes',
] as const
type Tab = (typeof TABS)[number]

export default function AdminPage() {
    const [tab, setTab] = useState<Tab>('Users')

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
            <h1
                style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: '#e2e8f0',
                    margin: '0 0 20px 0',
                }}
            >
                Admin Panel
            </h1>

            {/* Tab bar */}
            <div
                className="scrollbar-none"
                style={{
                    display: 'flex',
                    gap: 4,
                    borderBottom: '1px solid #1e1e30',
                    marginBottom: 24,
                    overflowX: 'auto',
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
                            borderBottom:
                                tab === t
                                    ? '2px solid #60a5fa'
                                    : '2px solid transparent',
                            marginBottom: -1,
                            transition: 'color 0.15s',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                        }}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {/* Active tab content */}
            {tab === 'Users' && <UsersTab />}
            {tab === 'Achievements' && <AchievementsTab />}
            {tab === 'Events' && <EventsTab />}
            {tab === 'Quests' && <QuestsTab />}
            {tab === 'Packs' && <PacksTab />}
            {tab === 'Reprice' && <RepriceTab />}
            {tab === 'CardMoves' && <CardMovesTab />}
            {tab === 'SeedMoves' && <SeedMovesTab />}
            {tab === 'BackfillTypes' && <BackfillTypesTab />}
        </div>
    )
}
