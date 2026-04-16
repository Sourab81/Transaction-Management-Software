import React from 'react';

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

const CountersTable: React.FC<CountersTableProps> = ({ counters }) => {
  return (
    <section className="table-panel">
      <div className="table-panel__header">
        <div>
          <p className="eyebrow">Counters</p>
          <h3 className="table-panel__title">Counter overview</h3>
          <p className="table-panel__copy">Balances and status across active service counters.</p>
        </div>
      </div>
      <div className="data-table-wrapper">
        <table className="table data-table align-middle mobile-card-table">
          <thead>
            <tr>
              <th>Counter</th>
              <th>Code</th>
              <th>Opening Balance</th>
              <th>Current Balance</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {counters.map((counter) => (
              <tr key={counter.id}>
                <td data-label="Counter"><span className="data-table__primary">{counter.name}</span></td>
                <td data-label="Code">{counter.code}</td>
                <td data-label="Opening Balance">Rs. {counter.openingBalance.toLocaleString('en-IN')}</td>
                <td data-label="Current Balance">Rs. {counter.currentBalance.toLocaleString('en-IN')}</td>
                <td data-label="Status">
                  <span className={`status-chip ${counter.status === 'Active' ? 'status-chip--active' : 'status-chip--inactive'}`}>
                    {counter.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default CountersTable;
