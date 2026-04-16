'use client';

export type WorkflowTransactionStatus = 'completed' | 'pending' | 'cancelled' | 'refunded';
export type WorkflowPaymentMode = 'cash' | 'upi' | 'bank' | 'card';

export interface WorkflowTransactionSummaryInput {
  transactionNumber?: string;
  customerName: string;
  customerPhone?: string;
  service: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentMode: WorkflowPaymentMode;
  status: WorkflowTransactionStatus;
  departmentName?: string;
  accountLabel?: string;
  handledByName?: string;
  handledByRole?: 'Customer' | 'Employee';
  note?: string;
  date: string;
}

export interface WorkflowExpenseSummaryInput {
  amount: number;
  date: string;
  status?: 'Active' | 'Inactive';
}

export interface DailyClosingSummary {
  reportDate: string;
  transactionCount: number;
  completedCount: number;
  pendingCount: number;
  cancelledCount: number;
  refundedCount: number;
  grossAmount: number;
  collectedAmount: number;
  outstandingAmount: number;
  expenseAmount: number;
  netAmount: number;
  topService: string;
  busiestDepartment: string;
}

export const deriveTransactionStatus = (
  requestedStatus: WorkflowTransactionStatus,
  totalAmount: number,
  paidAmount: number,
) => {
  const dueAmount = Math.max(totalAmount - paidAmount, 0);

  if (requestedStatus === 'cancelled' || requestedStatus === 'refunded') {
    return {
      status: requestedStatus,
      dueAmount: 0,
    };
  }

  if (dueAmount === 0) {
    return {
      status: 'completed' as const,
      dueAmount: 0,
    };
  }

  return {
    status: 'pending' as const,
    dueAmount,
  };
};

export const getPostedTransactionAmount = (
  status: WorkflowTransactionStatus,
  paidAmount: number,
) => (status === 'completed' || status === 'pending' ? paidAmount : 0);

export const formatPaymentModeLabel = (paymentMode: WorkflowPaymentMode) => {
  if (paymentMode === 'upi') return 'UPI';
  return paymentMode.charAt(0).toUpperCase() + paymentMode.slice(1);
};

export const buildDailyClosingSummary = (
  transactions: WorkflowTransactionSummaryInput[],
  expenses: WorkflowExpenseSummaryInput[],
  reportDate: string,
): DailyClosingSummary => {
  const dailyTransactions = transactions.filter((transaction) => transaction.date === reportDate);
  const dailyExpenses = expenses.filter((expense) => expense.date === reportDate && expense.status !== 'Inactive');
  const serviceCounts = new Map<string, number>();
  const departmentCounts = new Map<string, number>();

  dailyTransactions.forEach((transaction) => {
    serviceCounts.set(transaction.service, (serviceCounts.get(transaction.service) || 0) + 1);

    if (transaction.departmentName) {
      departmentCounts.set(transaction.departmentName, (departmentCounts.get(transaction.departmentName) || 0) + 1);
    }
  });

  const topService = [...serviceCounts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] || 'No transactions';
  const busiestDepartment = [...departmentCounts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] || 'No department activity';
  const grossAmount = dailyTransactions.reduce((total, transaction) => total + transaction.totalAmount, 0);
  const collectedAmount = dailyTransactions.reduce((total, transaction) => total + getPostedTransactionAmount(transaction.status, transaction.paidAmount), 0);
  const outstandingAmount = dailyTransactions.reduce((total, transaction) => total + transaction.dueAmount, 0);
  const expenseAmount = dailyExpenses.reduce((total, expense) => total + expense.amount, 0);

  return {
    reportDate,
    transactionCount: dailyTransactions.length,
    completedCount: dailyTransactions.filter((transaction) => transaction.status === 'completed').length,
    pendingCount: dailyTransactions.filter((transaction) => transaction.status === 'pending').length,
    cancelledCount: dailyTransactions.filter((transaction) => transaction.status === 'cancelled').length,
    refundedCount: dailyTransactions.filter((transaction) => transaction.status === 'refunded').length,
    grossAmount,
    collectedAmount,
    outstandingAmount,
    expenseAmount,
    netAmount: collectedAmount - expenseAmount,
    topService,
    busiestDepartment,
  };
};

export const buildTransactionReceiptText = (transaction: WorkflowTransactionSummaryInput) => {
  const lines = [
    'eNest Service Receipt',
    '---------------------',
    `Transaction No: ${transaction.transactionNumber || 'Not assigned'}`,
    `Date: ${transaction.date}`,
    `Customer: ${transaction.customerName}`,
    `Phone: ${transaction.customerPhone || 'Not added'}`,
    `Service: ${transaction.service}`,
    `Payment Mode: ${formatPaymentModeLabel(transaction.paymentMode)}`,
    `Status: ${transaction.status}`,
    `Total Amount: Rs. ${transaction.totalAmount.toLocaleString('en-IN')}`,
    `Paid Amount: Rs. ${transaction.paidAmount.toLocaleString('en-IN')}`,
    `Due Amount: Rs. ${transaction.dueAmount.toLocaleString('en-IN')}`,
    `Department: ${transaction.departmentName || 'Not assigned'}`,
    `Account: ${transaction.accountLabel || 'Not linked'}`,
    `Handled By: ${transaction.handledByName || 'Not assigned'}${transaction.handledByRole ? ` (${transaction.handledByRole})` : ''}`,
    `Notes: ${transaction.note || 'No notes'}`,
  ];

  return lines.join('\r\n');
};
