'use client';

import React, { useMemo, useState } from 'react';
import { parseNonNegativeNumber } from '../../lib/number-validation';
import { createCustomer } from '../../lib/api/customers';
import { mapCustomerRecord } from '../../lib/mappers/customer-mapper';
import { isRecord } from '../../lib/mappers/legacy-record';
import {
  createRecordId,
  type Account,
  type BusinessCustomer,
  type Counter,
  type Service,
  type Transaction,
  useAppDispatch,
} from '../../lib/store';

export interface ServiceWorkflowDraft {
  token: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  serviceId?: string;
  totalAmount?: number;
  paidAmount?: number;
  paymentMode?: Transaction['paymentMode'];
  status?: Transaction['status'];
  note?: string;
}

interface TransactionFormPayload {
  formName: string;
  transactionNo: string;
  serviceProduct: string;
  inventoryItemId?: string;
  inventoryItemType?: 'service' | 'product';
  transactionAccountId: string | null;
  transactionAccountType: 'cash' | 'bank';
  amount: number;
  serviceCharge: number;
  bankCharge: number;
  otherCharge: number;
  totalAmount: number;
  remark: string;
}

interface TransactionDraftRow {
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

type SavedTransactionRow = TransactionFormPayload & { id: string };

interface ServiceFormProps {
  accounts?: Account[];
  availableDepartments: Counter[];
  businessId: string;
  customers?: BusinessCustomer[];
  selectedDepartment?: Counter | null;
  services?: Service[];
  actor: {
    id: string;
    name: string;
    role: 'Customer' | 'Employee';
  };
  draft?: ServiceWorkflowDraft | null;
  onCustomersChanged?: () => void;
}

const createTransactionNo = () => {
  const now = new Date();
  const dateCode = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');
  const timeCode = [
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('');

  return `TXN-${dateCode}-${timeCode}`;
};

const toSafeAmount = (value: string) => parseNonNegativeNumber(value) ?? 0;

const createEmptyRow = (transactionAccountId: string): TransactionDraftRow => ({
  formName: '',
  transactionNo: createTransactionNo(),
  serviceProduct: '',
  inventoryItemId: '',
  transactionAccountId,
  amount: '',
  serviceCharge: '0',
  bankCharge: '0',
  otherCharge: '0',
  remark: '',
});

const isCurrentRowEmpty = (row: TransactionDraftRow) => (
  !row.formName.trim()
  && !row.serviceProduct.trim()
  && !row.inventoryItemId
  && !row.amount.trim()
  && !row.remark.trim()
  && toSafeAmount(row.serviceCharge) === 0
  && toSafeAmount(row.bankCharge) === 0
  && toSafeAmount(row.otherCharge) === 0
);

const ServiceForm: React.FC<ServiceFormProps> = ({
  accounts = [],
  businessId,
  customers = [],
  selectedDepartment,
  services = [],
  actor,
  draft,
  onCustomersChanged,
}) => {
  const dispatch = useAppDispatch();
  const initialService = draft?.serviceId
    ? services.find((service) => service.id === draft.serviceId)
    : null;
  const initialAmount = typeof draft?.totalAmount === 'number'
    ? draft.totalAmount
    : initialService?.price ?? 0;
  const defaultTransactionAccountId = 'cash';
  const initialCustomerId = draft?.customerId && customers.some((customer) => customer.id === draft.customerId)
    ? draft.customerId
    : '';

  // currentRow is the active entry row shown at the top of the table.
  const [currentRow, setCurrentRow] = useState<TransactionDraftRow>({
    formName: '',
    transactionNo: createTransactionNo(),
    serviceProduct: initialService?.name || '',
    inventoryItemId: initialService?.id || '',
    transactionAccountId: defaultTransactionAccountId,
    amount: initialAmount ? String(initialAmount) : '',
    serviceCharge: '0',
    bankCharge: '0',
    otherCharge: '0',
    remark: draft?.note || '',
  });
  // savedRows are completed rows already moved out of the active entry row.
  const [savedRows, setSavedRows] = useState<SavedTransactionRow[]>([]);
  // customer is required before saving transaction rows.
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialCustomerId);
  const [selectedCustomerSnapshot, setSelectedCustomerSnapshot] = useState<BusinessCustomer | null>(
    customers.find((customer) => customer.id === initialCustomerId) || null,
  );
  const [newCustomerName, setNewCustomerName] = useState(draft?.customerName && !initialCustomerId ? draft.customerName : '');
  const [newCustomerPhone, setNewCustomerPhone] = useState(draft?.customerPhone && !initialCustomerId ? draft.customerPhone : '');
  const [newCustomerEmail, setNewCustomerEmail] = useState(draft?.customerEmail && !initialCustomerId ? draft.customerEmail : '');
  const [validationError, setValidationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

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
    const currentBase = isCurrentRowEmpty(currentRow)
      ? { amount: 0, serviceCharge: 0, bankCharge: 0, otherCharge: 0, totalAmount: 0 }
      : {
          amount: currentAmounts.amount,
          serviceCharge: currentAmounts.serviceCharge,
          bankCharge: currentAmounts.bankCharge,
          otherCharge: currentAmounts.otherCharge,
          totalAmount: currentTotal,
        };

    return savedRows.reduce((nextTotals, row) => ({
      amount: nextTotals.amount + row.amount,
      serviceCharge: nextTotals.serviceCharge + row.serviceCharge,
      bankCharge: nextTotals.bankCharge + row.bankCharge,
      otherCharge: nextTotals.otherCharge + row.otherCharge,
      totalAmount: nextTotals.totalAmount + row.totalAmount,
    }), currentBase);
  }, [currentAmounts, currentRow, currentTotal, savedRows]);

