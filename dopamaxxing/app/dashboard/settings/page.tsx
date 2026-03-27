'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import LinkDiscord from '@/components/LinkDiscord'

type Theme = 'dark' | 'light'

function SectionLabel({ children }: { children: string }) {
    return (
        <p style={{
            fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'var(--app-text-muted)',
            margin: '28px 0 4px',
        }}>
            {children}
        </p>
    )
}

function FieldRow({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
    return (
        <div style={{ padding: '14px 0', borderBottom: '1px solid var(--app-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flexShrink: 0 }}>
                    <p style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--app-text)', margin: 0 }}>{label}</p>
                    {sub && <p style={{ fontSize: '0.65rem', color: 'var(--app-text-muted)', margin: '2px 0 0' }}>{sub}</p>}
                </div>
                {children}
            </div>
        </div>
    )
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            onClick={() => onChange(!on)}
            style={{
                width: 40, height: 22, borderRadius: 11, flexShrink: 0,
                background: on ? '#7c3aed' : 'rgba(255,255,255,0.08)',
                border: `1px solid ${on ? '#7c3aed' : 'rgba(255,255,255,0.12)'}`,
                cursor: 'pointer', position: 'relative', transition: 'all 250ms ease',
            }}
        >
            <div style={{
                position: 'absolute', top: 2,
                left: on ? 19 : 2,
                width: 16, height: 16, borderRadius: '50%',
                background: on ? '#fff' : '#6b7280',
                transition: 'left 250ms ease',
            }} />
        </button>
    )
}

function InlineInput({
    value, onChange, placeholder, prefix, type = 'text', disabled,
}: {
    value: string
    onChange: (v: string) => void
    placeholder?: string
    prefix?: string
    type?: string
    disabled?: boolean
}) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, flex: 1, justifyContent: 'flex-end' }}>
            {prefix && <span style={{ fontSize: '0.8rem', color: 'var(--app-text-muted)', flexShrink: 0 }}>{prefix}</span>}
            <input
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                style={{
                    background: 'var(--input-bg, rgba(255,255,255,0.05))',
                    border: '1px solid var(--input-border, rgba(255,255,255,0.1))',
                    borderRadius: 8, padding: '6px 10px',
                    fontSize: '0.78rem', color: 'var(--app-text)',
                    outline: 'none', width: 'min(180px, 40vw)', textAlign: 'right',
                    opacity: disabled ? 0.4 : 1,
                    cursor: disabled ? 'not-allowed' : 'text',
                }}
                onFocus={e => { if (!disabled) e.currentTarget.style.borderColor = 'rgba(168,85,247,0.5)' }}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--input-border, rgba(255,255,255,0.1))'}
            />
        </div>
    )
}

