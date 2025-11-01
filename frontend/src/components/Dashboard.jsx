import React from 'react';
import MetricCard from './MetricCard';
import DiskChart from './DiskChart';
import ServiceTable from './ServiceTable';
import LogPanel from './LogPanel';
import MemoryGraph from './MemoryGraph';

const Dashboard = ({ data, usageHistory, handleClearTemp, handleRunHealthCheck, isLoading }) => {
    // 1. Initial check for data presence
    if (!data || !data.metrics) {
        return <div className="loading-state">Loading dashboard...</div>;
    }

    const { metrics, services, logs } = data;

    // 2. Safely access nested properties, ensuring they exist or default to an empty object/array
    const diskSpace = metrics.diskSpace || {};
    const currentServices = services || [];
    const currentLogs = logs || [];
    // Ensure pendingUpdates is treated as a number or fallback string
    const pendingUpdates = metrics.pendingUpdates !== undefined ? metrics.pendingUpdates : 'N/A';

    // Determine if the full health check has been run (logs will only be populated after full run)
    const isFullReport = currentLogs.length > 0;
    const buttonText = isLoading ? "Running Checks..." : "Run Full Health Check";

    return (
        <div className="dashboard-grid">
            <div className="action-buttons">
                {/* Disable button while loading */}
                <button onClick={handleRunHealthCheck} disabled={isLoading}>{buttonText}</button>
                <button onClick={handleClearTemp} disabled={isLoading}>Clear Temp Files</button>
            </div>

            <div className="metric-cards">
                <MetricCard title="CPU Usage" value={`${metrics.cpuUsage || 'N/A'}%`} type="cpu" />
                <MetricCard title="Memory Usage" value={`${metrics.usedMemoryGB || 'N/A'} / ${metrics.totalMemoryGB || 'N/A'} GB`} type="memory" />

                {/* Safely read disk metrics using the diskSpace variable */}
                <MetricCard
                    title="Disk Usage (C:)"
                    value={`${diskSpace.usedPercent ? diskSpace.usedPercent.toFixed(2) : 'N/A'}%`}
                    type="disk"
                />
                <MetricCard title="Pending Updates" value={pendingUpdates} type="updates" />
            </div>

            {/* NEW GRAPH SECTION */}
            <div className="memory-graph-container chart-container">
                <MemoryGraph usageHistory={usageHistory} />
            </div>
            {/* END NEW GRAPH SECTION */}

            <div className="chart-container">
                <h2>C: Drive Space</h2>
                {/* Safely pass default values (0) if diskSpace is not fully loaded */}
                <DiskChart used={diskSpace.usedGB || 0} total={diskSpace.totalGB || 0} />
            </div>

            <div className="services-container">
                <h2>Critical Services Status</h2>
                <ServiceTable services={currentServices} />
            </div>

            <div className="log-panel-container">
                <h2>Activity Log (Detailed)</h2>
                {isLoading ? (
                    <div className="log-panel-placeholder loading-text">**{buttonText}** Please wait for system response...</div>
                ) : isFullReport ? (
                    <LogPanel logs={currentLogs} />
                ) : (
                    <div className="log-panel-placeholder">
                        Run a Full Health Check to view detailed script activity and troubleshooting steps.
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
