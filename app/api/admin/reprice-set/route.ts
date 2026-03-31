import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import TCGdx from '@tcgdex/sdk'

const sdk = new TCGdx('en')

type LogItem = {
    cardId: string
    name: string
    newPrice: number
}

export async function GET() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

    if (!profile?.is_admin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin.rpc('get_set_counts')

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ sets: data ?? [] })
}

export async function POST(request: NextRequest) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

    if (!profile?.is_admin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const admin = createAdminClient()
    const { setId } = (await request.json()) as { setId: string }

    if (!setId) {
        return NextResponse.json({ error: 'setId required' }, { status: 400 })
    }

    const updates: { card_id: string; market_price_usd: number }[] = []
    const logs: LogItem[] = []

    try {
        const set = await sdk.set.get(setId)

        if (!set) {
            return NextResponse.json(
                { error: `Set "${setId}" not found` },
                { status: 404 },
            )
        }

        for (const cardResume of set.cards ?? []) {
            const card = await sdk.card.get(cardResume.id)
            if (!card || card.category !== 'Pokemon') continue

            const pricing = (card as any).pricing?.cardmarket
            const basePrice = pricing?.avg30
                ? parseFloat((pricing.avg30 * 1.08).toFixed(2))
                : 0

            updates.push({
                card_id: cardResume.id,
                market_price_usd: basePrice,
            })

            logs.push({
                cardId: cardResume.id,
                name: cardResume.name,
                newPrice: basePrice,
            })
        }

        if (updates.length === 0) {
            return NextResponse.json({
                updated: 0,
                message: 'No eligible cards found.',
                logs: [],
            })
        }

        const { data, error } = await admin.rpc('bulk_reprice_cards', {
            price_updates: updates,
        })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        const totalUpdated =
            Array.isArray(data) && data.length > 0
                ? Number(data[0].user_cards_updated ?? 0)
                : 0

        return NextResponse.json({
            updated: totalUpdated,
            message: `Done. Updated ${totalUpdated} user cards.`,
            logs,
        })
    } catch (err: any) {
        return NextResponse.json(
            { error: err?.message ?? 'Failed to reprice set' },
            { status: 500 },
        )
    }
}
