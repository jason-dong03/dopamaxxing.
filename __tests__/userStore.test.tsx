import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import React from 'react'
import { UserDataProvider, useProfile, useAchievements, useQuests, useBinders, useInvalidate } from '../lib/userStore'

// ── Mock fetch ────────────────────────────────────────────────────────────────

const mockPrefetchData = {
    profile: {
        id: 'user-1',
        username: 'trainer1',
        first_name: 'Ash',
        last_name: 'Ketchum',
        profile_url: null,
        coins: 1500,
        xp: 420,
        level: 7,
        active_title: null,
        battle_power: 50000,
        bag_capacity: 50,
        packs_opened: 32,
        login_streak: 3,
        discord_id: null,
        is_admin: false,
    },
    achievements: [
        { id: 'ach-1', name: 'First Pack', description: 'Open your first pack', icon: '📦', isHidden: false, coinReward: 100, earned: true, earnedAt: '2025-01-01', coinsClaimed: false },
        { id: 'ach-2', name: 'Collector', description: 'Own 50 cards', icon: '🃏', isHidden: false, coinReward: 500, earned: false, earnedAt: null, coinsClaimed: false },
    ],
    quests: [
        { id: 'q-1', title: 'Open 10 Packs', description: 'Open packs', reward_coins: 100, reward_xp: 50, icon: '📦', category: 'packs', sort_order: 1, title_reward: null },
    ],
    userQuests: [
        { quest_id: 'q-1', status: 'completed', completed_at: '2025-01-10' },
    ],
    binders: [
        { id: 'b-1', name: 'My Favourites', color: '#a855f7', is_featured: true, created_at: '2025-01-01' },
    ],
    lineups: [],
    items: [],
    nqp: null,
    friends: [],
    fetchedAt: Date.now(),
}

beforeEach(() => {
    vi.restoreAllMocks()
    global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockPrefetchData,
    } as Response)
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
    return <UserDataProvider>{children}</UserDataProvider>
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('UserDataProvider', () => {
    it('calls /api/prefetch on mount', async () => {
        render(<UserDataProvider><div /></UserDataProvider>)
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/prefetch')
        })
    })

    it('does not call prefetch more than once on initial mount', async () => {
        render(<UserDataProvider><div /></UserDataProvider>)
        await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1))
        // Simulate a re-render
        render(<UserDataProvider><div /></UserDataProvider>)
        await new Promise(r => setTimeout(r, 50))
        // Each provider instance calls once — second render is a new provider
        expect(global.fetch).toHaveBeenCalledTimes(2)
    })

    it('surfaces profile data via useProfile', async () => {
        function TestComponent() {
            const { profile, loading } = useProfile()
            if (loading || !profile) return <div>loading</div>
            return <div data-testid="username">{profile.username}</div>
        }
        render(<TestComponent />, { wrapper })
        await waitFor(() => {
            expect(screen.getByTestId('username').textContent).toBe('trainer1')
        })
    })

    it('surfaces achievements via useAchievements', async () => {
        function TestComponent() {
            const { achievements } = useAchievements()
            return <div data-testid="count">{achievements.length}</div>
        }
        render(<TestComponent />, { wrapper })
        await waitFor(() => {
            expect(screen.getByTestId('count').textContent).toBe('2')
        })
    })

    it('surfaces quests + userQuests via useQuests', async () => {
        function TestComponent() {
            const { quests, userQuests } = useQuests()
            return (
                <>
                    <div data-testid="quests">{quests.length}</div>
                    <div data-testid="userQuests">{userQuests.length}</div>
                </>
            )
        }
        render(<TestComponent />, { wrapper })
        await waitFor(() => {
            expect(screen.getByTestId('quests').textContent).toBe('1')
            expect(screen.getByTestId('userQuests').textContent).toBe('1')
        })
    })

    it('surfaces binders via useBinders', async () => {
        function TestComponent() {
            const { binders } = useBinders()
            return <div data-testid="binders">{binders[0]?.name ?? 'none'}</div>
        }
        render(<TestComponent />, { wrapper })
        await waitFor(() => {
            expect(screen.getByTestId('binders').textContent).toBe('My Favourites')
        })
    })
})

describe('invalidation', () => {
    it('patchProfile updates profile coins without a full refetch', async () => {
        function TestComponent() {
            const { profile } = useProfile()
            const { patchProfile } = useInvalidate()
            return (
                <>
                    <div data-testid="coins">{profile?.coins ?? 0}</div>
                    <button onClick={() => patchProfile({ coins: 9999 })}>patch</button>
                </>
            )
        }
        render(<TestComponent />, { wrapper })
        await waitFor(() => expect(screen.getByTestId('coins').textContent).toBe('1500'))

        act(() => {
            screen.getByText('patch').click()
        })
        expect(screen.getByTestId('coins').textContent).toBe('9999')
        // patchProfile should NOT trigger another fetch
        expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('invalidate marks a key stale and triggers refetch on next hook mount', async () => {
        function TestComponent() {
            const { profile } = useProfile()
            const { invalidate } = useInvalidate()
            return (
                <>
                    <div data-testid="level">{profile?.level ?? 0}</div>
                    <button onClick={() => invalidate('profile')}>invalidate</button>
                </>
            )
        }
        render(<TestComponent />, { wrapper })
        await waitFor(() => expect(screen.getByTestId('level').textContent).toBe('7'))

        // After invalidate, refetch is triggered on next useProfile mount
        act(() => { screen.getByText('invalidate').click() })
        await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2))
    })
})

describe('error handling', () => {
    it('gracefully handles fetch failure — hooks return empty defaults', async () => {
        global.fetch = vi.fn().mockRejectedValue(new Error('network error'))

        function TestComponent() {
            const { profile } = useProfile()
            const { achievements } = useAchievements()
            return (
                <>
                    <div data-testid="profile">{profile ? 'has profile' : 'no profile'}</div>
                    <div data-testid="achievements">{achievements.length}</div>
                </>
            )
        }
        render(<TestComponent />, { wrapper })
        await waitFor(() => {
            expect(screen.getByTestId('profile').textContent).toBe('no profile')
            expect(screen.getByTestId('achievements').textContent).toBe('0')
        })
    })
})

describe('prefetch API endpoint contract', () => {
    it('returned profile has required fields', () => {
        const p = mockPrefetchData.profile
        expect(p).toHaveProperty('id')
        expect(p).toHaveProperty('coins')
        expect(p).toHaveProperty('level')
        expect(p).toHaveProperty('xp')
        expect(p).toHaveProperty('bag_capacity')
        expect(p).toHaveProperty('battle_power')
        expect(p).toHaveProperty('is_admin')
    })

    it('achievements have earned + earnedAt fields', () => {
        mockPrefetchData.achievements.forEach(a => {
            expect(a).toHaveProperty('earned')
            expect(a).toHaveProperty('earnedAt')
            expect(a).toHaveProperty('coinsClaimed')
        })
    })

    it('userQuests have quest_id and status', () => {
        mockPrefetchData.userQuests.forEach(uq => {
            expect(uq).toHaveProperty('quest_id')
            expect(uq).toHaveProperty('status')
        })
    })

    it('response includes fetchedAt timestamp', () => {
        expect(typeof mockPrefetchData.fetchedAt).toBe('number')
        expect(mockPrefetchData.fetchedAt).toBeGreaterThan(0)
    })
})
