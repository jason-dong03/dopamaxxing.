import PackSelector from '@/components/PackSelector'
import PassiveCoins from '@/components/ui/PassiveCoins'
import LockScroll from '@/components/ui/LockScroll'
import LeaderboardSidebar from '@/components/ui/LeaderboardSidebar'
import DashboardHeader from '@/components/ui/DashboardHeader'
import EventBannerLoader from '@/components/ui/EventBannerLoader'
import DashboardEntrance from '@/components/ui/DashboardEntrance'

export default function Dashboard() {
    return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <DashboardEntrance />
            <LockScroll />
            <PassiveCoins />
            <LeaderboardSidebar />
            <DashboardHeader />
            <div style={{ flexShrink: 0 }}>
                <EventBannerLoader />
            </div>
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <PackSelector />
            </div>
        </div>
    )
}
