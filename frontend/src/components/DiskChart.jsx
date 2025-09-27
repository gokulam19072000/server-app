import React from 'react';

const DiskChart = ({ used, total }) => {
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const usedPercentage = (used / total) * 100;
    const freePercentage = 100 - usedPercentage;
    const usedOffset = circumference - (usedPercentage / 100) * circumference;

    return (
        <div className="disk-chart">
            <svg width="120" height="120">
                <circle
                    className="disk-chart-background"
                    cx="60"
                    cy="60"
                    r={radius}
                    strokeWidth="10"
                />
                <circle
                    className="disk-chart-used"
                    cx="60"
                    cy="60"
                    r={radius}
                    strokeWidth="10"
                    strokeDasharray={circumference}
                    strokeDashoffset={usedOffset}
                />
                <text x="60" y="60" textAnchor="middle" dy="0.3em" className="disk-chart-text">
                    {freePercentage.toFixed(0)}% Free
                </text>
            </svg>
            <div className="disk-chart-legend">
                <span>Used: {used.toFixed(2)} GB</span>
                <span>Total: {total.toFixed(2)} GB</span>
            </div>
        </div>
    );
};

export default DiskChart;
