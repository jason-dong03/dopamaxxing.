export type Profile = {
    id?: string
    username: string | null
    first_name: string | null
    last_name: string | null
    profile_url: string | null
    coins: number
    level: number
    xp: number
    active_title?: string | null
}

export type Friend = {
    id: string
    username: string | null
    profile_url: string | null
}

export type AchievementItem = {
    id: string
    name: string
    description: string
    icon: string
    isHidden: boolean
    earned: boolean
    coinReward: number
    coinsClaimed?: boolean
}
