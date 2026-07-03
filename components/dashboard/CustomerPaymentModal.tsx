'use client';

import { useMemo, useState } from 'react';
import type { PayCustomerBalancePayload } from '../../lib/api/customerBalance';
import { formatCustomerBalance, getCustomerBalanceClassName } from '../../lib/customer-balance-format';
import type { Account } from '../../lib/store';
import ActionModal from '../ui/ActionModal';
import ConfirmActionModal from '../ui/state/ConfirmActionModal';

export interface CustomerPaymentTarget {
  customerId: number | string;
  customerName?: string;
  customerCode?: string;
  currentBalance: number | string;
  todayBalance?: number | string | null;
}

interface CustomerPaymentModalProps {
  target: CustomerPaymentTarget;
  accounts: Account[];
  counterId?: number | string | null;
  onClose: () => void;
  onPayment: (payload: PayCustomerBalancePayload) => Promise<boolean>;
  onSuccess?: () => void;
}

const getTodayDate = () => new Date().toLocaleDateString('en-CA');
const readNumericBalance = (balance: unknown) => {
  const numericBalance = Number(formatCustomerBalance(balance));
  return Number.isFinite(numericBalance) ? numericBalance : 0;
};
const formatCurrency = (amount: number) => {
  const absoluteAmount = Math.abs(amount);
  const formatted = `₹${absoluteAmount.toLocaleString('en-IN')}`;
  return amount < 0 ? `- ${formatted}` : formatted;
};
const formatPaymentAmount = (amount: number) => {
  const absoluteAmount = Math.abs(amount);
  const formatted = `₹${absoluteAmount.toLocaleString('en-IN')}`;
  return amount < 0 ? `-₹${absoluteAmount.toLocaleString('en-IN')}` : formatted;
};

