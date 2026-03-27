import { withAuth } from '@/lib/api/withAuth'
import { NextResponse } from 'next/server'

const COOLDOWN_MS = 180_000

function rollCoins(): number {
    const r = Math.random() * 100
    if (r < 70)   return parseFloat((Math.random() * 1.00 + 0.50).toFixed(2))
    if (r < 98)   return parseFloat((Math.random() * 7.00 + 2.00).toFixed(2))
    if (r < 99.8) return 10
    return 100
}

export const POST = withAuth(async ({ user, supabase }) => {
    const { data: profile } = await supabase
        .from('profiles')
        .select('coins, passive_coin_at')
        .eq('id', user.id)
        .single()

    const lastAward = profile?.passive_coin_at ? new Date(profile.passive_coin_at).getTime() : 0
    if (Date.now() - lastAward < COOLDOWN_MS)
        return NextResponse.json({ error: 'too_soon' }, { status: 429 })

    const awarded = rollCoins()
    const newCoins = (profile?.coins ?? 0) + awarded
    await supabase
        .from('profiles')
        .update({ coins: newCoins, passive_coin_at: new Date().toISOString() })
        .eq('id', user.id)

    return NextResponse.json({ success: true, awarded, newCoins })
})
