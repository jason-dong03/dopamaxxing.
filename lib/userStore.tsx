'use client'

import React, { createContext, useContext, useReducer, useCallback, useRef } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────

export type Profile = {
    id: string
    username: string | null
    first_name: string | null
    last_name: string | null
    profile_url: string | null
    coins: number
    xp: number
    level: number
    active_title: string | null
    battle_power: number
    bag_capacity: number
    packs_opened: number
    login_streak: number
    discord_id: string | null
    is_admin: boolean
}

export type Achievement = {
    id: string
    name: string
    description: string
    icon: string
    isHidden: boolean
    coinReward: number
    earned: boolean
    earnedAt: string | null
    coinsClaimed: boolean
}

export type Quest = {
    id: string
    title: string
    description: string
    reward_coins: number
    reward_xp: number
    icon: string
    category: string
    sort_order: number | null
    title_reward: string | null
}

export type UserQuest = {
    quest_id: string
    status: string
    completed_at: string | null
}

export type Binder = {
    id: string
    name: string
    color: string
    is_featured: boolean
    created_at: string
}

export type Lineup = {
    id: string
    name: string
    card_ids: string[]
}

export type UserItem = {
    id: string
    item_id: string
    quantity: number
}

export type NQP = {
    opened_white_flare: boolean
    opened_black_bolt: boolean
    sold_highest_count: number
    found_liberator_phrase: boolean
    found_n_farewell: boolean
} | null

export type Friendship = {
    id: string
    requester_id: string
    addressee_id: string
    status: string
}

export type PrefetchData = {
    profile: Profile | null
    achievements: Achievement[]
    quests: Quest[]
    userQuests: UserQuest[]
    binders: Binder[]
    lineups: Lineup[]
    items: UserItem[]
    nqp: NQP
    friends: Friendship[]
    fetchedAt: number
}

type SliceStatus = 'idle' | 'loading' | 'ready' | 'error'

type StoreState = {
    status: SliceStatus
    data: PrefetchData | null
    fetchedAt: number
    /** Per-key override for targeted invalidation */
    staleBits: Set<keyof PrefetchData>
}

type StoreAction =
    | { type: 'LOADING' }
    | { type: 'SUCCESS'; payload: PrefetchData }
    | { type: 'ERROR' }
    | { type: 'INVALIDATE'; key: keyof PrefetchData }
    | { type: 'INVALIDATE_ALL' }
    | { type: 'PATCH_PROFILE'; patch: Partial<Profile> }

// ── TTLs (ms) ─────────────────────────────────────────────────────────────────

const TTL: Record<keyof PrefetchData, number> = {
    profile:      60_000,      // 1 min — coins/xp change often
    achievements: 5 * 60_000,  // 5 min
    quests:       5 * 60_000,
    userQuests:   2 * 60_000,
    binders:      3 * 60_000,
    lineups:      3 * 60_000,
    items:        3 * 60_000,
    nqp:          5 * 60_000,
    friends:      5 * 60_000,
    fetchedAt:    Infinity,
}

// ── Reducer ───────────────────────────────────────────────────────────────────

const initialState: StoreState = {
    status: 'idle',
    data: null,
    fetchedAt: 0,
    staleBits: new Set(),
}

function reducer(state: StoreState, action: StoreAction): StoreState {
    switch (action.type) {
        case 'LOADING':
            return { ...state, status: 'loading' }
        case 'SUCCESS':
            return {
                status: 'ready',
                data: action.payload,
                fetchedAt: action.payload.fetchedAt,
                staleBits: new Set(),
            }
        case 'ERROR':
            return { ...state, status: 'error' }
        case 'INVALIDATE':
            return { ...state, staleBits: new Set([...state.staleBits, action.key]) }
        case 'INVALIDATE_ALL':
            return { ...state, staleBits: new Set(Object.keys(TTL) as (keyof PrefetchData)[]) }
        case 'PATCH_PROFILE':
            if (!state.data) return state
            return {
                ...state,
                data: { ...state.data, profile: state.data.profile ? { ...state.data.profile, ...action.patch } : null },
            }
        default:
            return state
    }
}

// ── Context ───────────────────────────────────────────────────────────────────

type StoreContextValue = {
    state: StoreState
    prefetch: () => Promise<void>
    refetch: () => Promise<void>
    invalidate: (key: keyof PrefetchData) => void
    invalidateAll: () => void
    patchProfile: (patch: Partial<Profile>) => void
    isStale: (key: keyof PrefetchData) => boolean
}

