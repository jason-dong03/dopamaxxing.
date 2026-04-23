'use client'

import BagPage from '@/components/Bag'
import type { UserCard } from '@/lib/types'
import { usePageCache } from '@/hooks/usePageCache'

type BagData = {
    userCards: UserCard[]
    coins: number
    bagCapacity: number
    battleRating: number
    profileLevel: number
    userItems: Array<{ id: string; item_id: string; quantity: number }>
}

export default function Bag() {
    const { data, loading, refresh } = usePageCache<BagData>('/api/bag-data')

    if (loading || !data) return <BagLoadingSkeleton />

    return (
        <BagPage
            userCards={data.userCards}
            coins={data.coins}
            bagCapacity={data.bagCapacity}
            battleRating={data.battleRating}
            profileLevel={data.profileLevel}
            userItems={data.userItems}
            onRefresh={refresh}
        />
    )
}

const S = {
    bg: 'rgba(255,255,255,0.06)',
    bgFaint: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 8,
    borderRadiusPill: 999,
}

function BagLoadingSkeleton() {
    return (
        <div style={{ background: '#08080d', minHeight: '100vh', color: '#fff' }}>
            <div className="animate-pulse sticky top-0 z-30 px-4 pt-4 pb-3" style={{ background: 'rgba(8,8,13,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center justify-between mb-2">
                    <div style={{ height: 20, width: 32, borderRadius: S.borderRadius, background: S.bg }} />
                    <div className="flex items-center" style={{ gap: 8 }}>
                        <div style={{ height: 22, width: 70, borderRadius: S.borderRadiusPill, background: S.bg }} />
                        <div style={{ height: 18, width: 18, borderRadius: '50%', background: S.bg }} />
                        <div style={{ height: 18, width: 40, borderRadius: S.borderRadius, background: S.bg }} />
                        <div style={{ height: 22, width: 56, borderRadius: S.borderRadiusPill, background: S.bg }} />
                    </div>
                </div>
                <div className="flex items-center mb-3" style={{ gap: 6 }}>
                    <div style={{ height: 24, width: 52, borderRadius: S.borderRadiusPill, background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.25)' }} />
                    <div style={{ height: 24, width: 44, borderRadius: S.borderRadiusPill, background: S.bg }} />
                    <div style={{ flex: 1 }} />
                    <div style={{ height: 24, width: 52, borderRadius: S.borderRadiusPill, background: S.bg }} />
                </div>
                <div style={{ height: 36, borderRadius: S.borderRadius, background: S.bg, marginBottom: 12 }} />
                <div className="flex items-center" style={{ gap: 6, flexWrap: 'wrap' }}>
                    <div style={{ height: 30, width: 30, borderRadius: S.borderRadius, background: S.bg }} />
                    <div style={{ height: 30, width: 72, borderRadius: S.borderRadius, background: S.bg }} />
                    <div style={{ height: 30, width: 88, borderRadius: S.borderRadius, background: S.bg }} />
                    <div style={{ flex: 1 }} />
                    <div style={{ height: 24, width: 48, borderRadius: S.borderRadiusPill, background: S.bg }} />
                    <div style={{ height: 24, width: 44, borderRadius: S.borderRadiusPill, background: S.bg }} />
                    <div style={{ height: 24, width: 40, borderRadius: S.borderRadiusPill, background: S.bg }} />
                </div>
            </div>
            <div className="animate-pulse px-4 pt-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                {Array.from({ length: 16 }).map((_, i) => (
                    <div key={i} style={{ borderRadius: 12, background: S.bgFaint, border: S.border, aspectRatio: '2/3' }} />
                ))}
            </div>
        </div>
    )
}
