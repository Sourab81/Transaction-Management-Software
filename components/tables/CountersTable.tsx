import React from 'react';
import DataTable from './DataTable';

interface Counter {
  id: string;
  name: string;
  code: string;
  openingBalance: number;
  currentBalance: number;
  status: 'Active' | 'Inactive';
}

interface CountersTableProps {
  counters: Counter[];
}

const CountersTable: React.FC<CountersTableProps> = ({ counters }) => (
  <DataTable
    rows={counters}
    getRowKey={(counter) => counter.id}
    eyebrow="Counters"
    title="Counter overview"
    copy="Balances and status across active service counters."
    emptyLabel="No counter records found."
    columns={[
      { key: 'counter', header: 'Counter', render: (counter) => <span className="data-table__primary">{counter.name}</span> },
      { key: 'code', header: 'Code', render: (counter) => counter.code },
      { key: 'opening', header: 'Opening Balance', render: (counter) => `Rs. ${counter.openingBalance.toLocaleString('en-IN')}` },
      { key: 'current', header: 'Current Balance', render: (counter) => `Rs. ${counter.currentBalance.toLocaleString('en-IN')}` },
      {
        key: 'status',
        header: 'Status',
        render: (counter) => (
          <span className={`status-chip ${counter.status === 'Active' ? 'status-chip--active' : 'status-chip--inactive'}`}>
            {counter.status}
          </span>
        ),
      },
    ]}
  />
);

export default CountersTable;
