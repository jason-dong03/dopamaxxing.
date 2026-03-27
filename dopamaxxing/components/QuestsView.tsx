'use client'

import { useState, useEffect, useRef, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
    CATEGORY_META,
    getProgress,
    isAutoComplete,
    type Quest,
    type AllMetrics,
} from '@/lib/quests'
import NDialogueModal from './dialogs/NDialogueModal'
import BattleScreen from './dialogs/BattleScreen'
import type { OwnedCard } from '@/lib/types'
import {
    IconStar,
    IconClock,
    IconCheck,
    IconSpinner,
    IconAll,
    IconBook,
} from './quests/Icons'
import { type ActiveTab, TAB_ACCENT, msLeft, formatCooldown } from './quests/utils'
import { QuestCard } from './quests/QuestCard'

type Metrics = AllMetrics

type Props = {
    quests: Quest[]
    completedQuestIds: Set<string>
    lastCompletedAt: Record<string, string>
    metrics: Metrics
    playerLevel?: number
    ownedCards?: OwnedCard[]
}

const CATEGORIES: Array<{
    key: ActiveTab
    label: string
    icon: React.ReactNode
}> = [
    { key: 'all', label: 'All', icon: <IconAll size={13} /> },
    { key: 'recurring', label: 'Recurring', icon: <IconClock size={13} /> },
    { key: 'ingame', label: 'In-Game', icon: <IconStar size={13} /> },
    { key: 'story', label: 'Story', icon: <IconBook size={13} /> },
    { key: 'completed', label: 'Completed', icon: <IconCheck size={13} /> },
]

// ─── view ─────────────────────────────────────────────────────────────────────

