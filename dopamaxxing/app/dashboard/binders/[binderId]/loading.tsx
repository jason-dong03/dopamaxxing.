export default function BinderDetailLoading() {
    return (
        <div
            style={{
                minHeight: 'calc(100vh - 64px)',
                background: 'var(--app-bg)',
                padding: '20px 16px 40px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
            }}
        >
            {/* Top bar skeleton */}
            <div style={{ width: '100%', maxWidth: 580, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 60, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.07)' }} />
                <div style={{ flex: 1 }} />
                <div style={{ width: 50, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.07)' }} />
            </div>
            {/* Binder skeleton */}
            <div
                style={{
                    width: '100%',
                    maxWidth: 580,
                    height: 600,
                    borderRadius: 14,
                    background: 'rgba(255,255,255,0.05)',
                    animation: 'pulse 1.4s ease-in-out infinite',
                    display: 'flex',
                    overflow: 'hidden',
                }}
            >
                {/* Spine */}
                <div style={{ width: 44, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />
                {/* Cover area */}
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)' }} />
            </div>
            <style>{`@keyframes pulse { 0%,100%{opacity:.45} 50%{opacity:.9} }`}</style>
        </div>
    )
}
