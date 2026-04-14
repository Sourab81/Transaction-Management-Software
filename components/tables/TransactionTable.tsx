import React from 'react';

interface Transaction {
  id: string;
  customerName: string;
  service: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  date: string;
}

interface TransactionTableProps {
  transactions: Transaction[];
}

const TransactionTable: React.FC<TransactionTableProps> = ({ transactions }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success text-white';
      case 'pending':
        return 'bg-warning text-dark';
      case 'failed':
        return 'bg-danger text-white';
      default:
        return 'bg-secondary text-white';
    }
  };

  return (
    <div className="card border-0 shadow-sm" style={{borderRadius: '1rem'}}>
      <div className="card-header bg-transparent border-bottom">
        <h3 className="h5 mb-0 fw-semibold text-dark">Recent Transactions</h3>
      </div>
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th className="border-0 fw-semibold text-muted small text-uppercase">Customer</th>
                <th className="border-0 fw-semibold text-muted small text-uppercase">Service</th>
                <th className="border-0 fw-semibold text-muted small text-uppercase">Amount</th>
                <th className="border-0 fw-semibold text-muted small text-uppercase">Status</th>
                <th className="border-0 fw-semibold text-muted small text-uppercase">Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td className="fw-medium text-dark">{transaction.customerName}</td>
                  <td className="text-muted">{transaction.service}</td>
                  <td className="fw-semibold">${transaction.amount}</td>
                  <td>
                    <span className={`badge ${getStatusColor(transaction.status)} rounded-pill px-3 py-2`}>
                      {transaction.status}
                    </span>
                  </td>
                  <td className="text-muted small">{transaction.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TransactionTable;