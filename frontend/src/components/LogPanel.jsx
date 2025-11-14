// frontend/src/components/LogPanel.jsx
import React from 'react';
import './LogPanel.css'; // We will create this file next

/**
 * Renders a single log entry.
 * @param {object} props
 * @param {object} props.log - The log object from the backend.
 * @param {string} props.log.timestamp - e.g., "2023-10-27 10:30:45"
 * @param {string} props.log.type - e.g., "info", "warning", "error", "success"
 * @param {string} props.log.message - The log message
 */
function LogEntry({ log }) {
    // Destructure with the correct names from the PowerShell script
    const { timestamp, type, message } = log;

    // Use 'type' to set the CSS class. Default to 'info' if type is missing.
    const typeClass = `log-type ${type?.toLowerCase() || 'info'}`;

    // Split the timestamp (e.g., "2023-10-27 10:30:45") to show only the time
    const time = timestamp ? timestamp.split(' ')[1] : '...';

    return (
        <div className="log-entry">
            <span className="log-timestamp">{time}</span>
            <span className={typeClass}>{type}</span>
            <span className="log-message">{message}</span>
        </div>
    );
}

/**
 * Displays a panel with a list of log entries.
 * @param {object} props
 *@param {Array<object>} props.logs - Array of log objects from data.logs
 */
function LogPanel({ logs }) {
    // Your Dashboard.jsx already provides an <h2>
    // so we just need the panel itself.
    return (
        <div className="log-panel">
            <div className="log-content">
                {logs.map((log, index) => (
                    <LogEntry key={index} log={log} />
                ))}
            </div>
        </div>
    );
}

export default LogPanel;