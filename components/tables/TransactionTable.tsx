import React, { useState } from 'react';
import { FaChevronDown, FaChevronUp, FaEye, FaFilter, FaMoneyBillWave, FaPrint, FaReceipt } from 'react-icons/fa';
import type { Transaction } from '../../lib/store';
import { formatCustomerBalance, getCustomerBalanceClassName } from '../../lib/customer-balance-format';
import DataTable from './DataTable';

interface TransactionTableProps {
  transactions: Transaction[];
  onPay?: (transaction: Transaction) => void;
  onView?: (transaction: Transaction) => void;
  onPrint?: (transaction: Transaction) => void;
  onToggleFilters?: () => void;
  isFilterOpen?: boolean;
  headerAction?: React.ReactNode;
  isLoading?: boolean;
  compact?: boolean;
}

const formatCurrency = (value: number | undefined) => (
  `Rs. ${(value ?? 0).toLocaleString('en-IN')}`
);

const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  onPay,
  onView,
  onPrint,
  onToggleFilters,
  isFilterOpen = false,
  headerAction,
  isLoading = false,
  compact = false,
}) => {
  const hasActions = Boolean(onPay || onView || onPrint);
  const [expandedChargeRows, setExpandedChargeRows] = useState<Record<string, boolean>>({});
  const toggleCharges = (transactionId: string) => {
    setExpandedChargeRows((current) => ({
      ...current,
      [transactionId]: !current[transactionId],
    }));
  };

  const columns = compact
    ? [
        {
          key: 'date',
          header: 'Date',
          render: (transaction: Transaction) => transaction.date,
        },
        {
          key: 'customer',
          header: 'Customer',
          render: (transaction: Transaction) => (
            <span className="data-table__primary">
              {transaction.customerCode || transaction.customerId || '-'}
            </span>
          ),
        },
        {
          key: 'totalAmount',
          header: 'Total',
          render: (transaction: Transaction) => (
            <span className="data-table__primary">{formatCurrency(transaction.totalAmount)}</span>
          ),
        },
        {
          key: 'currentBalance',
          header: 'Balance',
          render: (transaction: Transaction) => {
            const balance = typeof transaction.currentBalance !== 'undefined'
              ? transaction.currentBalance
              : transaction.dueAmount;

            return (
              <span className={getCustomerBalanceClassName(balance)}>
                {formatCustomerBalance(balance)}
              </span>
            );
          },
        },
      ]
    : [
        {
          key: 'date',
          header: 'Transaction Date',
          render: (transaction: Transaction) => transaction.date,
        },
        {
          key: 'customer',
          header: 'ID/Customer',
          render: (transaction: Transaction) => (
            <span className="data-table__primary">
              {transaction.customerCode || transaction.customerId || '-'}
            </span>
          ),
        },
        {
          key: 'numberOfTransactions',
          header: 'No. of Transactions',
          render: (transaction: Transaction) => transaction.numberOfTransactions ?? transaction.noOfTransaction ?? transaction.rows?.length ?? 1,
        },
        {
          key: 'transactionAmount',
          header: 'Transaction Amount',
          render: (transaction: Transaction) => formatCurrency(transaction.transactionAmount ?? transaction.amount ?? transaction.totalAmount),
        },
        {
          key: 'totalAmount',
          header: 'Total Amount',
          render: (transaction: Transaction) => {
            const isExpanded = Boolean(expandedChargeRows[transaction.id]);

            return (
              <div className="transaction-charges-cell">
                <div className="d-flex align-items-center gap-2">
                  <span className="data-table__primary">{formatCurrency(transaction.totalAmount)}</span>
                  <button
                    type="button"
                    className="btn-icon-sm btn-icon-sm--primary"
                    onClick={() => toggleCharges(transaction.id)}
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? 'Hide charges' : 'View charges'}
                    title={isExpanded ? 'Hide charges' : 'View charges'}
                  >
                    <FaReceipt size={12} />
                    {isExpanded ? <FaChevronUp size={10} /> : <FaChevronDown size={10} />}
                  </button>
                </div>
                {isExpanded ? (
                  <div className="transaction-charges-cell__details mt-2">
                    <div>Service Charge: {formatCurrency(transaction.serviceCharge)}</div>
                    <div>Bank Charge: {formatCurrency(transaction.bankCharge)}</div>
                    <div>Other Charge: {formatCurrency(transaction.otherCharge)}</div>
                  </div>
                ) : null}
              </div>
            );
          },
        },
        {
          key: 'currentBalance',
          header: 'Current Balance',
          render: (transaction: Transaction) => {
            const balance = typeof transaction.currentBalance !== 'undefined'
              ? transaction.currentBalance
              : transaction.dueAmount;

            return (
              <span className={getCustomerBalanceClassName(balance)}>
                {formatCustomerBalance(balance)}
              </span>
            );
          },
        },
        {
          key: 'added',
          header: 'Added By',
          render: (transaction: Transaction) => transaction.addedByName || '-',
        },
      ];

  return (
    <DataTable
      rows={transactions}
      getRowKey={(transaction) => transaction.id}
      eyebrow="Transactions"
      title="Recent Transactions"
      copy="Transactions registered and waiting for settlement."
      emptyLabel="No transaction records found."
      isLoading={isLoading}
      headerAction={headerAction || (onToggleFilters ? (
        <button
          type="button"
          className="btn-app btn-app-secondary"
          onClick={onToggleFilters}
          aria-expanded={isFilterOpen}
          aria-controls="transaction-filter-panel"
        >
          <FaFilter />
          {isFilterOpen ? 'Hide Filters' : 'Filter'}
        </button>
      ) : null)}
      columns={columns}
      renderActions={(transaction) => (
        <div className="table-actions">
          {onPay && (
            <button type="button" className="btn-icon-sm btn-icon-sm--primary" onClick={() => onPay(transaction)}>
              <FaMoneyBillWave size={12} />
              Pay
            </button>
          )}
          {onView && (
            <button type="button" className="btn-icon-sm btn-icon-sm--primary" onClick={() => onView(transaction)}>
              <FaEye size={12} />
              View
            </button>
          )}
          {onPrint && (
            <button type="button" className="btn-icon-sm btn-icon-sm--primary" onClick={() => onPrint(transaction)}>
              <FaPrint size={12} />
              Print
            </button>
          )}
          {!hasActions && <span className="page-muted small">View only</span>}
        </div>
      )}
    />
  );
};

export default TransactionTable;
