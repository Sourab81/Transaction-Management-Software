'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FaChevronDown } from 'react-icons/fa';
import { parseNonNegativeNumber } from '../../lib/number-validation';
import { createCustomer, getCustomers } from '../../lib/api/customers';
import { createTransaction } from '../../lib/api/transactions';
import { mapCustomerRecord, mapCustomersResponse } from '../../lib/mappers/customer-mapper';
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
import ActionModal from '../ui/ActionModal';

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
  noOfTransaction: number;
  serviceProduct: string;
  inventoryId: string;
  inventoryItemId?: string;
  inventoryItemType?: 'service' | 'product';
  transactionAccount: string;
  transactionAccountId: string | null;
  transactionAccountType: 'other' | 'bank';
  unitAmount: number;
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
  onTransactionsChanged?: () => void | Promise<void>;
  onDirtyChange?: (isDirty: boolean) => void;
}

const toSafeAmount = (value: string) => parseNonNegativeNumber(value) ?? 0;

const createEmptyRow = (transactionAccountId: string): TransactionDraftRow => ({
  formName: '',
  transactionNo: '1',
  serviceProduct: '',
  inventoryItemId: '',
  transactionAccountId,
  amount: '',
  serviceCharge: '0',
  bankCharge: '0',
  otherCharge: '0',
  remark: '',
});

const getCustomerDisplayName = (customer: BusinessCustomer) =>
  customer.customerName || customer.name;

const getCustomerPhone = (customer: BusinessCustomer) =>
  customer.mobileNo || customer.phone;

const getCustomerCode = (customer: BusinessCustomer) =>
  customer.customerCode || '';

const getCustomerSearchLabel = (customer: BusinessCustomer) => {
  const name = getCustomerDisplayName(customer);
  const phone = getCustomerPhone(customer);
  const code = getCustomerCode(customer);
  return [name, phone, code].filter(Boolean).join(' / ');
};

const isCurrentRowEmpty = (row: TransactionDraftRow) => (
  !row.formName.trim()
  && !row.serviceProduct.trim()
  && !row.inventoryItemId
  && toSafeAmount(row.amount) === 0
  && !row.remark.trim()
  && toSafeAmount(row.serviceCharge) === 0
  && toSafeAmount(row.bankCharge) === 0
  && toSafeAmount(row.otherCharge) === 0
);

const getInventoryLabel = (service: Service) =>
  `${service.name} - ${service.type === 'product' ? 'Product' : 'Service'}`;

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

const getServiceCounterId = (service: Service) => service.counterId ?? service.departmentId ?? null;