const CustomerPaymentModal = ({
  target,
  accounts,
  counterId = null,
  onClose,
  onPayment,
  onSuccess,
}: CustomerPaymentModalProps) => {
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate] = useState(getTodayDate);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'account'>('cash');
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [paymentRemark, setPaymentRemark] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const currentBalance = readNumericBalance(target.currentBalance);
  const numericAmount = Number(paymentAmount);
  const hasPaymentAmount = Number.isFinite(numericAmount) && numericAmount !== 0;
  const newBalance = useMemo(
    () => currentBalance + (hasPaymentAmount ? numericAmount : 0),
    [currentBalance, hasPaymentAmount, numericAmount],
  );

  const validatePayment = () => {
    if (!target.customerId) return 'Customer is required.';
    if (!Number.isFinite(numericAmount) || numericAmount === 0) return 'Amount cannot be 0.';
    if (!paymentDate) return 'Date is required.';
    if (paymentMode === 'account' && !paymentAccountId) return 'Select an account for account payment.';
    return '';
  };

  const openConfirm = () => {
    const error = validatePayment();
    if (error) {
      setPaymentError(error);
      return;
    }

    setPaymentError('');
    setIsConfirmOpen(true);
  };

  const submitPayment = async () => {
    const error = validatePayment();
    if (error) {
      setPaymentError(error);
      return;
    }

    setIsSubmitting(true);
    setPaymentError('');
    const success = await onPayment({
      customerId: target.customerId,
      paymentAmount: numericAmount,
      paymentMode,
      accountId: paymentMode === 'account' ? paymentAccountId : null,
      counterId,
      paymentDate,
      remark: paymentRemark.trim() || null,
    });
    setIsSubmitting(false);

    if (!success) {
      setPaymentError(numericAmount < 0
        ? 'Unable to record negative payment. Backend support may be required for reversals.'
        : 'Unable to record customer payment.');
      return;
    }

    setIsConfirmOpen(false);
    onSuccess?.();
    onClose();
  };

  return (
    <>
      <ActionModal
        title="Pay Customer Balance"
        eyebrow="Customer Payment"
        onClose={onClose}
      >
        {paymentError ? (
          <div className="form-alert" role="alert">{paymentError}</div>
        ) : null}

        <div className="customer-payment-modal__summary customer-payment-modal__summary--compact">
          <div className="customer-payment-modal__info-item">
            <span>Customer Name</span>
            <strong>{target.customerName || `Customer #${target.customerId}`}</strong>
          </div>
          <div className="customer-payment-modal__info-item">
            <span>Customer Code</span>
            <strong>{target.customerCode || '-'}</strong>
          </div>
          <div className="customer-payment-modal__info-item">
            <span>Current Balance</span>
            <strong className={getCustomerBalanceClassName(target.currentBalance)}>
              {formatCustomerBalance(target.currentBalance)}
            </strong>
          </div>
          {typeof target.todayBalance !== 'undefined' && target.todayBalance !== null ? (
            <div className="customer-payment-modal__info-item">
              <span>Today's Balance</span>
              <strong className={getCustomerBalanceClassName(target.todayBalance)}>
                {formatCustomerBalance(target.todayBalance)}
              </strong>
            </div>
          ) : null}
        </div>

        <div className="row g-3">
          <div className="col-12 col-md-4">
            <label className="form-label" htmlFor="customer-balance-payment-amount">Payment Amount</label>
            <input
              className="form-control"
              id="customer-balance-payment-amount"
              step="any"
              type="number"
              value={paymentAmount}
              onChange={(event) => {
                setPaymentAmount(event.target.value);
                setPaymentError('');
              }}
            />
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label" htmlFor="customer-balance-payment-mode">Payment Mode</label>
            <select
              className="form-select"
              id="customer-balance-payment-mode"
              value={paymentMode}
              onChange={(event) => {
                setPaymentMode(event.target.value as 'cash' | 'account');
                setPaymentError('');
              }}
            >
              <option value="cash">Cash</option>
              <option value="account">Account</option>
            </select>
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label" htmlFor="customer-balance-payment-remark">Remark</label>
            <input
              className="form-control"
              id="customer-balance-payment-remark"
              value={paymentRemark}
              onChange={(event) => setPaymentRemark(event.target.value)}
            />
          </div>
          {paymentMode === 'account' ? (
            <div className="col-12">
              <label className="form-label" htmlFor="customer-balance-payment-account">Account</label>
              <select
                className="form-select"
                id="customer-balance-payment-account"
                value={paymentAccountId}
                onChange={(event) => {
                  setPaymentAccountId(event.target.value);
                  setPaymentError('');
                }}
              >
                <option value="">Select Account</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.accountHolder} | {account.bankName}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        <div className="customer-payment-modal__preview customer-payment-modal__preview--compact">
          <div>
            <span>Current Balance</span>
            <strong className={getCustomerBalanceClassName(currentBalance)}>
              {formatCurrency(currentBalance)}
            </strong>
          </div>
          <div>
            <span>Payment Received</span>
            <strong style={{ color: '#16A34A' }}>
              {hasPaymentAmount ? `+₹${Math.abs(numericAmount).toLocaleString('en-IN')}` : '₹0'}
            </strong>
          </div>
          <div>
            <span>Balance After Payment</span>
            <strong className={getCustomerBalanceClassName(newBalance)}>
              {formatCurrency(newBalance)}
            </strong>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-app btn-app-secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="button" className="btn-app btn-app-primary" onClick={openConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Paying...' : 'Pay'}
          </button>
        </div>
      </ActionModal>

      {isConfirmOpen ? (
        <ConfirmActionModal
          title="Confirm Payment"
          eyebrow="Customer Payment"
          description="Confirm before saving this customer payment."
          promptTitle="Are you sure you want to record this payment?"
          confirmLabel={isSubmitting ? 'Saving...' : 'Confirm'}
          isConfirming={isSubmitting}
          onConfirm={submitPayment}
          onCancel={() => {
            if (!isSubmitting) setIsConfirmOpen(false);
          }}
        >
          <div className="customer-payment-modal__confirm">
            <div><span>Customer</span><strong>{target.customerCode ? `${target.customerName} (${target.customerCode})` : target.customerName}</strong></div>
            <div>
              <span>Amount Received</span>
              <strong style={{ color: '#16A34A' }}>
                +₹{Math.abs(numericAmount).toLocaleString('en-IN')}
              </strong>
            </div>
            <div><span>Date</span><strong>{paymentDate}</strong></div>
          </div>
        </ConfirmActionModal>
      ) : null}
    </>
  );
};

export default CustomerPaymentModal;
