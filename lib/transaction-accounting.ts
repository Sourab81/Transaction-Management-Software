import { getPostedTransactionAmount } from './transaction-workflow';

interface TransactionAccountingSubject {
  status: 'completed' | 'pending' | 'cancelled' | 'refunded';
  paidAmount: number;
  accountId?: string;
  departmentId?: string;
  isDeleted?: boolean;
}

export interface BalanceDelta {
  recordId: string;
  delta: number;
}

export interface TransactionUpdateDelta {
  accountDeltas: BalanceDelta[];
  departmentDeltas: BalanceDelta[];
  previousImpactAmount: number;
  nextImpactAmount: number;
}

const appendDelta = (
  deltas: BalanceDelta[],
  recordId: string | undefined,
  delta: number,
) => {
  if (!recordId || delta === 0) {
    return deltas;
  }

  const existingDelta = deltas.find((item) => item.recordId === recordId);
  if (existingDelta) {
    existingDelta.delta += delta;
    return deltas;
  }

  deltas.push({ recordId, delta });
  return deltas;
};

export const getTransactionImpactAmount = (
  transaction: TransactionAccountingSubject | null | undefined,
) => {
  if (!transaction || transaction.isDeleted) {
    return 0;
  }

  return getPostedTransactionAmount(transaction.status, transaction.paidAmount);
};

export const getTransactionUpdateDelta = (
  previousTransaction: TransactionAccountingSubject | null | undefined,
  nextTransaction: TransactionAccountingSubject | null | undefined,
): TransactionUpdateDelta => {
  const previousImpactAmount = getTransactionImpactAmount(previousTransaction);
  const nextImpactAmount = getTransactionImpactAmount(nextTransaction);
  const accountDeltas: BalanceDelta[] = [];
  const departmentDeltas: BalanceDelta[] = [];

  appendDelta(accountDeltas, previousTransaction?.accountId, -previousImpactAmount);
  appendDelta(accountDeltas, nextTransaction?.accountId, nextImpactAmount);
  appendDelta(departmentDeltas, previousTransaction?.departmentId, -previousImpactAmount);
  appendDelta(departmentDeltas, nextTransaction?.departmentId, nextImpactAmount);

  return {
    accountDeltas: accountDeltas.filter((delta) => delta.delta !== 0),
    departmentDeltas: departmentDeltas.filter((delta) => delta.delta !== 0),
    previousImpactAmount,
    nextImpactAmount,
  };
};
