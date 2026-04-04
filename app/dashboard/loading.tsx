const S = {
    bg: 'rgba(255,255,255,0.06)',
    bgFaint: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadiusPill: 999,
}

export default function DashboardLoading() {
    return (
        <div className="min-h-screen animate-pulse" style={{ background: '#08080d' }}>
            {/* sticky header bar */}
            <div
                className="sticky top-0 z-40"
                style={{
                    width: '100%',
                    background: '#08080d',
                    borderBottom: '1px solid rgba(255,255,255,0.07)',
                }}
            >
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
                    {/* avatar */}
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: S.bg, flexShrink: 0 }} />

                    {/* username + streak */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                        <div style={{ height: 11, width: 80, borderRadius: 4, background: S.bg }} />
                        <div className="hidden sm:block" style={{ height: 8, width: 60, borderRadius: 4, background: S.bgFaint }} />
                    </div>

                    <div style={{ flex: 1 }} />

                    {/* coins pill */}
                    <div style={{ height: 26, width: 84, borderRadius: S.borderRadiusPill, background: S.bg, flexShrink: 0 }} />

                    {/* level badge */}
                    <div style={{ height: 26, width: 54, borderRadius: S.borderRadiusPill, background: S.bg, flexShrink: 0 }} />

                    {/* settings icon */}
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: S.bg, flexShrink: 0 }} />
                </div>
            </div>

            {/* pack selector area */}
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 16px' }}>
                {/* section heading */}
                <div style={{ height: 14, width: 100, borderRadius: 4, background: S.bg, marginBottom: 16 }} />

                {/* pack cards row */}
                <div style={{ display: 'flex', gap: 12, overflowX: 'hidden' }}>
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div
                            key={i}
                            style={{
                                flexShrink: 0,
                                width: 'clamp(120px, 22vw, 160px)',
                                aspectRatio: '3/4',
                                borderRadius: 12,
                                background: S.bgFaint,
                                border: S.border,
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}
