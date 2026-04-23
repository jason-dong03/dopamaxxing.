'use client'

import ProfileView from '@/components/ProfileView'
import type { Profile, Friend, AchievementItem, ShowcaseCard, BinderPreview } from '@/lib/types'
import { usePageCache } from '@/hooks/usePageCache'

type ProfileData = {
    profile: Profile | null
    showcaseCard: ShowcaseCard | null
    friends: Friend[]
    achievements: AchievementItem[]
    binders: BinderPreview[]
    currentUserId: string
    unlockedTitles: string[]
}

export default function ProfilePage() {
    const { data, loading, refresh } = usePageCache<ProfileData>('/api/profile-data')

    if (loading || !data) return <ProfileLoadingSkeleton />

    return (
        <ProfileView
            profile={data.profile}
            showcaseCard={data.showcaseCard}
            friends={data.friends}
            achievements={data.achievements}
            binders={data.binders}
            currentUserId={data.currentUserId}
            unlockedTitles={data.unlockedTitles}
            onRefresh={refresh}
        />
    )
}

function ProfileLoadingSkeleton() {
    return (
        <div className="flex flex-col sm:flex-row gap-5 sm:items-start items-stretch justify-center" style={{ minHeight: 'calc(100vh - 64px)', background: '#08080d', padding: '20px 24px' }}>
            <div className="flex flex-col flex-shrink-0 animate-pulse sm:w-[300px] w-full" style={{ gap: 12 }}>
                <div className="rounded-2xl w-full sm:w-[300px]" style={{ height: 460, background: 'rgba(255,255,255,0.04)' }} />
                <div style={{ height: 22, width: 160, borderRadius: 6, background: 'rgba(255,255,255,0.06)' }} />
                <div className="flex gap-2">
                    <div style={{ height: 20, width: 64, borderRadius: 6, background: 'rgba(255,255,255,0.06)' }} />
                    <div style={{ height: 20, width: 64, borderRadius: 6, background: 'rgba(255,255,255,0.06)' }} />
                </div>
                <div style={{ height: 28, width: 120, borderRadius: 999, background: 'rgba(255,255,255,0.04)' }} />
            </div>
            <div className="flex flex-col rounded-2xl animate-pulse sm:w-[340px] w-full" style={{ minHeight: 580, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '24px 22px', gap: 20, flexShrink: 0 }}>
                <div className="flex items-center gap-3">
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
                    <div className="flex flex-col gap-2">
                        <div style={{ height: 16, width: 120, borderRadius: 6, background: 'rgba(255,255,255,0.08)' }} />
                        <div style={{ height: 12, width: 80, borderRadius: 6, background: 'rgba(255,255,255,0.05)' }} />
                    </div>
                </div>
                <div className="rounded-xl" style={{ height: 72, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
                {[80, 100, 140].map((h, i) => (
                    <div key={i} className="rounded-xl" style={{ height: h, background: 'rgba(255,255,255,0.03)' }} />
                ))}
            </div>
        </div>
    )
}
