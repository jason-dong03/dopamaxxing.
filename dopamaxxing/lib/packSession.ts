export type PackSession = {
    cards: any[]
    addedIndices: number[]
    doneIndex: number
    addedCardIds: string[]
}

const SESSION_KEY = 'dopamaxxing_pack_session'

export function saveSession(session: PackSession): void {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function loadSession(): PackSession | null {
    try {
        const raw = localStorage.getItem(SESSION_KEY)
        return raw ? JSON.parse(raw) : null
    } catch {
        return null
    }
}

export function clearSession(): void {
    localStorage.removeItem(SESSION_KEY)
}
