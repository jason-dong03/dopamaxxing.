import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { COIN_PACKAGES, type PackageId } from '@/lib/coinPackages'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-02-25.clover' })

export async function POST(req: NextRequest) {
    const rawBody = await req.text()
    const sig = req.headers.get('stripe-signature')

    if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    let event: Stripe.Event
    try {
        event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)
    } catch (err) {
        console.error('[stripe/webhook] signature verification failed:', err)
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    if (event.type !== 'checkout.session.completed') {
        return NextResponse.json({ received: true })
    }

    const session = event.data.object as Stripe.Checkout.Session
    const { user_id, package_id } = session.metadata ?? {}
    const paymentIntent = session.payment_intent as string

    if (!user_id || !package_id || !paymentIntent) {
        console.error('[stripe/webhook] missing metadata', session.metadata)
        return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
    }

    const pkg = COIN_PACKAGES[package_id as PackageId]
    if (!pkg) {
        console.error('[stripe/webhook] unknown package_id:', package_id)
        return NextResponse.json({ error: 'Unknown package' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: existing } = await supabase
        .from('purchases')
        .select('id')
        .eq('stripe_payment_intent', paymentIntent)
        .maybeSingle()

    if (existing) {
        console.log('[stripe/webhook] already processed:', paymentIntent)
        return NextResponse.json({ received: true })
    }

    const coinsToCredit = pkg.coins + pkg.bonus

    // Credit coins to user
    const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('coins')
        .eq('id', user_id)
        .single()

    if (profileErr || !profile) {
        console.error('[stripe/webhook] profile fetch failed:', profileErr?.message)
        return NextResponse.json({ error: 'Profile not found' }, { status: 500 })
    }

    const updates: Record<string, unknown> = {
        coins: (profile.coins ?? 0) + coinsToCredit,
    }
    if (pkg.oneTime) updates.new_user_promo_used = true

    const { error: updateErr } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user_id)

    if (updateErr) {
        console.error('[stripe/webhook] profile update failed:', updateErr.message)
        return NextResponse.json({ error: 'Failed to credit coins' }, { status: 500 })
    }

    // Record purchase (UNIQUE on stripe_payment_intent prevents double-credit)
    const { error: insertErr } = await supabase
        .from('purchases')
        .insert({
            user_id,
            stripe_payment_intent: paymentIntent,
            stripe_session_id: session.id,
            package_id,
            coins_credited: coinsToCredit,
            amount_cents: session.amount_total ?? pkg.priceCents,
        })

    if (insertErr) {
        console.error('[stripe/webhook] purchase insert failed:', insertErr.message)
    }


    if (!pkg.oneTime) {
        const { data: topupQuest } = await supabase
            .from('quests')
            .select('id')
            .eq('slug', 'first-topup')
            .maybeSingle()
        if (topupQuest) {
            await supabase
                .from('quests')
                .update({ is_active: true, quest_type: 'auto', requirement_metric: 'topup_count', requirement_target: 1 })
                .eq('slug', 'first-topup')
        }
    }

    console.log(`[stripe/webhook] credited ${coinsToCredit} coins to user ${user_id} (${package_id})`)
    return NextResponse.json({ received: true })
}
