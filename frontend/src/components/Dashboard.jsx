import React from 'react';
import MetricCard from './MetricCard';
import DiskChart from './DiskChart';
import ServiceTable from './ServiceTable';
import LogPanel from './LogPanel';
import MemoryGraph from './MemoryGraph';
import CPUGraph from './CPUGraph'; // NEW CPU GRAPH IMPORT

const Dashboard = ({ data, usageHistory, handleClearTemp, handleRunHealthCheck, handleInstallUpdates, isLoading }) => {
    // 1. Initial check for data presence
    if (!data || !data.metrics) {
        return <div className="loading-state">Loading dashboard...</div>;
    }

    const { metrics, services, logs } = data;

    // 2. Safely access nested properties
    const diskSpace = metrics.diskSpace || {};
    const currentServices = services || [];
    const currentLogs = logs || [];
    // CRITICAL FIX: Ensure pendingUpdates is a number for correct button logic
    const pendingUpdates = typeof metrics.pendingUpdates === 'number' ? metrics.pendingUpdates : 'N/A';

    // Determine if the full health check has been run (logs will only be populated after full run)
    const isFullReport = currentLogs.length > 0;
    const buttonText = isLoading ? "Running Checks..." : "Run Full Health Check";

    // Logic for Install Updates button text and state
    const isUpdatesAvailable = pendingUpdates > 0;
    const installButtonDisabled = isLoading || pendingUpdates === 'N/A' || pendingUpdates === 0;
    const installButtonText = isLoading
        ? "Please wait..."
        : (pendingUpdates === 'N/A' ? 'Check Updates' : (isUpdatesAvailable ? `Install Updates (${pendingUpdates})` : 'No Updates'));


    return (
        <div className="dashboard-grid">
            <div className="action-buttons">
                {/* Disable button while loading */}
                <button onClick={handleRunHealthCheck} disabled={isLoading}>{buttonText}</button>
                <button onClick={handleClearTemp} disabled={isLoading}>Clear Temp Files</button>

                {/* INSTALL UPDATES BUTTON */}
                <button
                    onClick={handleInstallUpdates}
                    disabled={installButtonDisabled}
                    className={isUpdatesAvailable && !isLoading ? 'button-warning' : ''}
                >
                    {installButtonText}
                </button>
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

            {/* CPU AND MEMORY GRAPHS - Side by side layout */}
            <div className="chart-container">
                <CPUGraph usageHistory={usageHistory} />
            </div>
            <div className="chart-container">
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
                {isLoading && !isFullReport ? (
                    <div className="log-panel-placeholder loading-text">**Running Checks...** Please wait for system response...</div>
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