export default function SettingsPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const supabase = createClient()
    const [theme, setTheme] = useState<Theme>('dark')
    const [highlighted, setHighlighted] = useState<string | null>(null)
    const discordRef = useRef<HTMLDivElement>(null)
    const tutorialRef = useRef<HTMLDivElement>(null)
    const [signingOut, setSigningOut] = useState(false)
    const [saving, setSaving] = useState(false)
    const [saveMsg, setSaveMsg] = useState('')

    // avatar
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
    const [avatarUploading, setAvatarUploading] = useState(false)
    const [avatarMsg, setAvatarMsg] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)

    // profile fields
    const [username, setUsername] = useState('')
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')

    // notification toggles (mock)
    const [notifPackDrops, setNotifPackDrops] = useState(true)
    const [notifCoins, setNotifCoins] = useState(false)
    const [notifNews, setNotifNews] = useState(false)

    // connections
    const [discordLinked, setDiscordLinked] = useState(false)

    useEffect(() => {
        const saved = localStorage.getItem('theme') as Theme | null
        if (saved) applyTheme(saved, false)

        async function load() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            setEmail(user.email ?? '')
            const { data: profile } = await supabase
                .from('profiles')
                .select('username, first_name, last_name, phone, profile_url, discord_id')
                .eq('id', user.id)
                .single()
            if (profile) {
                setUsername(profile.username ?? '')
                setFirstName(profile.first_name ?? '')
                setLastName(profile.last_name ?? '')
                setPhone(profile.phone ?? '')
                setAvatarUrl(profile.profile_url ?? null)
                setDiscordLinked(!!profile.discord_id)
            }
        }
        load()
    }, [])

    // Handle ?action= param from quest redirects
    useEffect(() => {
        const action = searchParams.get('action')
        if (!action) return
        setHighlighted(action)
        setTimeout(() => {
            const ref = action === 'discord' ? discordRef : action === 'tutorial' ? tutorialRef : null
            ref?.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            if (action === 'tutorial') {
                // Auto-fire the tutorial after scrolling
                setTimeout(() => window.dispatchEvent(new Event('replay-tutorial')), 400)
            }
        }, 150)
        // Remove highlight after 3s
        const t = setTimeout(() => setHighlighted(null), 3000)
        return () => clearTimeout(t)
    }, [searchParams])

    function applyTheme(t: Theme, save = true) {
        setTheme(t)
        if (save) localStorage.setItem('theme', t)
        document.documentElement.setAttribute('data-theme', t)
    }

    async function resizeImage(file: File, maxPx = 256): Promise<Blob> {
        return new Promise((resolve, reject) => {
            const img = new window.Image()
            img.onload = () => {
                const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
                const canvas = document.createElement('canvas')
                canvas.width = Math.round(img.width * scale)
                canvas.height = Math.round(img.height * scale)
                canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
                canvas.toBlob(
                    (b) => (b ? resolve(b) : reject(new Error('canvas error'))),
                    'image/jpeg',
                    0.88,
                )
            }
            img.onerror = reject
            img.src = URL.createObjectURL(file)
        })
    }

    async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.size > 20 * 1024 * 1024) {
            setAvatarMsg('File too large — max 20 MB')
            return
        }
        setAvatarUploading(true)
        setAvatarMsg('')
        try {
            const blob = await resizeImage(file, 256)
            const form = new FormData()
            form.append('file', new File([blob], 'avatar.jpg', { type: 'image/jpeg' }))
            const res = await fetch('/api/upload-avatar', { method: 'POST', body: form })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error ?? 'Upload failed')
            setAvatarUrl(data.url)
            setAvatarMsg('Photo updated!')
            setTimeout(() => setAvatarMsg(''), 2500)
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Upload failed'
            setAvatarMsg(msg)
        }
        setAvatarUploading(false)
        e.target.value = ''
    }

    async function handleSaveProfile() {
        setSaving(true)
        setSaveMsg('')
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setSaving(false); return }

        const trimmed = username.trim().toLowerCase()
        if (trimmed.length < 3 || trimmed.length > 20 || !/^[a-zA-Z0-9_]+$/.test(trimmed)) {
            setSaveMsg('Username must be 3–20 chars, letters/numbers/underscores only.')
            setSaving(false)
            return
        }

        // check username uniqueness (skip if unchanged)
        const { data: existing } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', trimmed)
            .neq('id', user.id)
            .maybeSingle()
        if (existing) {
            setSaveMsg('Username already taken.')
            setSaving(false)
            return
        }

        const { error } = await supabase
            .from('profiles')
            .update({
                username: trimmed,
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                phone: phone.trim() || null,
            })
            .eq('id', user.id)

        if (error) {
            setSaveMsg('Error saving: ' + error.message)
        } else {
            setSaveMsg('Saved!')
            setTimeout(() => setSaveMsg(''), 2500)
        }
        setSaving(false)
    }

    async function handleSignOut() {
        setSigningOut(true)
        localStorage.clear()
        await supabase.auth.signOut()
        router.push('/')
    }

    return (
        <div style={{ maxWidth: 520, margin: '0 auto', padding: '32px 20px 120px' }}>
            <h1 style={{
                fontSize: '1.2rem', fontWeight: 700, color: 'var(--app-text)',
                margin: '0 0 4px', letterSpacing: '-0.02em',
            }}>
                Settings
            </h1>
            <p style={{ fontSize: '0.72rem', color: 'var(--app-text-muted)', margin: 0 }}>
                preferences &amp; account
            </p>

            {/* ── profile ── */}
            <SectionLabel>Profile</SectionLabel>
            <div style={{
                background: 'var(--app-surface-2)',
                border: '1px solid var(--app-border)',
                borderRadius: 12, padding: '0 16px',
            }}>
                <FieldRow label="Photo" sub="Shown on your profile">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {avatarMsg && (
                            <span style={{
                                fontSize: '0.68rem',
                                color: avatarMsg === 'Photo updated!' ? '#4ade80' : '#f87171',
                            }}>
                                {avatarMsg}
                            </span>
                        )}
                        <button
                            className="avatar-upload-btn"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={avatarUploading}
                            style={{
                                position: 'relative', width: 48, height: 48,
                                borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                                border: '2px solid rgba(255,255,255,0.12)',
                                cursor: avatarUploading ? 'not-allowed' : 'pointer',
                                background: 'rgba(255,255,255,0.06)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                        >
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt="avatar"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
                                />
                            ) : (
                                <span style={{ fontSize: '1.2rem', color: '#9ca3af' }}>?</span>
                            )}
                            {/* spinner while uploading */}
                            {avatarUploading && (
                                <div style={{
                                    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <svg style={{ animation: 'landing-spin 0.8s linear infinite' }} width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round">
                                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                    </svg>
                                </div>
                            )}
                            {/* upload icon on hover */}
                            <div className="avatar-hover-overlay" style={{
                                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                opacity: 0, transition: 'opacity 200ms',
                            }}>
                                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="17 8 12 3 7 8" />
                                    <line x1="12" y1="3" x2="12" y2="15" />
                                </svg>
                            </div>
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handleAvatarChange}
                        />
                    </div>
                </FieldRow>
                <FieldRow label="Username" sub="Visible to others">
                    <InlineInput value={username} onChange={setUsername} placeholder="yourname" prefix="@" />
                </FieldRow>
                <FieldRow label="First name">
                    <InlineInput value={firstName} onChange={setFirstName} placeholder="First" />
                </FieldRow>
                <FieldRow label="Last name">
                    <InlineInput value={lastName} onChange={setLastName} placeholder="Last" />
                </FieldRow>
                <FieldRow label="Email" sub="Managed by your auth provider">
                    <InlineInput value={email} onChange={setEmail} placeholder="you@email.com" type="email" disabled />
                </FieldRow>
                <FieldRow label="Phone" sub="Optional — not shared">
                    <InlineInput value={phone} onChange={setPhone} placeholder="+1 555 000 0000" type="tel" />
                </FieldRow>

                <div style={{ padding: '14px 0', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
                    {saveMsg && (
                        <span style={{
                            fontSize: '0.72rem',
                            color: saveMsg === 'Saved!' ? '#4ade80' : '#f87171',
                        }}>
                            {saveMsg}
                        </span>
                    )}
                    <button
                        onClick={handleSaveProfile}
                        disabled={saving}
                        style={{
                            padding: '7px 20px', borderRadius: 8,
                            fontSize: '0.75rem', fontWeight: 600,
                            cursor: saving ? 'not-allowed' : 'pointer',
                            background: saving ? 'rgba(255,255,255,0.04)' : 'rgba(168,85,247,0.15)',
                            border: `1px solid ${saving ? 'rgba(255,255,255,0.08)' : 'rgba(168,85,247,0.35)'}`,
                            color: saving ? 'var(--app-text-muted)' : '#c084fc',
                            transition: 'all 200ms ease',
                        }}
                    >
                        {saving ? 'Saving…' : 'Save changes'}
                    </button>
                </div>
            </div>

            {/* ── notifications ── */}
            <SectionLabel>Notifications</SectionLabel>
            <div style={{
                background: 'var(--app-surface-2)',
                border: '1px solid var(--app-border)',
                borderRadius: 12, padding: '0 16px',
            }}>
                <FieldRow label="Pack drops" sub="Email me when a Discord drop lands">
                    <Toggle on={notifPackDrops} onChange={setNotifPackDrops} />
                </FieldRow>
                <FieldRow label="Coin rewards" sub="Email me on large coin awards">
                    <Toggle on={notifCoins} onChange={setNotifCoins} />
                </FieldRow>
                <FieldRow label="News &amp; updates" sub="Product announcements">
                    <Toggle on={notifNews} onChange={setNotifNews} />
                </FieldRow>
                <div style={{ padding: '10px 0' }}>
                    <p style={{ fontSize: '0.62rem', color: 'var(--app-text-muted)', margin: 0 }}>
                        Email notifications coming soon.
                    </p>
                </div>
            </div>

            {/* ── appearance ── */}
            <SectionLabel>Appearance</SectionLabel>
            <div style={{
                background: 'var(--app-surface-2)',
                border: '1px solid var(--app-border)',
                borderRadius: 12, padding: '0 16px',
            }}>
                <FieldRow label="Theme" sub="Choose how Dopamaxxing looks">
                    <div style={{
                        display: 'flex',
                        background: 'var(--app-surface-3)',
                        border: '1px solid var(--app-border)',
                        borderRadius: 8, padding: 3, gap: 3,
                    }}>
                        {(['dark', 'light'] as Theme[]).map((t) => (
                            <button
                                key={t}
                                onClick={() => applyTheme(t)}
                                style={{
                                    padding: '5px 14px', borderRadius: 6,
                                    fontSize: '0.72rem', fontWeight: 500,
                                    cursor: 'pointer',
                                    background: theme === t ? 'var(--app-surface-3)' : 'transparent',
                                    border: theme === t ? '1px solid var(--app-border-2)' : '1px solid transparent',
                                    color: theme === t ? 'var(--app-text)' : 'var(--app-text-muted)',
                                    transition: 'all 200ms ease',
                                    textTransform: 'capitalize',
                                }}
                            >
                                {t === 'dark' ? (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                                        </svg>
                                        Dark
                                    </span>
                                ) : (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="5" />
                                            <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                                            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                                            <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                                            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                                        </svg>
                                        Light
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </FieldRow>
            </div>

            {/* ── connections ── */}
            <SectionLabel>Connections</SectionLabel>
            <div
                ref={discordRef}
                style={{
                    background: 'var(--app-surface-2)',
                    border: highlighted === 'discord' ? '1px solid #5865f2' : '1px solid var(--app-border)',
                    borderRadius: 12, padding: '0 16px',
                    boxShadow: highlighted === 'discord' ? '0 0 0 3px rgba(88,101,242,0.25)' : 'none',
                    transition: 'border-color 300ms, box-shadow 300ms',
                }}
            >
                <FieldRow
                    label="Discord"
                    sub={discordLinked ? 'Already linked' : 'Link your Discord to unlock quests & drops'}
                >
                    <LinkDiscord discordLinked={discordLinked} />
                </FieldRow>
            </div>

            {/* ── account ── */}
            <SectionLabel>Account</SectionLabel>
            <div style={{
                background: 'var(--app-surface-2)',
                border: '1px solid var(--app-border)',
                borderRadius: 12, padding: '0 16px',
            }}>
                <FieldRow label="Sign out" sub="Clears your session and local data">
                    <button
                        onClick={handleSignOut}
                        disabled={signingOut}
                        style={{
                            padding: '7px 16px', borderRadius: 8,
                            fontSize: '0.75rem', fontWeight: 600,
                            cursor: signingOut ? 'not-allowed' : 'pointer',
                            background: 'rgba(239,68,68,0.08)',
                            border: '1px solid rgba(239,68,68,0.2)',
                            color: signingOut ? 'var(--app-text-muted)' : '#f87171',
                            transition: 'all 200ms ease',
                            whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={(e) => {
                            if (!signingOut) {
                                e.currentTarget.style.background = 'rgba(239,68,68,0.15)'
                                e.currentTarget.style.borderColor = 'rgba(239,68,68,0.35)'
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(239,68,68,0.08)'
                            e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'
                        }}
                    >
                        {signingOut ? 'Signing out…' : 'Sign out'}
                    </button>
                </FieldRow>
            </div>

            {/* ── help ── */}
            <SectionLabel>Help</SectionLabel>
            <div
                ref={tutorialRef}
                style={{
                    background: 'var(--app-surface-2)',
                    border: highlighted === 'tutorial' ? '1px solid #a78bfa' : '1px solid var(--app-border)',
                    borderRadius: 12, padding: '0 16px',
                    boxShadow: highlighted === 'tutorial' ? '0 0 0 3px rgba(167,139,250,0.25)' : 'none',
                    transition: 'border-color 300ms, box-shadow 300ms',
                }}
            >
                <FieldRow label="Tutorial" sub="Replay the intro walkthrough">
                    <button
                        onClick={() => window.dispatchEvent(new Event('replay-tutorial'))}
                        style={{
                            fontSize: '0.72rem', fontWeight: 600,
                            padding: '5px 14px', borderRadius: 8, cursor: 'pointer',
                            background: 'rgba(124,58,237,0.1)',
                            border: '1px solid rgba(124,58,237,0.3)',
                            color: '#a78bfa',
                        }}
                    >
                        Replay
                    </button>
                </FieldRow>
            </div>

            {/* ── about ── */}
            <SectionLabel>About</SectionLabel>
            <div style={{
                background: 'var(--app-surface-2)',
                border: '1px solid var(--app-border)',
                borderRadius: 12, padding: '0 16px',
            }}>
                <FieldRow label="Dopamaxxing" sub="Collect Pokémon cards. Chase the dopamine.">
                    <span style={{ fontSize: '0.65rem', color: 'var(--app-text-muted)' }}>v0.1</span>
                </FieldRow>
            </div>
        </div>
    )
}
