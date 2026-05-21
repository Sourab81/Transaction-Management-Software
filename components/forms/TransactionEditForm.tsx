'use client';

import React, { useMemo, useState } from 'react';
import { parseNonNegativeNumber } from '../../lib/number-validation';
import type { Account, Service, Transaction } from '../../lib/store';
import Button from '../ui/Button';

export interface TransactionEditorValues {
  formName: string;
  transactionNo: string;
  serviceProduct: string;
  inventoryItemId?: string;
  inventoryItemType?: 'service' | 'product';
  transactionAccountId: string;
  amount: number;
  serviceCharge: number;
  bankCharge: number;
  otherCharge: number;
  totalAmount: number;
  remark: string;
}

interface TransactionEditorDraftRow {
  formName: string;
  transactionNo: string;
  serviceProduct: string;
  inventoryItemId: string;
  transactionAccountId: string;
  amount: string;
  serviceCharge: string;
  bankCharge: string;
  otherCharge: string;
  remark: string;
}

type SavedTransactionRow = TransactionEditorValues & { id: string };

interface TransactionEditFormProps {
  accounts: Account[];
  initialValues: Transaction;
  services: Service[];
  isSubmitting?: boolean;
  submitLabel?: string;
  onCancel: () => void;
  onSubmit: (values: TransactionEditorValues[]) => void | Promise<void>;
}

const numberToFieldValue = (value: number | undefined) => (
  typeof value === 'number' && Number.isFinite(value) ? String(value) : ''
);

const getInitialAmount = (transaction: Transaction) => (
  typeof transaction.amount === 'number'
    ? transaction.amount
    : typeof transaction.totalAmount === 'number'
      ? transaction.totalAmount
      : 0
);

const toSafeAmount = (value: string) => parseNonNegativeNumber(value) ?? 0;

const createEmptyRow = (): TransactionEditorDraftRow => ({
  formName: '',
  transactionNo: '',
  serviceProduct: '',
  inventoryItemId: '',
  transactionAccountId: '',
  amount: '',
  serviceCharge: '0',
  bankCharge: '0',
  otherCharge: '0',
  remark: '',
});

const isCurrentRowEmpty = (row: TransactionEditorDraftRow) => (
  !row.formName.trim()
  && !row.transactionNo.trim()
  && !row.serviceProduct.trim()
  && !row.inventoryItemId
  && !row.transactionAccountId
  && !row.amount.trim()
  && !row.remark.trim()
  && toSafeAmount(row.serviceCharge) === 0
  && toSafeAmount(row.bankCharge) === 0
  && toSafeAmount(row.otherCharge) === 0
);

