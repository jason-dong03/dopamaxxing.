import Navbar from '@/components/Navbar'
import AgeGateModal from '@/components/AgeGateModal'
import QuestToast from '@/components/ui/QuestToast'
import OnboardingModal from '@/components/OnboardingModal'
import { createClient } from '@/lib/supabase/server'
import { PendingRequestsProvider } from '@/components/PendingRequestsProvider'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    const { data: profile } = await supabase
        .from('profiles')
        .select('username, profile_url, coins, level, age_verified, tos_accepted_at')
        .eq('id', user?.id)
        .single()

    return (
        <PendingRequestsProvider>
            <Navbar />
            <QuestToast />
            <OnboardingModal />
            <AgeGateModal
                ageVerified={profile?.age_verified ?? false}
                tosAcceptedAt={profile?.tos_accepted_at ?? null}
            />
            <main className="pb-16">{children}</main>
        </PendingRequestsProvider>
    )
}
