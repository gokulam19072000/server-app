import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import './index.css';

function App() {
    const [data, setData] = useState(null);
    const [history, setHistory] = useState([]); // State for metric history {usedPercent, cpuUsage, timestamp}
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [logPopup, setLogPopup] = useState(null); // State for dynamic log pop-up

    // Function to show log message dynamically
    const showLogPopup = (log) => {
        setLogPopup({
            message: log.message,
            type: log.type,
            timestamp: new Date().toLocaleTimeString()
        });
        // Set timeout to clear the pop-up
        setTimeout(() => setLogPopup(null), 3000); // Hide after 3 seconds
    };

    // Helper function to update History after any successful data fetch
    const updateHistory = (result) => {
        if (result.metrics && result.metrics.totalMemoryGB > 0) {
            // Calculate memory usage percentage
            const usedPercent = (result.metrics.usedMemoryGB / result.metrics.totalMemoryGB) * 100;

            const newEntry = {
                timestamp: Date.now(),
                usedPercent: usedPercent,
                cpuUsage: result.metrics.cpuUsage, // Add CPU usage to history
            };

            // Add new entry and keep only the last 15 entries
            setHistory(prevHistory => [...prevHistory, newEntry].slice(-15));
        }
    };

    // Function to fetch the FULL health check report (intensive)
    const fetchData = async () => {
        setLoading(true); // START LOADING
        setError(null);

        showLogPopup({ message: "Starting full server health check sequence. Please wait...", type: "info" });

        try {
            const response = await fetch('http://127.0.0.1:5000/api/healthcheck');

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const result = await response.json();

            if (result.status === 'success') {
                setData(result);

                // Display logs one by one in the dynamic pop-up
                for (const log of result.logs) {
                    showLogPopup(log);
                    // Wait 600ms before showing the next log
                    await new Promise(resolve => setTimeout(resolve, 600));
                }

                updateHistory(result); // Update graph history
                showLogPopup({ message: "Health check sequence complete.", type: "success" });
            } else {
                setError(result.message);
                showLogPopup({ message: `Health check failed: ${result.message}`, type: "error" });
            }
        } catch (err) {
            setError('Failed to fetch server data. Please check if the backend is running.');
            showLogPopup({ message: "Connection Error: Failed to reach the server.", type: "error" });
        } finally {
            setLoading(false); // END LOADING
        }
    };

    // Function to fetch only initial data (lightweight)
    const fetchInitialData = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('http://127.0.0.1:5000/api/serverdetails');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const result = await response.json();
            if (result.status === 'success') {
                setData(result);

                // Initialize history with the first data point
                if (result.metrics && result.metrics.totalMemoryGB > 0) {
                    updateHistory(result);
                }
            } else {
                setError(result.message);
            }
        } catch (err) {
            setError('Failed to fetch initial server details. Please check if the backend is running.');
        } finally {
            setLoading(false);
        }
    };

    const handleClearTemp = async () => {
        setLoading(true);
        setError(null);
        showLogPopup({ message: "Starting clean-up operation...", type: "info" });
        try {
            const response = await fetch('http://127.0.0.1:5000/api/cleartemp', { method: 'POST' });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const result = await response.json();

            if (result.status === 'success') {
                // Display cleanup logs one by one
                for (const log of result.logs) {
                    showLogPopup(log);
                    await new Promise(resolve => setTimeout(resolve, 600));
                }
                showLogPopup({ message: "Clean-up sequence complete. Refreshing metrics.", type: "success" });
                fetchInitialData(); // Refresh data after cleanup
            } else {
                setError(result.message);
                showLogPopup({ message: `Clean-up failed: ${result.message}`, type: "error" });
            }
        } catch (err) {
            alert('Failed to connect to the backend.');
        } finally {
            setLoading(false);
        }
    };

    // NEW HANDLER: Install Updates
    const handleInstallUpdates = async () => {
        setLoading(true);
        setError(null);
        showLogPopup({ message: "Installation process starting. Please do not close this window.", type: "warning" });
        try {
            const response = await fetch('http://127.0.0.1:5000/api/installupdates', { method: 'POST' });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const result = await response.json();

            if (result.status === 'success') {
                // Display installation logs one by one
                for (const log of result.logs) {
                    showLogPopup(log);
                    await new Promise(resolve => setTimeout(resolve, 600));
                }
                showLogPopup({ message: "Installation finished. Refreshing metrics.", type: "success" });
                // Update data with the new metrics returned from the install action
                setData(result);
                updateHistory(result);
            } else {
                setError(result.message);
                showLogPopup({ message: `Installation failed: ${result.message}`, type: "error" });
            }
        } catch (err) {
            setError('Failed to connect to the backend.');
            showLogPopup({ message: "Connection Error: Failed to reach the server.", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    const handleRunHealthCheck = async () => {
        fetchData();
    };

    // Calls the lightweight fetchInitialData on component mount.
    useEffect(() => {
        fetchInitialData();
    }, []);

    // Display loading state only on initial page load
    if (loading && !data) {
        return <div className="loading-state">Loading server details...</div>;
    }

    if (error) {
        return <div className="error-state">Error: {error}</div>;
    }

    return (
        <div className="app-container">
            <header>
                <h1>Windows Server Health Dashboard</h1>
            </header>
            <main>
                <Dashboard
                    data={data}
                    usageHistory={history}
                    handleClearTemp={handleClearTemp}
                    handleRunHealthCheck={handleRunHealthCheck}
                    handleInstallUpdates={handleInstallUpdates} // Pass new handler
                    isLoading={loading}
                />
            </main>
            {/* Dynamic Popup Message for User Feedback */}
            {logPopup && (
                <div className={`log-popup log-${logPopup.type}`}>
                    <span className="log-message">{logPopup.message}</span>
                </div>
            )}
        </div>
    );
}

export default App;

