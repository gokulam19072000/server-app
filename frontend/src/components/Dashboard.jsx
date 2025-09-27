import React from 'react';
import MetricCard from './MetricCard';
import DiskChart from './DiskChart';
import ServiceTable from './ServiceTable';
import LogPanel from './LogPanel';

const Dashboard = ({ data, handleClearTemp, handleRunHealthCheck }) => {
    // Conditional rendering to prevent crash on initial render
    if (!data || !data.metrics || !data.services) {
        return <div className="loading-state">Loading dashboard...</div>;
    }

    const { metrics, services, logs } = data;

    if (!metrics || !metrics.diskUsedPercent || !metrics.usedDiskGB || !metrics.totalDiskGB) {
        return <div className="error-state">Metrics data is incomplete or unavailable.</div>;
    }

    return (
        <div className="dashboard-grid">
            <div className="action-buttons">
                <button onClick={handleRunHealthCheck}>Run Full Health Check</button>
                <button onClick={handleClearTemp}>Clear Temp Files</button>
            </div>

            <div className="metric-cards">
                <MetricCard title="CPU Usage" value={`${metrics.cpuUsage}%`} type="cpu" />
                <MetricCard title="Memory Usage" value={`${metrics.usedMemoryGB} / ${metrics.totalMemoryGB} GB`} type="memory" />
                <MetricCard title="Disk Usage (C:)" value={`${metrics.diskUsedPercent}%`} type="disk" />
                <MetricCard title="Pending Updates" value={metrics.pendingUpdates} type="updates" />
            </div>

            <div className="chart-container">
                <h2>C: Drive Space</h2>
                <DiskChart used={metrics.usedDiskGB} total={metrics.totalDiskGB} />
            </div>

            <div className="services-container">
                <h2>Critical Services Status</h2>
                <ServiceTable services={services} />
            </div>

            <div className="log-panel-container">
                <h2>Activity Log</h2>
                <LogPanel logs={logs} />
            </div>
        </div>
    );
};

export default Dashboard;
