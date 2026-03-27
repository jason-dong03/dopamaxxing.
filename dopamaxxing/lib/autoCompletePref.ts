// lib/autoCompletePref.ts

export type CardAction = 'add' | 'feed' | 'sell' | 'skip'

export type GradeAction = 'sell' | 'skip' | 'off'

export type AutoCompletePrefs = {
    bulk: CardAction
    fullArt: Record<string, CardAction> // keyed by rarity
    // If overall attr grade < gradeThreshold, override action with gradeAction
    gradeThreshold: number    // 1–10, e.g. 5 means "if overall < 5, do gradeAction"
    gradeAction: GradeAction  // what to do when below threshold
    gradeAboveSkip?: boolean  // if true and grade >= threshold, skip (keep the card)
    gradeOverridesPremium?: boolean // if false, premium cards ignore grade filter (rarity rules win)
}

const STORAGE_KEY = 'dopamaxxing_autocomplete_prefs'

export const DEFAULT_PREFS: AutoCompletePrefs = {
    bulk: 'sell',
    fullArt: {
        Uncommon: 'add',
        Rare: 'add',
        Epic: 'add',
        Mythical: 'add',
        Legendary: 'add',
        Divine: 'add',
        Celestial: 'add',
        '???': 'add',
    },
    gradeThreshold: 0,   // 0 = off
    gradeAction: 'off',
    gradeOverridesPremium: true,
}

export function loadPrefs(): AutoCompletePrefs {
    if (typeof window === 'undefined') return DEFAULT_PREFS
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        return raw ? JSON.parse(raw) : DEFAULT_PREFS
    } catch {
        return DEFAULT_PREFS
    }
}

export function savePrefs(prefs: AutoCompletePrefs): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
}

export const PREMIUM_RARITIES = new Set([
    'Rare',
    'Epic',
    'Mythical',
    'Legendary',
    'Divine',
    'Celestial',
    '???',
])

function getOverallGrade(card: {
    attr_centering?: number | null
    attr_corners?: number | null
    attr_edges?: number | null
    attr_surface?: number | null
}): number | null {
    const vals = [card.attr_centering, card.attr_corners, card.attr_edges, card.attr_surface]
        .filter((v): v is number => v != null)
    if (vals.length === 0) return null
    return vals.reduce((s, v) => s + v, 0) / vals.length
}

export function getActionForCard(
    card: {
        rarity: string
        attr_centering?: number | null
        attr_corners?: number | null
        attr_edges?: number | null
        attr_surface?: number | null
    },
    prefs: AutoCompletePrefs,
    isNew: boolean,
): CardAction {
    const isBulk = card.rarity === 'Common'
    const isPremium = PREMIUM_RARITIES.has(card.rarity)

    // Grade filter: skip it for premium cards when gradeOverridesPremium is false
    const gradeApplies = prefs.gradeThreshold > 0 && (isBulk || prefs.gradeOverridesPremium !== false || !isPremium)
    if (gradeApplies) {
        const overall = getOverallGrade(card)
        if (overall !== null) {
            // below threshold override
            if (prefs.gradeAction !== 'off' && overall < prefs.gradeThreshold) {
                return prefs.gradeAction as CardAction
            }
            // above threshold skip
            if (prefs.gradeAboveSkip && overall >= prefs.gradeThreshold) {
                return 'skip'
            }
        }
    }

    const action = isBulk ? prefs.bulk : (prefs.fullArt[card.rarity] ?? 'skip')

    if (action === 'feed' && isNew) return 'add'
    if (action === 'add' && !isNew) return 'feed'
    return action
}
