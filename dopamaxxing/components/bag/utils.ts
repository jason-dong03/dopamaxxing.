import type { UserCard } from '@/lib/types'

export function rarityClassName(rarity: string): string {
    return rarity === 'Celestial' ? 'celestial-pulse' : ''
}

export function cardImgSrc(uc: UserCard): string {
    const attrVals = [uc.attr_centering, uc.attr_corners, uc.attr_edges, uc.attr_surface]
        .filter((v): v is number => v != null)
    const overallCond = attrVals.length ? attrVals.reduce((s, v) => s + v, 0) / attrVals.length : null
    return (overallCond === null || overallCond >= 6) && uc.cards.image_url_hi
        ? uc.cards.image_url_hi
        : uc.cards.image_url
}
