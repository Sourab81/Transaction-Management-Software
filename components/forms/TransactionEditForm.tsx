'use client';

import React, { useMemo, useState } from 'react';
import { parseNonNegativeNumber } from '../../lib/number-validation';
import type { Account, Service, Transaction } from '../../lib/store';
import Button from '../ui/Button';

export interface TransactionEditorValues {
  formName: string;
  transactionNo: string;
  noOfTransaction: number;
  serviceProduct: string;
  inventoryId: string;
  inventoryItemId?: string;
  inventoryItemType?: 'service' | 'product';
  transactionAccount: string;
  transactionAccountId: string;
  amount: number;
  unitServiceCharge: number;
  serviceCharge: number;
  unitBankCharge: number;
  bankCharge: number;
  unitOtherCharge: number;
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
  (
    typeof transaction.amount === 'number'
      ? transaction.amount
      : typeof transaction.totalAmount === 'number'
        ? transaction.totalAmount
        : 0
  ) / (transaction.noOfTransaction && transaction.noOfTransaction > 0 ? transaction.noOfTransaction : 1)
);

const toSafeAmount = (value: string) => parseNonNegativeNumber(value) ?? 0;

const createEmptyRow = (): TransactionEditorDraftRow => ({
  formName: '',
  transactionNo: '1',
  serviceProduct: '',
  inventoryItemId: '',
  transactionAccountId: 'cash',
  amount: '',
  serviceCharge: '0',
  bankCharge: '0',
  otherCharge: '0',
  remark: '',
});

const isCurrentRowEmpty = (row: TransactionEditorDraftRow) => (
  !row.formName.trim()
  && !row.serviceProduct.trim()
  && !row.inventoryItemId
  && !row.amount.trim()
  && !row.remark.trim()
  && toSafeAmount(row.serviceCharge) === 0
  && toSafeAmount(row.bankCharge) === 0
  && toSafeAmount(row.otherCharge) === 0
);

