'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { xpForLevel } from '@/lib/rarityConfig'
import { getTitleColor } from '@/lib/titleConfig'
import { useProfile } from '@/lib/userStore'
import CoinDisplay from './CoinDisplay'
import BRDisplay from './BRDisplay'
import StashButton from './StashButton'
import LiberatorEasterEgg from '@/components/LiberatorEasterEgg'

export default function DashboardHeader() {
    const { profile, loading } = useProfile()
    const [mobileExpanded, setMobileExpanded] = useState(false)

    const level    = profile?.level ?? 1
    const xp       = profile?.xp ?? 0
    const xpNeeded = xpForLevel(level)
    const xpPct    = Math.min((xp / xpNeeded) * 100, 100)
    const streak   = profile?.login_streak ?? 0
    const title    = profile?.active_title ?? null

    return (
        <div
            style={{
                width: '100%',
                background: 'var(--app-bg)',
                borderBottom: '1px solid var(--app-border)',
                zIndex: 40,
                flexShrink: 0,
                position: 'relative',
            }}
        >
            {/* ── main row ── */}
            <div
                style={{
                    width: '100%',
                    padding: '0 16px',
                    height: 50,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                }}
            >
                {/* left: brand + avatar + username */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                    <div
                        className="hidden sm:flex"
                        style={{ flexDirection: 'column', alignItems: 'flex-start', flexShrink: 0, marginRight: 4 }}
                    >
                        <LiberatorEasterEgg>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--app-text)', letterSpacing: '-0.02em' }}>
                                dopamaxxing.
                            </span>
                        </LiberatorEasterEgg>
                        <span
                            style={{
                                fontSize: '0.38rem',
                                color: 'var(--app-text)',
                                opacity: 0.18,
                                letterSpacing: '0.15em',
                                fontFamily: 'monospace',
                                lineHeight: 1,
                                marginTop: 1,
                                userSelect: 'none',
                            }}
                        >
                            vii
                        </span>
                    </div>

                    <div className="hidden sm:block" style={{ width: 1, height: 20, background: 'var(--app-border)', flexShrink: 0 }} />

                    {loading ? (
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />
                    ) : profile?.profile_url ? (
                        <Image
                            src={profile.profile_url}
                            alt="avatar"
                            width={26}
                            height={26}
                            style={{ borderRadius: '50%', flexShrink: 0, opacity: 0.9 }}
                        />
                    ) : null}

                    {/* username + title + streak */}
                    <div style={{ lineHeight: 1.2, minWidth: 0, overflow: 'hidden' }}>
                        {/* row 1: username + desktop title/streak */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap' }}>
                            <p
                                style={{
                                    fontSize: '0.78rem',
                                    fontWeight: 600,
                                    color: 'var(--app-text-dim)',
                                    margin: 0,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    maxWidth: 'clamp(80px, 35vw, 200px)',
                                }}
                            >
                                {loading ? '' : (profile?.username ?? 'Trainer')}
                            </p>

                            {/* desktop: title inline */}
                            {title && (
                                <span
                                    className="hidden sm:inline"
                                    style={{ fontSize: '0.6rem', fontWeight: 600, color: getTitleColor(title), whiteSpace: 'nowrap', flexShrink: 0 }}
                                >
                                    {title}
                                </span>
                            )}

                            {/* desktop: full streak pill */}
                            {streak > 1 && (
                                <span
                                    className="hidden sm:inline-flex"
                                    style={{
                                        alignItems: 'center', gap: 2,
                                        fontSize: '0.62rem', fontWeight: 700, color: '#fb923c',
                                        background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.25)',
                                        borderRadius: 20, padding: '1px 7px', whiteSpace: 'nowrap', flexShrink: 0,
                                    }}
                                >
                                    🔥 {streak}
                                </span>
                            )}

                            {/* mobile: truncated streak (fire + number only) */}
                            {streak > 1 && (
                                <span
                                    className="sm:hidden"
                                    style={{ fontSize: '0.65rem', fontWeight: 700, color: '#fb923c', flexShrink: 0 }}
                                >
                                    🔥 {streak}
                                </span>
                            )}
                        </div>

                        {/* mobile row 2: title below username */}
                        {title && (
                            <p
                                className="sm:hidden"
                                style={{
                                    fontSize: '0.55rem',
                                    fontWeight: 600,
                                    color: getTitleColor(title),
                                    margin: 0,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}
                            >
                                {title}
                            </p>
                        )}

                        {(profile?.first_name || profile?.last_name) && (
                            <p
                                className="hidden sm:block"
                                style={{ fontSize: '0.58rem', color: 'var(--app-text-faint)', margin: 0, letterSpacing: '1px' }}
                            >
                                @{[profile?.first_name, profile?.last_name].filter(Boolean).join(' ')}
                            </p>
                        )}
                    </div>

                    <div className="sm:hidden" style={{ flex: 1 }} />
                </div>

                {/* right: admin + BR + stash + coins + level/XP + settings */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, justifyContent: 'flex-end' }}>
                    {profile?.is_admin && (
                        <a
                            href="/admin"
                            className="hidden sm:contents admin-pill"
                            style={{
                                fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8',
                                background: 'var(--app-surface-2)', border: '1px solid var(--app-border)',
                                borderRadius: 20, padding: '3px 10px', textDecoration: 'none',
                                letterSpacing: '0.05em', whiteSpace: 'nowrap', flexShrink: 0,
                            }}
                        >
                            ADMIN
                        </a>
                    )}

                    <BRDisplay initialBP={profile?.battle_power ?? 0} />

                    <span className="hidden sm:contents">
                        <StashButton />
                    </span>

                    <CoinDisplay initialCoins={profile?.coins ?? 0} />

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <div
                            style={{
                                display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 2,
                                background: 'var(--app-surface-2)', border: '1px solid var(--app-border)',
                                borderRadius: 20, padding: '3px 14px 3px 10px',
                            }}
                        >
                            <span style={{ fontSize: '0.6rem', fontWeight: 500, color: 'var(--app-text-muted)' }}>Lv</span>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--lv-green)' }}>
                                {loading ? '–' : level}
                            </span>
                        </div>
                        <div
                            className="hidden sm:flex"
                            style={{ flexDirection: 'column', alignItems: 'flex-end', gap: 3, position: 'relative', top: 5 }}
                        >
                            <div style={{ width: 100, height: 5, borderRadius: 3, background: 'var(--app-border)', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${xpPct}%`, background: 'var(--lv-green)', borderRadius: 3, transition: 'width 600ms ease' }} />
                            </div>
                            <span
                                className="hidden sm:flex"
                                style={{ fontSize: '0.5rem', color: 'var(--app-text-muted)', whiteSpace: 'nowrap' }}
                            >
                                {loading ? '' : `${xp} / ${xpNeeded} XP`}
                            </span>
                        </div>
                    </div>

                    <Link
                        href="/dashboard/settings"
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                            background: 'var(--app-surface-2)', border: '1px solid var(--app-border)',
                            color: '#475569',
                        }}
                        title="Settings"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M6 4v10m0 0a2 2 0 1 0 0 4m0-4a2 2 0 1 1 0 4m0 0v2m6-16v2m0 0a2 2 0 1 0 0 4m0-4a2 2 0 1 1 0 4m0 0v10m6-16v10m0 0a2 2 0 1 0 0 4m0-4a2 2 0 1 1 0 4m0 0v2" />
                        </svg>
                    </Link>
                </div>
            </div>

            {/* ── mobile expand toggle — centered on bottom border ── */}
            <button
                className="sm:hidden"
                onClick={() => setMobileExpanded(v => !v)}
                style={{
                    position: 'absolute',
                    bottom: -11,
                    left: '50%',
                    transform: mobileExpanded ? 'translateX(-50%) rotate(180deg)' : 'translateX(-50%)',
                    background: 'var(--app-bg)',
                    border: '1px solid var(--app-border)',
                    borderRadius: 20,
                    cursor: 'pointer',
                    color: 'var(--app-text-muted)',
                    padding: '1px 10px',
                    fontSize: '0.6rem',
                    lineHeight: 1,
                    zIndex: 1,
                    transition: 'transform 200ms ease',
                }}
            >
                ▾
            </button>

            {/* ── mobile expanded row ── */}
            {mobileExpanded && (
                <div
                    className="sm:hidden"
                    style={{
                        borderTop: '1px solid var(--app-border)',
                        padding: '8px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                    }}
                >
                    <StashButton />
                    {profile?.is_admin && (
                        <a
                            href="/admin"
                            className="admin-pill"
                            style={{
                                fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8',
                                background: 'var(--app-surface-2)', border: '1px solid var(--app-border)',
                                borderRadius: 20, padding: '3px 10px', textDecoration: 'none',
                                letterSpacing: '0.05em', whiteSpace: 'nowrap',
                            }}
                        >
                            ADMIN
                        </a>
                    )}
                </div>
            )}
        </div>
    )
}
