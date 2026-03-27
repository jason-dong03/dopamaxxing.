export default function ProfileLoading() {
    return (
        <div
            className="flex gap-5 items-center justify-center"
            style={{
                minHeight: 'calc(100vh - 64px)',
                background: '#08080d',
                padding: '20px 24px',
            }}
        >
            {/* left: viewer + tags */}
            <div className="flex flex-col flex-shrink-0 animate-pulse" style={{ width: 300, gap: 12 }}>
                <div
                    className="rounded-2xl"
                    style={{ width: 300, height: 460, background: 'rgba(255,255,255,0.04)' }}
                />
                <div style={{ height: 22, width: 160, borderRadius: 6, background: 'rgba(255,255,255,0.06)' }} />
                <div className="flex gap-2">
                    <div style={{ height: 20, width: 64, borderRadius: 6, background: 'rgba(255,255,255,0.06)' }} />
                    <div style={{ height: 20, width: 64, borderRadius: 6, background: 'rgba(255,255,255,0.06)' }} />
                </div>
                <div style={{ height: 28, width: 120, borderRadius: 999, background: 'rgba(255,255,255,0.04)' }} />
            </div>

            {/* right: info panel */}
            <div
                className="flex flex-col rounded-2xl animate-pulse"
                style={{
                    width: 340,
                    minHeight: 580,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    padding: '24px 22px',
                    gap: 20,
                    flexShrink: 0,
                }}
            >
                {/* avatar + name */}
                <div className="flex items-center gap-3">
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
                    <div className="flex flex-col gap-2">
                        <div style={{ height: 16, width: 120, borderRadius: 6, background: 'rgba(255,255,255,0.08)' }} />
                        <div style={{ height: 12, width: 80, borderRadius: 6, background: 'rgba(255,255,255,0.05)' }} />
                    </div>
                </div>
                {/* xp bar */}
                <div className="rounded-xl" style={{ height: 72, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
                {/* sections */}
                {[80, 100, 140].map((h, i) => (
                    <div key={i} className="rounded-xl" style={{ height: h, background: 'rgba(255,255,255,0.03)' }} />
                ))}
            </div>
        </div>
    )
}