const isServiceActiveForCounter = (service: Service, counterId: string | number | null | undefined) => (
  service.status === 'Active'
  && getServiceCounterId(service) !== null
  && idsMatch(getServiceCounterId(service), counterId)
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
  onTransactionsChanged,
  onDirtyChange,
}) => {
  const dispatch = useAppDispatch();
  const customerPanelRef = useRef<HTMLDivElement | null>(null);
  const customerSearchInputRef = useRef<HTMLInputElement | null>(null);
  const initialService = draft?.serviceId
    ? services.find((service) => service.id === draft.serviceId)
    : null;
  const defaultTransactionAccountId = 'other';
  const initialCustomerId = draft?.customerId && customers.some((customer) => customer.id === draft.customerId)
    ? draft.customerId
    : '';
  const initialCustomer = initialCustomerId
    ? customers.find((customer) => customer.id === initialCustomerId) || null
    : null;

  // currentRow is the active entry row shown at the top of the table.
  const [currentRow, setCurrentRow] = useState<TransactionDraftRow>({
    formName: '',
    transactionNo: '1',
    serviceProduct: initialService?.name || '',
    inventoryItemId: initialService?.id || '',
    transactionAccountId: defaultTransactionAccountId,
    amount: '0',
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
    initialCustomer,
  );
  const [customerOptions, setCustomerOptions] = useState<BusinessCustomer[]>(initialCustomer ? [initialCustomer] : []);
  const [customerSearchQuery, setCustomerSearchQuery] = useState(initialCustomer ? getCustomerSearchLabel(initialCustomer) : '');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [isCustomerSearchLoading, setIsCustomerSearchLoading] = useState(false);
  const [hasCustomerSearchCompleted, setHasCustomerSearchCompleted] = useState(false);
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState(draft?.customerName && !initialCustomerId ? draft.customerName : '');
  const [newCustomerPhone, setNewCustomerPhone] = useState(draft?.customerPhone && !initialCustomerId ? draft.customerPhone : '');
  const [newCustomerEmail, setNewCustomerEmail] = useState(draft?.customerEmail && !initialCustomerId ? draft.customerEmail : '');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');
  const [newCustomerRemark, setNewCustomerRemark] = useState('');
  const [customerModalError, setCustomerModalError] = useState('');
  const [validationError, setValidationError] = useState('');
  const [isCustomerPanelHighlighted, setIsCustomerPanelHighlighted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const selectedCounterId = selectedDepartment?.id || '';

  const inventoryItems = useMemo(() => {
    const byId = new Map<string, Service>();
    services.forEach((service) => {
      if (isServiceActiveForCounter(service, selectedCounterId)) {
        byId.set(service.id, service);
      }
    });

    return Array.from(byId.values());
  }, [selectedCounterId, services]);

  const isInventoryValidForSelectedDepartment = (inventoryId: string | number | null | undefined) => (
    inventoryItems.some((service) =>
      idsMatch(service.id, inventoryId) && isServiceActiveForCounter(service, selectedCounterId)
    )
  );

  const currentAmounts = useMemo(() => ({
    noOfTransaction: toSafeAmount(currentRow.transactionNo),
    amount: toSafeAmount(currentRow.amount),
    serviceCharge: toSafeAmount(currentRow.serviceCharge),
    bankCharge: toSafeAmount(currentRow.bankCharge),
    otherCharge: toSafeAmount(currentRow.otherCharge),
  }), [currentRow.amount, currentRow.bankCharge, currentRow.otherCharge, currentRow.serviceCharge, currentRow.transactionNo]);

  const currentTotal = useMemo(() => (
    (currentAmounts.noOfTransaction * currentAmounts.amount)
    + currentAmounts.serviceCharge
    + currentAmounts.bankCharge
    + currentAmounts.otherCharge
  ), [currentAmounts]);

  const totals = useMemo(() => {
    const currentBase = isCurrentRowEmpty(currentRow)
      ? { amount: 0, serviceCharge: 0, bankCharge: 0, otherCharge: 0, totalAmount: 0 }
      : {
          amount: currentAmounts.noOfTransaction * currentAmounts.amount,
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
    { value: 'other', label: 'Other' },
    ...accounts.map((account) => ({
      value: account.id,
      label: `${account.accountHolder} | ${account.bankName}`,
    })),
  ];

  const serviceOptions = [
    { value: '', label: inventoryItems.length > 0 ? 'Select' : 'No inventory available' },
    ...inventoryItems.map((service) => ({
      value: service.id,
      label: getInventoryLabel(service),
    })),
  ];

  const updateCurrentRow = (values: Partial<TransactionDraftRow>) => {
    setCurrentRow((row) => ({ ...row, ...values }));
    setValidationError('');
  };

  useEffect(() => {
    onDirtyChange?.(!isCurrentRowEmpty(currentRow) || savedRows.length > 0);
  }, [currentRow, onDirtyChange, savedRows.length]);

  useEffect(() => {
    if (!initialCustomer) return;

    setCustomerOptions((previousOptions) => {
      const merged = new Map<string, BusinessCustomer>();
      [initialCustomer, ...previousOptions].forEach((customer) => {
        merged.set(customer.id, customer);
      });
      return Array.from(merged.values());
    });
  }, [initialCustomer]);

  const selectedCustomer = customerOptions.find((customer) => customer.id === selectedCustomerId) || selectedCustomerSnapshot;
  const isTransactionEntryLocked = !selectedCustomerId || !selectedDepartment?.id;
  const isTransactionEntryReadOnly = isTransactionEntryLocked || isSubmitting;
  const normalizedCustomerSearchQuery = customerSearchQuery.trim().toLowerCase();
  const customerSearchOptions = customerOptions.map((customer) => ({
    customer,
    label: getCustomerSearchLabel(customer),
  }));
  const filteredCustomerSearchOptions = normalizedCustomerSearchQuery.length >= 3
    ? customerSearchOptions.filter(({ customer, label }) => {
        const code = getCustomerCode(customer).toLowerCase();
        return label.toLowerCase().includes(normalizedCustomerSearchQuery)
          || getCustomerDisplayName(customer).toLowerCase().includes(normalizedCustomerSearchQuery)
          || getCustomerPhone(customer).toLowerCase().includes(normalizedCustomerSearchQuery)
          || code.includes(normalizedCustomerSearchQuery);
      })
    : [];

  useEffect(() => {
    const searchTerm = customerSearchQuery.trim();
    if (selectedCustomerId || searchTerm.length < 3) {
      setIsCustomerDropdownOpen(false);
      setIsCustomerSearchLoading(false);
      setHasCustomerSearchCompleted(false);
      return;
    }

    let isActive = true;
    setIsCustomerSearchLoading(true);
    setHasCustomerSearchCompleted(false);
    const searchTimer = window.setTimeout(async () => {
      try {
        const response = await getCustomers({ search: searchTerm, status: 1 });
        if (!isActive) return;

        setCustomerOptions(mapCustomersResponse(response));
        setHasCustomerSearchCompleted(true);
        setIsCustomerDropdownOpen(true);
      } catch {
        if (!isActive) return;

        setCustomerOptions([]);
        setHasCustomerSearchCompleted(true);
        setIsCustomerDropdownOpen(true);
      } finally {
        if (isActive) setIsCustomerSearchLoading(false);
      }
    }, 300);

    return () => {
      isActive = false;
      window.clearTimeout(searchTimer);
    };
  }, [customerSearchQuery, selectedCustomerId]);
  const showCustomerRequiredMessage = () => {
    setValidationError('Please select or add a customer first.');
    setIsCustomerPanelHighlighted(true);
    customerPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.requestAnimationFrame(() => {
      customerSearchInputRef.current?.focus({ preventScroll: true });
    });
    return false;
  };

  const ensureCustomerSelected = () => (
    selectedCustomerId ? true : showCustomerRequiredMessage()
  );

  const ensureDepartmentSelected = () => {
    if (!ensureCustomerSelected()) return false;
    if (!selectedDepartment?.id) {
      setValidationError('Please select department first.');
      return false;
    }

    return true;
  };

  const ensureInventorySelected = (row: TransactionDraftRow) => {
    if (!ensureDepartmentSelected()) return false;
    if (!row.inventoryItemId || !isInventoryValidForSelectedDepartment(row.inventoryItemId)) {
      setValidationError('Please select an active service/product from the selected department.');
      return false;
    }

    return true;
  };

  const guardTransactionFieldInteraction = (event?: React.SyntheticEvent) => {
    if (ensureDepartmentSelected()) return true;

    event?.preventDefault();
    return false;
  };

  const selectCustomer = (customer: BusinessCustomer) => {
    setSelectedCustomerId(customer.id);
    setSelectedCustomerSnapshot(customer);
    setIsCustomerPanelHighlighted(false);
    setCustomerSearchQuery(getCustomerDisplayName(customer));
    setIsCustomerDropdownOpen(false);
    setNewCustomerPhone(getCustomerPhone(customer));
    setNewCustomerName(getCustomerDisplayName(customer));
    setNewCustomerEmail(customer.email || '');
    setNewCustomerAddress(customer.address || '');
    setNewCustomerRemark(customer.remark || '');
    setValidationError('');
  };

  const handleCustomerSearchChange = (value: string) => {
    setCustomerSearchQuery(value);
    const normalizedValue = value.trim().toLowerCase();
    const matchedOption = customerSearchOptions.find(({ customer, label }) => {
      const name = getCustomerDisplayName(customer).toLowerCase();
      const phone = getCustomerPhone(customer).toLowerCase();
      const email = (customer.email || '').toLowerCase();
      const code = getCustomerCode(customer).toLowerCase();
      return label.toLowerCase() === normalizedValue
        || String(customer.id).toLowerCase() === normalizedValue
        || name === normalizedValue
        || phone === normalizedValue
        || email === normalizedValue
        || code === normalizedValue;
    });

    if (matchedOption) {
      selectCustomer(matchedOption.customer);
      return;
    }

    setSelectedCustomerId('');
    setSelectedCustomerSnapshot(null);
    setIsCustomerDropdownOpen(false);
    setValidationError('');
  };

  const clearSelectedCustomer = () => {
    setSelectedCustomerId('');
    setSelectedCustomerSnapshot(null);
    setCustomerSearchQuery('');
    setIsCustomerDropdownOpen(false);
    setValidationError('');
  };

  const openAddCustomerModal = () => {
    setCustomerModalError('');
    setNewCustomerName('');
    setNewCustomerPhone('');
    setNewCustomerEmail('');
    setNewCustomerAddress('');
    setNewCustomerRemark('');
    setIsAddCustomerModalOpen(true);
  };

  const handleCreateCustomer = async () => {
    const trimmedName = newCustomerName.trim();
    const trimmedPhone = newCustomerPhone.trim();
    const trimmedEmail = newCustomerEmail.trim();
    const trimmedAddress = newCustomerAddress.trim();
    const trimmedRemark = newCustomerRemark.trim();
    if (!trimmedName || !trimmedPhone) {
      setCustomerModalError('Customer name and mobile number are required.');
      return;
    }

    const existingCustomer = customerOptions.find((customer) => getCustomerPhone(customer) === trimmedPhone);
    if (existingCustomer) {
      selectCustomer(existingCustomer);
      setIsAddCustomerModalOpen(false);
      return;
    }

    setIsCreatingCustomer(true);
    setCustomerModalError('');
    try {
      const result = await createCustomer({
        customerName: trimmedName,
        mobileNo: trimmedPhone,
        email: trimmedEmail || null,
        address: trimmedAddress || null,
        remark: trimmedRemark || null,
      });

      if (!result.success) {
        setCustomerModalError(result.message || 'Unable to add customer right now.');
        return;
      }

      const joinedDate = new Date().toISOString().split('T')[0];
      const fallbackCustomer: BusinessCustomer = {
        id: createRecordId(),
        name: trimmedName,
        customerName: trimmedName,
        customerCode: undefined,
        phone: trimmedPhone,
        mobileNo: trimmedPhone,
        email: trimmedEmail,
        address: trimmedAddress || null,
        remark: trimmedRemark || null,
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
      setCustomerOptions((options) => [createdCustomer, ...options.filter((customer) => customer.id !== createdCustomer.id)]);
      setSelectedCustomerId(createdCustomer.id);
      setSelectedCustomerSnapshot(createdCustomer);
      setIsCustomerPanelHighlighted(false);
      setCustomerSearchQuery(getCustomerDisplayName(createdCustomer));
      setNewCustomerName(getCustomerDisplayName(createdCustomer));
      setNewCustomerPhone(getCustomerPhone(createdCustomer));
      setNewCustomerEmail(createdCustomer.email || '');
      setNewCustomerAddress(createdCustomer.address || '');
      setNewCustomerRemark(createdCustomer.remark || '');
      setIsAddCustomerModalOpen(false);
      setValidationError('');
      onCustomersChanged?.();
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  const handleCurrentInventorySelect = (inventoryId: string) => {
    if (!ensureDepartmentSelected()) return;

    const selectedService = inventoryItems.find((service) => service.id === inventoryId);

    if (!selectedService) {
      updateCurrentRow({
        serviceProduct: '',
        inventoryItemId: '',
      });
      return;
    }

    updateCurrentRow({
      serviceProduct: selectedService.name,
      inventoryItemId: selectedService.id,
      ...(selectedService.price > 0 && currentRow.transactionAccountId !== 'other'
        ? { amount: String(selectedService.price) }
        : {}),
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

    if (!row.inventoryItemId || !isInventoryValidForSelectedDepartment(row.inventoryItemId)) {
      setValidationError('Please select an active service/product from the selected department.');
      return null;
    }

    if (!row.remark.trim()) {
      setValidationError('Remark is required.');
      return null;
    }

    const isOtherAccount = row.transactionAccountId === 'other';
    if (!row.formName.trim() || !row.transactionNo.trim() || !row.transactionAccountId || (!isOtherAccount && !row.amount.trim())) {
      setValidationError('Form, Qty, Item, Account, and Amount are required.');
      return null;
    }

    const transactionAccountType = isOtherAccount ? 'other' : 'bank';
    const selectedAccount = transactionAccountType === 'bank'
      ? accounts.find((account) => account.id === row.transactionAccountId)
      : null;
    if (transactionAccountType === 'bank' && !selectedAccount) {
      setValidationError('Select a valid transaction account before saving.');
      return null;
    }

    const noOfTransaction = toSafeAmount(row.transactionNo);
    if (noOfTransaction <= 0 || !Number.isInteger(noOfTransaction)) {
      setValidationError('No. of Txn must be a whole number greater than zero.');
      return null;
    }

    const amount = toSafeAmount(row.amount);
    const serviceCharge = toSafeAmount(row.serviceCharge);
    const bankCharge = toSafeAmount(row.bankCharge);
    const otherCharge = toSafeAmount(row.otherCharge);
    const transactionAmount = noOfTransaction * amount;
    const selectedService = inventoryItems.find((service) => service.id === row.inventoryItemId);
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
      inventoryItemType: selectedService?.type || undefined,
      transactionAccount: transactionAccountType === 'other' ? 'other' : row.transactionAccountId,
      transactionAccountId: transactionAccountType === 'other' ? null : row.transactionAccountId,
      transactionAccountType,
      unitAmount: amount,
      amount: transactionAmount,
      serviceCharge,
      bankCharge,
      otherCharge,
      totalAmount: transactionAmount + serviceCharge + bankCharge + otherCharge,
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
    if (!ensureInventorySelected(currentRow)) return;

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

  const updateSavedRow = (rowId: string, values: Partial<SavedTransactionRow>) => {
    setSavedRows((rows) => rows.map((row) => {
      if (row.id !== rowId) return row;

      const nextRow = { ...row, ...values };
      const unitAmount = nextRow.unitAmount;
      const amount = nextRow.noOfTransaction * unitAmount;

      return {
        ...nextRow,
        amount,
        totalAmount: amount + nextRow.serviceCharge + nextRow.bankCharge + nextRow.otherCharge,
      };
    }));
    setValidationError('');
  };

  const handleSavedInventoryChange = (rowId: string, inventoryId: string) => {
    const selectedService = inventoryItems.find((service) => service.id === inventoryId);
    if (!selectedService) return;
    const currentSavedRow = savedRows.find((row) => row.id === rowId);

    updateSavedRow(rowId, {
      inventoryId,
      inventoryItemId: inventoryId,
      serviceProduct: selectedService.name,
      inventoryItemType: selectedService.type,
      ...(currentSavedRow?.transactionAccountType === 'bank' && selectedService.price > 0
        ? { unitAmount: selectedService.price }
        : {}),
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    if (!ensureDepartmentSelected()) return;

    const currentIsEmpty = isCurrentRowEmpty(currentRow);
    if (!currentIsEmpty && !ensureInventorySelected(currentRow)) return;
    if (currentIsEmpty && savedRows.length === 0 && !currentRow.inventoryItemId) {
      setValidationError('Please select service/product.');
      return;
    }
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
    const missingRemarkRowIndex = rowsToSubmit.findIndex((row) => !row.remark.trim());
    if (missingRemarkRowIndex >= 0) {
      setValidationError('Remark is required.');
      return;
    }
    const invalidInventoryRowIndex = rowsToSubmit.findIndex((row) =>
      !isInventoryValidForSelectedDepartment(row.inventoryId)
    );
    if (invalidInventoryRowIndex >= 0) {
      setValidationError(`Inventory in row ${invalidInventoryRowIndex + 1} is inactive or not assigned to selected department.`);
      return;
    }
    const selectedDepartmentId = selectedDepartment?.id;
    if (!selectedDepartmentId) {
      setValidationError('Please select department first.');
      return;
    }

    setIsSubmitting(true);
    try {
      const noOfTransaction = rowsToSubmit.reduce((sum, row) => sum + row.noOfTransaction, 0);
      const result = await createTransaction({
        customerId: selectedCustomerId,
        counterId: selectedDepartmentId,
        date: new Date().toISOString().split('T')[0],
        rows: rowsToSubmit.map((row) => ({
          formName: row.formName,
          noOfTransaction: row.noOfTransaction,
          inventoryId: row.inventoryId,
          inventoryName: row.serviceProduct,
          transactionAccount: row.transactionAccount,
          amount: row.amount,
          serviceCharge: row.serviceCharge,
          bankCharge: row.bankCharge,
          otherCharge: row.otherCharge,
          totalAmount: row.totalAmount,
          remark: row.remark || null,
        })),
      });

      if (!result.success) {
        setValidationError(result.message || 'Unable to save transaction.');
        return;
      }

      dispatch({
        type: 'ADD_HISTORY_EVENT',
        businessId,
        payload: {
          title: `${noOfTransaction} transaction${noOfTransaction === 1 ? '' : 's'} saved`,
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
          message: `${noOfTransaction} transaction${noOfTransaction === 1 ? '' : 's'} saved.`,
        },
      });

      await onTransactionsChanged?.();
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
        {validationError ? (
          <div className="form-alert" role="alert">
            {validationError}
          </div>
        ) : null}

        {isAddCustomerModalOpen ? (
          <ActionModal
            title="Add Customer"
            eyebrow="Customer"
            description="Create a customer and continue the transaction with the new selection."
            onClose={() => setIsAddCustomerModalOpen(false)}
          >
            {customerModalError ? (
              <div className="form-alert" role="alert">{customerModalError}</div>
            ) : null}
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="transaction-new-customer-name">Customer Name</label>
                <input
                  className="form-control"
                  id="transaction-new-customer-name"
                  value={newCustomerName}
                  onChange={(event) => {
                    setNewCustomerName(event.target.value);
                    setCustomerModalError('');
                  }}
                  required
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="transaction-new-customer-mobile">Mobile Number</label>
                <input
                  className="form-control"
                  id="transaction-new-customer-mobile"
                  value={newCustomerPhone}
                  onChange={(event) => {
                    setNewCustomerPhone(event.target.value);
                    setCustomerModalError('');
                  }}
                  required
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="transaction-new-customer-email">Email Optional</label>
                <input
                  className="form-control"
                  id="transaction-new-customer-email"
                  type="email"
                  value={newCustomerEmail}
                  onChange={(event) => setNewCustomerEmail(event.target.value)}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="transaction-new-customer-address">Address Optional</label>
                <input
                  className="form-control"
                  id="transaction-new-customer-address"
                  value={newCustomerAddress}
                  onChange={(event) => setNewCustomerAddress(event.target.value)}
                />
              </div>
              <div className="col-12">
                <label className="form-label" htmlFor="transaction-new-customer-remark">Remark Optional</label>
                <input
                  className="form-control"
                  id="transaction-new-customer-remark"
                  value={newCustomerRemark}
                  onChange={(event) => setNewCustomerRemark(event.target.value)}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-app btn-app-secondary" onClick={() => setIsAddCustomerModalOpen(false)} disabled={isCreatingCustomer}>
                Cancel
              </button>
              <button type="button" className="btn-app btn-app-primary" onClick={handleCreateCustomer} disabled={isCreatingCustomer}>
                {isCreatingCustomer ? 'Adding...' : 'Add Customer'}
              </button>
            </div>
          </ActionModal>
        ) : null}

        <div
          ref={customerPanelRef}
          className={`transaction-customer-panel mb-4${isCustomerPanelHighlighted ? ' transaction-customer-panel--highlight' : ''}`}
        >
          <div className="transaction-customer-panel__header">
            <div>
              <div className="form-section-title mb-1">Customer Search</div>
              <p className="page-muted small mb-0">Search by mobile number or name. Existing customer details will fill automatically.</p>
            </div>
            <button
              type="button"
              className="btn-app btn-app-primary transaction-customer-panel__add-button"
              onClick={openAddCustomerModal}
              disabled={isCreatingCustomer}
            >
              Add Customer
            </button>
          </div>

          <div className="transaction-customer-panel__grid">
            <div className="transaction-customer-panel__selector-row">
              <div className="app-field">
                <label className="form-label" htmlFor="transaction-customer-search">Select Customer</label>
                <div className="transaction-search-combobox transaction-modern-select">
                  <input
                    ref={customerSearchInputRef}
                    className="form-control transaction-modern-select__control"
                    id="transaction-customer-search"
                    placeholder="Select Customer"
                    value={customerSearchQuery}
                    autoComplete="off"
                    onBlur={() => window.setTimeout(() => setIsCustomerDropdownOpen(false), 120)}
                    onChange={(event) => handleCustomerSearchChange(event.target.value)}
                  />
                  <span className="transaction-modern-select__chevron" aria-hidden="true">
                    <FaChevronDown />
                  </span>
                  {isCustomerDropdownOpen && normalizedCustomerSearchQuery.length >= 3 && (isCustomerSearchLoading || hasCustomerSearchCompleted) ? (
                    <div className="transaction-search-dropdown transaction-search-dropdown--customer" role="listbox">
                      {isCustomerSearchLoading ? (
                        <div className="transaction-search-dropdown__empty">Searching customers...</div>
                      ) : filteredCustomerSearchOptions.length > 0 ? (
                        filteredCustomerSearchOptions.map(({ customer }) => (
                          <button
                            key={customer.id}
                            type="button"
                            className="transaction-search-dropdown__option"
                            aria-selected={customer.id === selectedCustomerId}
                            onMouseDown={(event) => {
                              event.preventDefault();
                              selectCustomer(customer);
                            }}
                            role="option"
                          >
                            <span className="transaction-search-dropdown__primary">{getCustomerSearchLabel(customer)}</span>
                          </button>
                        ))
                      ) : (
                        <div className="transaction-search-dropdown__empty">No customers found.</div>
                      )}
                    </div>
                  ) : null}
                </div>
                <p className="form-hint">
                  {normalizedCustomerSearchQuery.length < 3
                    ? 'Enter at least 3 characters to search customers'
                    : 'Search by customer name, phone, or customer code.'}
                </p>
              </div>
            </div>

            {selectedCustomer ? (
              <div className="transaction-customer-card">
                <div className="transaction-customer-card__header">
                  <span>Selected Customer</span>
                  <button
                    type="button"
                    className="transaction-customer-card__remove"
                    onClick={clearSelectedCustomer}
                    aria-label="Clear customer"
                    title="Clear customer"
                  >
                    x
                  </button>
                </div>
                <div className="transaction-customer-card__row">
                  <span>Name</span>
                  <strong>{getCustomerDisplayName(selectedCustomer)}</strong>
                </div>
                {getCustomerCode(selectedCustomer) ? (
                  <div className="transaction-customer-card__row">
                    <span>Code</span>
                    <strong>{getCustomerCode(selectedCustomer)}</strong>
                  </div>
                ) : null}
                <div className="transaction-customer-card__row">
                  <span>Phone</span>
                  <strong>{getCustomerPhone(selectedCustomer) || '-'}</strong>
                </div>
                {selectedCustomer.email ? (
                  <div className="transaction-customer-card__row">
                    <span>Email</span>
                    <strong>{selectedCustomer.email}</strong>
                  </div>
                ) : null}
                {selectedCustomer.address ? (
                  <div className="transaction-customer-card__row">
                    <span>Address</span>
                    <strong>{selectedCustomer.address}</strong>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="form-hint mb-0">Please select an existing customer or add a new customer.</p>
            )}
          </div>
        </div>

        <div className="transaction-section-header">
          <div>
            <div className="form-section-title mb-1">Transaction Details</div>
            <p className="page-muted small mb-0">Create a transaction record with account, charges, total, and remark.</p>
            {!selectedDepartment?.id ? (
              <p className="form-hint">Please select department first.</p>
            ) : null}
          </div>
          <button
            type="button"
            className="btn-app btn-app-secondary transaction-section-header__action"
            onClick={handleAddRow}
            disabled={isSubmitting}
          >
            Add Row
          </button>
        </div>

        <div className="transaction-entry-table transaction-entry-table--editor data-table-wrapper overflow-x-auto w-full">
          <table className="table data-table transaction-entry-table__grid transaction-entry-table__grid--transaction-form transaction-entry-table__grid--edit-form transaction-entry-table__grid--compact whitespace-nowrap">
            <thead>
              <tr>
                <th>Form</th>
                <th>Qty</th>
                <th>Item</th>
                <th>Account</th>
                <th>Amount</th>
                <th>Service Chg.</th>
                <th>Bank Chg.</th>
                <th>Other Chg.</th>
                <th>Total</th>
                <th>Remark</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td data-label="Form">
                  <div className="app-field">
                    <input
                      aria-label="Form"
                      className="form-control"
                      placeholder="Form"
                      value={currentRow.formName}
                      onFocus={guardTransactionFieldInteraction}
                      onChange={(event) => updateCurrentRow({ formName: event.target.value })}
                      readOnly={isTransactionEntryReadOnly}
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                </td>
                <td data-label="Qty">
                  <div className="app-field">
                    <input
                      aria-label="Qty"
                      className="form-control"
                      min="1"
                      placeholder="1"
                      step="1"
                      type="number"
                      value={currentRow.transactionNo}
                      onFocus={guardTransactionFieldInteraction}
                      onChange={(event) => updateCurrentRow({ transactionNo: event.target.value })}
                      readOnly={isTransactionEntryReadOnly}
                      disabled={isSubmitting}
                    />
                  </div>
                </td>
                <td data-label="Item">
                  <div className="app-field">
                    <select
                      aria-label="Item"
                      className="form-select"
                      value={currentRow.inventoryItemId}
                      onFocus={guardTransactionFieldInteraction}
                      onMouseDown={guardTransactionFieldInteraction}
                      onChange={(event) => handleCurrentInventorySelect(event.target.value)}
                      disabled={isSubmitting || isTransactionEntryReadOnly || inventoryItems.length === 0}
                      required
                    >
                      {selectedDepartment?.id ? (
                        <option value="">{inventoryItems.length > 0 ? 'Select Item' : 'No inventory available'}</option>
                      ) : (
                        <option value="">Please select department first</option>
                      )}
                      {inventoryItems.map((service) => (
                        <option key={service.id} value={service.id}>
                          {getInventoryLabel(service)}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
                <td data-label="Account">
                  <div className="app-field">
                    <select
                      aria-label="Account"
                      className="form-select"
                      value={currentRow.transactionAccountId}
                      onFocus={guardTransactionFieldInteraction}
                      onMouseDown={guardTransactionFieldInteraction}
                      onChange={(event) => {
                        if (!ensureDepartmentSelected()) return;
                        const nextAccountId = event.target.value;
                        const selectedInventory = inventoryItems.find((service) => service.id === currentRow.inventoryItemId);
                        updateCurrentRow({
                          transactionAccountId: nextAccountId,
                          amount: nextAccountId === 'other'
                            ? '0'
                            : selectedInventory?.price
                              ? String(selectedInventory.price)
                              : currentRow.amount,
                        });
                      }}
                      disabled={isSubmitting}
                      required
                    >
                      {accountOptions.map((option) => (
                        <option key={option.value || option.label} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {/* <p className="form-hint transaction-entry-table__hint">Select the account from which payment was made.</p> */}
                  </div>
                </td>
                <td data-label="Amount">
                  <div className="app-field">
                    <input
                      aria-label="Amount"
                      className={`form-control${currentRow.transactionAccountId === 'other' ? ' transaction-entry-table__disabled-input' : ''}`}
                      min="0"
                      placeholder="Rs. 0"
                      type="number"
                      value={currentRow.amount}
                      onFocus={guardTransactionFieldInteraction}
                      onChange={(event) => updateCurrentRow({ amount: event.target.value })}
                      readOnly={isTransactionEntryReadOnly}
                      disabled={isSubmitting || currentRow.transactionAccountId === 'other'}
                      required
                    />
                  </div>
                </td>
                <td data-label="Service Chg.">
                  <div className="app-field">
                    <input
                      aria-label="Service Chg."
                      className="form-control"
                      min="0"
                      placeholder="Rs. 0"
                      type="number"
                      value={currentRow.serviceCharge}
                      onFocus={guardTransactionFieldInteraction}
                      onChange={(event) => updateCurrentRow({ serviceCharge: event.target.value })}
                      readOnly={isTransactionEntryReadOnly}
                      disabled={isSubmitting}
                    />
                  </div>
                </td>
                <td data-label="Bank Chg.">
                  <div className="app-field">
                    <input
                      aria-label="Bank Chg."
                      className="form-control"
                      min="0"
                      placeholder="Rs. 0"
                      type="number"
                      value={currentRow.bankCharge}
                      onFocus={guardTransactionFieldInteraction}
                      onChange={(event) => updateCurrentRow({ bankCharge: event.target.value })}
                      readOnly={isTransactionEntryReadOnly}
                      disabled={isSubmitting}
                    />
                  </div>
                </td>
                <td data-label="Other Chg.">
                  <div className="app-field">
                    <input
                      aria-label="Other Chg."
                      className="form-control"
                      min="0"
                      placeholder="Rs. 0"
                      type="number"
                      value={currentRow.otherCharge}
                      onFocus={guardTransactionFieldInteraction}
                      onChange={(event) => updateCurrentRow({ otherCharge: event.target.value })}
                      readOnly={isTransactionEntryReadOnly}
                      disabled={isSubmitting}
                    />
                  </div>
                </td>
                <td data-label="Total">
                  <div className="app-field">
                    <input
                      aria-label="Total"
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
                      placeholder="Required"
                      value={currentRow.remark}
                      onFocus={guardTransactionFieldInteraction}
                      onChange={(event) => updateCurrentRow({ remark: event.target.value })}
                      readOnly={isTransactionEntryReadOnly}
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                </td>
              </tr>
              {savedRows.map((row) => (
                  <tr key={row.id}>
                    <td data-label="Form">
                      <input
                        aria-label="Saved Form"
                        className="form-control"
                        value={row.formName}
                        onChange={(event) => updateSavedRow(row.id, { formName: event.target.value })}
                      />
                    </td>
                    <td data-label="Qty">
                      <input
                        aria-label="Saved Qty"
                        className="form-control"
                        min="1"
                        step="1"
                        type="number"
                        value={row.noOfTransaction}
                        onChange={(event) => updateSavedRow(row.id, { noOfTransaction: toSafeAmount(event.target.value) || 1 })}
                      />
                    </td>
                    <td data-label="Item">
                      <select
                        aria-label="Saved Item"
                        className="form-select"
                        value={row.inventoryId}
                        onChange={(event) => handleSavedInventoryChange(row.id, event.target.value)}
                      >
                        {serviceOptions.map((option) => (
                          <option key={option.value || option.label} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {/* <p className="form-hint transaction-entry-table__hint">Select the account from which payment was made.</p> */}
                    </td>
                    <td data-label="Account">
                      <select
                        aria-label="Saved Account"
                        className="form-select"
                        value={row.transactionAccountType === 'other' ? 'other' : row.transactionAccountId || ''}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          const selectedInventory = inventoryItems.find((service) => service.id === row.inventoryId);
                          updateSavedRow(row.id, {
                            transactionAccount: nextValue,
                            transactionAccountId: nextValue === 'other' ? null : nextValue,
                            transactionAccountType: nextValue === 'other' ? 'other' : 'bank',
                            unitAmount: nextValue === 'other'
                              ? 0
                              : selectedInventory?.price
                                ? selectedInventory.price
                                : row.unitAmount,
                          });
                        }}
                      >
                        {accountOptions.map((option) => (
                          <option key={option.value || option.label} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td data-label="Amount">
                      <input
                        aria-label="Saved Amount"
                        className={`form-control${row.transactionAccountType === 'other' ? ' transaction-entry-table__disabled-input' : ''}`}
                        min="0"
                        type="number"
                        value={row.unitAmount}
                        onChange={(event) => updateSavedRow(row.id, { unitAmount: toSafeAmount(event.target.value) })}
                        disabled={row.transactionAccountType === 'other'}
                      />
                    </td>
                    <td data-label="Service Chg.">
                      <input
                        aria-label="Saved Service Chg."
                        className="form-control"
                        min="0"
                        type="number"
                        value={row.serviceCharge}
                        onChange={(event) => updateSavedRow(row.id, { serviceCharge: toSafeAmount(event.target.value) })}
                      />
                    </td>
                    <td data-label="Bank Chg.">
                      <input
                        aria-label="Saved Bank Chg."
                        className="form-control"
                        min="0"
                        type="number"
                        value={row.bankCharge}
                        onChange={(event) => updateSavedRow(row.id, { bankCharge: toSafeAmount(event.target.value) })}
                      />
                    </td>
                    <td data-label="Other Chg.">
                      <input
                        aria-label="Saved Other Chg."
                        className="form-control"
                        min="0"
                        type="number"
                        value={row.otherCharge}
                        onChange={(event) => updateSavedRow(row.id, { otherCharge: toSafeAmount(event.target.value) })}
                      />
                    </td>
                    <td data-label="Total">{row.totalAmount}</td>
                    <td data-label="Remark">
                      <div className="transaction-entry-table__saved-remark">
                        <input
                          aria-label="Saved Remark"
                          className="form-control"
                          value={row.remark}
                          onChange={(event) => updateSavedRow(row.id, { remark: event.target.value })}
                        />
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
                <td data-label="Service Chg.">{totals.serviceCharge}</td>
                <td data-label="Bank Chg.">{totals.bankCharge}</td>
                <td data-label="Other Chg.">{totals.otherCharge}</td>
                <td data-label="Total">{totals.totalAmount}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>

        <div className="modal-actions transaction-entry-table__actions transaction-entry-table__save-actions mt-4">
          <button type="submit" className="btn-app btn-app-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default ServiceForm;