const idsMatch = (
  left: string | number | null | undefined,
  right: string | number | null | undefined,
) => {
  const normalizedLeft = String(left ?? '').trim();
  const normalizedRight = String(right ?? '').trim();

  if (!normalizedLeft || !normalizedRight) return false;

  const leftNumber = Number(normalizedLeft);
  const rightNumber = Number(normalizedRight);

  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return leftNumber === rightNumber;
  }

  return normalizedLeft === normalizedRight;
};

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
  const availableServices = useMemo(() => services.filter((service) => (
    service.status === 'Active'
  )), [services]);

  // currentRow is the active entry row shown at the top of the table.
  const initialQty = initialValues.noOfTransaction && initialValues.noOfTransaction > 0 ? initialValues.noOfTransaction : 1;
  const [currentRow, setCurrentRow] = useState<TransactionEditorDraftRow>({
    formName: initialValues.formName || '',
    transactionNo: initialValues.noOfTransaction ? String(initialValues.noOfTransaction) : '1',
    serviceProduct: initialValues.serviceProduct || initialValues.service || '',
    inventoryItemId: initialInventoryItemId,
    transactionAccountId: initialValues.transactionAccountId || initialValues.accountId || 'cash',
    amount: numberToFieldValue(getInitialAmount(initialValues)),
    serviceCharge: numberToFieldValue((initialValues.serviceCharge ?? 0) / initialQty),
    bankCharge: numberToFieldValue((initialValues.bankCharge ?? 0) / initialQty),
    otherCharge: numberToFieldValue((initialValues.otherCharge ?? 0) / initialQty),
    remark: initialValues.remark || initialValues.note || '',
  });
  // savedRows are completed rows already moved out of the active entry row.
  const [savedRows, setSavedRows] = useState<SavedTransactionRow[]>([]);
  const [validationError, setValidationError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const currentAmounts = useMemo(() => ({
    noOfTransaction: toSafeAmount(currentRow.transactionNo),
    amount: toSafeAmount(currentRow.amount),
    serviceCharge: toSafeAmount(currentRow.serviceCharge),
    bankCharge: toSafeAmount(currentRow.bankCharge),
    otherCharge: toSafeAmount(currentRow.otherCharge),
  }), [currentRow.amount, currentRow.bankCharge, currentRow.otherCharge, currentRow.serviceCharge, currentRow.transactionNo]);

  const currentTotal = useMemo(() => {
    const qty = currentAmounts.noOfTransaction || 1;
    return qty * (currentAmounts.amount + currentAmounts.serviceCharge + currentAmounts.bankCharge + currentAmounts.otherCharge);
  }, [currentAmounts]);

  const totals = useMemo(() => {
    const qty = currentAmounts.noOfTransaction || 1;
    const base = {
      amount: isCurrentRowEmpty(currentRow) ? 0 : qty * currentAmounts.amount,
      serviceCharge: isCurrentRowEmpty(currentRow) ? 0 : qty * currentAmounts.serviceCharge,
      bankCharge: isCurrentRowEmpty(currentRow) ? 0 : qty * currentAmounts.bankCharge,
      otherCharge: isCurrentRowEmpty(currentRow) ? 0 : qty * currentAmounts.otherCharge,
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
    { value: 'cash', label: 'Cash' },
    ...(currentRow.transactionAccountId && currentRow.transactionAccountId !== 'cash' && !accounts.some((account) => account.id === currentRow.transactionAccountId)
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
    ...(!initialInventoryItemId && currentRow.serviceProduct && !availableServices.some((service) => service.name === currentRow.serviceProduct)
      ? [{ value: legacyServiceOptionValue, label: currentRow.serviceProduct }]
      : []),
    ...availableServices.map((service) => ({
      value: service.id,
      label: `${service.name} (Stock: ${service.currentStock ?? service.quantity ?? 0})`,
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

    const selectedService = availableServices.find((service) => service.id === nextValue);

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

    if (!row.formName.trim() || !row.transactionNo.trim() || !row.inventoryItemId || !row.transactionAccountId || !row.amount.trim()) {
      setValidationError('Form Name, No. of Txn, Service/Product, Transaction Account, and Amount are required.');
      return null;
    }

    const noOfTransaction = toSafeAmount(row.transactionNo);
    if (noOfTransaction <= 0 || !Number.isInteger(noOfTransaction)) {
      setValidationError('No. of Txn must be a whole number greater than zero.');
      return null;
    }

    const unitAmount = toSafeAmount(row.amount);
    const unitServiceCharge = toSafeAmount(row.serviceCharge);
    const unitBankCharge = toSafeAmount(row.bankCharge);
    const unitOtherCharge = toSafeAmount(row.otherCharge);
    const amount = noOfTransaction * unitAmount;
    const serviceCharge = noOfTransaction * unitServiceCharge;
    const bankCharge = noOfTransaction * unitBankCharge;
    const otherCharge = noOfTransaction * unitOtherCharge;
    const selectedService = availableServices.find((service) => service.id === row.inventoryItemId);
    if (!selectedService) {
      setValidationError('Please select an active service/product from the selected department.');
      return null;
    }

    return {
      formName: row.formName.trim(),
      transactionNo: row.transactionNo.trim(),
      noOfTransaction,
      serviceProduct: row.serviceProduct.trim(),
      inventoryId: row.inventoryItemId,
      inventoryItemId: row.inventoryItemId || undefined,
      inventoryItemType: selectedService.type || undefined,
      transactionAccount: row.transactionAccountId,
      transactionAccountId: row.transactionAccountId,
      amount,
      unitServiceCharge,
      serviceCharge,
      unitBankCharge,
      bankCharge,
      unitOtherCharge,
      otherCharge,
      totalAmount: amount + serviceCharge + bankCharge + otherCharge,
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
                      min="1"
                      placeholder="1"
                      step="1"
                      type="number"
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
                  <td data-label="No. of Txn">{row.noOfTransaction}</td>
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
