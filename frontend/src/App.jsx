import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import './index.css';

function App() {
    const [data, setData] = useState(null);
    const [history, setHistory] = useState([]); // New state for metric history
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Function to fetch the FULL health check report (intensive)
    const fetchData = async () => {
        setLoading(true); // START LOADING
        setError(null);
        try {
            const response = await fetch('http://127.0.0.1:5000/api/healthcheck');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const result = await response.json();
            
            if (result.status === 'success') {
                setData(result);
                
                // Update history state
                setHistory(prevHistory => {
                    if (result.metrics && result.metrics.totalMemoryGB > 0) {
                        const usedPercent = (result.metrics.usedMemoryGB / result.metrics.totalMemoryGB) * 100;

                        const newEntry = {
                            timestamp: Date.now(),
                            usedPercent: usedPercent,
                        };
                        // Limit history to last 15 entries
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
        try {
            const response = await fetch('http://127.0.0.1:5000/api/cleartemp', { method: 'POST' });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const result = await response.json();
            if (result.status === 'success') {
                alert(result.message);
                fetchData();
            } else {
                alert(`Error: ${result.message}`);
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

    // CRITICAL FIX: Calls the lightweight fetchInitialData on component mount.
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
        </div>
    );
}

export default App;
