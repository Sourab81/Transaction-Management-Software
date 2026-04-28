import React from 'react';
import DataTable from './DataTable';

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

const RecentServicesTable: React.FC<RecentServicesTableProps> = ({ services }) => (
  <DataTable
    rows={services}
    getRowKey={(service) => service.id}
    eyebrow="Recent Services"
    title="Latest service activity"
    copy="Most recent processed services with customer and amount context."
    emptyLabel="No recent service activity found."
    columns={[
      { key: 'service', header: 'Service', render: (service) => <span className="data-table__primary">{service.name}</span> },
      { key: 'customer', header: 'Customer', render: (service) => service.customer },
      { key: 'amount', header: 'Amount', render: (service) => `Rs. ${service.amount.toLocaleString('en-IN')}` },
      { key: 'status', header: 'Status', render: (service) => <span className={getStatusClass(service.status)}>{service.status}</span> },
    ]}
  />
);

export default RecentServicesTable;