const StoreContext = createContext<StoreContextValue | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────

export function UserDataProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(reducer, initialState)
    const fetchingRef = useRef(false)

    const fetchAll = useCallback(async () => {
        if (fetchingRef.current) return
        fetchingRef.current = true
        dispatch({ type: 'LOADING' })
        try {
            const res = await fetch('/api/prefetch')
            if (!res.ok) throw new Error(`prefetch ${res.status}`)
            const data: PrefetchData = await res.json()
            dispatch({ type: 'SUCCESS', payload: data })
        } catch {
            dispatch({ type: 'ERROR' })
        } finally {
            fetchingRef.current = false
        }
    }, [])

    const prefetch = useCallback(async () => {
        // Only fetch if idle or not yet loaded
        if (state.status === 'ready' || state.status === 'loading') return
        await fetchAll()
    }, [state.status, fetchAll])

    const refetch = useCallback(async () => {
        await fetchAll()
    }, [fetchAll])

    const invalidate = useCallback((key: keyof PrefetchData) => {
        dispatch({ type: 'INVALIDATE', key })
    }, [])

    const invalidateAll = useCallback(() => {
        dispatch({ type: 'INVALIDATE_ALL' })
    }, [])

    const patchProfile = useCallback((patch: Partial<Profile>) => {
        dispatch({ type: 'PATCH_PROFILE', patch })
    }, [])

    const isStale = useCallback((key: keyof PrefetchData): boolean => {
        if (!state.data) return true
        if (state.staleBits.has(key)) return true
        const age = Date.now() - state.fetchedAt
        return age > (TTL[key] ?? 60_000)
    }, [state])

    // Auto-prefetch on mount
    React.useEffect(() => {
        fetchAll()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <StoreContext.Provider value={{ state, prefetch, refetch, invalidate, invalidateAll, patchProfile, isStale }}>
            {children}
        </StoreContext.Provider>
    )
}

// ── Core hook ─────────────────────────────────────────────────────────────────

export function useUserStore() {
    const ctx = useContext(StoreContext)
    if (!ctx) throw new Error('useUserStore must be used inside UserDataProvider')
    return ctx
}

// ── Convenience hooks ─────────────────────────────────────────────────────────

function useSlice<T>(
    key: keyof PrefetchData,
    select: (data: PrefetchData) => T,
    empty: T,
) {
    const { state, refetch } = useUserStore()
    // Re-run whenever this key is added to staleBits
    const isStale = state.staleBits.has(key)
    React.useEffect(() => {
        if (isStale && state.status === 'ready') refetch()
    }, [isStale]) // eslint-disable-line react-hooks/exhaustive-deps
    return {
        data: state.data ? select(state.data) : empty,
        loading: state.status === 'loading' || state.status === 'idle',
    }
}

export function useProfile() {
    const s = useSlice('profile', d => d.profile, null)
    return { profile: s.data, loading: s.loading }
}

export function useAchievements() {
    const s = useSlice('achievements', d => d.achievements, [] as Achievement[])
    return { achievements: s.data, loading: s.loading }
}

export function useQuests() {
    const { state, refetch } = useUserStore()
    const isStale = state.staleBits.has('quests')
    React.useEffect(() => {
        if (isStale && state.status === 'ready') refetch()
    }, [isStale]) // eslint-disable-line react-hooks/exhaustive-deps
    return {
        quests: state.data?.quests ?? [] as Quest[],
        userQuests: state.data?.userQuests ?? [] as UserQuest[],
        loading: state.status === 'loading' || state.status === 'idle',
    }
}

export function useBinders() {
    const s = useSlice('binders', d => d.binders, [] as Binder[])
    return { binders: s.data, loading: s.loading }
}

export function useLineups() {
    const s = useSlice('lineups', d => d.lineups, [] as Lineup[])
    return { lineups: s.data, loading: s.loading }
}

export function useUserItems() {
    const s = useSlice('items', d => d.items, [] as UserItem[])
    return { items: s.data, loading: s.loading }
}

export function useFriends() {
    const s = useSlice('friends', d => d.friends, [] as Friendship[])
    return { friends: s.data, loading: s.loading }
}

export function useNQP() {
    const { state } = useUserStore()
    return { nqp: state.data?.nqp ?? null }
}

/** Call after mutations to keep cache consistent without a full refetch */
export function useInvalidate() {
    const { invalidate, invalidateAll, patchProfile, refetch } = useUserStore()
    return { invalidate, invalidateAll, patchProfile, refetch }
}
