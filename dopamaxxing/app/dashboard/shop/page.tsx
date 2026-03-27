import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ShopClient from './ShopClient'

export default async function ShopPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('coins, new_user_promo_used, age_verified, tos_accepted_at')
        .eq('id', user.id)
        .single()

    // Also fetch purchase history for the receipt tab
    const { data: purchases } = await supabase
        .from('purchases')
        .select('id, package_id, coins_credited, amount_cents, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

    return (
        <ShopClient
            coins={profile?.coins ?? 0}
            newUserPromoUsed={profile?.new_user_promo_used ?? false}
            tosAccepted={!!profile?.age_verified && !!profile?.tos_accepted_at}
            purchases={purchases ?? []}
        />
    )
}
