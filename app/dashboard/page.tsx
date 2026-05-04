import PackSelector from '@/components/PackSelector'
import PassiveCoins from '@/components/ui/PassiveCoins'
import LockScroll from '@/components/ui/LockScroll'
import LeaderboardSidebar from '@/components/ui/LeaderboardSidebar'
import DashboardHeader from '@/components/ui/DashboardHeader'
import EventBannerLoader from '@/components/ui/EventBannerLoader'
import DashboardEntrance from '@/components/ui/DashboardEntrance'
import { createClient } from '@/lib/supabase/server'
import { getOrRefreshStock } from '@/lib/packStock'

export default async function Dashboard() {
    // Pre-fetch stock server-side so the dashboard never renders without it.
    // Next.js will display loading.tsx while this runs.
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let initialStock = undefined
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single()
        const isAdmin = !!(profile as { is_admin?: boolean } | null)?.is_admin
        if (!isAdmin) {
            const { stock, discounts, nextRefreshAt } = await getOrRefreshStock(supabase, user.id)
            initialStock = { stock, discounts, nextRefreshAt }
        }
    }

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
                <PackSelector initialStock={initialStock} />
            </div>
        </div>
    )
}
