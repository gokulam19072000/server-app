import React from 'react';

const LogPanel = ({ logs }) => {
    return (
        <div className="log-panel">
            {logs.map((log, index) => (
                <div key={index} className={`log-entry log-${log.type}`}>
                    <span className="log-timestamp">[{log.timestamp}]</span>
                    <span className="log-message">{log.message}</span>
                </div>
            ))}
        </div>
    );
};

export default LogPanel;
