import TCGdex from '@tcgdex/sdk'
import { createClient } from '@/lib/supabase/server'

const tcgdex = new TCGdex('en')
const EURO_TO_USD = 1.08
export async function populateSet() {
    try {
        const set = await tcgdex.set.get('Crown Zenith')
        const supabase = await createClient()

        if (set && supabase) {
            const { error } = await supabase.from('sets').upsert({
                id: set.id,
                name: set.name,
                series: set.serie?.name,
                total_cards: set.cardCount?.total,
                release_date: set.releaseDate,
                image_url: set.logo,
            })
            if (error) console.error('Error inserting set:', error)
            else console.log(`Set inserted: ${set?.name}!`)
        }
    } catch (error) {
        console.error('Network Error - Something went wrong:', error)
    }
}
export async function getCardInfo() {
    try {
        const card = await tcgdex.card.get('sv10.5b-001')
        console.log(card)
    } catch (error) {
        console.error('error:', error)
    }
}
export async function populateCards() {
    try {
        const set = await tcgdex.set.get('Crown Zenith')
        const supabase = await createClient()

        if (set && supabase) {
            for (const cardResume of set.cards) {
                const card = await tcgdex.card.get(cardResume.id)

                if (!card || card.category != 'Pokemon') continue

                const pricing = (card as any).pricing?.cardmarket
                const { error } = await supabase.from('cards').upsert({
                    id: card.id,
                    name: card.name,
                    subtype: card.stage ?? null,
                    hp: card.hp ?? null,
                    evolves_from: card.evolveFrom ?? null,
                    set_id: set.id,
                    national_pokedex_number:
                        card.dexId?.[0] ??
                        (card.localId ? parseInt(card.localId) || null : null),
                    image_url: card.image ? `${card.image}/low.webp` : null,
                    image_url_hi: card.image ? `${card.image}/high.webp` : null,
                    market_price_usd: pricing?.avg30
                        ? parseFloat((pricing.avg30 * EURO_TO_USD).toFixed(2))
                        : 0,
                    is_special: false,
                    attacks: card.attacks?.map((a: any) => ({
                        name:   a.name,
                        damage: a.damage ?? null,
                        effect: a.effect ?? null,
                        cost:   a.cost ?? [],
                    })) ?? [],
                })
                if (error) console.error('Error inserting card:', error)
                else console.log(`${card.name} has been added!`)
            }
        }
    } catch (error) {
        console.error('Network Error - Something went wrong:', error)
    }
}