const TransactionEditForm: React.FC<TransactionEditFormProps> = ({
  accounts,
  initialValues,
  services,
  isSubmitting = false,
  submitLabel = 'Save Changes',
  onCancel,
  onSubmit,
}) => {
  const initialInventoryItemId = initialValues.inventoryItemId || initialValues.serviceId || '';

  // currentRow is the active entry row shown at the top of the table.
  const [currentRow, setCurrentRow] = useState<TransactionEditorDraftRow>({
    formName: initialValues.formName || '',
    transactionNo: initialValues.transactionNo || initialValues.transactionNumber || '',
    serviceProduct: initialValues.serviceProduct || initialValues.service || '',
    inventoryItemId: initialInventoryItemId,
    transactionAccountId: initialValues.transactionAccountId || initialValues.accountId || '',
    amount: numberToFieldValue(getInitialAmount(initialValues)),
    serviceCharge: numberToFieldValue(initialValues.serviceCharge ?? 0),
    bankCharge: numberToFieldValue(initialValues.bankCharge ?? 0),
    otherCharge: numberToFieldValue(initialValues.otherCharge ?? 0),
    remark: initialValues.remark || initialValues.note || '',
  });
  // savedRows are completed rows already moved out of the active entry row.
  const [savedRows, setSavedRows] = useState<SavedTransactionRow[]>([]);
  const [validationError, setValidationError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const currentAmounts = useMemo(() => ({
    amount: toSafeAmount(currentRow.amount),
    serviceCharge: toSafeAmount(currentRow.serviceCharge),
    bankCharge: toSafeAmount(currentRow.bankCharge),
    otherCharge: toSafeAmount(currentRow.otherCharge),
  }), [currentRow.amount, currentRow.bankCharge, currentRow.otherCharge, currentRow.serviceCharge]);

  const currentTotal = useMemo(() => (
    currentAmounts.amount
    + currentAmounts.serviceCharge
    + currentAmounts.bankCharge
    + currentAmounts.otherCharge
  ), [currentAmounts]);

  const totals = useMemo(() => {
    const base = {
      amount: isCurrentRowEmpty(currentRow) ? 0 : currentAmounts.amount,
      serviceCharge: isCurrentRowEmpty(currentRow) ? 0 : currentAmounts.serviceCharge,
      bankCharge: isCurrentRowEmpty(currentRow) ? 0 : currentAmounts.bankCharge,
      otherCharge: isCurrentRowEmpty(currentRow) ? 0 : currentAmounts.otherCharge,
      totalAmount: isCurrentRowEmpty(currentRow) ? 0 : currentTotal,
    };

    return savedRows.reduce((nextTotals, row) => ({
      amount: nextTotals.amount + row.amount,
      serviceCharge: nextTotals.serviceCharge + row.serviceCharge,
      bankCharge: nextTotals.bankCharge + row.bankCharge,
      otherCharge: nextTotals.otherCharge + row.otherCharge,
      totalAmount: nextTotals.totalAmount + row.totalAmount,
    }), base);
  }, [currentAmounts, currentRow, currentTotal, savedRows]);

  const accountOptions = [
    { value: '', label: accounts.length > 0 ? 'Select Account' : 'No accounts available' },
    ...(currentRow.transactionAccountId && !accounts.some((account) => account.id === currentRow.transactionAccountId)
      ? [{ value: currentRow.transactionAccountId, label: initialValues.accountLabel || currentRow.transactionAccountId }]
      : []),
    ...accounts.map((account) => ({
      value: account.id,
      label: `${account.accountHolder} | ${account.bankName}`,
    })),
  ];

  const legacyServiceOptionValue = currentRow.serviceProduct ? `legacy:${currentRow.serviceProduct}` : '';
  const serviceOptions = [
    { value: '', label: 'Select' },
    ...(initialInventoryItemId && !services.some((service) => service.id === initialInventoryItemId)
      ? [{ value: initialInventoryItemId, label: currentRow.serviceProduct || initialInventoryItemId }]
      : []),
    ...(!initialInventoryItemId && currentRow.serviceProduct && !services.some((service) => service.name === currentRow.serviceProduct)
      ? [{ value: legacyServiceOptionValue, label: currentRow.serviceProduct }]
      : []),
    ...services.map((service) => ({
      value: service.id,
      label: `${service.name} - ${service.type === 'product' ? 'Product' : 'Service'}`,
    })),
  ];

  const isSubmitDisabled = isSubmitting || isSaving;
  const saveButtonLabel = isSubmitDisabled
    ? 'Saving...'
    : submitLabel === 'Save Changes'
      ? 'Save Transaction'
      : submitLabel;

  const updateCurrentRow = (values: Partial<TransactionEditorDraftRow>) => {
    setCurrentRow((row) => ({ ...row, ...values }));
    setValidationError('');
  };

  const handleServiceProductChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextValue = event.target.value;
    if (nextValue.startsWith('legacy:')) {
      updateCurrentRow({
        inventoryItemId: '',
        serviceProduct: nextValue.replace(/^legacy:/, ''),
      });
      return;
    }

    const selectedService = services.find((service) => service.id === nextValue);

    updateCurrentRow({
      inventoryItemId: nextValue,
      serviceProduct: selectedService?.name || '',
      ...(selectedService && selectedService.price > 0 ? { amount: String(selectedService.price) } : {}),
    });
  };

  const buildRowPayload = (
    row: TransactionEditorDraftRow,
    validationMode: 'add' | 'save',
  ): TransactionEditorValues | null => {
    if (isCurrentRowEmpty(row)) {
      if (validationMode === 'add') {
        setValidationError('Please fill transaction details before adding a row.');
      }
      return null;
    }

    if (!row.formName.trim() || !row.serviceProduct.trim() || !row.transactionAccountId || !row.amount.trim()) {
      setValidationError('Form Name, Service/Product, Transaction Account, and Amount are required.');
      return null;
    }

    const amountValue = toSafeAmount(row.amount);
    const serviceChargeValue = toSafeAmount(row.serviceCharge);
    const bankChargeValue = toSafeAmount(row.bankCharge);
    const otherChargeValue = toSafeAmount(row.otherCharge);
    const selectedService = services.find((service) => service.id === row.inventoryItemId);

    return {
      formName: row.formName.trim(),
      transactionNo: row.transactionNo.trim(),
      serviceProduct: row.serviceProduct.trim(),
      inventoryItemId: row.inventoryItemId || undefined,
      inventoryItemType: selectedService?.type || undefined,
      transactionAccountId: row.transactionAccountId,
      amount: amountValue,
      serviceCharge: serviceChargeValue,
      bankCharge: bankChargeValue,
      otherCharge: otherChargeValue,
      totalAmount: amountValue + serviceChargeValue + bankChargeValue + otherChargeValue,
      remark: row.remark.trim(),
    };
  };

  const handleAddRow = () => {
    if (isSubmitDisabled) return;

    const payload = buildRowPayload(currentRow, 'add');
    if (!payload) return;

    // Add Row moves currentRow into savedRows and clears currentRow for the next entry.
    setSavedRows((rows) => [{ ...payload, id: `${Date.now()}-${rows.length}` }, ...rows]);
    setCurrentRow(createEmptyRow());
    setValidationError('');
  };

  const handleRemoveSavedRow = (rowId: string) => {
    setSavedRows((rows) => rows.filter((row) => row.id !== rowId));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitDisabled) return;

    const currentIsEmpty = isCurrentRowEmpty(currentRow);
    const currentPayload = currentIsEmpty ? null : buildRowPayload(currentRow, 'save');
    if (!currentPayload && currentIsEmpty && savedRows.length === 0) {
      setValidationError('Please fill transaction details before saving.');
      return;
    }

    if (!currentPayload && !currentIsEmpty) return;

    const rowsToSubmit = [
      ...(currentPayload ? [currentPayload] : []),
      ...savedRows,
    ];

    setValidationError('');
    setIsSaving(true);
    try {
      await onSubmit(rowsToSubmit);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      {validationError ? (
        <div className="form-alert" role="alert">
          {validationError}
        </div>
      ) : null}

      <div className="form-section-card mb-4">
        <div className="transaction-entry-table transaction-entry-table--editor data-table-wrapper overflow-x-auto w-full">
          <table className="table data-table transaction-entry-table__grid transaction-entry-table__grid--transaction-form transaction-entry-table__grid--edit-form whitespace-nowrap">
            <thead>
              <tr>
                <th>Form Name</th>
                <th>No. of Txn</th>
                <th>Service/Product</th>
                <th>Transaction Account</th>
                <th>Amount</th>
                <th>Service Charge</th>
                <th>Bank Charge</th>
                <th>Other Charge</th>
                <th>Total Amount</th>
                <th>Remark</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td data-label="Form Name">
                  <div className="app-field">
                    <input
                      aria-label="Form Name"
                      className="form-control"
                      placeholder="Enter Name"
                      value={currentRow.formName}
                      onChange={(event) => updateCurrentRow({ formName: event.target.value })}
                      required
                    />
                  </div>
                </td>
                <td data-label="No. of Txn">
                  <div className="app-field">
                    <input
                      aria-label="No. of Txn"
                      className="form-control"
                      placeholder="TXN"
                      value={currentRow.transactionNo}
                      onChange={(event) => updateCurrentRow({ transactionNo: event.target.value })}
                    />
                  </div>
                </td>
                <td data-label="Service/Product">
                  <div className="app-field">
                    {services.length > 0 ? (
                      <select
                        aria-label="Service/Product"
                        className="form-select"
                        value={currentRow.inventoryItemId || legacyServiceOptionValue}
                        onChange={handleServiceProductChange}
                        required
                      >
                        {serviceOptions.map((option) => (
                          <option key={option.value || option.label} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        aria-label="Service/Product"
                        className="form-control"
                        placeholder="Service/Product"
                        value={currentRow.serviceProduct}
                        onChange={(event) => updateCurrentRow({ serviceProduct: event.target.value })}
                        required
                      />
                    )}
                  </div>
                </td>
                <td data-label="Transaction Account">
                  <div className="app-field">
                    <select
                      aria-label="Transaction Account"
                      className="form-select"
                      value={currentRow.transactionAccountId}
                      onChange={(event) => updateCurrentRow({ transactionAccountId: event.target.value })}
                      required
                    >
                      {accountOptions.map((option) => (
                        <option key={option.value || option.label} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
                <td data-label="Amount">
                  <div className="app-field">
                    <input
                      aria-label="Amount"
                      className="form-control"
                      min="0"
                      placeholder="Rs. 0"
                      type="number"
                      value={currentRow.amount}
                      onChange={(event) => updateCurrentRow({ amount: event.target.value })}
                      required
                    />
                  </div>
                </td>
                <td data-label="Service Charge">
                  <div className="app-field">
                    <input
                      aria-label="Service Charge"
                      className="form-control"
                      min="0"
                      placeholder="Rs. 0"
                      type="number"
                      value={currentRow.serviceCharge}
                      onChange={(event) => updateCurrentRow({ serviceCharge: event.target.value })}
                    />
                  </div>
                </td>
                <td data-label="Bank Charge">
                  <div className="app-field">
                    <input
                      aria-label="Bank Charge"
                      className="form-control"
                      min="0"
                      placeholder="Rs. 0"
                      type="number"
                      value={currentRow.bankCharge}
                      onChange={(event) => updateCurrentRow({ bankCharge: event.target.value })}
                    />
                  </div>
                </td>
                <td data-label="Other Charge">
                  <div className="app-field">
                    <input
                      aria-label="Other Charge"
                      className="form-control"
                      min="0"
                      placeholder="Rs. 0"
                      type="number"
                      value={currentRow.otherCharge}
                      onChange={(event) => updateCurrentRow({ otherCharge: event.target.value })}
                    />
                  </div>
                </td>
                <td data-label="Total Amount">
                  <div className="app-field">
                    <input
                      aria-label="Total Amount"
                      className="form-control"
                      min="0"
                      readOnly
                      type="number"
                      value={currentTotal}
                    />
                  </div>
                </td>
                <td data-label="Remark">
                  <div className="app-field">
                    <input
                      aria-label="Remark"
                      className="form-control"
                      placeholder="Remark"
                      value={currentRow.remark}
                      onChange={(event) => updateCurrentRow({ remark: event.target.value })}
                    />
                  </div>
                </td>
              </tr>
              {savedRows.map((row) => (
                <tr key={row.id}>
                  <td data-label="Form Name">{row.formName}</td>
                  <td data-label="No. of Txn">{row.transactionNo || '-'}</td>
                  <td data-label="Service/Product">{row.serviceProduct}</td>
                  <td data-label="Transaction Account">
                    {accounts.find((account) => account.id === row.transactionAccountId)
                      ? `${accounts.find((account) => account.id === row.transactionAccountId)?.accountHolder} | ${accounts.find((account) => account.id === row.transactionAccountId)?.bankName}`
                      : row.transactionAccountId}
                  </td>
                  <td data-label="Amount">{row.amount}</td>
                  <td data-label="Service Charge">{row.serviceCharge}</td>
                  <td data-label="Bank Charge">{row.bankCharge}</td>
                  <td data-label="Other Charge">{row.otherCharge}</td>
                  <td data-label="Total Amount">{row.totalAmount}</td>
                  <td data-label="Remark">
                    <div className="transaction-entry-table__saved-remark">
                      <span>{row.remark || '-'}</span>
                      <button
                        type="button"
                        className="transaction-entry-table__remove-row"
                        onClick={() => handleRemoveSavedRow(row.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              <tr className="transaction-entry-table__total-row">
                <td colSpan={4}>Total</td>
                <td data-label="Amount">{totals.amount}</td>
                <td data-label="Service Charge">{totals.serviceCharge}</td>
                <td data-label="Bank Charge">{totals.bankCharge}</td>
                <td data-label="Other Charge">{totals.otherCharge}</td>
                <td data-label="Total Amount">{totals.totalAmount}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="modal-actions transaction-entry-table__actions">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" variant="secondary" onClick={handleAddRow} disabled={isSubmitDisabled}>
          Add Row
        </Button>
        <Button type="submit" disabled={isSubmitDisabled}>
          {saveButtonLabel}
        </Button>
      </div>
    </form>
  );
};

export default TransactionEditForm;
