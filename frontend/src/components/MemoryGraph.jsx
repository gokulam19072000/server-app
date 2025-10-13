import React from 'react';

// This component simulates a memory usage history graph using inline SVG
const MemoryGraph = ({ usageHistory }) => {
    // Check if history is meaningful (more than 1 point to draw a line)
    if (!usageHistory || usageHistory.length < 2) {
        return <div className="graph-placeholder">Run a full health check multiple times to see usage history.</div>;
    }

    const width = 450;
    const height = 150;
    const padding = 20;

    // Normalize data: Scale usage values (0 to 100%) to fit graph height
    const points = usageHistory.map((d, i) => {
        // X: evenly space points across the width
        const x = padding + i * ((width - 2 * padding) / (usageHistory.length - 1));
        // Y: Convert percentage (0-100) to height coordinate (High usage = low Y value)
        const y = height - padding - (d.usedPercent * (height - 2 * padding)) / 100;
        return `${x},${y}`;
    }).join(" ");

    // Get the last usage reading for display
    const lastUsage = usageHistory[usageHistory.length - 1].usedPercent.toFixed(1);

    return (
        <div className="memory-graph-container">
            <h3>Memory Usage History (Last {usageHistory.length} Readings)</h3>
            <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="memory-svg">

                {/* Draw 50% line */}
                <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#475569" strokeDasharray="4 4" strokeWidth="1" />

                {/* Y-axis labels */}
                <text x={padding - 5} y={height - padding + 5} fontSize="10" fill="#94a3b8" textAnchor="end">0%</text>
                <text x={padding - 5} y={padding} fontSize="10" fill="#94a3b8" textAnchor="end">100%</text>
                <text x={padding - 5} y={height / 2 + 5} fontSize="10" fill="#94a3b8" textAnchor="end">50%</text>

                {/* Line Path */}
                <polyline fill="none" stroke="#4f46e5" strokeWidth="2" points={points} />

                {/* Latest data point */}
                <circle cx={points.split(' ')[points.split(' ').length - 1].split(',')[0]} cy={points.split(' ')[points.split(' ').length - 1].split(',')[1]} r="3" fill="#10b981" stroke="#fff" strokeWidth="1" />
            </svg>
            <p className="current-usage-label">Current Reading: **{lastUsage}% Used**</p>
        </div>
    );
};

export default MemoryGraph;



