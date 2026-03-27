function ArcText({ text, radius, fontSize, color, size }: { text: string; radius: number; fontSize: number; color: string; size: number }) {
    // Arc text along the top of the circle using SVG textPath
    const cx = size / 2
    const cy = size / 2
    const r = radius
    const startAngle = -140 // degrees, start of arc
    const endAngle = -40   // degrees, end of arc
    const start = {
        x: cx + r * Math.cos((startAngle * Math.PI) / 180),
        y: cy + r * Math.sin((startAngle * Math.PI) / 180),
    }
    const end = {
        x: cx + r * Math.cos((endAngle * Math.PI) / 180),
        y: cy + r * Math.sin((endAngle * Math.PI) / 180),
    }
    const d = `M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`
    return (
        <svg
            width={size}
            height={size}
            style={{ position: 'absolute', top: 0, left: '-1.5%', pointerEvents: 'none', zIndex: 2, overflow: 'visible' }}
        >
            <defs>
                <path id={`arc-${size}`} d={d} />
            </defs>
            <text
                style={{ fontSize, fontWeight: 800, fontFamily: 'system-ui, sans-serif', fill: color, letterSpacing: '0.12em' }}
            >
                <textPath href={`#arc-${size}`} startOffset="50%" textAnchor="middle">
                    {text}
                </textPath>
            </text>
        </svg>
    )
}

export default function FirstEditionBadge({
    variant,
    side = 'right',
}: {
    variant: 'tile' | 'detail'
    side?: 'left' | 'right'
}) {
    if (variant === 'tile') {
        return (
            <div
                style={{
                    position: 'absolute',
                    bottom: 6,
                    ...(side === 'left' ? { left: 6 } : { right: 6 }),
                    zIndex: 10,
                    width: 46,
                    height: 46,
                    borderRadius: '50%',
                    background:
                        'radial-gradient(circle at 38% 32%, rgba(255,210,60,0.22) 0%, rgba(10,6,0,0.72) 70%)',
                    border: '1.5px solid rgba(220,170,40,0.75)',
                    boxShadow:
                        '0 0 10px rgba(220,160,20,0.65), 0 0 4px rgba(255,200,50,0.4), inset 0 0 10px rgba(0,0,0,0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0,
                    pointerEvents: 'none',
                    userSelect: 'none',
                    overflow: 'visible',
                    backdropFilter: 'blur(2px)',
                    WebkitBackdropFilter: 'blur(2px)',
                }}
            >
                <ArcText text="EDITION" radius={17} fontSize={5.5} color="rgba(200,160,40,0.9)" size={46} />
                <span
                    style={{
                        fontSize: '1.6rem',
                        fontWeight: 900,
                        color: '#f5cc45',
                        fontFamily: 'Georgia, "Times New Roman", serif',
                        lineHeight: 1,
                        textShadow:
                            '0 0 8px rgba(255,210,50,0.95), 0 0 2px rgba(255,180,0,0.7)',
                        position: 'absolute',
                        top: '42%',
                        left: '48.5%',
                        transform: 'translate(-50%, -50%) scaleY(1.5)',
                        zIndex: 1,
                    }}
                >
                    1
                </span>
                {/* clip layer keeps shimmer inside the circle */}
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden', pointerEvents: 'none' }}>
                    <div className="first-ed-gleam-sweep" />
                </div>
            </div>
        )
    }

    // detail variant — circular seal
    return (
        <div
            style={{
                position: 'absolute',
                bottom: 14,
                ...(side === 'left' ? { left: 10 } : { right: 10 }),
                zIndex: 10,
                width: 52,
                height: 52,
                borderRadius: '50%',
                background:
                    'radial-gradient(circle at 40% 35%, #2a1800 0%, #120b00 70%)',
                border: '2px solid #c8a030',
                boxShadow:
                    '0 0 10px rgba(200,160,48,0.7), 0 0 3px rgba(200,160,48,0.4), inset 0 0 8px rgba(0,0,0,0.8)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                pointerEvents: 'none',
                userSelect: 'none',
                overflow: 'visible',
            }}
        >
            <ArcText text="EDITION" radius={19} fontSize={6} color="rgba(180,140,30,0.9)" size={52} />
            <span
                style={{
                    fontSize: '1.9rem',
                    fontWeight: 900,
                    color: '#f0c84a',
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    lineHeight: 1,
                    letterSpacing: '-0.05em',
                    textShadow: '0 0 8px rgba(240,200,74,0.9)',
                    position: 'absolute',
                    top: '42%',
                    left: '49%',
                    transform: 'translate(-50%, -50%) scaleY(1.5)',
                    zIndex: 1,
                }}
            >
                1
            </span>
            {/* clip layer keeps shimmer inside the circle */}
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden', pointerEvents: 'none' }}>
                <div className="first-ed-gleam-sweep" />
            </div>
        </div>
    )
}
