'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FaMoneyBillWave,
  FaLandmark,
  FaShoppingCart,
  FaCalculator,
  FaCloud,
} from 'react-icons/fa';
import { getTransactions } from '../../lib/api/transactions';
import { mapTransactionsResponse } from '../../lib/mappers/transaction-mapper';
import { getExpenses } from '../../lib/api/expenses';
import { mapExpensesResponse } from '../../lib/mappers/expense-mapper';
import { getLedgerReport, type LedgerEntry, type LedgerEntity } from '../../lib/api/reports';
import { getCustomerOutstanding } from '../../lib/api/customerOutstanding';
import { mapCustomerBalanceResponse } from '../../lib/mappers/customer-balance-mapper';
import type { CustomerBalance } from '../../lib/api/customerBalance';
import { getDailyReport, saveDailyReport } from '../../lib/api/dailyReports';
import {
  parseDailyReport,
  serializeServiceCharges,
  serializeEntityActivity,
  serializeExpenseInfo,
  serializeNetDetails,
  type ParsedDailyReport,
} from '../../lib/mappers/daily-report-mapper';
import { formatDate } from '../../src/utils/dateFormatter';
import type { Transaction } from '../../lib/store';
import type { ExpenseRecord } from '../../lib/api/expenses';
import type { DashboardTabContext } from '../dashboard/active-tab/types';

interface DayReportViewProps {
  ctx: DashboardTabContext;
}

const getTodayDateValue = () => {
  const date = new Date();
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 10);
};

const formatMoney = (amount: number) => `\u20B9${amount.toLocaleString('en-IN')}`;

const normalizeDate = (d: string): string => {
  const datePart = d.split(/[ T]/)[0];
  if (/^\d{2}-\d{2}-\d{4}$/.test(datePart)) {
    const [dd, mm, yyyy] = datePart.split('-');
    return `${yyyy}-${mm}-${dd}`;
  }
  return datePart;
};

