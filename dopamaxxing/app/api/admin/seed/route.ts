import { NextResponse, NextRequest } from 'next/server'
import TCGdex from '@tcgdex/sdk'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const tcgdex = new TCGdex('en')
const EURO_TO_USD = 1.08

const FIRST_ED_MULTIPLIER: Record<string, number> = {
    'Rare Holo':    18,
    'Rare Holo EX': 18,
    'Rare Secret':  20,
    'Rare':          8,
    'Uncommon':      4,
    'Common':        2,
    'Promo':         5,
}

export async function GET(request: NextRequest) {
    // Auth + admin check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).single()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const setId        = request.nextUrl.searchParams.get('setId') ?? 'sv03.5'
    const firstEdition = request.nextUrl.searchParams.get('firstEdition') === 'true'
    const targetSetId  = firstEdition ? `${setId}-1ed` : setId

    try {
        const set = await tcgdex.set.get(setId)
        if (!set)
            return NextResponse.json({ error: `Set "${setId}" not found` }, { status: 404 })

        await admin.from('sets').upsert({
            id:           targetSetId,
            name:         firstEdition ? `${set.name} — 1st Edition` : set.name,
            series:       set.serie?.name,
            total_cards:  set.cardCount?.total,
            release_date: set.releaseDate,
            image_url:    set.logo,
        })

        const label = firstEdition ? `${set.name} — 1st Edition` : set.name
        console.log(`\n🌱 Seeding "${label}" (${targetSetId}) — ${set.cards.length} cards\n`)

        const results: string[] = []
        for (const cardResume of set.cards) {
            const card = await tcgdex.card.get(cardResume.id)
            if (!card || card.category !== 'Pokemon') continue

            const tcgRarity: string = (card as any).rarity ?? 'Common'
            const pricing   = (card as any).pricing?.cardmarket
            const basePrice = pricing?.avg30
                ? parseFloat((pricing.avg30 * EURO_TO_USD).toFixed(2))
                : 0

            const marketPrice = firstEdition
                ? parseFloat((basePrice * (FIRST_ED_MULTIPLIER[tcgRarity] ?? 3)).toFixed(2))
                : basePrice

            const cardId = firstEdition ? `${targetSetId}/${card.localId}` : card.id

            const { error } = await admin.from('cards').upsert({
                id:           cardId,
                name:         card.name,
                subtype:      card.stage ?? null,
                hp:           card.hp ?? null,
                evolves_from: card.evolveFrom ?? null,
                set_id:       targetSetId,
                national_pokedex_number:
                    card.dexId?.[0] ??
                    (card.localId ? parseInt(card.localId) || null : null),
                image_url:    card.image ? `${card.image}/low.webp`  : null,
                image_url_hi: card.image ? `${card.image}/high.webp` : null,
                market_price_usd: marketPrice,
                is_special:   false,
            })

            if (error) {
                console.error(`❌ ${card.name}:`, error.message)
            } else {
                results.push(card.name)
                console.log(`✅ [${results.length}/${set.cards.length}] ${card.name} — $${marketPrice}`)
            }
        }

        return NextResponse.json({ ok: true, set: label, setId: targetSetId, inserted: results.length, cards: results })
    } catch (err) {
        console.error('Seed error:', err)
        return NextResponse.json({ error: String(err) }, { status: 500 })
    }
}
