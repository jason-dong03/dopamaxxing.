import { withAuth } from '@/lib/api/withAuth'
import { NextResponse } from 'next/server'

const EXPAND_SLOTS = 10
const EXPAND_COST = 20

export const POST = withAuth(async ({ user, supabase }) => {
    const { data: profile } = await supabase
        .from('profiles')
        .select('coins, bag_capacity')
        .eq('id', user.id)
        .single()

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const coins = Number(profile.coins ?? 0)
    if (coins < EXPAND_COST) {
        return NextResponse.json({ error: 'Not enough coins', need: EXPAND_COST, have: coins }, { status: 402 })
    }

    const newCapacity = (profile.bag_capacity ?? 50) + EXPAND_SLOTS
    const { error } = await supabase
        .from('profiles')
        .update({ coins: coins - EXPAND_COST, bag_capacity: newCapacity })
        .eq('id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ capacity: newCapacity, cost: EXPAND_COST, slots: EXPAND_SLOTS })
})
