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
    <div className="card border-0 shadow-sm" style={{borderRadius: '1.5rem', overflow: 'hidden'}}>
      <div className="card-header bg-light border-bottom-0">
        <h3 className="h5 mb-0 fw-semibold text-dark">Counters Overview</h3>
      </div>
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th className="border-0 fw-semibold text-muted small text-uppercase">Counter</th>
                <th className="border-0 fw-semibold text-muted small text-uppercase">Code</th>
                <th className="border-0 fw-semibold text-muted small text-uppercase">Opening Balance</th>
                <th className="border-0 fw-semibold text-muted small text-uppercase">Current Balance</th>
                <th className="border-0 fw-semibold text-muted small text-uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {counters.map((counter) => (
                <tr key={counter.id}>
                  <td className="fw-medium text-dark">{counter.name}</td>
                  <td>{counter.code}</td>
                  <td>${counter.openingBalance.toLocaleString()}</td>
                  <td>${counter.currentBalance.toLocaleString()}</td>
                  <td>
                    <span className={`badge ${counter.status === 'Active' ? 'bg-success' : 'bg-secondary'} rounded-pill px-3 py-2`}>
                      {counter.status}
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

export default CountersTable;
