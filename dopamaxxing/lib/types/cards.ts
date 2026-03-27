import type { StoredMove } from '@/lib/pokemon-moves'

/** Core card info as stored in the `cards` DB table */
export type CardInfo = {
    id: string
    name: string
    image_url: string
    image_url_hi?: string | null
    rarity: string
    national_pokedex_number: number
    set_id?: string | null
    hp?: number
}

/** A user's owned card with all metadata (bag view) */
export type UserCard = {
    id: string
    card_id: string
    card_level: number
    card_xp: number
    is_favorited: boolean
    worth: number
    is_hot: boolean
    attr_centering: number | null
    attr_corners: number | null
    attr_edges: number | null
    attr_surface: number | null
    grade: number | null
    grade_count: number
    stat_atk: number | null
    stat_def: number | null
    stat_spatk: number | null
    stat_spdef: number | null
    stat_spd: number | null
    stat_accuracy: number | null
    stat_evasion: number | null
    nature: string | null
    moves: StoredMove[] | null
    pending_moves: StoredMove[] | null
    cards: CardInfo
}

/** Lighter user card used in server-side profile pages */
export type RawCard = {
    id: string
    card_level: number
    grade: number | null
    cards: {
        id: string
        name: string
        image_url: string
        image_url_hi: string | null
        rarity: string
        national_pokedex_number: number
        set_id: string | null
    } | null
}

/** Card displayed in profile showcase */
export type ShowcaseCard = {
    id: string
    card_level: number
    grade: number | null
    worth: number | null
    nature?: string | null
    cards: {
        id: string
        name: string
        image_url: string
        rarity: string
        national_pokedex_number: number
        set_id: string | null
    }
}

/** Minimal card shape used in drops/stash UI */
export type DropsCard = {
    id: string
    worth: number
    cards: {
        name: string
        image_url: string
        rarity: string
    }
}

/** Card used in quest owned-card checks */
export type OwnedCard = {
    name: string
    rarity: string
    set_id: string
}

/** Card for battle selection screen */
export type CardForBattle = {
    userCardId: string
    name: string
    hp: number
    rarity: string
    imageUrl: string
    level: number
    nature: string | null
    pokemon_type: string
    atk: number | null
    def: number | null
    spatk: number | null
    spdef: number | null
    spd: number | null
    accuracy: number | null
    evasion: number | null
    moves: import('@/lib/pokemon-moves').StoredMove[] | null
}
