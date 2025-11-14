import React, { useState, useEffect, useRef } from 'react';

const UpdateStatusModal = ({ task_id, onComplete, onMetricsUpdate }) => {
    const [status, setStatus] = useState('In Progress');
    const [logs, setLogs] = useState([{
        timestamp: new Date().toLocaleTimeString(),
        message: "Update task started. Polling for status...",
        type: "info"
    }]);

    // Ref to store the interval ID
    const pollInterval = useRef(null);

    // This function will poll the backend for task status
    // FIX: Corrected async function syntax
    const pollTaskStatus = async () => {
        try {
            // Use task_id directly from props
            const response = await fetch(`http://127.0.0.1:5000/api/taskstatus/${task_id}`);
            if (!response.ok) {
                // Task might not be found yet, keep polling
                return;
            }

            const result = await response.json();

            setStatus(result.status);

            // Update logs if new ones are available
            if (result.data && result.data.logs) {
                setLogs(result.data.logs);
            }

            if (result.status === 'Complete' || result.status === 'Failed') {
                // Stop polling
                if (pollInterval.current) {
                    clearInterval(pollInterval.current);
                }
                // Send the final data (including new metrics) back to App.jsx
                if (result.status === 'Complete') {
                    onMetricsUpdate(result.data);
                }
            }
        } catch (err) {
            console.error("Polling error:", err);
            setStatus('Failed');
            setLogs(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), message: "Failed to get task status.", type: "error" }]);
            if (pollInterval.current) {
                clearInterval(pollInterval.current);
            }
        }
    };

    // Start polling when the component mounts
    useEffect(() => {
        // Clear any existing intervals
        if (pollInterval.current) {
            clearInterval(pollInterval.current);
        }

        // Start a new polling interval
        pollInterval.current = setInterval(() => {
            pollTaskStatus(); // FIX: Call function without argument
        }, 5000); // Poll every 5 seconds

        // Cleanup: stop polling when the component unmounts
        return () => {
            if (pollInterval.current) {
                clearInterval(pollInterval.current);
            }
        };
    }, [task_id]); // Re-run if task_id changes

    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                <h2>Windows Update Installation Status</h2>

                <div className="modal-status">
                    <strong>Status: </strong>
                    <span className={`status-${status.toLowerCase().replace(' ', '-')}`}>
                        {status}
                    </span>
                    {status === 'In Progress' && <div className="spinner"></div>}
                </div>

                <div className="log-panel modal-log-panel">
                    {logs.map((log, index) => (
                        <div key={index} className={`log-entry log-${log.type}`}>
                            <span className="log-timestamp">[{log.timestamp}]</span>
                            <span className="log-message">{log.message}</span>
                        </div>
                    ))}
                </div>

                {status !== 'In Progress' && (
                    <button onClick={onComplete} className="modal-close-button">
                        Close
                    </button>
                )}
            </div>
        </div>
    );
};

export default UpdateStatusModal;

