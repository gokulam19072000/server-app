import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import LoginScreen from './components/LoginScreen'; // Import the new login screen
import './index.css';

function App() {
    const [user, setUser] = useState(null); // Holds user data { token, name, role }
    const [data, setData] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [logPopup, setLogPopup] = useState(null);

    // --- Authentication ---
    const handleLogin = (userData) => {
        setUser(userData);
        fetchInitialData(userData.token); // Fetch initial data *after* logging in
    };

    const handleLogout = () => {
        setUser(null);
        setData(null);
        setHistory([]);
    };

    // Function to show log message dynamically
    const showLogPopup = (log) => {
        setLogPopup({
            message: log.message,
            type: log.type,
            timestamp: new Date().toLocaleTimeString()
        });
        setTimeout(() => setLogPopup(null), 3000);
    };

    // Helper function to update History
    const updateHistory = (result) => {
        if (result.metrics && result.metrics.totalMemoryGB > 0) {
            const usedPercent = (result.metrics.usedMemoryGB / result.metrics.totalMemoryGB) * 100;
            const newEntry = {
                timestamp: Date.now(),
                usedPercent: usedPercent,
                cpuUsage: result.metrics.cpuUsage,
            };
            setHistory(prevHistory => [...prevHistory, newEntry].slice(-15));
        }
    };

    // --- API Handlers (Now require token) ---

    // Function to fetch the FULL health check report (intensive)
    const fetchData = async () => {
        if (!user) return; // Guard clause
        setLoading(true);
        setError(null);
        showLogPopup({ message: "Starting full server health check sequence...", type: "info" });

        try {
            const response = await fetch('http://127.0.0.1:5000/api/healthcheck', {
                headers: { 'Authorization': `Bearer ${user.token}` } // Send token
            });
            const result = await response.json();

            if (response.ok && result.status === 'success') {
                setData(result);
                for (const log of result.logs) {
                    showLogPopup(log);
                    await new Promise(resolve => setTimeout(resolve, 600));
                }
                updateHistory(result);
                showLogPopup({ message: "Health check sequence complete.", type: "success" });
            } else {
                setError(result.message);
                showLogPopup({ message: `Health check failed: ${result.message}`, type: "error" });
            }
        } catch (err) {
            setError('Failed to fetch server data.');
            showLogPopup({ message: "Connection Error: Failed to reach the server.", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    // Function to fetch only initial data (lightweight)
    const fetchInitialData = async (token) => {
        if (!token) return; // Guard clause
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('http://127.0.0.1:5000/api/serverdetails', {
                headers: { 'Authorization': `Bearer ${token}` } // Send token
            });
            const result = await response.json();

            if (response.ok && result.status === 'success') {
                setData(result);
                if (result.metrics && result.metrics.totalMemoryGB > 0) {
                    updateHistory(result);
                }
            } else {
                setError(result.message);
            }
        } catch (err) {
            setError('Failed to fetch initial server details.');
        } finally {
            setLoading(false);
        }
    };

    const handleClearTemp = async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        showLogPopup({ message: "Starting clean-up operation...", type: "info" });
        try {
            const response = await fetch('http://127.0.0.1:5000/api/cleartemp', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${user.token}` } // Send token
            });
            const result = await response.json();

            if (response.ok && result.status === 'success') {
                for (const log of result.logs) {
                    showLogPopup(log);
                    await new Promise(resolve => setTimeout(resolve, 600));
                }
                showLogPopup({ message: "Clean-up complete. Refreshing metrics.", type: "success" });
                fetchInitialData(user.token); // Refresh data
            } else {
                setError(result.message);
                showLogPopup({ message: `Clean-up failed: ${result.message}`, type: "error" });
            }
        } catch (err) {
            setError('Failed to connect to the backend.');
        } finally {
            setLoading(false);
        }
    };

    // NEW HANDLER: Install Updates
    const handleInstallUpdates = async () => {
        if (!user) return;
        setLoading(true);
        setError(null);
        showLogPopup({ message: "Installation process starting...", type: "warning" });
        try {
            const response = await fetch('http://127.0.0.1:5000/api/installupdates', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${user.token}` } // Send token
            });
            const result = await response.json();

            if (response.ok && result.status === 'success') {
                for (const log of result.logs) {
                    showLogPopup(log);
                    await new Promise(resolve => setTimeout(resolve, 600));
                }
                showLogPopup({ message: "Installation finished. Refreshing metrics.", type: "success" });
                setData(result);
                updateHistory(result);
            } else {
                setError(result.message);
                showLogPopup({ message: `Installation failed: ${result.message}`, type: "error" });
            }
        } catch (err) {
            setError('Failed to connect to the backend.');
        } finally {
            setLoading(false);
        }
    };

    // Main render logic
    return (
        <div className="app-container">
            <header>
                <h1>Windows Server Health Dashboard</h1>
                {user && (
                    <div className="user-info">
                        <span>Welcome, {user.name} ({user.role})</span>
                        <button onClick={handleLogout} className="logout-button">Logout</button>
                    </div>
                )}
            </header>
            <main>
                {!user ? (
                    <LoginScreen onLogin={handleLogin} setError={setError} />
                ) : (
                    <Dashboard
                        user={user} // Pass user object
                        data={data}
                        usageHistory={history}
                        handleClearTemp={handleClearTemp}
                        handleRunHealthCheck={fetchData} // Renamed for clarity
                        handleInstallUpdates={handleInstallUpdates}
                        isLoading={loading}
                    />
                )}
                {/* Display global errors */}
                {error && <div className="error-state global-error">Error: {error}</div>}
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

