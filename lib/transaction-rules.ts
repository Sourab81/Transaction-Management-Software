import {
  getDepartmentLinkedAccountIds,
  type Account,
  type Counter,
  type Transaction,
} from './store';

interface TransactionAmountValidationInput {
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: Transaction['status'];
}

interface TransactionAccountSelectionValidationInput {
  paymentMode: Transaction['paymentMode'];
  accountId?: string;
  paymentDetails?: Transaction['paymentDetails'];
  selectedAccount?: Account | null;
  selectedDepartment?: Counter | null;
}

const EPSILON = 0.0001;

const formatStatusLabel = (status: Transaction['status']) => {
  if (status === 'pending') return 'Pending';
  if (status === 'completed') return 'Completed';
  if (status === 'cancelled') return 'Cancelled';
  return 'Refunded';
};

const getPaymentReferenceNumber = (
  paymentMode: Transaction['paymentMode'],
  paymentDetails?: Transaction['paymentDetails'],
) => {
  if (!paymentDetails) {
    return '';
  }

  if (paymentMode === 'upi' && paymentDetails.kind === 'upi') {
    return paymentDetails.utrNumber || paymentDetails.transactionId;
  }

  if (paymentMode === 'card' && paymentDetails.kind === 'card') {
    return paymentDetails.transactionId;
  }

  if (paymentMode === 'bank' && paymentDetails.kind === 'bank') {
    return paymentDetails.bankTransactionReferenceNumber;
  }

  return '';
};

export const validateTransactionAmounts = ({
  totalAmount,
  paidAmount,
  dueAmount,
  status,
}: TransactionAmountValidationInput) => {
  const errors: string[] = [];

  if (totalAmount <= 0) {
    errors.push('Total amount must be greater than zero.');
  }

  if (paidAmount < 0) {
    errors.push('Paid amount cannot be negative.');
  }

  if (dueAmount < 0) {
    errors.push('Due amount cannot be negative.');
  }

  if (paidAmount > totalAmount) {
    errors.push('Paid amount cannot be more than the total amount.');
  }

  if (Math.abs((paidAmount + dueAmount) - totalAmount) > EPSILON) {
    errors.push('Paid amount and due amount must add up to the total amount.');
  }

  if (status === 'completed' && Math.abs(dueAmount) > EPSILON) {
    errors.push('Completed transactions must have zero due amount.');
  }

  if (status === 'pending' && Math.abs(dueAmount) <= EPSILON) {
    errors.push('Pending transactions cannot be fully paid. Mark the transaction as completed instead.');
  }

  return errors;
};

export const validateTransactionAccountSelection = ({
  paymentMode,
  accountId,
  paymentDetails,
  selectedAccount,
  selectedDepartment,
}: TransactionAccountSelectionValidationInput) => {
  const errors: string[] = [];

  if (paymentMode === 'cash') {
    return errors;
  }

  if (!accountId) {
    errors.push(`Select the active account for this ${paymentMode.toUpperCase()} transaction.`);
    return errors;
  }

  if (!selectedAccount) {
    errors.push(`The selected account for this ${paymentMode.toUpperCase()} transaction could not be found.`);
    return errors;
  }

  if (selectedAccount.status !== 'Active') {
    errors.push(`${selectedAccount.accountHolder} is inactive. Choose an active account before saving this transaction.`);
  }

  if (selectedDepartment) {
    const linkedAccountIds = getDepartmentLinkedAccountIds(selectedDepartment);
    if (linkedAccountIds.length > 0 && !linkedAccountIds.includes(selectedAccount.id)) {
      errors.push(`${selectedAccount.accountHolder} is not linked to ${selectedDepartment.name}.`);
    }
  }

  const referenceNumber = getPaymentReferenceNumber(paymentMode, paymentDetails).trim();
  if (!referenceNumber) {
    errors.push(`Enter the payment reference before saving this ${paymentMode.toUpperCase()} transaction.`);
  }

  return errors;
};

export const canTransitionTransactionStatus = (
  currentStatus: Transaction['status'],
  nextStatus: Transaction['status'],
) => {
  if (currentStatus === nextStatus) {
    return { allowed: true as const };
  }

  if (currentStatus === 'pending' && (nextStatus === 'completed' || nextStatus === 'cancelled')) {
    return { allowed: true as const };
  }

  if (currentStatus === 'completed' && nextStatus === 'refunded') {
    return { allowed: true as const };
  }

  if (currentStatus === 'completed' && nextStatus === 'cancelled') {
    return {
      allowed: false as const,
      error: 'Completed transactions cannot be cancelled directly. Use the refund flow instead.',
    };
  }

  if (currentStatus === 'cancelled') {
    return {
      allowed: false as const,
      error: 'Cancelled transactions cannot change status again.',
    };
  }

  if (currentStatus === 'refunded') {
    return {
      allowed: false as const,
      error: 'Refunded transactions cannot change status again.',
    };
  }

  return {
    allowed: false as const,
    error: `Cannot change transaction status from ${formatStatusLabel(currentStatus)} to ${formatStatusLabel(nextStatus)}.`,
  };
};
