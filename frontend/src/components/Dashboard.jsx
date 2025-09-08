import React from 'react';
import MetricCard from './MetricCard';
import DiskChart from './DiskChart';
import ServiceTable from './ServiceTable';

const Dashboard = ({ data, handleClearTemp }) => {
    if (!data || !data.metrics || !data.services) {
        return <div className="loading-state">Loading dashboard...</div>;
    }

    const { metrics, services } = data;

    return (
        <div className="dashboard-grid">
            <div className="metric-cards">
                <MetricCard title="CPU Usage" value={`${metrics.cpuUsage}%`} type="cpu" />
                <MetricCard title="Memory Usage" value={`${metrics.usedMemoryGB} / ${metrics.totalMemoryGB} GB`} type="memory" />
                <MetricCard title="Disk Usage (C:)" value={`${metrics.diskUsedPercent}%`} type="disk" />
            </div>

            <div className="action-buttons">
                <button onClick={handleClearTemp}>Clear Temp Files</button>
            </div>

            <div className="chart-container">
                <h2>C: Drive Space</h2>
                <DiskChart used={metrics.usedDiskGB} total={metrics.totalDiskGB} />
            </div>

            <div className="services-container">
                <h2>Critical Services Status</h2>
                <ServiceTable services={services} />
            </div>
        </div>
    );
};

export default Dashboard;
