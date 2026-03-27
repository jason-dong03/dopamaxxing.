export default function BindersLoading() {
    return (
        <div
            style={{
                minHeight: 'calc(100vh - 64px)',
                background: 'var(--app-bg)',
                padding: '24px 20px',
                maxWidth: 700,
                margin: '0 auto',
            }}
        >
            {/* Header skeleton */}
            <div style={{ marginBottom: 24 }}>
                <div style={{ width: 120, height: 22, borderRadius: 6, background: 'rgba(255,255,255,0.07)', marginBottom: 6 }} />
                <div style={{ width: 60, height: 14, borderRadius: 4, background: 'rgba(255,255,255,0.04)' }} />
            </div>
            {/* Grid skeleton */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {Array.from({ length: 6 }).map((_, i) => (
                    <div
                        key={i}
                        style={{
                            aspectRatio: '3/4',
                            borderRadius: 10,
                            background: 'rgba(255,255,255,0.05)',
                            animation: `pulse 1.4s ease-in-out ${i * 0.08}s infinite`,
                        }}
                    />
                ))}
            </div>
            <style>{`@keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:1} }`}</style>
        </div>
    )
}
