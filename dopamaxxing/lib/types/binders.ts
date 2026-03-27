import type { CardInfo } from './cards'

export type Binder = {
    id: string
    name: string
    color: string
    include_slabs?: boolean
    user_id?: string
    created_at?: string
    is_featured?: boolean
}

export type BinderPreview = {
    id: string
    name: string
    color: string
    is_featured?: boolean
}

export type BinderUserCard = {
    id: string
    grade: number | null
    grade_count: number | null
    worth: number | null
    is_hot: boolean | null
    card_level: number
    attr_centering: number | null
    attr_corners: number | null
    attr_edges: number | null
    attr_surface: number | null
    cards: CardInfo | null
}

export type BinderCard = {
    id: string
    position: number
    user_card_id: string
    user_cards: BinderUserCard | null
}

export type BinderMyCard = {
    id: string
    worth: number | null
    card_level: number
    grade: number | null
    cards: CardInfo | null
}