export default function QuestsView({
    quests,
    completedQuestIds,
    lastCompletedAt,
    metrics,
    playerLevel = 1,
    ownedCards = [],
}: Props) {
    const router = useRouter()
    const [now, setNow] = useState(0)
    const [activeTab, setActiveTab] = useState<ActiveTab>('all')
    const [claimingId, setClaimingId] = useState<string | null>(null)
    const [claimNotes, setClaimNotes] = useState('')
    const [localCompleted, setLocalCompleted] = useState<Set<string>>(new Set())
    const [localLastClaimed, setLocalLastClaimed] = useState<
        Record<string, string>
    >({})
    const [claimedRewards, setClaimedRewards] = useState<
        Record<string, { coins: number; xp: number }>
    >({})
    const [claiming, setClaiming] = useState(false)
    const [claimingAll, setClaimingAll] = useState(false)
    const [page, setPage] = useState(0)
    const [dialogueSlug, setDialogueSlug] = useState<string | null>(null)
    const [battleOpen, setBattleOpen] = useState(false)
    const [returnedCard, setReturnedCard] = useState<{
        name: string
        image_url: string | null
    } | null>(null)

    useEffect(() => {
        setNow(Date.now())
        const id = setInterval(() => setNow(Date.now()), 30_000)
        return () => clearInterval(id)
    }, [])

    useEffect(() => {
        setPage(0)
    }, [activeTab])

    useEffect(() => {
        function onTutorialFinished() {
            router.refresh()
        }
        window.addEventListener('tutorial-finished', onTutorialFinished)
        return () =>
            window.removeEventListener('tutorial-finished', onTutorialFinished)
    }, [router])

    // Track progress changes and fire toast when a quest moves forward
    const prevMetricsRef = useRef<Metrics | null>(null)
    useEffect(() => {
        const prev = prevMetricsRef.current
        if (prev) {
            for (const quest of quests) {
                if (quest.quest_type !== 'auto' || isPermanentlyDone(quest))
                    continue
                const prevProgress = getProgress(quest, prev)
                const nextProgress = getProgress(quest, metrics)
                if (nextProgress > prevProgress && nextProgress < 1) {
                    window.dispatchEvent(
                        new CustomEvent('quest-progress', {
                            detail: {
                                name: quest.name,
                                progress: nextProgress,
                            },
                        }),
                    )
                }
            }
        }
        prevMetricsRef.current = metrics
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [metrics])

    void now // used only to trigger re-render for cooldown ticks

    const allCompleted = new Set([...completedQuestIds, ...localCompleted])
    const mergedLastClaimed = { ...lastCompletedAt, ...localLastClaimed }

    function isOnCooldown(quest: Quest): boolean {
        if (!quest.cooldown_hours) return false
        const last = mergedLastClaimed[quest.id]
        return !!last && msLeft(last, quest.cooldown_hours) > 0
    }

    function cooldownRemaining(quest: Quest): number {
        if (!quest.cooldown_hours) return 0
        const last = mergedLastClaimed[quest.id]
        return last ? Math.max(0, msLeft(last, quest.cooldown_hours)) : 0
    }

    function isPermanentlyDone(quest: Quest): boolean {
        return !quest.cooldown_hours && allCompleted.has(quest.id)
    }

    function hasEverCompleted(quest: Quest): boolean {
        return !!mergedLastClaimed[quest.id] || allCompleted.has(quest.id)
    }

    const diffOrder: Record<string, number> = { easy: 0, medium: 1, hard: 2 }

    const ROMAN = [
        'I',
        'II',
        'III',
        'IV',
        'V',
        'VI',
        'VII',
        'VIII',
        'IX',
        'X',
        'XI',
        'XII',
        'XIII',
        'XIV',
        'XV',
    ]

    function actNumber(slug: string): number {
        const m = slug.match(/(\d+)$/)
        return m ? parseInt(m[1], 10) : 0
    }

    function sortCompleted(list: Quest[]): Quest[] {
        const story = list
            .filter((q) => q.category === 'story')
            .sort((a, b) => actNumber(a.slug) - actNumber(b.slug))
        const others = list
            .filter((q) => q.category !== 'story')
            .sort((a, b) => diffOrder[a.difficulty] - diffOrder[b.difficulty])
        return [...story, ...others]
    }

    function sortQuests(list: Quest[]): Quest[] {
        return [...list].sort((a, b) => {
            const aDone = isPermanentlyDone(a) ? 1 : 0
            const bDone = isPermanentlyDone(b) ? 1 : 0
            if (aDone !== bDone) return aDone - bDone

            const aOnCD = isOnCooldown(a) ? 1 : 0
            const bOnCD = isOnCooldown(b) ? 1 : 0
            if (aOnCD !== bOnCD) return aOnCD - bOnCD

            const aReady =
                a.quest_type === 'auto' && isAutoComplete(a, metrics) ? -1 : 0
            const bReady =
                b.quest_type === 'auto' && isAutoComplete(b, metrics) ? -1 : 0
            if (aReady !== bReady) return aReady - bReady

            return diffOrder[a.difficulty] - diffOrder[b.difficulty]
        })
    }

    // Build a slug → quest lookup for prerequisite checks
    const questBySlug = new Map(quests.map((q) => [q.slug, q]))

    // Hidden quests only appear once completed; quests with a prerequisite
    // only appear once that prerequisite has been completed; level-gated quests
    // are invisible until the player reaches the required level
    function isVisible(quest: Quest): boolean {
        if (quest.min_level && playerLevel < quest.min_level) return false
        if (quest.prerequisite_slug) {
            const prereq = questBySlug.get(quest.prerequisite_slug)
            if (prereq && !hasEverCompleted(prereq)) return false
        }
        if (!quest.is_hidden) return true
        return hasEverCompleted(quest)
    }

    let questPool: Quest[]
    if (activeTab === 'completed') {
        questPool = sortCompleted(quests.filter(hasEverCompleted))
    } else if (activeTab === 'recurring') {
        questPool = sortQuests(
            quests.filter((q) => !!q.cooldown_hours && isVisible(q)),
        )
    } else if (activeTab === 'ingame') {
        questPool = sortQuests(
            quests.filter((q) => q.category === 'ingame' && isVisible(q)),
        )
    } else if (activeTab === 'story') {
        questPool = sortQuests(
            quests.filter(
                (q) =>
                    q.category === 'story' &&
                    (isVisible(q) || hasEverCompleted(q)),
            ),
        )
    } else {
        questPool = sortQuests(quests.filter(isVisible))
    }

    const visibleQuests = questPool
    const PAGE_SIZE = 10
    const totalPages = Math.ceil(visibleQuests.length / PAGE_SIZE)
    const pagedQuests = visibleQuests.slice(
        page * PAGE_SIZE,
        (page + 1) * PAGE_SIZE,
    )

    const oneTimeCompleted = quests.filter(
        (q) => !q.cooldown_hours && allCompleted.has(q.id),
    ).length
    const oneTimeTotal = quests.filter(
        (q) => !q.cooldown_hours && !q.is_hidden,
    ).length
    const everCompleted = quests.filter(hasEverCompleted).length

    function dispatchQuestComplete(quest: Quest) {
        window.dispatchEvent(
            new CustomEvent('quest-complete', {
                detail: {
                    name: quest.name,
                    coins: quest.coin_reward,
                    xp: quest.xp_reward,
                },
            }),
        )
    }

    function dispatchCoinChange(delta: number) {
        window.dispatchEvent(
            new CustomEvent('coin-change', { detail: { delta } }),
        )
    }

    async function handleClaim(quest: Quest) {
        if (claiming) return
        setClaiming(true)
        try {
            const res = await fetch('/api/claim-quest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ questId: quest.id, notes: claimNotes }),
            })
            if (res.ok) {
                const nowIso = new Date().toISOString()
                if (!quest.cooldown_hours)
                    setLocalCompleted((prev) => new Set(prev).add(quest.id))
                setLocalLastClaimed((prev) => ({ ...prev, [quest.id]: nowIso }))
                setClaimedRewards((prev) => ({
                    ...prev,
                    [quest.id]: {
                        coins: quest.coin_reward,
                        xp: quest.xp_reward,
                    },
                }))
                setClaimingId(null)
                setClaimNotes('')
                dispatchQuestComplete(quest)
                dispatchCoinChange(quest.coin_reward)
                window.dispatchEvent(new Event('quest-claimed'))
                if (quest.category === 'story') {
                    setDialogueSlug(quest.slug)
                } else {
                    router.refresh()
                }
            }
        } finally {
            setClaiming(false)
        }
    }

    async function handleGiveAndClaim(quest: Quest) {
        if (claiming) return
        setClaiming(true)
        try {
            const res = await fetch('/api/n-give-card', { method: 'POST' })
            if (!res.ok) return
            const { card, reward } = (await res.json()) as {
                card: { id: string; name: string; image_url: string | null }
                reward: { coins: number; xp: number }
            }

            const nowIso = new Date().toISOString()
            if (!quest.cooldown_hours)
                setLocalCompleted((prev) => new Set(prev).add(quest.id))
            setLocalLastClaimed((prev) => ({ ...prev, [quest.id]: nowIso }))
            setClaimedRewards((prev) => ({
                ...prev,
                [quest.id]: { coins: reward.coins, xp: reward.xp },
            }))
            dispatchQuestComplete(quest)
            dispatchCoinChange(reward.coins)
            window.dispatchEvent(new Event('quest-claimed'))
            setReturnedCard({ name: card.name, image_url: card.image_url })
            setDialogueSlug(quest.slug)
        } finally {
            setClaiming(false)
        }
    }

    async function handlePhraseVerify(
        quest: Quest,
        phrase: string,
    ): Promise<'ok' | 'wrong' | 'error'> {
        try {
            const res = await fetch('/api/verify-phrase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ questId: quest.id, phrase }),
            })
            if (res.status === 400) {
                const body = await res.json()
                if (body.error === 'wrong_phrase') return 'wrong'
            }
            if (!res.ok) return 'error'
            const { reward } = await res.json()
            setLocalCompleted((prev) => new Set(prev).add(quest.id))
            setClaimedRewards((prev) => ({
                ...prev,
                [quest.id]: { coins: reward.coins, xp: reward.xp },
            }))
            dispatchQuestComplete(quest)
            dispatchCoinChange(reward.coins)
            window.dispatchEvent(new Event('quest-claimed'))
            if (quest.category === 'story') setDialogueSlug(quest.slug)
            else router.refresh()
            return 'ok'
        } catch {
            return 'error'
        }
    }

    async function handleAutoClaim(quest: Quest) {
        if (
            !isVisible(quest) ||
            !isAutoComplete(quest, metrics) ||
            isPermanentlyDone(quest)
        )
            return
        if (claiming) return
        setClaiming(true)
        try {
            const res = await fetch('/api/claim-quest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    questId: quest.id,
                    notes: 'auto-detected',
                }),
            })
            if (res.ok) {
                setLocalCompleted((prev) => new Set(prev).add(quest.id))
                setClaimedRewards((prev) => ({
                    ...prev,
                    [quest.id]: {
                        coins: quest.coin_reward,
                        xp: quest.xp_reward,
                    },
                }))
                dispatchQuestComplete(quest)
                dispatchCoinChange(quest.coin_reward)
                window.dispatchEvent(new Event('quest-claimed'))
                if (quest.category === 'story') {
                    setDialogueSlug(quest.slug)
                } else {
                    router.refresh()
                }
            }
        } finally {
            setClaiming(false)
        }
    }

    // All auto-completable quests that are ready to claim right now
    // Must also pass the same visibility gate as the quest list
    const claimableQuests = quests.filter(
        (q) =>
            isVisible(q) &&
            q.quest_type === 'auto' &&
            isAutoComplete(q, metrics) &&
            !isPermanentlyDone(q) &&
            !isOnCooldown(q),
    )
    const claimAllCoins = claimableQuests.reduce((s, q) => s + q.coin_reward, 0)
    const claimAllXp = claimableQuests.reduce((s, q) => s + q.xp_reward, 0)

    async function handleClaimAll() {
        if (claimingAll || claiming || claimableQuests.length === 0) return
        setClaimingAll(true)
        try {
            const nowIso = new Date().toISOString()
            for (const quest of claimableQuests) {
                const res = await fetch('/api/claim-quest', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        questId: quest.id,
                        notes: 'auto-detected',
                    }),
                })
                if (res.ok) {
                    if (!quest.cooldown_hours)
                        setLocalCompleted((prev) => new Set(prev).add(quest.id))
                    setLocalLastClaimed((prev) => ({
                        ...prev,
                        [quest.id]: nowIso,
                    }))
                    setClaimedRewards((prev) => ({
                        ...prev,
                        [quest.id]: {
                            coins: quest.coin_reward,
                            xp: quest.xp_reward,
                        },
                    }))
                    dispatchQuestComplete(quest)
                    dispatchCoinChange(quest.coin_reward)
                }
            }
            window.dispatchEvent(new Event('quest-claimed'))
            router.refresh()
        } finally {
            setClaimingAll(false)
        }
    }

    function renderQuestCard(quest: Quest) {
        return (
            <QuestCard
                key={quest.id}
                quest={quest}
                completed={isPermanentlyDone(quest)}
                onCooldown={isOnCooldown(quest)}
                cooldownMs={cooldownRemaining(quest)}
                hasEverCompleted={hasEverCompleted(quest)}
                reward={claimedRewards[quest.id]}
                metrics={metrics}
                isExpanded={claimingId === quest.id}
                notes={claimNotes}
                claiming={claiming}
                onExpand={() =>
                    setClaimingId(claimingId === quest.id ? null : quest.id)
                }
                onNotesChange={setClaimNotes}
                ownedCards={ownedCards}
                onClaim={() => handleClaim(quest)}
                onAutoClaim={() => handleAutoClaim(quest)}
                onPhraseVerify={
                    quest.requirement_metric === 'found_liberator_phrase'
                        ? (phrase) => handlePhraseVerify(quest, phrase)
                        : undefined
                }
                onReplayDialogue={
                    quest.category === 'story'
                        ? () => setDialogueSlug(quest.slug)
                        : undefined
                }
                onGiveCard={
                    quest.slug === 'n-ch-2'
                        ? () => handleGiveAndClaim(quest)
                        : undefined
                }
                onChallenge={
                    quest.slug === 'n-ch-9' &&
                    quest.requirement_metric === 'n_battle_won'
                        ? () => setBattleOpen(true)
                        : undefined
                }
            />
        )
    }

    function renderCompletedList(list: Quest[]) {
        let lastAct = -1
        let shownOtherHeader = false
        const nodes: ReactNode[] = []
        for (const quest of list) {
            const isStory = quest.category === 'story'
            const act = isStory ? actNumber(quest.slug) : -1
            if (isStory && act !== lastAct) {
                lastAct = act
                nodes.push(
                    <div
                        key={`act-header-${act}`}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            margin: nodes.length > 0 ? '12px 0 6px' : '0 0 6px',
                        }}
                    >
                        <span
                            style={{
                                fontSize: '0.58rem',
                                fontWeight: 700,
                                color: '#f87171',
                                letterSpacing: '0.14em',
                                textTransform: 'uppercase',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            Act {ROMAN[act - 1] ?? act}
                        </span>
                        <div
                            style={{
                                flex: 1,
                                height: 1,
                                background: 'rgba(248,113,113,0.2)',
                            }}
                        />
                    </div>,
                )
            }
            if (!isStory && !shownOtherHeader) {
                shownOtherHeader = true
                nodes.push(
                    <div
                        key="other-header"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            margin: nodes.length > 0 ? '12px 0 6px' : '0 0 6px',
                        }}
                    >
                        <span
                            style={{
                                fontSize: '0.58rem',
                                fontWeight: 700,
                                color: 'var(--app-text-muted)',
                                letterSpacing: '0.14em',
                                textTransform: 'uppercase',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            Other
                        </span>
                        <div
                            style={{
                                flex: 1,
                                height: 1,
                                background: 'var(--app-border)',
                            }}
                        />
                    </div>,
                )
            }
            nodes.push(renderQuestCard(quest))
        }
        return nodes
    }

    return (
        <>
            {dialogueSlug && (
                <NDialogueModal
                    questSlug={dialogueSlug}
                    returnedCard={
                        dialogueSlug === 'n-ch-2'
                            ? (returnedCard ?? undefined)
                            : undefined
                    }
                    onClose={() => {
                        setDialogueSlug(null)
                        setReturnedCard(null)
                        router.refresh()
                    }}
                />
            )}
            {battleOpen && (
                <BattleScreen
                    onClose={() => setBattleOpen(false)}
                    onBattleWon={() => {
                        setBattleOpen(false)
                        router.refresh()
                    }}
                />
            )}
            <div
                style={{
                    width: '100%',
                    maxWidth: 700,
                    margin: '0 auto',
                    padding: '24px 16px 100px',
                }}
            >
                {/* header */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        marginBottom: 24,
                    }}
                >
                    <div>
                        <h1
                            style={{
                                fontSize: '1.35rem',
                                fontWeight: 700,
                                color: 'var(--app-text)',
                                margin: 0,
                                letterSpacing: '-0.02em',
                            }}
                        >
                            Quests
                        </h1>
                        <p
                            style={{
                                fontSize: '0.78rem',
                                color: 'var(--app-text-faint)',
                                marginTop: 4,
                                margin: '4px 0 0',
                            }}
                        >
                            complete quests to earn coins &amp; xp
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <div
                            style={{
                                background: 'var(--app-surface-2)',
                                border: '1px solid var(--app-border)',
                                borderRadius: 8,
                                padding: '5px 12px',
                                fontSize: '0.72rem',
                                color: 'var(--app-text-muted)',
                            }}
                        >
                            {oneTimeCompleted} / {oneTimeTotal} one-time
                        </div>
                        <div
                            style={{
                                background: 'var(--app-surface)',
                                border: '1px solid var(--app-border)',
                                borderRadius: 8,
                                padding: '4px 10px',
                                fontSize: '0.65rem',
                                color: 'var(--app-text-ghost)',
                            }}
                        >
                            {everCompleted} ever completed
                        </div>
                    </div>
                </div>

                {/* category tabs + claim all */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        paddingBottom: 4,
                        marginBottom: 22,
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            gap: 6,
                            overflowX: 'auto',
                            flex: 1,
                            scrollbarWidth: 'none',
                        }}
                    >
                        {CATEGORIES.map(({ key, label, icon }) => {
                            const isActive = activeTab === key
                            const accentColor = TAB_ACCENT[key]
                            return (
                                <button
                                    key={key}
                                    onClick={() => setActiveTab(key)}
                                    className={
                                        key === 'completed' && isActive
                                            ? 'quest-completed-accent'
                                            : ''
                                    }
                                    style={{
                                        flexShrink: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        padding: '6px 14px',
                                        borderRadius: 20,
                                        fontSize: '0.72rem',
                                        fontWeight: isActive ? 600 : 400,
                                        cursor: 'pointer',
                                        border: isActive
                                            ? `1px solid ${accentColor}`
                                            : '1px solid var(--app-border)',
                                        background: isActive
                                            ? `${accentColor}18`
                                            : 'transparent',
                                        color: isActive
                                            ? accentColor
                                            : 'var(--app-text-muted)',
                                        transition: 'all 200ms ease',
                                    }}
                                >
                                    <span
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            opacity: isActive ? 1 : 0.6,
                                        }}
                                    >
                                        {icon}
                                    </span>
                                    <span>{label}</span>
                                </button>
                            )
                        })}
                    </div>
                    {claimableQuests.length > 0 && (
                        <button
                            onClick={handleClaimAll}
                            disabled={claimingAll || claiming}
                            style={{
                                flexShrink: 0,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 5,
                                background: claimingAll
                                    ? 'rgba(234,179,8,0.08)'
                                    : 'rgba(234,179,8,0.12)',
                                border: '1px solid rgba(234,179,8,0.45)',
                                borderRadius: 20,
                                padding: '6px 12px',
                                cursor: claimingAll ? 'default' : 'pointer',
                                color: '#eab308',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                transition: 'all 0.15s',
                            }}
                        >
                            {claimingAll ? (
                                <>
                                    <IconSpinner size={11} color="#eab308" />
                                    claiming…
                                </>
                            ) : (
                                <>
                                    Claim All
                                    <span
                                        style={{
                                            color: 'var(--app-text-muted)',
                                            fontSize: '0.65rem',
                                        }}
                                    >
                                        ({claimableQuests.length})
                                    </span>
                                    <span
                                        style={{
                                            color: '#4ade80',
                                            fontWeight: 700,
                                        }}
                                    >
                                        +${claimAllCoins.toLocaleString()}
                                    </span>
                                    <span
                                        style={{
                                            color: 'var(--app-text-muted)',
                                            fontSize: '0.65rem',
                                        }}
                                    >
                                        +{claimAllXp.toLocaleString()} xp
                                    </span>
                                </>
                            )}
                        </button>
                    )}
                </div>

                {/* quest list */}
                <div style={{ paddingRight: 4 }}>
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10,
                        }}
                    >
                        {visibleQuests.length === 0 ? (
                            <div
                                style={{
                                    textAlign: 'center',
                                    padding: '48px 24px',
                                    color: 'var(--app-text-ghost)',
                                    fontSize: '0.82rem',
                                }}
                            >
                                {activeTab === 'completed'
                                    ? 'No quests completed yet.'
                                    : 'No quests here.'}
                            </div>
                        ) : activeTab === 'completed' ? (
                            renderCompletedList(pagedQuests)
                        ) : (
                            pagedQuests.map((quest) => renderQuestCard(quest))
                        )}
                    </div>
                    {totalPages > 1 && (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 12,
                                marginTop: 16,
                            }}
                        >
                            <button
                                onClick={() =>
                                    setPage((p) => Math.max(0, p - 1))
                                }
                                disabled={page === 0}
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 8,
                                    border: '1px solid var(--app-border)',
                                    background:
                                        page === 0
                                            ? 'transparent'
                                            : 'var(--app-surface-2)',
                                    color:
                                        page === 0
                                            ? 'var(--app-text-ghost)'
                                            : 'var(--app-text-muted)',
                                    cursor: page === 0 ? 'default' : 'pointer',
                                    fontSize: '0.9rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                ‹
                            </button>
                            <span
                                style={{
                                    fontSize: '0.72rem',
                                    color: 'var(--app-text-muted)',
                                }}
                            >
                                {page + 1} / {totalPages}
                            </span>
                            <button
                                onClick={() =>
                                    setPage((p) =>
                                        Math.min(totalPages - 1, p + 1),
                                    )
                                }
                                disabled={page >= totalPages - 1}
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 8,
                                    border: '1px solid var(--app-border)',
                                    background:
                                        page >= totalPages - 1
                                            ? 'transparent'
                                            : 'var(--app-surface-2)',
                                    color:
                                        page >= totalPages - 1
                                            ? 'var(--app-text-ghost)'
                                            : 'var(--app-text-muted)',
                                    cursor:
                                        page >= totalPages - 1
                                            ? 'default'
                                            : 'pointer',
                                    fontSize: '0.9rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                ›
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
