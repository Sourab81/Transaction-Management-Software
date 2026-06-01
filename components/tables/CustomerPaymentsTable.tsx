import React from 'react';
import type { CustomerPayment } from '../../lib/api/customerPayments';
import DataTable from './DataTable';

interface CustomerPaymentsTableProps {
  payments: CustomerPayment[];
  isLoading?: boolean;
}

const formatMoney = (value: number) => `Rs. ${value.toLocaleString('en-IN')}`;
const formatCustomer = (payment: CustomerPayment) => {
  const id = payment.customerCode || payment.customerId || '-';
  const name = payment.customerName || '-';
  return `${id} / ${name}`;
};

const CustomerPaymentsTable: React.FC<CustomerPaymentsTableProps> = ({
  payments,
  isLoading = false,
}) => (
  <DataTable
    rows={payments}
    getRowKey={(payment) => String(payment.id)}
    eyebrow="Customer Payments"
    title="Customer Payment List"
    copy="Payment transaction history collected from customers."
    emptyLabel="No customer payment transactions found."
    isLoading={isLoading}
    columns={[
      { key: 'paymentDate', header: 'Payment Date', render: (payment) => payment.paymentDate || '-' },
      { key: 'invoiceId', header: 'Invoice ID', render: (payment) => payment.invoiceId || '-' },
      { key: 'customer', header: 'Customer ID/Name', render: (payment) => <span className="data-table__primary">{formatCustomer(payment)}</span> },
      { key: 'department', header: 'Department', render: (payment) => payment.counterName || '-' },
      { key: 'onlineAmount', header: 'Online Amount', render: (payment) => formatMoney(payment.onlineAmount) },
      { key: 'cashAmount', header: 'Cash Amount', render: (payment) => formatMoney(payment.cashAmount) },
      { key: 'totalPaid', header: 'Total Paid', render: (payment) => <span className="data-table__primary">{formatMoney(payment.totalPaid)}</span> },
      { key: 'account', header: 'Account', render: (payment) => payment.accountName || '-' },
      { key: 'addedBy', header: 'Added By', render: (payment) => payment.addedByName || '-' },
      { key: 'status', header: 'Status', render: (payment) => <span className="status-chip status-chip--active">{String(payment.status)}</span> },
    ]}
  />
);

export default CustomerPaymentsTable;
