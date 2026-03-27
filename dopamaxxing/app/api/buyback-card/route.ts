import { withAuth } from '@/lib/api/withAuth'
import { NextResponse } from 'next/server'

export const POST = withAuth(async ({ user, supabase }, request) => {
    const { card_buyback_amount, user_card_id, count = 1 } = await request.json()

    const { data: fullProfile } = await supabase
        .from('profiles')
        .select('coins, cards_sold')
        .eq('id', user.id)
        .single()

    const { error: coinsErr } = await supabase
        .from('profiles')
        .update({
            coins: (fullProfile?.coins ?? 0) + card_buyback_amount,
            cards_sold: ((fullProfile?.cards_sold ?? 0) + count),
        })
        .eq('id', user.id)
    if (coinsErr) console.error('buyback coins error:', coinsErr)

    if (user_card_id) {
        const { data: soldRow } = await supabase
            .from('user_cards')
            .select('cards!inner(market_price_usd)')
            .eq('id', user_card_id)
            .eq('user_id', user.id)
            .single()
        const soldPrice: number = (soldRow as any)?.cards?.market_price_usd ?? 0

        void (async () => {
            try {
                const { data: nqp } = await supabase
                    .from('n_quest_progress')
                    .select('sold_highest_count')
                    .eq('user_id', user.id)
                    .maybeSingle()
                if (!(nqp?.sold_highest_count >= 1) && soldPrice > 0) {
                    const { data: others } = await supabase
                        .from('user_cards')
                        .select('cards!inner(market_price_usd)')
                        .eq('user_id', user.id)
                        .neq('id', user_card_id)
                        .limit(500)
                    const maxOther = Math.max(0, ...((others ?? []) as any[])
                        .map((r: any) => r.cards?.market_price_usd ?? 0))
                    if (soldPrice >= maxOther) {
                        await supabase.from('n_quest_progress')
                            .upsert({ user_id: user.id, sold_highest_count: 1 }, { onConflict: 'user_id' })
                    }
                }
            } catch { /* ignore */ }
        })()

        const { error: deleteErr } = await supabase
            .from('user_cards')
            .delete()
            .eq('id', user_card_id)
            .eq('user_id', user.id)
        if (deleteErr) console.error('buyback delete error:', deleteErr)
    }

    return NextResponse.json({ success: true })
})
