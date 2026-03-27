import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { COIN_PACKAGES, type PackageId } from '@/lib/coinPackages'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-02-25.clover' })

export async function POST(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { packageId } = await req.json() as { packageId: string }
    const pkg = COIN_PACKAGES[packageId as PackageId]
    if (!pkg) return NextResponse.json({ error: 'Invalid package' }, { status: 400 })

    // For one-time promo, verify not already used (server-side check)
    if (pkg.oneTime) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('new_user_promo_used, age_verified, tos_accepted_at')
            .eq('id', user.id)
            .single()
        if (profile?.new_user_promo_used) {
            return NextResponse.json({ error: 'Promo already used' }, { status: 400 })
        }
        if (!profile?.age_verified || !profile?.tos_accepted_at) {
            return NextResponse.json({ error: 'Must accept ToS before purchasing' }, { status: 403 })
        }
    } else {
        const { data: profile } = await supabase
            .from('profiles')
            .select('age_verified, tos_accepted_at')
            .eq('id', user.id)
            .single()
        if (!profile?.age_verified || !profile?.tos_accepted_at) {
            return NextResponse.json({ error: 'Must accept ToS before purchasing' }, { status: 403 })
        }
    }

    const origin = req.headers.get('origin') ?? 'http://localhost:3000'
    const totalCoins = pkg.coins + pkg.bonus

    const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [{
            price_data: {
                currency: 'usd',
                product_data: {
                    name: `${pkg.label} — ${totalCoins.toLocaleString()} Dopamaxxing Coins`,
                    description: [
                        pkg.bonus > 0 ? `${pkg.coins.toLocaleString()} coins + ${pkg.bonus.toLocaleString()} bonus` : `${pkg.coins.toLocaleString()} coins`,
                        'Virtual in-game currency only. No cash value.',
                    ].join(' · '),
                },
                unit_amount: pkg.priceCents,
            },
            quantity: 1,
        }],
        metadata: {
            user_id: user.id,
            package_id: packageId,
            coins_total: String(totalCoins),
        },
        success_url: `${origin}/dashboard/shop/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/dashboard/shop`,
    })

    return NextResponse.json({ url: session.url })
}