  const accountOptions = [
    // Cash option is available even when no bank account exists.
    { value: 'cash', label: 'Cash' },
    ...accounts.map((account) => ({
      value: account.id,
      label: `${account.accountHolder} | ${account.bankName}`,
    })),
  ];

  const serviceOptions = [
    { value: '', label: services.length > 0 ? 'Select' : 'No inventory available' },
    ...services.map((service) => ({
      value: service.id,
      label: `${service.name} - ${service.type === 'product' ? 'Product' : 'Service'}`,
    })),
  ];

  const updateCurrentRow = (values: Partial<TransactionDraftRow>) => {
    setCurrentRow((row) => ({ ...row, ...values }));
    setValidationError('');
  };

  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId) || selectedCustomerSnapshot;
  const isTransactionEntryDisabled = !selectedCustomerId || isSubmitting;
  const customerOptions = [
    { value: '', label: customers.length > 0 ? 'Select Customer' : 'No customers available' },
    ...customers.map((customer) => ({
      value: customer.id,
      label: `${customer.name}${customer.phone ? ` | ${customer.phone}` : ''}`,
    })),
  ];

  const handleCreateCustomer = async () => {
    const trimmedName = newCustomerName.trim();
    const trimmedPhone = newCustomerPhone.trim();
    if (!trimmedName || !trimmedPhone) {
      setValidationError('Customer name and phone are required to add a customer.');
      return;
    }

    const existingCustomer = customers.find((customer) => customer.phone === trimmedPhone);
    if (existingCustomer) {
      setSelectedCustomerId(existingCustomer.id);
      setSelectedCustomerSnapshot(existingCustomer);
      setValidationError('');
      return;
    }

    setIsCreatingCustomer(true);
    try {
      const result = await createCustomer({
        customerName: trimmedName,
        mobileNo: trimmedPhone,
        email: newCustomerEmail.trim() || null,
        remark: null,
      });

      if (!result.success) {
        setValidationError(result.message || 'Unable to add customer right now.');
        return;
      }

      const joinedDate = new Date().toISOString().split('T')[0];
      const fallbackCustomer: BusinessCustomer = {
        id: createRecordId(),
        name: trimmedName,
        customerName: trimmedName,
        phone: trimmedPhone,
        mobileNo: trimmedPhone,
        email: newCustomerEmail.trim(),
        address: null,
        remark: null,
        status: 'Active',
        joinedDate,
        addedDate: joinedDate,
      };
      const createdCustomer = result.customer && isRecord(result.customer)
        ? mapCustomerRecord(result.customer) || fallbackCustomer
        : fallbackCustomer;

      dispatch({
        type: 'ADD_CUSTOMER',
        businessId,
        payload: createdCustomer,
      });
      setSelectedCustomerId(createdCustomer.id);
      setSelectedCustomerSnapshot(createdCustomer);
      setNewCustomerName('');
      setNewCustomerPhone('');
      setNewCustomerEmail('');
      setValidationError('');
      onCustomersChanged?.();
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  const handleServiceProductChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextInventoryItemId = event.target.value;
    const selectedService = services.find((service) => service.id === nextInventoryItemId);

    updateCurrentRow({
      inventoryItemId: nextInventoryItemId,
      serviceProduct: selectedService?.name || '',
      ...(selectedService && selectedService.price > 0 ? { amount: String(selectedService.price) } : {}),
    });
  };

  const buildRowPayload = (
    row: TransactionDraftRow,
    validationMode: 'add' | 'save',
  ): TransactionFormPayload | null => {
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

    const transactionAccountType = row.transactionAccountId === 'cash' ? 'cash' : 'bank';
    const selectedAccount = transactionAccountType === 'bank'
      ? accounts.find((account) => account.id === row.transactionAccountId)
      : null;
    if (transactionAccountType === 'bank' && !selectedAccount) {
      setValidationError('Select a valid transaction account before saving.');
      return null;
    }

    const amount = toSafeAmount(row.amount);
    const serviceCharge = toSafeAmount(row.serviceCharge);
    const bankCharge = toSafeAmount(row.bankCharge);
    const otherCharge = toSafeAmount(row.otherCharge);
    const selectedService = services.find((service) => service.id === row.inventoryItemId);

    return {
      formName: row.formName.trim(),
      transactionNo: row.transactionNo.trim(),
      serviceProduct: row.serviceProduct.trim(),
      inventoryItemId: row.inventoryItemId || undefined,
      inventoryItemType: selectedService?.type || undefined,
      transactionAccountId: transactionAccountType === 'cash' ? null : row.transactionAccountId,
      transactionAccountType,
      amount,
      serviceCharge,
      bankCharge,
      otherCharge,
      totalAmount: amount + serviceCharge + bankCharge + otherCharge,
      remark: row.remark.trim(),
    };
  };

  const resetCurrentRow = () => {
    setCurrentRow(createEmptyRow(defaultTransactionAccountId));
  };

  const resetForm = () => {
    resetCurrentRow();
    setSavedRows([]);
    setValidationError('');
  };

  const handleAddRow = () => {
    if (isSubmitting) return;
    if (!selectedCustomerId) {
      setValidationError('Please select a customer before saving transaction.');
      return;
    }

    const payload = buildRowPayload(currentRow, 'add');
    if (!payload) return;

    // Add Row moves currentRow into savedRows and clears currentRow for the next entry.
    setSavedRows((rows) => [{ ...payload, id: `${Date.now()}-${rows.length}` }, ...rows]);
    resetCurrentRow();
    setValidationError('');
  };

  const handleRemoveSavedRow = (rowId: string) => {
    setSavedRows((rows) => rows.filter((row) => row.id !== rowId));
  };

  const dispatchTransaction = (payload: TransactionFormPayload, sharedCustomerId: string, now: string) => {
    const selectedAccount = payload.transactionAccountType === 'bank' && payload.transactionAccountId
      ? accounts.find((account) => account.id === payload.transactionAccountId)
      : null;

    const service = services.find((item) => item.id === payload.inventoryItemId)
      || services.find((item) => item.name === payload.serviceProduct);
    const customerName = selectedCustomer?.name || payload.formName;
    const customerPhone = selectedCustomer?.phone || '';

    dispatch({
      type: 'ADD_TRANSACTION',
      businessId,
      payload: {
        formName: payload.formName,
        transactionNo: payload.transactionNo,
        customerId: sharedCustomerId,
        customerName,
        customerPhone,
        serviceProduct: payload.serviceProduct,
        inventoryItemId: payload.inventoryItemId,
        inventoryItemType: payload.inventoryItemType,
        serviceId: service?.id || '',
        service: payload.serviceProduct,
        servicePrice: payload.amount,
        transactionAccountId: payload.transactionAccountId || undefined,
        amount: payload.amount,
        serviceCharge: payload.serviceCharge,
        bankCharge: payload.bankCharge,
        otherCharge: payload.otherCharge,
        totalAmount: payload.totalAmount,
        paidAmount: payload.totalAmount,
        dueAmount: 0,
        paymentMode: payload.transactionAccountType === 'cash' ? 'cash' : 'bank',
        departmentId: selectedDepartment?.id,
        departmentName: selectedDepartment?.name || '',
        accountId: payload.transactionAccountId || undefined,
        accountLabel: selectedAccount ? `${selectedAccount.accountHolder} | ${selectedAccount.bankName}` : 'Cash',
        handledById: actor.id,
        handledByName: actor.name,
        handledByRole: actor.role,
        remark: payload.remark,
        note: payload.remark,
        status: 'completed',
        createdBy: actor.name,
        updatedAt: now,
      },
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    if (!selectedCustomerId) {
      setValidationError('Please select a customer before saving transaction.');
      return;
    }

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

    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      const sharedCustomerId = selectedCustomerId;

      rowsToSubmit.forEach((payload) => {
        dispatchTransaction(payload, sharedCustomerId, now);
      });

      dispatch({
        type: 'ADD_HISTORY_EVENT',
        businessId,
        payload: {
          title: `${rowsToSubmit.length} transaction row${rowsToSubmit.length === 1 ? '' : 's'} saved`,
          module: 'Transactions',
          actor: actor.name,
          status: 'Completed',
        },
      });

      dispatch({
        type: 'ADD_NOTIFICATION',
        businessId,
        payload: {
          type: 'success',
          message: `${rowsToSubmit.length} transaction row${rowsToSubmit.length === 1 ? '' : 's'} saved.`,
        },
      });

      resetForm();
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : 'Unable to save transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="service-workflow-form" noValidate>
      <div className="form-section-card mb-4">
        <div className="d-flex flex-column flex-md-row justify-content-between gap-3 mb-3">
          <div>
            <div className="form-section-title mb-1">Transaction Details</div>
            <p className="page-muted small mb-0">Create a transaction record with account, charges, total, and remark.</p>
          </div>
        </div>

        {validationError ? (
          <div className="form-alert" role="alert">
            {validationError}
          </div>
        ) : null}

        <div className="transaction-customer-panel mb-3">
          <div className="row g-3">
            <div className="col-12 col-lg-4">
              <label className="form-label">Customer</label>
              <select
                className="form-select"
                value={selectedCustomerId}
                onChange={(event) => {
                  const nextCustomerId = event.target.value;
                  setSelectedCustomerId(nextCustomerId);
                  setSelectedCustomerSnapshot(customers.find((customer) => customer.id === nextCustomerId) || null);
                  setValidationError('');
                }}
              >
                {customerOptions.map((option) => (
                  <option key={option.value || option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {selectedCustomer ? (
                <p className="form-hint">Selected: {selectedCustomer.name} {selectedCustomer.phone ? `(${selectedCustomer.phone})` : ''}</p>
              ) : (
                <p className="form-hint">Please select a customer before saving transaction.</p>
              )}
            </div>
            <div className="col-12 col-lg-8">
              <div className="row g-2">
                <div className="col-12 col-md-4">
                  <label className="form-label">New Customer Name</label>
                  <input
                    className="form-control"
                    placeholder="Customer name"
                    value={newCustomerName}
                    onChange={(event) => setNewCustomerName(event.target.value)}
                  />
                </div>
                <div className="col-12 col-md-3">
                  <label className="form-label">Phone</label>
                  <input
                    className="form-control"
                    placeholder="Phone"
                    value={newCustomerPhone}
                    onChange={(event) => setNewCustomerPhone(event.target.value)}
                  />
                </div>
                <div className="col-12 col-md-3">
                  <label className="form-label">Email</label>
                  <input
                    className="form-control"
                    placeholder="Email"
                    type="email"
                    value={newCustomerEmail}
                    onChange={(event) => setNewCustomerEmail(event.target.value)}
                  />
                </div>
                <div className="col-12 col-md-2 d-flex align-items-end">
                  <button
                    type="button"
                    className="btn-app btn-app-secondary w-100"
                    onClick={handleCreateCustomer}
                    disabled={isCreatingCustomer}
                  >
                    {isCreatingCustomer ? 'Adding...' : 'Add'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

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
                      disabled={isTransactionEntryDisabled}
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
                      disabled={isTransactionEntryDisabled}
                    />
                  </div>
                </td>
                <td data-label="Service/Product">
                  <div className="app-field">
                    {services.length > 0 ? (
                      <select
                        aria-label="Service/Product"
                        className="form-select"
                        value={currentRow.inventoryItemId}
                        onChange={handleServiceProductChange}
                        disabled={isTransactionEntryDisabled}
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
                        disabled={isTransactionEntryDisabled}
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
                      disabled={isTransactionEntryDisabled}
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
                      disabled={isTransactionEntryDisabled}
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
                      disabled={isTransactionEntryDisabled}
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
                      disabled={isTransactionEntryDisabled}
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
                      disabled={isTransactionEntryDisabled}
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
                    {/* Remark is optional and does not block Add Row or Save Transaction. */}
                    <input
                      aria-label="Remark"
                      className="form-control"
                      placeholder="Remark"
                      value={currentRow.remark}
                      onChange={(event) => updateCurrentRow({ remark: event.target.value })}
                      disabled={isTransactionEntryDisabled}
                    />
                  </div>
                </td>
              </tr>
              {savedRows.map((row) => {
                const selectedAccount = row.transactionAccountType === 'bank' && row.transactionAccountId
                  ? accounts.find((account) => account.id === row.transactionAccountId)
                  : null;

                return (
                  <tr key={row.id}>
                    <td data-label="Form Name">{row.formName}</td>
                    <td data-label="No. of Txn">{row.transactionNo || '-'}</td>
                    <td data-label="Service/Product">{row.serviceProduct}</td>
                    <td data-label="Transaction Account">
                      {selectedAccount ? `${selectedAccount.accountHolder} | ${selectedAccount.bankName}` : 'Cash'}
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
                );
              })}
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

        <div className="modal-actions transaction-entry-table__actions mt-3">
          <button
            type="button"
            className="btn-app btn-app-secondary"
            onClick={handleAddRow}
            disabled={isSubmitting || !selectedCustomerId}
          >
            Add Row
          </button>
          <button type="submit" className="btn-app btn-app-primary" disabled={isSubmitting || !selectedCustomerId}>
            {isSubmitting ? 'Saving...' : 'Save Transaction'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default ServiceForm;
