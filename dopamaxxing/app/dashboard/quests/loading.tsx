export default function QuestsLoading() {
    return (
        <div
            className="min-h-screen p-4"
            style={{ width: '100%', maxWidth: 680, margin: '0 auto' }}
        >
            {/* header skeleton */}
            <div className="flex justify-between items-center mb-5">
                <div>
                    <div
                        className="rounded animate-pulse"
                        style={{
                            width: 80,
                            height: 18,
                            background: 'rgba(255,255,255,0.06)',
                            marginBottom: 6,
                        }}
                    />
                    <div
                        className="rounded animate-pulse"
                        style={{
                            width: 160,
                            height: 10,
                            background: 'rgba(255,255,255,0.04)',
                        }}
                    />
                </div>
                <div
                    className="rounded animate-pulse"
                    style={{
                        width: 110,
                        height: 28,
                        background: 'rgba(255,255,255,0.04)',
                    }}
                />
            </div>

            {/* tabs skeleton */}
            <div className="flex gap-2 mb-5">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div
                        key={i}
                        className="rounded-full animate-pulse"
                        style={{
                            width: 70,
                            height: 28,
                            background: 'rgba(255,255,255,0.04)',
                            flexShrink: 0,
                        }}
                    />
                ))}
            </div>

            {/* quest card skeletons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Array.from({ length: 6 }).map((_, i) => (
                    <div
                        key={i}
                        className="animate-pulse rounded-xl"
                        style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            padding: '14px 16px',
                            display: 'flex',
                            gap: 12,
                        }}
                    >
                        <div
                            className="rounded-lg"
                            style={{
                                width: 36,
                                height: 36,
                                background: 'rgba(255,255,255,0.06)',
                                flexShrink: 0,
                            }}
                        />
                        <div style={{ flex: 1 }}>
                            <div
                                className="rounded"
                                style={{
                                    width: `${45 + (i % 3) * 20}%`,
                                    height: 13,
                                    background: 'rgba(255,255,255,0.06)',
                                    marginBottom: 8,
                                }}
                            />
                            <div
                                className="rounded"
                                style={{
                                    width: '80%',
                                    height: 10,
                                    background: 'rgba(255,255,255,0.04)',
                                    marginBottom: 10,
                                }}
                            />
                            <div
                                className="rounded"
                                style={{
                                    width: 80,
                                    height: 8,
                                    background: 'rgba(255,255,255,0.04)',
                                }}
                            />
                        </div>
                        <div
                            className="rounded-lg"
                            style={{
                                width: 72,
                                height: 28,
                                background: 'rgba(255,255,255,0.04)',
                                flexShrink: 0,
                            }}
                        />
                    </div>
                ))}
            </div>
        </div>
    )
}