export default function DayReportView({ ctx }: DayReportViewProps) {
  const { filteredTransactionRecords, expenses, counters, accounts, selectedCounter } = ctx;
  const today = getTodayDateValue();
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [apiTransactions, setApiTransactions] = useState<Transaction[]>([]);
  const [apiExpenses, setApiExpenses] = useState<ExpenseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [cachedReport, setCachedReport] = useState<ParsedDailyReport | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const savedForRef = useRef<string | null>(null);
  const isSingleDay = dateFrom === dateTo;
  const [ledgerRecords, setLedgerRecords] = useState<LedgerEntry[]>([]);
  const [ledgerEntities, setLedgerEntities] = useState<LedgerEntity[]>([]);
  const [customerBalances, setCustomerBalances] = useState<CustomerBalance[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setCachedReport(null);
      setLedgerRecords([]);
      setLedgerEntities([]);
      setCustomerBalances([]);
      savedForRef.current = null;

      if (dateFrom > dateTo) {
        if (!cancelled) setIsLoading(false);
        return;
      }

      if (isSingleDay) {
        try {
          const response = await getDailyReport(dateTo) as { data?: unknown; status?: number };
          if (cancelled) return;
          if (response?.data) {
            const parsed = parseDailyReport(response.data as any);
            if (parsed) {
              setCachedReport(parsed);
            }
          }
        } catch {
          // Cache miss — fall through to API fetch
        }
      }

      try {
        const [txResponse, exResponse] = await Promise.all([
          getTransactions({ dateFrom, dateTo, limit: 5000 }),
          getExpenses({ dateFrom, dateTo, limit: 5000 }),
        ]);
        if (!cancelled) {
          setApiTransactions(mapTransactionsResponse(txResponse));
          setApiExpenses(mapExpensesResponse(exResponse));
        }
      } catch (err) {
        console.error('[DayReportView] Failed to load data:', err);
        if (!cancelled) {
          setApiTransactions([]);
          setApiExpenses([]);
        }
      }

      try {
        const ledgerResponse = await getLedgerReport({
          dateFrom, dateTo, counterIds: [], accountIds: [], page: 1, limit: 99999,
        });
        if (!cancelled && ledgerResponse?.data) {
          setLedgerRecords(ledgerResponse.data.records);
          setLedgerEntities(ledgerResponse.data.entities);
        }
      } catch {
        if (!cancelled) { setLedgerRecords([]); setLedgerEntities([]); }
      }

      try {
        const raw = await getCustomerOutstanding({ pageNo: 1, limit: 10000, status: 1, dateTo });
        if (!cancelled) {
          setCustomerBalances(mapCustomerBalanceResponse(raw));
        }
      } catch {
        if (!cancelled) setCustomerBalances([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [dateFrom, dateTo, selectedCounter, isSingleDay]);

  const allTransactions = useMemo(() => {
    const seen = new Set<string>();
    const merged: Transaction[] = [];
    for (const tx of [...filteredTransactionRecords, ...apiTransactions]) {
      if (!seen.has(tx.id)) {
        seen.add(tx.id);
        merged.push(tx);
      }
    }
    return merged;
  }, [filteredTransactionRecords, apiTransactions]);

  const rangeTransactions = useMemo(
    () =>
      allTransactions.filter((tx) => {
        const d = normalizeDate(tx.date);
        return d >= dateFrom && d <= dateTo && (tx.status === 'completed' || tx.status === 'pending');
      }),
    [allTransactions, dateFrom, dateTo],
  );

  const allExpenses = useMemo(() => {
    const seen = new Set<string>();
    const out: { id: string; category: string; amount: number; status: string | number; date: string }[] = [];
    for (const e of expenses) {
      if (!seen.has(e.id)) { seen.add(e.id); out.push(e); }
    }
    for (const e of apiExpenses) {
      if (!seen.has(e.id)) {
        seen.add(e.id);
        out.push({
          id: e.id,
          category: e.category || e.title || '',
          amount: e.amount,
          status: e.status,
          date: e.date,
        });
      }
    }
    return out;
  }, [expenses, apiExpenses]);

  const rangeExpenses = useMemo(
    () => allExpenses.filter((e) => {
      const d = normalizeDate(e.date);
      const isInactive = e.status === 'Inactive' || e.status === '0' || e.status === 0;
      return d >= dateFrom && d <= dateTo && !isInactive;
    }),
    [allExpenses, dateFrom, dateTo],
  );

  const serviceCharges = useMemo(() => {
    const map = new Map<
      string,
      { serviceCharge: number; bankCharge: number; otherCharge: number; count: number }
    >();
    for (const tx of rangeTransactions) {
      const user = tx.handledByName || 'Unknown';
      const curr = map.get(user) || {
        serviceCharge: 0,
        bankCharge: 0,
        otherCharge: 0,
        count: 0,
      };
      curr.serviceCharge += tx.serviceCharge ?? 0;
      curr.bankCharge += tx.bankCharge ?? 0;
      curr.otherCharge += tx.otherCharge ?? 0;
      curr.count += 1;
      map.set(user, curr);
    }
    return Array.from(map.entries()).map(([user, data]) => ({ user, ...data }));
  }, [rangeTransactions]);

  const entityEntryMap = useMemo(() => {
    const map = new Map<string, LedgerEntry[]>();
    for (const entry of ledgerRecords) {
      const key = `${entry.entityType}_${entry.entityId}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(entry);
    }
    return map;
  }, [ledgerRecords]);

  const entityOpeningMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const ent of ledgerEntities) {
      map.set(`${ent.type}_${ent.id}`, ent.openingBalance);
    }
    return map;
  }, [ledgerEntities]);

  const accountDeptInfo = useMemo(() => {
    const result: Array<{
      id: string;
      name: string;
      type: 'Department' | 'Account';
      transactionAmount: number;
      noOfTx: number;
      openingBalance: number;
      closingBalance: number;
      diff: number;
    }> = [];

    for (const counter of counters) {
      const key = `counter_${counter.id}`;
      const entries = entityEntryMap.get(key) ?? [];
      const noOfTx = entries.length;
      const transactionAmount = entries.reduce((s, e) => s + e.debit + e.credit, 0);
      const netChange = entries.reduce((s, e) => s + e.credit - e.debit, 0);
      const cachedEntity = cachedReport?.entityActivity.find(e => e.id === counter.id && e.type === 'Department') ?? null;
      const ledgerOpening = entityOpeningMap.get(key);
      const openingBalance = ledgerOpening ?? cachedEntity?.openingBalance ?? counter.openingBalance;
      const closingBalance = cachedEntity?.closingBalance ?? (entries.length > 0 ? openingBalance + netChange : counter.currentBalance);
      result.push({
        id: counter.id,
        name: counter.code ? `${counter.code} / ${counter.name}` : counter.name,
        type: 'Department',
        transactionAmount,
        noOfTx,
        openingBalance,
        closingBalance,
        diff: closingBalance - openingBalance,
      });
    }

    for (const account of accounts) {
      const key = `account_${account.id}`;
      const entries = entityEntryMap.get(key) ?? [];
      const noOfTx = entries.length;
      const transactionAmount = entries.reduce((s, e) => s + e.debit + e.credit, 0);
      const netChange = entries.reduce((s, e) => s + e.credit - e.debit, 0);
      const cachedEntity = cachedReport?.entityActivity.find(e => e.id === account.id && e.type === 'Account') ?? null;
      const ledgerOpening = entityOpeningMap.get(key);
      const openingBalance = ledgerOpening ?? cachedEntity?.openingBalance ?? account.openingBalance;
      const closingBalance = cachedEntity?.closingBalance ?? (entries.length > 0 ? openingBalance + netChange : account.currentBalance);
      result.push({
        id: account.id,
        name: `${account.bankName} - ${account.accountHolder}`,
        type: 'Account',
        transactionAmount,
        noOfTx,
        openingBalance,
        closingBalance,
        diff: closingBalance - openingBalance,
      });
    }

    return result;
  }, [entityEntryMap, entityOpeningMap, cachedReport, counters, accounts]);

  const expenseInfo = useMemo(
    () => rangeExpenses.map((e) => ({ category: e.category, amount: e.amount })),
    [rangeExpenses],
  );

  const netDetails = useMemo(() => {
    const totalOpeningBalance = accountDeptInfo.reduce((s, e) => s + e.openingBalance, 0);
    const totalClosingBalance = accountDeptInfo.reduce((s, e) => s + e.closingBalance, 0);
    const accountDiff = totalClosingBalance - totalOpeningBalance;
    const sumOutstanding = customerBalances.length > 0
      ? customerBalances.reduce((s, row) => {
          const val = typeof row.currentBalanceStatus === 'number'
            ? row.currentBalanceStatus
            : Number(row.currentBalanceStatus) || 0;
          return s + val;
        }, 0)
      : rangeTransactions.reduce((s, tx) => s + (tx.dueAmount ?? 0), 0);
    const totalExpense = expenseInfo.reduce((s, e) => s + e.amount, 0);
    const totalCharges = serviceCharges.reduce(
      (s, u) => s + u.serviceCharge + u.bankCharge + u.otherCharge,
      0,
    );
    const entityBalances = accountDeptInfo.map((e) => ({
      name: e.name,
      type: e.type,
      openingBalance: e.openingBalance,
      closingBalance: e.closingBalance,
    }));
    const grandTotal = accountDiff - sumOutstanding + totalExpense - totalCharges;
    return { totalOpeningBalance, totalClosingBalance, entityBalances, accountDiff, sumOutstanding, totalExpense, totalCharges, tax: 0, grandTotal };
  }, [accountDeptInfo, rangeTransactions, expenseInfo, serviceCharges, customerBalances]);

  useEffect(() => {
    if (!isSingleDay || isSaving) return;
    const cacheKey = `${dateTo}_${selectedCounter?.id || ''}`;
    if (savedForRef.current === cacheKey) return;
    if (isLoading) return;
    if (serviceCharges.length === 0 && accountDeptInfo.length === 0 && expenseInfo.length === 0) return;

    setIsSaving(true);
    savedForRef.current = cacheKey;
    saveDailyReport({
      reportDate: dateTo,
      serviceCharges: serializeServiceCharges(serviceCharges),
      entityActivity: serializeEntityActivity(accountDeptInfo),
      expenseInfo: serializeExpenseInfo(expenseInfo),
      netDetails: serializeNetDetails(netDetails),
    }).finally(() => {
      setIsSaving(false);
    });
  }, [isSingleDay, isSaving, isLoading, dateTo, selectedCounter,
    serviceCharges, accountDeptInfo, expenseInfo, netDetails]);

  const chargesTotals = useMemo(
    () => ({
      serviceCharge: serviceCharges.reduce((s, u) => s + u.serviceCharge, 0),
      bankCharge: serviceCharges.reduce((s, u) => s + u.bankCharge, 0),
      otherCharge: serviceCharges.reduce((s, u) => s + u.otherCharge, 0),
      count: serviceCharges.reduce((s, u) => s + u.count, 0),
    }),
    [serviceCharges],
  );

  const hasExpenses = rangeExpenses.length > 0;
  const hasServiceCharges = serviceCharges.length > 0;
  const hasActivity = rangeTransactions.length > 0 || ledgerRecords.length > 0 || hasExpenses || hasServiceCharges;
  const hasAccountDeptActivity = accountDeptInfo.length > 0;

  const accountDeptTotalTx = accountDeptInfo.reduce((s, e) => s + e.noOfTx, 0);
  const accountDeptTotalAmount = accountDeptInfo.reduce((s, e) => s + e.transactionAmount, 0);
  const accountDeptTotalDiff = accountDeptInfo.reduce((s, e) => s + e.diff, 0);

  return (
    <div className="row g-4">
      {/* Date Filter */}
      <div className="col-12">
        <div className="form-section-card">
          <div className="d-flex flex-wrap align-items-end justify-content-between gap-3">
            <div>
              <p className="eyebrow mb-1">Day Report</p>
              <h3 className="table-panel__title mb-0">
                Daily Activity Summary &mdash; {formatDate(dateFrom)} to {formatDate(dateTo)}
              </h3>
            </div>
            <div className="d-flex flex-wrap align-items-end gap-3">
              {isSaving ? (
                <span className="badge bg-warning text-dark">
                  <FaCloud className="me-1" /> Saving&hellip;
                </span>
              ) : null}
              <label className="table-toolbar__field">
                <span>From</span>
                <input
                  type="date"
                  className="form-control"
                  value={dateFrom}
                  max={dateTo}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </label>
              <label className="table-toolbar__field">
                <span>To</span>
                <input
                  type="date"
                  className="form-control"
                  value={dateTo}
                  min={dateFrom}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </label>
              {isLoading ? <span className="spinner-border spinner-border-sm" role="status" /> : null}
            </div>
          </div>
        </div>
      </div>

      {/* Table 1: Service Charges */}
      <div className="col-12">
        <div className="form-section-card">
          <p className="eyebrow mb-1">Service Collection</p>
          <h3 className="table-panel__title mb-3">
            <FaMoneyBillWave className="me-2" />
            Service Charges
          </h3>
          {!hasServiceCharges ? (
            <p className="text-muted mb-0">No service charges recorded for this date.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered table-hover mb-0">
                <thead>
                  <tr>
                    <th>User</th>
                    <th className="text-end">Service Charge</th>
                    <th className="text-end">Bank Charge</th>
                    <th className="text-end">Other Charge</th>
                    <th className="text-end">No. of Transactions</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceCharges.map((row) => (
                    <tr key={row.user}>
                      <td>{row.user}</td>
                      <td className="text-end">{formatMoney(row.serviceCharge)}</td>
                      <td className="text-end">{formatMoney(row.bankCharge)}</td>
                      <td className="text-end">{formatMoney(row.otherCharge)}</td>
                      <td className="text-end">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="fw-semibold">
                    <td>Total</td>
                    <td className="text-end">{formatMoney(chargesTotals.serviceCharge)}</td>
                    <td className="text-end">{formatMoney(chargesTotals.bankCharge)}</td>
                    <td className="text-end">{formatMoney(chargesTotals.otherCharge)}</td>
                    <td className="text-end">{chargesTotals.count}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Table 2: Account/Department Information */}
      <div className="col-12">
        <div className="form-section-card">
          <p className="eyebrow mb-1">Entity Activity</p>
          <h3 className="table-panel__title mb-3">
            <FaLandmark className="me-2" />
            Account / Department Information
          </h3>
          {!hasAccountDeptActivity ? (
            <p className="text-muted mb-0">No account or department activity for this date.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered table-hover mb-0">
                <thead>
                  <tr>
                    <th>Account / Department</th>
                    <th className="text-end">No. of Transactions</th>
                    <th className="text-end">Transaction Amount</th>
                    <th className="text-end">Opening Balance</th>
                    <th className="text-end">Closing Balance</th>
                    <th className="text-end">Difference</th>
                  </tr>
                </thead>
                <tbody>
                  {accountDeptInfo.map((row) => (
                    <tr key={`${row.type}_${row.id}`}>
                      <td>
                        <span className="badge bg-light text-dark me-1">
                          {row.type === 'Department' ? 'Dept' : 'Acc'}
                        </span>
                        {row.name}
                      </td>
                      <td className="text-end">{row.noOfTx}</td>
                      <td className="text-end">{formatMoney(row.transactionAmount)}</td>
                      <td className="text-end">{formatMoney(row.openingBalance)}</td>
                      <td className="text-end">{formatMoney(row.closingBalance)}</td>
                      <td className="text-end fw-semibold">{formatMoney(row.diff)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="fw-semibold">
                    <td>Total</td>
                    <td className="text-end">{accountDeptTotalTx}</td>
                    <td className="text-end">{formatMoney(accountDeptTotalAmount)}</td>
                    <td className="text-end">{formatMoney(netDetails.totalOpeningBalance)}</td>
                    <td className="text-end">{formatMoney(netDetails.totalClosingBalance)}</td>
                    <td className="text-end">{formatMoney(accountDeptTotalDiff)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Table 3: Expense Information */}
      <div className="col-12">
        <div className="form-section-card">
          <p className="eyebrow mb-1">Expenses</p>
          <h3 className="table-panel__title mb-3">
            <FaShoppingCart className="me-2" />
            Expense Information
          </h3>
          {!hasExpenses ? (
            <p className="text-muted mb-0">No expenses recorded for this date.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered mb-0">
                <thead>
                  <tr>
                    <th>Expense Type</th>
                    <th className="text-end">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {expenseInfo.map((row, idx) => (
                    <tr key={idx}>
                      <td>{row.category}</td>
                      <td className="text-end">{formatMoney(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="fw-semibold">
                    <td>Total</td>
                    <td className="text-end">{formatMoney(netDetails.totalExpense)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Table 4: Net Details */}
      <div className="col-12">
        <div className="form-section-card">
          <p className="eyebrow mb-1">Summary</p>
          <h3 className="table-panel__title mb-3">
            <FaCalculator className="me-2" />
            Net Details
          </h3>
          {!hasActivity ? (
            <p className="text-muted mb-0">
              No transactions or expenses for this date. All values are zero.
            </p>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered mb-0">
                <tbody>
                  <tr>
                    <td style={{ width: '50%' }}>Total Opening Balance</td>
                    <td className="text-end fw-semibold">
                      {formatMoney(netDetails.totalOpeningBalance)}
                    </td>
                  </tr>
                  <tr>
                    <td>Total Closing Balance</td>
                    <td className="text-end fw-semibold">
                      {formatMoney(netDetails.totalClosingBalance)}
                    </td>
                  </tr>
                  <tr>
                    <td>Account Difference</td>
                    <td className="text-end fw-semibold">
                      {formatMoney(netDetails.accountDiff)}
                    </td>
                  </tr>
                  <tr>
                    <td>Sum of Net Outstanding</td>
                    <td className="text-end fw-semibold">
                      {formatMoney(netDetails.sumOutstanding)}
                    </td>
                  </tr>
                  <tr>
                    <td>Total Expense</td>
                    <td className="text-end fw-semibold">
                      {formatMoney(netDetails.totalExpense)}
                    </td>
                  </tr>
                  <tr>
                    <td>Total (Service + Bank + Other) Charges</td>
                    <td className="text-end fw-semibold">
                      {formatMoney(netDetails.totalCharges)}
                    </td>
                  </tr>
                  <tr>
                    <td>Total Tax</td>
                    <td className="text-end fw-semibold">{formatMoney(netDetails.tax)}</td>
                  </tr>
                  <tr className="fw-bold">
                    <td>Grand Total</td>
                    <td className="text-end">{formatMoney(netDetails.grandTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
