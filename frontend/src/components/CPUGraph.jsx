import React from 'react';

// This component renders a CPU usage history graph using inline SVG
const CPUGraph = ({ usageHistory }) => {
    // Check if history is meaningful (at least one point)
    if (!usageHistory || usageHistory.length < 1) {
        return <div className="graph-placeholder">Run a health check to start tracking CPU usage.</div>;
    }

    const width = 450;
    const height = 150;
    const padding = 20;

    // Create array of points, even if only one
    const points = usageHistory.map((d, i) => {
        const x = (usageHistory.length === 1)
            ? padding // Single point
            : padding + i * ((width - 2 * padding) / (usageHistory.length - 1));

        // Y: Convert percentage (0-100) to height coordinate
        const y = height - padding - (d.cpuUsage * (height - 2 * padding)) / 100;
        return `${x},${y}`;
    }).join(" ");

    // Get the last usage reading for display
    const lastUsage = usageHistory[usageHistory.length - 1].cpuUsage.toFixed(1);

    return (
        <div className="cpu-graph-content">
            <h3>CPU Usage History (Last {usageHistory.length} Readings)</h3>
            <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="cpu-svg">

                {/* Draw 50% line */}
                <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#475569" strokeDasharray="4 4" strokeWidth="1" />

                {/* Y-axis labels */}
                <text x={padding - 5} y={height - padding + 5} fontSize="10" fill="#94a3b8" textAnchor="end">0%</text>
                <text x={padding - 5} y={padding} fontSize="10" fill="#94a3b8" textAnchor="end">100%</text>
                <text x={padding - 5} y={height / 2 + 5} fontSize="10" fill="#94a3b8" textAnchor="end">50%</text>

                {/* Line Path (only if 2+ points) */}
                {usageHistory.length > 1 && (
                    <polyline fill="none" stroke="#f59e0b" strokeWidth="2" points={points} />
                )}

                {/* Latest data point */}
                <circle cx={points.split(' ')[points.split(' ').length - 1].split(',')[0]} cy={points.split(' ')[points.split(' ').length - 1].split(',')[1]} r="3" fill="#f59e0b" stroke="#fff" strokeWidth="1" />
            </svg>
            <p className="current-usage-label">Current Reading: **{lastUsage}% Used**</p>
        </div>
    );
};

export default CPUGraph;

