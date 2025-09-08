import React from 'react';

const MetricCard = ({ title, value, type }) => {
    return (
        <div className={`metric-card ${type}`}>
            <div className="metric-title">{title}</div>
            <div className="metric-value">{value}</div>
        </div>
    );
};

export default MetricCard;
