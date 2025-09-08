import React from 'react';

const ServiceTable = ({ services }) => {
    return (
        <table className="service-table">
            <thead>
                <tr>
                    <th>Service Name</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                {services.map((service, index) => (
                    <tr key={index}>
                        <td>{service.name}</td>
                        <td className={service.status === 'Running' ? 'status-running' : 'status-stopped'}>
                            {service.status}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default ServiceTable;
