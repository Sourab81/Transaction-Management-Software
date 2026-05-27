'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { parseNonNegativeNumber } from '../../lib/number-validation';
import { createCustomer } from '../../lib/api/customers';
import { createInventory } from '../../lib/api/inventory';
import { createTransaction } from '../../lib/api/transactions';
import { mapCustomerRecord } from '../../lib/mappers/customer-mapper';
import { isRecord, readNumberValue, readStringValue } from '../../lib/mappers/legacy-record';
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
  transactionAccountType: 'cash' | 'bank';
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
  onInventoryChanged?: () => void;
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

const getCustomerSearchLabel = (customer: BusinessCustomer) => {
  const name = getCustomerDisplayName(customer);
  const phone = getCustomerPhone(customer);
  return phone ? `${phone} - ${name}` : name;
};

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
  onInventoryChanged,
}) => {
  const dispatch = useAppDispatch();
  const customerPanelRef = useRef<HTMLDivElement | null>(null);
  const customerSearchInputRef = useRef<HTMLInputElement | null>(null);
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
    initialCustomer,
  );
  const [customerSearch, setCustomerSearch] = useState(initialCustomer ? getCustomerSearchLabel(initialCustomer) : '');
  const [newCustomerName, setNewCustomerName] = useState(draft?.customerName && !initialCustomerId ? draft.customerName : '');
  const [newCustomerPhone, setNewCustomerPhone] = useState(draft?.customerPhone && !initialCustomerId ? draft.customerPhone : '');
  const [newCustomerEmail, setNewCustomerEmail] = useState(draft?.customerEmail && !initialCustomerId ? draft.customerEmail : '');
  const [validationError, setValidationError] = useState('');
  const [isCustomerPanelHighlighted, setIsCustomerPanelHighlighted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [localInventoryItems, setLocalInventoryItems] = useState<Service[]>([]);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [newInventoryName, setNewInventoryName] = useState('');
  const [newInventoryType, setNewInventoryType] = useState<'service' | 'product'>('service');
  const [newInventoryQuantity, setNewInventoryQuantity] = useState('0');
  const [newInventoryRemark, setNewInventoryRemark] = useState('');
  const [inventoryError, setInventoryError] = useState('');
  const [isCreatingInventory, setIsCreatingInventory] = useState(false);
  const selectedCounterId = selectedDepartment?.id || '';

  const inventoryItems = useMemo(() => {
    const byId = new Map<string, Service>();
    [...services, ...localInventoryItems].forEach((service) => {
      if (isServiceActiveForCounter(service, selectedCounterId)) {
        byId.set(service.id, service);
      }
    });

    return Array.from(byId.values());
  }, [localInventoryItems, selectedCounterId, services]);

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
    // Cash option is available even when no bank account exists.
    { value: 'cash', label: 'Cash' },
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

  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId) || selectedCustomerSnapshot;
  const isTransactionEntryLocked = !selectedCustomerId || !selectedDepartment?.id;
  const isTransactionEntryReadOnly = isTransactionEntryLocked || isSubmitting;
  const customerSearchOptions = customers.map((customer) => ({
    customer,
    label: getCustomerSearchLabel(customer),
  }));

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
    setCustomerSearch(getCustomerSearchLabel(customer));
    setNewCustomerPhone(getCustomerPhone(customer));
    setNewCustomerName(getCustomerDisplayName(customer));
    setNewCustomerEmail(customer.email || '');
    setValidationError('');
  };

  const handleCustomerSearchChange = (value: string) => {
    setCustomerSearch(value);
    const normalizedValue = value.trim().toLowerCase();
    const matchedOption = customerSearchOptions.find(({ customer, label }) => {
      const name = getCustomerDisplayName(customer).toLowerCase();
      const phone = getCustomerPhone(customer).toLowerCase();
      return label.toLowerCase() === normalizedValue
        || customer.id.toLowerCase() === normalizedValue
        || name === normalizedValue
        || phone === normalizedValue;
    });

    if (matchedOption) {
      selectCustomer(matchedOption.customer);
      return;
    }

    setSelectedCustomerId('');
    setSelectedCustomerSnapshot(null);
    setValidationError('');
  };

  const beginManualCustomerEntry = () => {
    setValidationError('');
    if (!selectedCustomerId && !selectedCustomerSnapshot) return;

    setSelectedCustomerId('');
    setSelectedCustomerSnapshot(null);
    setCustomerSearch('');
  };

  const handleCreateCustomer = async () => {
    const trimmedName = newCustomerName.trim();
    const trimmedPhone = newCustomerPhone.trim();
    if (!trimmedName || !trimmedPhone) {
      setValidationError('Customer name and phone are required to add a customer.');
      return;
    }

    const existingCustomer = customers.find((customer) => customer.phone === trimmedPhone);
    if (existingCustomer) {
      selectCustomer(existingCustomer);
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
      setIsCustomerPanelHighlighted(false);
      setCustomerSearch(getCustomerSearchLabel(createdCustomer));
      setNewCustomerName(getCustomerDisplayName(createdCustomer));
      setNewCustomerPhone(getCustomerPhone(createdCustomer));
      setNewCustomerEmail(createdCustomer.email || '');
      setValidationError('');
      onCustomersChanged?.();
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  const handleInventorySearchChange = (value: string) => {
    if (!ensureDepartmentSelected()) return;

    const matchedService = inventoryItems.find((service) =>
      service.name.toLowerCase() === value.trim().toLowerCase()
      || getInventoryLabel(service).toLowerCase() === value.trim().toLowerCase()
    );

    updateCurrentRow({
      serviceProduct: value,
      inventoryItemId: matchedService?.id || '',
      ...(matchedService && matchedService.price > 0 ? { amount: String(matchedService.price) } : {}),
    });
  };

  const handleCreateInventory = async () => {
    if (!ensureCustomerSelected()) {
      setInventoryError('Please select or add a customer first.');
      return;
    }
    if (!selectedDepartment?.id) {
      setInventoryError('Please select department first.');
      return;
    }

    const trimmedName = newInventoryName.trim();
    if (!trimmedName) {
      setInventoryError('Inventory name is required.');
      return;
    }

    const parsedQuantity = newInventoryType === 'service' ? 0 : parseNonNegativeNumber(newInventoryQuantity);
    if (parsedQuantity === null) {
      setInventoryError('Quantity must be a valid zero or positive number.');
      return;
    }

    setIsCreatingInventory(true);
    setInventoryError('');
    try {
      const result = await createInventory({
        name: trimmedName,
        type: newInventoryType,
        quantity: parsedQuantity,
        remark: newInventoryRemark.trim() || null,
        counterId: selectedDepartment.id,
      });

      if (!result.success) {
        setInventoryError(result.message || 'Unable to add inventory item.');
        return;
      }

      const createdRecord = isRecord(result.item) ? result.item : null;
      const createdId = readStringValue(createdRecord, ['id', 'inventory_id', 'inventoryId']);
      const createdName = readStringValue(createdRecord, ['name', 'inventory_name', 'inventoryName']) || trimmedName;
      const createdType = readStringValue(createdRecord, ['type', 'inventory_type', 'inventoryType']) === 'product' ? 'product' : newInventoryType;
      const createdQuantity = readNumberValue(createdRecord, ['quantity', 'qty']) ?? parsedQuantity;

      if (createdId) {
        const createdInventory: Service = {
          id: createdId,
          name: createdName,
          category: createdType === 'product' ? 'Product' : 'Service',
          price: 0,
          status: 'Active',
          description: newInventoryRemark.trim(),
          type: createdType,
          quantity: createdQuantity,
          remark: newInventoryRemark.trim() || null,
          counterId: selectedDepartment.id,
          departmentId: selectedDepartment.id,
          departmentName: selectedDepartment.name,
        };

        setLocalInventoryItems((items) => [createdInventory, ...items.filter((item) => item.id !== createdInventory.id)]);
        updateCurrentRow({
          inventoryItemId: createdInventory.id,
          serviceProduct: createdInventory.name,
        });
      }

      onInventoryChanged?.();
      setNewInventoryName('');
      setNewInventoryType('service');
      setNewInventoryQuantity('0');
      setNewInventoryRemark('');
      setIsInventoryModalOpen(false);
    } finally {
      setIsCreatingInventory(false);
    }
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

    if (!row.formName.trim() || !row.transactionNo.trim() || !row.transactionAccountId || !row.amount.trim()) {
      setValidationError('Form Name, No. of Txn, Service/Product, Transaction Account, and Amount are required.');
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
      transactionAccount: transactionAccountType === 'cash' ? 'cash' : row.transactionAccountId,
      transactionAccountId: transactionAccountType === 'cash' ? null : row.transactionAccountId,
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

    updateSavedRow(rowId, {
      inventoryId,
      inventoryItemId: inventoryId,
      serviceProduct: selectedService.name,
      inventoryItemType: selectedService.type,
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
      {isInventoryModalOpen ? (
        <ActionModal
          title="Add Inventory"
          eyebrow="Inventory"
          description={selectedDepartment ? `Create an item for ${selectedDepartment.name}.` : 'Please select department first.'}
          onClose={() => setIsInventoryModalOpen(false)}
        >
          {inventoryError ? (
            <div className="form-alert" role="alert">{inventoryError}</div>
          ) : null}
          <div className="row g-3">
            <div className="col-12">
              <label className="form-label" htmlFor="transaction-new-inventory-name">Inventory Name</label>
              <input
                className="form-control"
                id="transaction-new-inventory-name"
                value={newInventoryName}
                onChange={(event) => {
                  setNewInventoryName(event.target.value);
                  setInventoryError('');
                }}
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label" htmlFor="transaction-new-inventory-type">Type</label>
              <select
                className="form-select"
                id="transaction-new-inventory-type"
                value={newInventoryType}
                onChange={(event) => {
                  const nextType = event.target.value as 'service' | 'product';
                  setNewInventoryType(nextType);
                  if (nextType === 'service') setNewInventoryQuantity('0');
                  setInventoryError('');
                }}
              >
                <option value="service">Service</option>
                <option value="product">Product</option>
              </select>
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label" htmlFor="transaction-new-inventory-quantity">Quantity</label>
              <input
                className="form-control"
                id="transaction-new-inventory-quantity"
                min="0"
                type="number"
                value={newInventoryType === 'service' ? '0' : newInventoryQuantity}
                onChange={(event) => {
                  setNewInventoryQuantity(event.target.value);
                  setInventoryError('');
                }}
                disabled={newInventoryType === 'service'}
              />
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="transaction-new-inventory-remark">Remark Optional</label>
              <input
                className="form-control"
                id="transaction-new-inventory-remark"
                value={newInventoryRemark}
                onChange={(event) => setNewInventoryRemark(event.target.value)}
              />
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-app btn-app-secondary" onClick={() => setIsInventoryModalOpen(false)} disabled={isCreatingInventory}>
              Cancel
            </button>
            <button type="button" className="btn-app btn-app-primary" onClick={handleCreateInventory} disabled={isCreatingInventory || !selectedDepartment?.id}>
              {isCreatingInventory ? 'Saving...' : 'Save Inventory'}
            </button>
          </div>
        </ActionModal>
      ) : null}

      <div className="form-section-card mb-4">
        {validationError ? (
          <div className="form-alert" role="alert">
            {validationError}
          </div>
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
          </div>

          <div className="transaction-customer-panel__grid">
            <div className="app-field">
              <label className="form-label" htmlFor="transaction-customer-search">Search Customer</label>
              <input
                ref={customerSearchInputRef}
                className="form-control"
                id="transaction-customer-search"
                list="transaction-customer-options"
                placeholder="Search by phone or name"
                value={customerSearch}
                onChange={(event) => handleCustomerSearchChange(event.target.value)}
              />
              <datalist id="transaction-customer-options">
                {customerSearchOptions.map(({ customer, label }) => (
                  <option key={customer.id} value={label} />
                ))}
              </datalist>
              {selectedCustomer ? (
                <p className="form-hint">Selected: {getCustomerDisplayName(selectedCustomer)} {getCustomerPhone(selectedCustomer) ? `(${getCustomerPhone(selectedCustomer)})` : ''}</p>
              ) : (
                <p className="form-hint">Please select an existing customer or add the customer details below.</p>
              )}
            </div>

            <div className="transaction-customer-panel__two-column">
              <div className="app-field">
                <label className="form-label" htmlFor="transaction-customer-name">Customer Name</label>
                <input
                  className="form-control"
                  id="transaction-customer-name"
                  placeholder="Customer name"
                  value={newCustomerName}
                  onChange={(event) => {
                    beginManualCustomerEntry();
                    setNewCustomerName(event.target.value);
                  }}
                />
              </div>
              <div className="app-field">
                <label className="form-label" htmlFor="transaction-customer-phone">Customer Phone</label>
                <input
                  className="form-control"
                  id="transaction-customer-phone"
                  placeholder="Customer phone"
                  value={newCustomerPhone}
                  onChange={(event) => {
                    beginManualCustomerEntry();
                    setNewCustomerPhone(event.target.value);
                  }}
                />
              </div>
            </div>

            <div className="app-field">
              <label className="form-label" htmlFor="transaction-customer-email">Email Optional</label>
              <input
                className="form-control"
                id="transaction-customer-email"
                placeholder="Email address"
                type="email"
                value={newCustomerEmail}
                onChange={(event) => {
                  beginManualCustomerEntry();
                  setNewCustomerEmail(event.target.value);
                }}
              />
            </div>

            <div className="transaction-customer-panel__footer">
              <button
                type="button"
                className="btn-app btn-app-secondary"
                onClick={handleCreateCustomer}
                disabled={isCreatingCustomer}
              >
                {isCreatingCustomer ? 'Adding Customer...' : 'Add Customer'}
              </button>
            </div>
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
                      onFocus={guardTransactionFieldInteraction}
                      onChange={(event) => updateCurrentRow({ formName: event.target.value })}
                      readOnly={isTransactionEntryReadOnly}
                      disabled={isSubmitting}
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
                      onFocus={guardTransactionFieldInteraction}
                      onChange={(event) => updateCurrentRow({ transactionNo: event.target.value })}
                      readOnly={isTransactionEntryReadOnly}
                      disabled={isSubmitting}
                    />
                  </div>
                </td>
                <td data-label="Service/Product">
                  <div className="app-field">
                    {inventoryItems.length > 0 ? (
                      <div className="d-flex gap-2">
                        <input
                          aria-label="Service/Product"
                          className="form-control"
                          list="transaction-inventory-options"
                          placeholder={selectedDepartment?.id ? 'Search service/product' : 'Please select department first'}
                          value={currentRow.serviceProduct}
                          onFocus={guardTransactionFieldInteraction}
                          onMouseDown={guardTransactionFieldInteraction}
                          onChange={(event) => handleInventorySearchChange(event.target.value)}
                          readOnly={isTransactionEntryReadOnly}
                          disabled={isSubmitting}
                          required
                        />
                        <datalist id="transaction-inventory-options">
                          {inventoryItems.map((service) => (
                            <option key={service.id} value={getInventoryLabel(service)} />
                          ))}
                        </datalist>
                        <button
                          type="button"
                          className="btn-icon-sm btn-icon-sm--primary"
                          onClick={() => {
                            if (ensureDepartmentSelected()) setIsInventoryModalOpen(true);
                          }}
                          disabled={isSubmitting}
                          aria-label="Add Inventory"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <input
                        aria-label="Service/Product"
                        className="form-control"
                        placeholder={selectedDepartment?.id ? 'No inventory available' : 'Please select department first'}
                        value={currentRow.serviceProduct}
                        onFocus={guardTransactionFieldInteraction}
                        onMouseDown={guardTransactionFieldInteraction}
                        onChange={(event) => updateCurrentRow({ serviceProduct: event.target.value })}
                        readOnly
                        disabled={isSubmitting}
                        required
                      />
                    )}
                    {inventoryItems.length === 0 ? (
                      <button
                        type="button"
                        className="btn-app btn-app-secondary mt-2"
                        onClick={() => {
                          if (ensureDepartmentSelected()) setIsInventoryModalOpen(true);
                        }}
                        disabled={isSubmitting}
                      >
                        + Add Inventory
                      </button>
                    ) : null}
                  </div>
                </td>
                <td data-label="Transaction Account">
                  <div className="app-field">
                    <select
                      aria-label="Transaction Account"
                      className="form-select"
                      value={currentRow.transactionAccountId}
                      onFocus={guardTransactionFieldInteraction}
                      onMouseDown={guardTransactionFieldInteraction}
                      onChange={(event) => {
                        if (!ensureDepartmentSelected()) return;
                        updateCurrentRow({ transactionAccountId: event.target.value });
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
                      onFocus={guardTransactionFieldInteraction}
                      onChange={(event) => updateCurrentRow({ amount: event.target.value })}
                      readOnly={isTransactionEntryReadOnly}
                      disabled={isSubmitting}
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
                      onFocus={guardTransactionFieldInteraction}
                      onChange={(event) => updateCurrentRow({ serviceCharge: event.target.value })}
                      readOnly={isTransactionEntryReadOnly}
                      disabled={isSubmitting}
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
                      onFocus={guardTransactionFieldInteraction}
                      onChange={(event) => updateCurrentRow({ bankCharge: event.target.value })}
                      readOnly={isTransactionEntryReadOnly}
                      disabled={isSubmitting}
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
                      onFocus={guardTransactionFieldInteraction}
                      onChange={(event) => updateCurrentRow({ otherCharge: event.target.value })}
                      readOnly={isTransactionEntryReadOnly}
                      disabled={isSubmitting}
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
                      onFocus={guardTransactionFieldInteraction}
                      onChange={(event) => updateCurrentRow({ remark: event.target.value })}
                      readOnly={isTransactionEntryReadOnly}
                      disabled={isSubmitting}
                    />
                  </div>
                </td>
              </tr>
              {savedRows.map((row) => (
                  <tr key={row.id}>
                    <td data-label="Form Name">
                      <input
                        aria-label="Saved Form Name"
                        className="form-control"
                        value={row.formName}
                        onChange={(event) => updateSavedRow(row.id, { formName: event.target.value })}
                      />
                    </td>
                    <td data-label="No. of Txn">
                      <input
                        aria-label="Saved No. of Txn"
                        className="form-control"
                        min="1"
                        step="1"
                        type="number"
                        value={row.noOfTransaction}
                        onChange={(event) => updateSavedRow(row.id, { noOfTransaction: toSafeAmount(event.target.value) || 1 })}
                      />
                    </td>
                    <td data-label="Service/Product">
                      <select
                        aria-label="Saved Service/Product"
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
                    </td>
                    <td data-label="Transaction Account">
                      <select
                        aria-label="Saved Transaction Account"
                        className="form-select"
                        value={row.transactionAccountType === 'cash' ? 'cash' : row.transactionAccountId || ''}
                        onChange={(event) => {
                          const nextValue = event.target.value;
                          updateSavedRow(row.id, {
                            transactionAccount: nextValue,
                            transactionAccountId: nextValue === 'cash' ? null : nextValue,
                            transactionAccountType: nextValue === 'cash' ? 'cash' : 'bank',
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
                        className="form-control"
                        min="0"
                        type="number"
                        value={row.unitAmount}
                        onChange={(event) => updateSavedRow(row.id, { unitAmount: toSafeAmount(event.target.value) })}
                      />
                    </td>
                    <td data-label="Service Charge">
                      <input
                        aria-label="Saved Service Charge"
                        className="form-control"
                        min="0"
                        type="number"
                        value={row.serviceCharge}
                        onChange={(event) => updateSavedRow(row.id, { serviceCharge: toSafeAmount(event.target.value) })}
                      />
                    </td>
                    <td data-label="Bank Charge">
                      <input
                        aria-label="Saved Bank Charge"
                        className="form-control"
                        min="0"
                        type="number"
                        value={row.bankCharge}
                        onChange={(event) => updateSavedRow(row.id, { bankCharge: toSafeAmount(event.target.value) })}
                      />
                    </td>
                    <td data-label="Other Charge">
                      <input
                        aria-label="Saved Other Charge"
                        className="form-control"
                        min="0"
                        type="number"
                        value={row.otherCharge}
                        onChange={(event) => updateSavedRow(row.id, { otherCharge: toSafeAmount(event.target.value) })}
                      />
                    </td>
                    <td data-label="Total Amount">{row.totalAmount}</td>
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
                <td data-label="Service Charge">{totals.serviceCharge}</td>
                <td data-label="Bank Charge">{totals.bankCharge}</td>
                <td data-label="Other Charge">{totals.otherCharge}</td>
                <td data-label="Total Amount">{totals.totalAmount}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>

        <div className="modal-actions transaction-entry-table__actions transaction-entry-table__save-actions mt-4">
          <button type="submit" className="btn-app btn-app-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Transaction'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default ServiceForm;
