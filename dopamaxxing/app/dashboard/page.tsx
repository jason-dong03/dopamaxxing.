import Link from 'next/link'
import PackSelector from '@/components/PackSelector'
import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'
import { xpForLevel } from '@/lib/rarityConfig'
import { getActiveEvents } from '@/lib/dailyEvents'
import EventBanner from '@/components/ui/EventBanner'
import PassiveCoins from '@/components/ui/PassiveCoins'
import LinkDiscord from '@/components/LinkDiscord'
import DropsButton from '@/components/DropsButton'
import CoinDisplay from '@/components/ui/CoinDisplay'
import LiberatorEasterEgg from '@/components/LiberatorEasterEgg'
import { getTitleColor } from '@/lib/titleConfig'

export default async function Dashboard() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    const { data: profile } = await supabase
        .from('profiles')
        .select(
            'username, first_name, last_name, profile_url, coins, xp, level, discord_id, active_title, is_admin, login_streak',
        )
        .eq('id', user?.id)
        .single()

    const level = profile?.level ?? 1
    const xp = profile?.xp ?? 0
    const xpNeeded = xpForLevel(level)
    const xpPct = Math.min((xp / xpNeeded) * 100, 100)

    return (
        <div className="min-h-screen">
            <PassiveCoins />
            {/* ── profile island ── */}
            <div
                style={{
                    width: '100%',
                    background: 'var(--app-bg)',
                    borderBottom: '1px solid var(--app-border)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 40,
                    overflow: 'hidden',
                }}
            >
                {/* main row */}
                <div
                    style={{
                        maxWidth: 1100,
                        margin: '0 auto',
                        padding: '0 16px',
                        height: 50,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                    }}
                >
                    {/* brand */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            flexShrink: 0,
                            marginRight: 4,
                        }}
                    >
                        <LiberatorEasterEgg>
                            <span
                                style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 800,
                                    color: 'var(--app-text)',
                                    letterSpacing: '-0.02em',
                                }}
                            >
                                dopamaxxing.
                            </span>
                        </LiberatorEasterEgg>
                        {/* subtle hint — barely visible, only noticeable if you're looking */}
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

                    <div
                        style={{
                            width: 1,
                            height: 20,
                            background: 'var(--app-border)',
                            flexShrink: 0,
                        }}
                    />

                    {profile?.profile_url && (
                        <Image
                            src={profile.profile_url}
                            alt="avatar"
                            width={26}
                            height={26}
                            style={{
                                borderRadius: '50%',
                                flexShrink: 0,
                                opacity: 0.9,
                            }}
                        />
                    )}

                    <div style={{ lineHeight: 1.2, minWidth: 0, overflow: 'hidden' }}>
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
                                    maxWidth: '20vw',
                                }}
                            >
                                {profile?.username ?? 'Trainer'}
                            </p>
                            {profile?.active_title && (
                                <span
                                    style={{
                                        fontSize: '0.6rem',
                                        fontWeight: 600,
                                        color: getTitleColor(profile.active_title),
                                        whiteSpace: 'nowrap',
                                        flexShrink: 0,
                                    }}
                                >
                                    {profile.active_title}
                                </span>
                            )}
                            {(profile?.login_streak ?? 0) > 1 && (
                                <span
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 2,
                                        fontSize: '0.62rem',
                                        fontWeight: 700,
                                        color: '#fb923c',
                                        background: 'rgba(251,146,60,0.1)',
                                        border: '1px solid rgba(251,146,60,0.25)',
                                        borderRadius: 20,
                                        padding: '1px 7px',
                                        whiteSpace: 'nowrap',
                                        flexShrink: 0,
                                    }}
                                >
                                    🔥 {profile?.login_streak}
                                </span>
                            )}
                        </div>
                        {(profile?.first_name || profile?.last_name) && (
                            <p
                                className="hidden sm:block"
                                style={{
                                    fontSize: '0.58rem',
                                    color: 'var(--app-text-faint)',
                                    margin: 0,
                                    letterSpacing: '1px',
                                }}
                            >
                                @{[profile.first_name, profile.last_name].filter(Boolean).join(' ')}
                            </p>
                        )}
                    </div>

                    <div style={{ flex: 1 }} />

                    {profile?.is_admin && (
                        <a
                            href="/admin"
                            className="admin-pill"
                            style={{
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                color: '#94a3b8',
                                background: 'var(--app-surface-2)',
                                border: '1px solid var(--app-border)',
                                borderRadius: 20,
                                padding: '3px 10px',
                                textDecoration: 'none',
                                letterSpacing: '0.05em',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                            }}
                        >
                            ADMIN
                        </a>
                    )}

                    <LinkDiscord discordLinked={!!profile?.discord_id} />

                    {/* coins */}
                    <CoinDisplay initialCoins={Number(profile?.coins ?? 0)} />

                    {/* level + xp bar */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            flexShrink: 0,
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'baseline',
                                gap: 2,
                                background: 'var(--app-surface-2)',
                                border: '1px solid var(--app-border)',
                                borderRadius: 20,
                                padding: '3px 10px',
                            }}
                        >
                            <span
                                style={{
                                    fontSize: '0.6rem',
                                    fontWeight: 500,
                                    color: 'var(--app-text-muted)',
                                }}
                            >
                                Lv
                            </span>
                            <span
                                style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    color: 'var(--lv-green)',
                                }}
                            >
                                {level}
                            </span>
                        </div>
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-end',
                                gap: 3,
                                position: 'relative',
                                top: 5,
                            }}
                        >
                            <div
                                style={{
                                    width: 100,
                                    height: 5,
                                    borderRadius: 3,
                                    background: 'var(--app-border)',
                                    overflow: 'hidden',
                                }}
                            >
                                <div
                                    style={{
                                        height: '100%',
                                        width: `${xpPct}%`,
                                        background: 'var(--lv-green)',
                                        borderRadius: 3,
                                        transition: 'width 600ms ease',
                                    }}
                                />
                            </div>
                            <span
                                style={{
                                    fontSize: '0.5rem',
                                    color: 'var(--app-text-muted)',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {xp} / {xpNeeded} XP
                            </span>
                        </div>
                    </div>

                    {/* settings */}
                    <Link
                        href="/dashboard/settings"
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                            background: 'var(--app-surface-2)',
                            border: '1px solid var(--app-border)',
                            color: '#475569',
                        }}
                        title="Settings"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M6 4v10m0 0a2 2 0 1 0 0 4m0-4a2 2 0 1 1 0 4m0 0v2m6-16v2m0 0a2 2 0 1 0 0 4m0-4a2 2 0 1 1 0 4m0 0v10m6-16v10m0 0a2 2 0 1 0 0 4m0-4a2 2 0 1 1 0 4m0 0v2"/>
                        </svg>
                    </Link>
                </div>
            </div>

            {/* daily event banner */}
            <EventBanner events={await getActiveEvents()} />
            <DropsButton />

            <PackSelector coins={profile?.coins ?? 0} />
        </div>
    )
}
