import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import './index.css';

function App() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Corrected API endpoint to match the Flask backend
            const response = await fetch('http://127.0.0.1:5000/api/healthcheck');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const result = await response.json();
            if (result.status === 'success') {
                setData(result);
            } else {
                setError(result.message);
            }
        } catch (err) {
            setError('Failed to fetch server data. Please check if the backend is running.');
        } finally {
            setLoading(false);
        }
    };

    const handleClearTemp = async () => {
        setLoading(true);
        setError(null);
        try {
            // Corrected API endpoint to match the Flask backend
            const response = await fetch('http://127.0.0.1:5000/api/cleartemp', { method: 'POST' });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const result = await response.json();
            if (result.status === 'success') {
                alert(result.message);
            } else {
                alert(`Error: ${result.message}`);
            }
        } catch (err) {
            alert('Failed to connect to the backend.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000); // Fetch data every 60 seconds
        return () => clearInterval(interval);
    }, []);

    if (loading && !data) {
        return <div className="loading-state">Loading server data...</div>;
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
                <Dashboard data={data} handleClearTemp={handleClearTemp} />
            </main>
        </div>
    );
}

export default App;
