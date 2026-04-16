'use client';

import React, { useMemo, useState } from 'react';
import { parseNonNegativeNumber } from '../../lib/number-validation';
import { deriveTransactionStatus } from '../../lib/transaction-workflow';
import {
  getDepartmentDefaultAccount,
  getDepartmentLinkedAccounts,
  getServicesForDepartment,
  type Account,
  type Counter,
  type Service,
  type Transaction,
} from '../../lib/store';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';

export interface TransactionEditorValues {
  serviceId: string;
  service: string;
  servicePrice: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentMode: Transaction['paymentMode'];
  paymentDetails?: Transaction['paymentDetails'];
  departmentId?: string;
  departmentName: string;
  accountId?: string;
  accountLabel: string;
  note?: string;
  status: Transaction['status'];
}

interface TransactionEditFormProps {
  accounts: Account[];
  departments: Counter[];
  initialValues: Transaction;
  lockDepartment?: boolean;
  services: Service[];
  submitLabel?: string;
  onCancel: () => void;
  onSubmit: (values: TransactionEditorValues) => void;
}

const TransactionEditForm: React.FC<TransactionEditFormProps> = ({
  accounts,
  departments,
  initialValues,
  lockDepartment = false,
  services,
  submitLabel = 'Save Changes',
  onCancel,
  onSubmit,
}) => {
  const [selectedServiceId, setSelectedServiceId] = useState(initialValues.serviceId);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(initialValues.departmentId || '');
  const [totalAmount, setTotalAmount] = useState(String(initialValues.totalAmount));
  const [paidAmount, setPaidAmount] = useState(String(initialValues.paidAmount));
  const [paymentMode, setPaymentMode] = useState<Transaction['paymentMode']>(initialValues.paymentMode);
  const [status, setStatus] = useState<Transaction['status']>(initialValues.status);
  const [note, setNote] = useState(initialValues.note || '');
  const [validationError, setValidationError] = useState('');

  const selectedDepartment = departments.find((department) => department.id === selectedDepartmentId);
  const departmentServices = useMemo(
    () => getServicesForDepartment(services, selectedDepartmentId),
    [selectedDepartmentId, services],
  );
  const selectedService = departmentServices.find((service) => service.id === selectedServiceId);
  const departmentAccounts = useMemo(
    () => getDepartmentLinkedAccounts(selectedDepartment, accounts),
    [accounts, selectedDepartment],
  );
  const defaultDepartmentAccount = useMemo(
    () => getDepartmentDefaultAccount(selectedDepartment, accounts),
    [accounts, selectedDepartment],
  );
  const [selectedAccountId, setSelectedAccountId] = useState(initialValues.accountId || defaultDepartmentAccount?.id || '');
  const resolvedSelectedAccountId = departmentAccounts.some((account) => account.id === selectedAccountId)
    ? selectedAccountId
    : defaultDepartmentAccount?.id || '';
  const selectedAccount = departmentAccounts.find((account) => account.id === resolvedSelectedAccountId) || defaultDepartmentAccount;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsedTotalAmount = parseNonNegativeNumber(totalAmount);
    const parsedPaidAmount = parseNonNegativeNumber(paidAmount);

    if (!selectedService) {
      setValidationError('Select a service before saving the transaction.');
      return;
    }

    if (parsedTotalAmount === null || parsedPaidAmount === null) {
      setValidationError('Amounts must be valid zero or positive numbers.');
      return;
    }

    if (parsedPaidAmount > parsedTotalAmount) {
      setValidationError('Paid amount cannot be more than the total amount.');
      return;
    }

    if (paymentMode !== 'cash') {
      if (departmentAccounts.length === 0) {
        setValidationError('Link at least one bank account to this department before saving a non-cash transaction.');
        return;
      }

      if (!selectedAccount) {
        setValidationError('Select the bank account for this non-cash transaction.');
        return;
      }
    }

    const normalizedStatus = deriveTransactionStatus(status, parsedTotalAmount, parsedPaidAmount);

    setValidationError('');
    onSubmit({
      serviceId: selectedService.id,
      service: selectedService.name,
      servicePrice: selectedService.price,
      totalAmount: parsedTotalAmount,
      paidAmount: parsedPaidAmount,
      dueAmount: normalizedStatus.dueAmount,
      paymentMode,
      paymentDetails: paymentMode === initialValues.paymentMode ? initialValues.paymentDetails : undefined,
      departmentId: selectedDepartment?.id,
      departmentName: selectedDepartment?.name || '',
      accountId: paymentMode === 'cash' ? undefined : selectedAccount?.id,
      accountLabel: paymentMode === 'cash'
        ? 'Cash'
        : selectedAccount
          ? `${selectedAccount.accountHolder} | ${selectedAccount.bankName}`
          : 'Not linked',
      note: note.trim(),
      status: normalizedStatus.status,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {validationError ? (
        <div className="form-alert" role="alert">
          {validationError}
        </div>
      ) : null}

      <div className="form-section-card mb-4">
        <div className="form-section-title mb-3">Transaction Reference</div>
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <div className="counter-chip h-100">
              <span className="page-muted small d-block">Transaction No.</span>
              <span className="fw-semibold">{initialValues.transactionNumber}</span>
              <span className="page-muted small d-block mt-2">Customer</span>
              <span className="fw-semibold">{initialValues.customerName}</span>
            </div>
          </div>
          <div className="col-12 col-md-6">
            <div className="counter-chip h-100">
              <span className="page-muted small d-block">Phone</span>
              <span className="fw-semibold">{initialValues.customerPhone || 'Not added'}</span>
              <span className="page-muted small d-block mt-2">Handled By</span>
              <span className="fw-semibold">{initialValues.handledByName || 'Not assigned'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="form-section-card mb-4">
        <div className="form-section-title mb-3">Service And Payment</div>
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <Select
              label="Service"
              value={departmentServices.some((service) => service.id === selectedServiceId) ? selectedServiceId : ''}
              onChange={(event) => {
                const nextServiceId = event.target.value;
                const nextService = departmentServices.find((service) => service.id === nextServiceId);
                setSelectedServiceId(nextServiceId);
                if (!nextService) {
                  return;
                }

                setTotalAmount(String(nextService.price));
                setPaidAmount((currentPaidAmount) => {
                  const parsedCurrentPaidAmount = parseNonNegativeNumber(currentPaidAmount);
                  if (parsedCurrentPaidAmount === null || parsedCurrentPaidAmount > nextService.price) {
                    return String(nextService.price);
                  }

                  return currentPaidAmount;
                });
              }}
              options={[
                { value: '', label: selectedDepartmentId ? 'Select Service' : 'Select Department First' },
                ...departmentServices.map((service) => ({
                  value: service.id,
                  label: `${service.name} | Rs. ${service.price}`,
                })),
              ]}
              required
            />
          </div>
          <div className="col-12 col-md-6">
            <Select
              label="Department"
              value={selectedDepartmentId}
              onChange={(event) => {
                if (lockDepartment) {
                  return;
                }

                const nextDepartmentId = event.target.value;
                const nextDepartmentServices = getServicesForDepartment(services, nextDepartmentId);
                setSelectedDepartmentId(nextDepartmentId);
                setSelectedServiceId((currentServiceId) =>
                  nextDepartmentServices.some((service) => service.id === currentServiceId)
                    ? currentServiceId
                    : '',
                );
              }}
              options={[
                { value: '', label: 'No Department' },
                ...departments.map((department) => ({
                  value: department.id,
                  label: `${department.name} (${department.code})`,
                })),
              ]}
              disabled={lockDepartment}
            />
            {lockDepartment ? (
              <p className="form-hint">Employees can save transactions only in their assigned department.</p>
            ) : null}
          </div>
          <div className="col-12 col-md-3">
            <Input
              label="Total Amount"
              type="number"
              min="0"
              value={totalAmount}
              onChange={(event) => setTotalAmount(event.target.value)}
              required
            />
          </div>
          <div className="col-12 col-md-3">
            <Input
              label="Paid Amount"
              type="number"
              min="0"
              value={paidAmount}
              onChange={(event) => setPaidAmount(event.target.value)}
              required
            />
          </div>
          <div className="col-12 col-md-3">
            <Select
              label="Payment Mode"
              value={paymentMode}
              onChange={(event) => setPaymentMode(event.target.value as Transaction['paymentMode'])}
              options={[
                { value: 'cash', label: 'Cash' },
                { value: 'upi', label: 'UPI' },
                { value: 'bank', label: 'Bank' },
                { value: 'card', label: 'Card' },
              ]}
            />
          </div>
          <div className="col-12 col-md-3">
            <Select
              label="Status"
              value={status}
              onChange={(event) => setStatus(event.target.value as Transaction['status'])}
              options={[
                { value: 'completed', label: 'Completed' },
                { value: 'pending', label: 'Pending' },
                { value: 'cancelled', label: 'Cancelled' },
                { value: 'refunded', label: 'Refunded' },
              ]}
            />
          </div>
          <div className="col-12 col-md-6">
            <div className="counter-chip h-100">
              <span className="page-muted small d-block">Default Account</span>
              <span className="fw-semibold">{defaultDepartmentAccount ? defaultDepartmentAccount.accountHolder : 'Not linked'}</span>
              <span className="page-muted small d-block mt-2">Due Amount</span>
              <span className="fw-semibold">
                Rs. {Math.max((parseNonNegativeNumber(totalAmount) || 0) - (parseNonNegativeNumber(paidAmount) || 0), 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
          {paymentMode !== 'cash' ? (
            <div className="col-12 col-md-6">
              {departmentAccounts.length > 1 ? (
                <Select
                  label="Transaction Account"
                  value={resolvedSelectedAccountId}
                  onChange={(event) => setSelectedAccountId(event.target.value)}
                  options={[
                    { value: '', label: 'Select Account' },
                    ...departmentAccounts.map((account) => ({
                      value: account.id,
                      label: `${account.accountHolder} | ${account.bankName}`,
                    })),
                  ]}
                />
              ) : (
                <div className="counter-chip h-100">
                  <span className="page-muted small d-block">Transaction Account</span>
                  <span className="fw-semibold">{selectedAccount ? `${selectedAccount.accountHolder} (Default)` : 'No linked account'}</span>
                  <span className="page-muted small d-block mt-2">Payment Mode</span>
                  <span className="fw-semibold">{paymentMode.toUpperCase()}</span>
                </div>
              )}
            </div>
          ) : null}
          <div className="col-12">
            <div className="app-field">
              <label className="form-label">Notes / Remarks</label>
              <textarea
                className="form-control"
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Update remarks, refund notes, or audit comments"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="modal-actions">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
};

export default TransactionEditForm;
