import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import './index.css';

function App() {
    const [data, setData] = useState(null);
    const [history, setHistory] = useState([]); // State for metric history
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
        setTimeout(() => setLogPopup(null), 3000); // Hide after 3 seconds
    };

    // Function to fetch the FULL health check report (intensive)
    const fetchData = async () => {
        setLoading(true); // START LOADING
        setError(null);

        // Show starting message immediately
        showLogPopup({ message: "Starting full server health check...", type: "info" });

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
                    // Delay is crucial for displaying logs one after another
                    await new Promise(resolve => setTimeout(resolve, 600));
                }

                // Update history state
                setHistory(prevHistory => {
                    if (result.metrics && result.metrics.totalMemoryGB > 0) {
                        const usedPercent = (result.metrics.usedMemoryGB / result.metrics.totalMemoryGB) * 100;

                        const newEntry = {
                            timestamp: Date.now(),
                            usedPercent: usedPercent,
                        };
                        return [...prevHistory, newEntry].slice(-15);
                    }
                    return prevHistory;
                });
            } else {
                setError(result.message);
            }
        } catch (err) {
            setError('Failed to fetch server data. Please check if the backend is running.');
        } finally {
            setLoading(false); // END LOADING
            showLogPopup({ message: "Health check sequence complete.", type: "success" });
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
                    const usedPercent = (result.metrics.usedMemoryGB / result.metrics.totalMemoryGB) * 100;
                    setHistory([{
                        timestamp: Date.now(),
                        usedPercent: usedPercent,
                    }]);
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

            // Display cleanup logs one by one
            if (result.status === 'success') {
                for (const log of result.logs) {
                    showLogPopup(log);
                    await new Promise(resolve => setTimeout(resolve, 600));
                }
                showLogPopup({ message: "Clean-up sequence complete.", type: "success" });
                fetchInitialData(); // Refresh data after cleanup
            } else {
                setError(result.message);
            }
        } catch (err) {
            alert('Failed to connect to the backend.');
        } finally {
            setLoading(false);
        }
    };

    const handleRunHealthCheck = async () => {
        fetchData();
    };

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
                    isLoading={loading} // Pass loading state to Dashboard for button control
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
