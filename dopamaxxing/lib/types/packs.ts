export type PendingPack = {
    id: string
    pack_id: string
    source: string
    created_at: string
}

export type StashRow = {
    id: string
    level_reached: number
    coins: number
    pack_id: string
}
