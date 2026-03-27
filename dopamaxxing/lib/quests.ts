export type QuestCategory =
    | 'ingame'
    | 'study'
    | 'gaming'
    | 'life'
    | 'entertainment'
    | 'story'

export type QuestType = 'auto' | 'self_report'
export type QuestDifficulty = 'easy' | 'medium' | 'hard'
export type AutoMetric =
    | 'packs_opened'
    | 'cards_owned'
    | 'cards_fed'
    | 'cards_sold'
    | 'friends_count'
    | 'daily_packs_today'
    | 'daily_cards_fed_today'
    | 'login_today'
    | 'login_streak'
    | 'has_uncommon'
    | 'has_rare'
    | 'has_epic'
    | 'has_mythical'
    | 'has_legendary'
    | 'has_divine'
    | 'has_celestial'
    | 'has_mystery'
    | 'has_psa10'
    | 'has_psa1'
    | 'has_showcase'
    | 'discord_packs_claimed'
    | 'added_owner_friend'
    | 'found_liberator_phrase'
    | 'found_n_farewell'
    | 'has_n_legendary_combo'
    | 'tutorial_completed'
    | 'discord_linked'
    | 'discord_connected'
    | 'n_packs_opened'
    | 'sold_highest_card'
    | 'n_battle_won'

/** Shape returned from the `quests` DB table */
export type Quest = {
    id: string          // UUID from DB
    slug: string        // human-readable key eg. 'first-pack'
    name: string
    description: string
    quest_type: QuestType
    category: QuestCategory
    difficulty: QuestDifficulty
    coin_reward: number
    xp_reward: number
    cooldown_hours: number | null   // null = one-time
    requirement_metric: AutoMetric | null
    requirement_target: number | null
    verification_hint: string | null
    verification_suggestion: string | null
    timed_minutes: number | null
    is_active: boolean
    title_reward: string | null   // title granted when claimed
    is_hidden: boolean            // hidden from quest list until completed
    prerequisite_slug: string | null  // slug of quest that must be completed first
    min_level: number | null          // player must be this level or higher to see
}

export const CATEGORY_META: Record<
    QuestCategory,
    { label: string; icon: string; color: string }
> = {
    ingame:        { label: 'In-Game',       icon: '📦', color: '#60a5fa' },
    study:         { label: 'Study',         icon: '📚', color: '#4ade80' },
    gaming:        { label: 'Gaming',        icon: '🎮', color: '#fb923c' },
    life:          { label: 'Life',          icon: '🌱', color: '#f472b4' },
    entertainment: { label: 'Entertainment', icon: '🎵', color: '#c084fc' },
    story:         { label: 'Story',         icon: '📖', color: '#f87171' },
}

export const DIFFICULTY_COLOR: Record<QuestDifficulty, string> = {
    easy:   '#4ade80',
    medium: '#fb923c',
    hard:   '#f87171',
}

// ─── helpers ──────────────────────────────────────────────────────────────────

export type AllMetrics = {
    packs_opened: number
    cards_owned: number
    cards_fed: number
    cards_sold: number
    friends_count: number
    daily_packs_today: number
    daily_cards_fed_today: number
    login_today: number
    login_streak: number
    has_uncommon: number
    has_rare: number
    has_epic: number
    has_mythical: number
    has_legendary: number
    has_divine: number
    has_celestial: number
    has_mystery: number
    has_psa10: number
    has_psa1: number
    has_showcase: number
    discord_packs_claimed: number
    added_owner_friend: number
    legendary_count: number
    discord_connected: number
    has_n_combo: number
    has_creation_trio: number
    has_mew_mewtwo: number
    found_liberator_phrase: number
    found_n_farewell: number
    has_n_legendary_combo: number
    has_purchased: number
    tutorial_completed: number
    discord_linked: number
    n_packs_opened: number
    sold_highest_card: number
    n_battle_won: number
}

export function getProgress(quest: Quest, metrics: Partial<AllMetrics>): number {
    if (quest.quest_type !== 'auto' || !quest.requirement_metric || !quest.requirement_target) return 0
    const current = (metrics as Record<string, number>)[quest.requirement_metric] ?? 0
    return Math.min(current / quest.requirement_target, 1)
}

export function isAutoComplete(quest: Quest, metrics: Partial<AllMetrics>): boolean {
    return getProgress(quest, metrics) >= 1
}
