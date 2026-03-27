export default function BagLoading() {
    return (
        <div
            className="min-h-screen"
            style={{ background: '#08080d', padding: '20px 16px' }}
        >
            {/* filter bar skeleton */}
            <div className="flex gap-2 mb-5 animate-pulse flex-wrap">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div
                        key={i}
                        style={{
                            height: 28,
                            width: 64,
                            borderRadius: 999,
                            background: 'rgba(255,255,255,0.06)',
                        }}
                    />
                ))}
            </div>

            {/* card grid skeleton */}
            <div
                className="grid animate-pulse"
                style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12 }}
            >
                {Array.from({ length: 20 }).map((_, i) => (
                    <div
                        key={i}
                        style={{
                            borderRadius: 12,
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            aspectRatio: '2/3',
                        }}
                    />
                ))}
            </div>
        </div>
    )
}
