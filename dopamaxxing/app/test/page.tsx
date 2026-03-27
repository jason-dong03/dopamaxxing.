export const dynamic = 'force-dynamic'

import TCGdex from '@tcgdex/sdk'

export default async function TestPage() {
    const tcgdex = new TCGdex('en')

    const set = await tcgdex.set.get('me02.5')

    const rawCards = set
        ? await Promise.all(set.cards.map((c) => tcgdex.card.get(c.id)))
        : []

    const cards = JSON.parse(JSON.stringify(rawCards, (_, v) =>
        v && typeof v === 'object' && v.constructor?.name === '_TCGdex' ? undefined : v
    )) as any[]

    return (
        <div className="p-6 flex flex-col gap-8">
            <h1 className="text-white font-bold text-lg">{set?.name} — {cards.length} cards</h1>

            {/* sprite grid */}
            <div className="grid grid-cols-6 gap-4">
                {cards.map((card: any) => (
                    <div key={card.id} className="flex flex-col items-center gap-1">
                        {card.image
                            ? <img src={`${card.image}/low.webp`} alt={card.name} className="rounded-lg w-full" />
                            : <div className="w-full aspect-[2/3] bg-white/5 rounded-lg flex items-center justify-center text-gray-600 text-xs">no img</div>
                        }
                        <span className="text-xs text-gray-400 text-center">{card.name}</span>
                        <span className="text-xs text-gray-600 font-mono">
                            dex: {card.dexId?.[0] ?? `#${card.localId}`}
                        </span>
                    </div>
                ))}
            </div>

            {/* raw json */}
            <pre className="text-xs overflow-auto text-gray-500">{JSON.stringify(cards, null, 2)}</pre>
        </div>
    )
}
