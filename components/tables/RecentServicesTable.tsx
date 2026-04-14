import React from 'react';

interface ServiceItem {
  id: string;
  name: string;
  customer: string;
  amount: number;
  status: 'Completed' | 'Pending' | 'Failed';
}

interface RecentServicesTableProps {
  services: ServiceItem[];
}

const RecentServicesTable: React.FC<RecentServicesTableProps> = ({ services }) => {
  return (
    <div className="card border-0 shadow-sm" style={{borderRadius: '1.5rem', overflow: 'hidden'}}>
      <div className="card-header bg-light border-bottom-0">
        <h3 className="h5 mb-0 fw-semibold text-dark">Recent Services</h3>
      </div>
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th className="border-0 fw-semibold text-muted small text-uppercase">Service</th>
                <th className="border-0 fw-semibold text-muted small text-uppercase">Customer</th>
                <th className="border-0 fw-semibold text-muted small text-uppercase">Amount</th>
                <th className="border-0 fw-semibold text-muted small text-uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr key={service.id}>
                  <td className="fw-medium text-dark">{service.name}</td>
                  <td>{service.customer}</td>
                  <td>${service.amount.toFixed(2)}</td>
                  <td>
                    <span className={`badge ${service.status === 'Completed' ? 'bg-success' : service.status === 'Pending' ? 'bg-warning' : 'bg-danger'} rounded-pill px-3 py-2`}>
                      {service.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RecentServicesTable;
