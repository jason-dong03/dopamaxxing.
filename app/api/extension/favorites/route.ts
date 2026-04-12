import { withExtensionAuth } from '@/lib/api/withExtensionAuth'
import { NextResponse } from 'next/server'

export const GET = withExtensionAuth(async ({ user, supabase }) => {
    const { data, error } = await supabase
        .from('user_cards')
        .select(`
            id,
            card_id,
            worth,
            card_level,
            obtained_at,
            cards ( id, name, image_url, rarity )
        `)
        .eq('user_id', user.id)
        .eq('is_favorited', true)
        .order('obtained_at', { ascending: false })
        .limit(50)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ favorites: data ?? [] })
})

export const OPTIONS = withExtensionAuth(async () => NextResponse.json(null))
