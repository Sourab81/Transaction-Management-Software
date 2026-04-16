import React from 'react';

interface ServiceItem {
  id: string;
  name: string;
  customer: string;
  amount: number;
  status: 'Completed' | 'Pending' | 'Cancelled' | 'Refunded';
}

interface RecentServicesTableProps {
  services: ServiceItem[];
}

const getStatusClass = (status: ServiceItem['status']) => {
  if (status === 'Completed') return 'status-chip status-chip--completed';
  if (status === 'Pending') return 'status-chip status-chip--pending';
  if (status === 'Refunded') return 'status-chip status-chip--info';
  return 'status-chip status-chip--failed';
};

const RecentServicesTable: React.FC<RecentServicesTableProps> = ({ services }) => {
  return (
    <section className="table-panel">
      <div className="table-panel__header">
        <div>
          <p className="eyebrow">Recent Services</p>
          <h3 className="table-panel__title">Latest service activity</h3>
          <p className="table-panel__copy">Most recent processed services with customer and amount context.</p>
        </div>
      </div>
      <div className="data-table-wrapper">
        <table className="table data-table align-middle mobile-card-table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {services.map((service) => (
              <tr key={service.id}>
                <td data-label="Service"><span className="data-table__primary">{service.name}</span></td>
                <td data-label="Customer">{service.customer}</td>
                <td data-label="Amount">Rs. {service.amount.toLocaleString('en-IN')}</td>
                <td data-label="Status"><span className={getStatusClass(service.status)}>{service.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default RecentServicesTable;
