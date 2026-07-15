import React, { useCallback, useMemo, useState } from 'react';
import { FaSave, FaTimes } from 'react-icons/fa';
import { createBalanceUpdatesBatch, type BalanceUpdateMode } from '../../lib/api/balanceUpdates';
import type { Account } from '../../lib/store';
import type { Counter } from '../../lib/store';

interface BalanceEditRow {
  entityId: string;
  entityName: string;
  existingBalance: number;
  statementBalance: string;
  remark: string;
}

interface BalanceBatchEditTableProps {
  mode: BalanceUpdateMode;
  counters: Counter[];
  accounts: Account[];
  onSave: () => void;
  onCancel: () => void;
  showNotification: (type: 'success' | 'error', message: string) => void;
}

const formatMoney = (amount: number) => `Rs. ${amount.toLocaleString('en-IN')}`;

const getEntityLabel = (mode: BalanceUpdateMode, entity: Counter | Account): string => {
  if (mode === 'department') {
    const counter = entity as Counter;
    return counter.code ? `${counter.name} (${counter.code})` : counter.name;
  }
  const account = entity as Account;
  return `${account.bankName} - ${account.accountHolder}`;
};

const BalanceBatchEditTable: React.FC<BalanceBatchEditTableProps> = ({
  mode,
  counters,
  accounts,
  onSave,
  onCancel,
  showNotification,
}) => {
  const entities = mode === 'department' ? counters : accounts;
  const sourceLabel = mode === 'department' ? 'Department' : 'Account';

  const [rows, setRows] = useState<BalanceEditRow[]>(() =>
    entities
      .filter((e) => e.status === 'Active')
      .map((e) => ({
        entityId: e.id,
        entityName: getEntityLabel(mode, e),
        existingBalance: e.currentBalance,
        statementBalance: '',
        remark: '',
      })),
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStatementChange = useCallback((entityId: string, value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.entityId === entityId ? { ...r, statementBalance: value } : r)),
    );
  }, []);

  const handleRemarkChange = useCallback((entityId: string, value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.entityId === entityId ? { ...r, remark: value } : r)),
    );
  }, []);

  const computedRows = useMemo(
    () =>
      rows.map((r) => {
        const parsed = parseFloat(r.statementBalance);
        const difference = Number.isFinite(parsed) ? parsed - r.existingBalance : null;
        return { ...r, difference };
      }),
    [rows],
  );

  const handleSaveAll = async () => {
    const updates = computedRows
      .filter((r) => r.statementBalance.trim() !== '' && Number.isFinite(parseFloat(r.statementBalance)))
      .map((r) => ({
        entityId: r.entityId,
        statementBalance: parseFloat(r.statementBalance),
        remark: r.remark.trim(),
      }));

    if (updates.length === 0) {
      showNotification('error', 'Please enter a statement balance for at least one ' + sourceLabel.toLowerCase() + '.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createBalanceUpdatesBatch({ mode, updates });
      console.log('[BalanceUpdate] Mutation result:', JSON.stringify(result));
      if (!result.success) {
        showNotification('error', result.message || 'Unable to save balance updates.');
        setIsSubmitting(false);
        return;
      }
      showNotification('success', result.message || 'Balance updates saved successfully.');
      onSave();
    } catch (error) {
      console.log('[BalanceUpdate] handleSaveAll catch:', error);
      showNotification('error', 'Unable to save balance updates.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="form-section-card">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
        <div>
          <p className="eyebrow mb-1">Batch Update</p>
          <h3 className="table-panel__title mb-0">
            Update {sourceLabel} Balances
          </h3>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="text-muted mb-0">No active {sourceLabel.toLowerCase()}s found.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-bordered table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th style={{ width: '50px' }}>#</th>
                <th>{sourceLabel}</th>
                <th style={{ width: '160px' }}>Existing Balance</th>
                <th style={{ width: '180px' }}>Balance As Per Statement</th>
                <th style={{ width: '160px' }}>Difference</th>
                <th style={{ minWidth: '200px' }}>Remark</th>
              </tr>
            </thead>
            <tbody>
              {computedRows.map((r, i) => (
                <tr key={r.entityId}>
                  <td className="text-center align-middle">{i + 1}</td>
                  <td className="align-middle fw-medium">{r.entityName}</td>
                  <td className="align-middle">{formatMoney(r.existingBalance)}</td>
                  <td className="align-middle">
                    <input
                      type="number"
                      step="0.01"
                      className="form-control form-control-sm"
                      value={r.statementBalance}
                      onChange={(e) => handleStatementChange(r.entityId, e.target.value)}
                      disabled={isSubmitting}
                      placeholder="Enter balance"
                    />
                  </td>
                  <td className="align-middle">
                    {r.difference !== null ? (
                      <span
                        className={`fw-semibold ${
                          r.difference < 0 ? 'text-danger' : r.difference > 0 ? 'text-success' : ''
                        }`}
                      >
                        {r.difference >= 0 ? '+' : ''}
                        {r.difference.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td className="align-middle">
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={r.remark}
                      onChange={(e) => handleRemarkChange(r.entityId, e.target.value)}
                      disabled={isSubmitting}
                      placeholder="Optional remark"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="d-flex justify-content-end gap-2 mt-3">
        <button
          type="button"
          className="btn-app btn-app-secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          <FaTimes />
          Cancel
        </button>
        <button
          type="button"
          className="btn-app btn-app-primary"
          onClick={handleSaveAll}
          disabled={isSubmitting || rows.length === 0}
        >
          <FaSave />
          {isSubmitting ? 'Saving...' : 'Save All'}
        </button>
      </div>
    </div>
  );
};

export default BalanceBatchEditTable;
