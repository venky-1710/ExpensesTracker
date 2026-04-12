import React from 'react';

/**
 * Inline SVG sparkline — a smooth polyline drawn from an array of numbers.
 * No external dependencies.
 */
const KPISparkline = ({ data = [], color = '#6d4aff', width = 100, height = 40 }) => {
    if (!data || data.length < 2) {
        // Draw a flat line as placeholder
        const y = height / 2;
        return (
            <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
                <line x1={0} y1={y} x2={width} y2={y} stroke={color} strokeWidth={1.5} strokeOpacity={0.4} />
            </svg>
        );
    }

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const padding = 4;
    const chartW = width - padding * 2;
    const chartH = height - padding * 2;

    const points = data.map((v, i) => {
        const x = padding + (i / (data.length - 1)) * chartW;
        const y = padding + chartH - ((v - min) / range) * chartH;
        return [x, y];
    });

    const polylinePoints = points.map(([x, y]) => `${x},${y}`).join(' ');

    // Build fill gradient path (close the shape under the line)
    const fillPath = [
        `M ${points[0][0]},${height}`,
        ...points.map(([x, y]) => `L ${x},${y}`),
        `L ${points[points.length - 1][0]},${height}`,
        'Z'
    ].join(' ');

    const gradientId = `spark-${color.replace('#', '')}-${Math.random().toString(36).slice(2, 6)}`;

    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} overflow="visible">
            <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                </linearGradient>
            </defs>
            {/* Fill */}
            <path d={fillPath} fill={`url(#${gradientId})`} />
            {/* Line */}
            <polyline
                points={polylinePoints}
                fill="none"
                stroke={color}
                strokeWidth={1.8}
                strokeLinejoin="round"
                strokeLinecap="round"
            />
        </svg>
    );
};

export default KPISparkline;
