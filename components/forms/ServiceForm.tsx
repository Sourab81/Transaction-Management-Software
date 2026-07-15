'use client';

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaChevronDown, FaPlus } from 'react-icons/fa';
import CustomerName from '../common/CustomerName';
import ConfirmActionModal from '../ui/state/ConfirmActionModal';
import { parseNonNegativeNumber } from '../../lib/number-validation';
import { createCustomer, getCustomers } from '../../lib/api/customers';
import { createTransaction, updateTransaction } from '../../lib/api/transactions';
import { mapCustomerRecord, mapCustomersResponse } from '../../lib/mappers/customer-mapper';
import { extractFirstRecordWithKeys, readStringValue } from '../../lib/mappers/legacy-record';
import {
  type Account,
  type BusinessCustomer,
  type Counter,
  type Service,
  type Transaction,
  type TransactionChildRow,
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
  childId?: string;
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
  unitServiceCharge: number;
  serviceCharge: number;
  unitBankCharge: number;
  bankCharge: number;
  unitOtherCharge: number;
  otherCharge: number;
  totalAmount: number;
  remark: string;
}

interface TransactionDraftRow {
  childId?: string;
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

interface NewCustomerDraft {
  customerName: string;
  mobileNo: string;
  address: string;
  dob: string;
  email: string;
}

type SavedTransactionRow = TransactionFormPayload & { id: string };

interface CustomerSearchPanelProps {
  inputRef: React.RefObject<HTMLInputElement | null>;
  isEditMode: boolean;
  isHighlighted: boolean;
  selectedCustomer: BusinessCustomer | null;
  initialDraft: NewCustomerDraft;
  onCustomerSelected: (customer: BusinessCustomer) => void;
  onCustomerCleared: () => void;
  onDraftChange: (draft: NewCustomerDraft) => void;
  onValidationClear: () => void;
}

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
  initialTransaction?: Transaction | null;
  onCustomersChanged?: () => void;
  onTransactionsChanged?: () => void | Promise<void>;
  onDirtyChange?: (isDirty: boolean) => void;
}

const toSafeAmount = (value: string) => parseNonNegativeNumber(value) ?? 0;

const createEmptyRow = (transactionAccountId: string): TransactionDraftRow => ({
  childId: undefined,
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

const normalizeTransactionAccountId = (value: string | null | undefined, fallback: string) => {
  const normalizedValue = value?.trim().toLowerCase();
  return normalizedValue === 'cash' ? 'other' : value || fallback;
};

const transactionChildToDraftRow = (
  row: TransactionChildRow,
  fallbackAccountId: string,
): TransactionDraftRow => {
  const qty = Math.max(row.noOfTransaction || 1, 1);
  return {
    childId: row.id,
    formName: row.formName || '',
    transactionNo: String(row.noOfTransaction || 1),
    serviceProduct: row.inventoryName || '',
    inventoryItemId: row.inventoryId || '',
    transactionAccountId: normalizeTransactionAccountId(row.transactionAccount, fallbackAccountId),
    amount: String((row.amount ?? 0) / qty),
    serviceCharge: String((row.serviceCharge ?? 0) / qty),
    bankCharge: String((row.bankCharge ?? 0) / qty),
    otherCharge: String((row.otherCharge ?? 0) / qty),
    remark: row.remark || '',
  };
};

const getTransactionDraftRows = (
  transaction: Transaction | null | undefined,
  fallbackAccountId: string,
) => {
  if (!transaction) return [];
  if (transaction.rows && transaction.rows.length > 0) {
    return transaction.rows.map((row) => transactionChildToDraftRow(row, fallbackAccountId));
  }

  const qty = Math.max(transaction.noOfTransaction || 1, 1);
  return [{
    childId: undefined,
    formName: transaction.formName || '',
    transactionNo: String(transaction.noOfTransaction || 1),
    serviceProduct: transaction.serviceProduct || transaction.service || '',
    inventoryItemId: transaction.inventoryItemId || transaction.serviceId || '',
    transactionAccountId: normalizeTransactionAccountId(
      transaction.transactionAccountId || transaction.accountId,
      fallbackAccountId,
    ),
    amount: String((transaction.transactionAmount ?? transaction.amount ?? 0) / qty),
    serviceCharge: String((transaction.serviceCharge ?? 0) / qty),
    bankCharge: String((transaction.bankCharge ?? 0) / qty),
    otherCharge: String((transaction.otherCharge ?? 0) / qty),
    remark: transaction.remark || transaction.note || '',
  } satisfies TransactionDraftRow];
};

const savedRowToDraftRow = (row: SavedTransactionRow): TransactionDraftRow => ({
  childId: row.childId,
  formName: row.formName,
  transactionNo: String(row.noOfTransaction),
  serviceProduct: row.serviceProduct,
  inventoryItemId: row.inventoryItemId || '',
  transactionAccountId: row.transactionAccountId || 'other',
  amount: String(row.unitAmount),
  serviceCharge: String(row.unitServiceCharge),
  bankCharge: String(row.unitBankCharge),
  otherCharge: String(row.unitOtherCharge),
  remark: row.remark,
});

const createEmptyCustomerDraft = (customerName = ''): NewCustomerDraft => ({
  customerName,
  mobileNo: '',
  address: '',
  dob: '',
  email: '',
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
  return [name, code, phone].filter(Boolean).join(' / ');
};

const mapCreatedCustomerResponse = (
  payload: unknown,
  draft: NewCustomerDraft,
): BusinessCustomer | null => {
  const record = extractFirstRecordWithKeys(
    payload,
    ['id', 'customer_id', 'customerId', 'cust_id'],
    ['data', 'customer', 'item', 'result'],
  );
  const scalarId = typeof payload === 'string' || typeof payload === 'number'
    ? String(payload).trim()
    : '';
  const id = record
    ? readStringValue(record, ['id', 'customer_id', 'customerId', 'cust_id']) || ''
    : scalarId;

  if (!id) return null;

  if (record) {
    const mappedCustomer = mapCustomerRecord({
      ...record,
      customer_name: readStringValue(record, ['customer_name', 'customerName', 'name']) || draft.customerName,
      mobile_no: readStringValue(record, ['mobile_no', 'mobileNo', 'phone']) || draft.mobileNo,
      email: readStringValue(record, ['email']) || draft.email,
      address: readStringValue(record, ['address']) || draft.address,
    });
    if (mappedCustomer) return mappedCustomer;
  }

  const addedDate = new Date().toISOString().split('T')[0];
  return {
    id,
    name: draft.customerName,
    customerName: draft.customerName,
    customerCode: undefined,
    phone: draft.mobileNo,
    mobileNo: draft.mobileNo,
    email: draft.email || undefined,
    address: draft.address || null,
    remark: null,
    status: 'Active',
    joinedDate: addedDate,
    addedDate,
  };
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
  `${service.name} (Stock: ${service.currentStock ?? service.quantity ?? 0})`;

const getAvailableStock = (service: Service | undefined) => (
  service ? Number(service.currentStock ?? service.quantity ?? 0) : 0
);

const isStockManagedProduct = (service: Service | undefined) => service?.type === 'product';

const getAvailableStockLabel = (service: Service | undefined) => (
  service ? `Available Stock: ${isStockManagedProduct(service) ? getAvailableStock(service) : 'Unlimited'}` : ''
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

const CustomerSearchPanel = memo(function CustomerSearchPanel({
  inputRef,
  isEditMode,
  isHighlighted,
  selectedCustomer,
  initialDraft,
  onCustomerSelected,
  onCustomerCleared,
  onDraftChange,
  onValidationClear,
}: CustomerSearchPanelProps) {
  const [customerOptions, setCustomerOptions] = useState<BusinessCustomer[]>(
    selectedCustomer ? [selectedCustomer] : [],
  );
  const [customerSearchQuery, setCustomerSearchQuery] = useState(
    selectedCustomer ? getCustomerSearchLabel(selectedCustomer) : initialDraft.customerName,
  );
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [isCustomerSearchLoading, setIsCustomerSearchLoading] = useState(false);
  const [hasCustomerSearchCompleted, setHasCustomerSearchCompleted] = useState(false);
  const [newCustomerDraft, setNewCustomerDraft] = useState<NewCustomerDraft>(initialDraft);
  const normalizedCustomerSearchQuery = customerSearchQuery.trim().toLowerCase();
  const showNewCustomerDraft = !isEditMode && !selectedCustomer && customerSearchQuery.trim().length > 3;
  const customerSearchOptions = useMemo(() => customerOptions.map((customer) => ({
    customer,
    label: getCustomerSearchLabel(customer),
  })), [customerOptions]);
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
    if (!selectedCustomer) return;

    setCustomerOptions((previousOptions) => {
      const merged = new Map<string, BusinessCustomer>();
      [selectedCustomer, ...previousOptions].forEach((customer) => {
        merged.set(customer.id, customer);
      });
      return Array.from(merged.values());
    });
    setCustomerSearchQuery(getCustomerSearchLabel(selectedCustomer));
    setIsCustomerDropdownOpen(false);
    setNewCustomerDraft(createEmptyCustomerDraft());
  }, [selectedCustomer]);

  useEffect(() => {
    onDraftChange(newCustomerDraft);
  }, [newCustomerDraft, onDraftChange]);

  useEffect(() => {
    const searchTerm = customerSearchQuery.trim();
    if (isEditMode || selectedCustomer || searchTerm.length < 3) {
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
  }, [customerSearchQuery, isEditMode, selectedCustomer]);

  const selectCustomer = (customer: BusinessCustomer) => {
    setCustomerSearchQuery(getCustomerSearchLabel(customer));
    setIsCustomerDropdownOpen(false);
    setNewCustomerDraft(createEmptyCustomerDraft());
    onCustomerSelected(customer);
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

    if (selectedCustomer) {
      onCustomerCleared();
    }
    setIsCustomerDropdownOpen(false);
    setNewCustomerDraft((customer) => ({
      ...customer,
      customerName: value,
    }));
    onValidationClear();
  };

  const clearSelectedCustomer = () => {
    setCustomerSearchQuery('');
    setIsCustomerDropdownOpen(false);
    setNewCustomerDraft(createEmptyCustomerDraft());
    onCustomerCleared();
  };

  return (
    <div className={`transaction-customer-panel mb-4${isHighlighted ? ' transaction-customer-panel--highlight' : ''}`}>
      <div className="transaction-customer-panel__header">
        <div>
          <div className="form-section-title mb-1">Customer Search</div>
          <p className="page-muted small mb-0">Select an existing customer, or complete the inline customer details before submitting.</p>
        </div>
      </div>

      <div className="transaction-customer-panel__grid">
        <div className="transaction-customer-panel__selector-row">
          <div className="app-field transaction-customer-panel__search-field">
            <label className="form-label" htmlFor="transaction-customer-search">Select Customer</label>
            <div className="transaction-search-combobox transaction-modern-select">
              <input
                ref={inputRef}
                className="form-control transaction-modern-select__control"
                id="transaction-customer-search"
                placeholder="Select Customer"
                value={customerSearchQuery}
                autoComplete="off"
                disabled={isEditMode}
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
                        aria-selected={customer.id === selectedCustomer?.id}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          selectCustomer(customer);
                        }}
                        role="option"
                      >
                        <CustomerName
                          name={getCustomerSearchLabel(customer)}
                          color={customer.color}
                          className="transaction-search-dropdown__primary"
                        />
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

          {selectedCustomer ? (
            <div className="transaction-customer-summary">
              <CustomerName
                name={[
                  getCustomerDisplayName(selectedCustomer),
                  getCustomerPhone(selectedCustomer),
                  getCustomerCode(selectedCustomer),
                  selectedCustomer.email,
                  selectedCustomer.address,
                ].filter(Boolean).join(' | ')}
                color={selectedCustomer.color}
                className="transaction-customer-summary__text"
              />
              {!isEditMode ? (
                <button
                  type="button"
                  className="transaction-customer-summary__clear"
                  onClick={clearSelectedCustomer}
                  aria-label="Clear customer"
                  title="Clear customer"
                >
                  x
                </button>
              ) : null}
            </div>
          ) : (
            <p className="form-hint transaction-customer-panel__inline-hint">
              {showNewCustomerDraft
                ? 'Complete Name and Mobile, then submit.'
                : 'Search existing customer or type more than 3 characters.'}
            </p>
          )}
        </div>

        {showNewCustomerDraft ? (
          <div className="transaction-customer-draft">
            <input
              className="form-control"
              id="transaction-new-customer-name"
              placeholder="Name *"
              value={newCustomerDraft.customerName}
              onChange={(event) => {
                const customerName = event.target.value;
                setNewCustomerDraft((customer) => ({ ...customer, customerName }));
                onValidationClear();
              }}
              required
              aria-label="Customer Name"
            />
            <input
              className="form-control"
              id="transaction-new-customer-mobile"
              inputMode="tel"
              placeholder="Mobile *"
              value={newCustomerDraft.mobileNo}
              onChange={(event) => {
                setNewCustomerDraft((customer) => ({ ...customer, mobileNo: event.target.value }));
                onValidationClear();
              }}
              required
              aria-label="Mobile"
            />
            <input
              className="form-control"
              id="transaction-new-customer-address"
              placeholder="Address"
              value={newCustomerDraft.address}
              onChange={(event) => setNewCustomerDraft((customer) => ({ ...customer, address: event.target.value }))}
              aria-label="Address"
            />
            <input
              className="form-control"
              id="transaction-new-customer-dob"
              type="date"
              value={newCustomerDraft.dob}
              onChange={(event) => setNewCustomerDraft((customer) => ({ ...customer, dob: event.target.value }))}
              aria-label="DOB"
            />
            <input
              className="form-control"
              id="transaction-new-customer-email"
              type="email"
              placeholder="Email"
              value={newCustomerDraft.email}
              onChange={(event) => setNewCustomerDraft((customer) => ({ ...customer, email: event.target.value }))}
              aria-label="Email"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
});

const ServiceForm: React.FC<ServiceFormProps> = ({
  accounts = [],
  businessId,
  customers = [],
  selectedDepartment,
  services = [],
  actor,
  draft,
  initialTransaction,
  onCustomersChanged,
  onTransactionsChanged,
  onDirtyChange,
}) => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const customerPanelRef = useRef<HTMLDivElement | null>(null);
  const customerSearchInputRef = useRef<HTMLInputElement | null>(null);
  const initialService = draft?.serviceId
    ? services.find((service) => service.id === draft.serviceId)
    : null;
  const defaultTransactionAccountId = 'other';
  const isEditMode = Boolean(initialTransaction?.id);
  const editDraftRows = getTransactionDraftRows(initialTransaction, defaultTransactionAccountId);
  const initialCustomerId = initialTransaction?.customerId
    || (draft?.customerId && customers.some((customer) => customer.id === draft.customerId) ? draft.customerId : '');
  const initialCustomer = useMemo(() => (
    initialCustomerId
      ? customers.find((customer) => customer.id === initialCustomerId) || (initialTransaction ? {
          id: initialTransaction.customerId,
          name: initialTransaction.customerName,
          customerName: initialTransaction.customerName,
          customerCode: initialTransaction.customerCode,
          phone: initialTransaction.customerPhone || 'Not added',
          mobileNo: initialTransaction.customerPhone || 'Not added',
          email: initialTransaction.customerEmail,
          address: initialTransaction.customerAddress || null,
          dob: initialTransaction.customerDob,
          status: 'Active' as const,
        } : null)
      : null
  ), [customers, initialCustomerId, initialTransaction]);

  // currentRow is the active entry row shown at the top of the table.
  const [currentRow, setCurrentRow] = useState<TransactionDraftRow>({
    ...(editDraftRows[0] || {
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
    }),
  });
  // savedRows are completed rows already moved out of the active entry row.
  const [savedRows, setSavedRows] = useState<SavedTransactionRow[]>(() => editDraftRows.slice(1).map((row, index) => {
    const noOfTransaction = toSafeAmount(row.transactionNo) || 1;
    const unitAmount = toSafeAmount(row.amount);
    const unitServiceCharge = toSafeAmount(row.serviceCharge);
    const unitBankCharge = toSafeAmount(row.bankCharge);
    const unitOtherCharge = toSafeAmount(row.otherCharge);
    const amount = noOfTransaction * unitAmount;
    const serviceCharge = noOfTransaction * unitServiceCharge;
    const bankCharge = noOfTransaction * unitBankCharge;
    const otherCharge = noOfTransaction * unitOtherCharge;

    return {
      childId: row.childId,
      id: `existing-${row.childId || index}`,
      formName: row.formName,
      transactionNo: row.transactionNo,
      noOfTransaction,
      serviceProduct: row.serviceProduct,
      inventoryId: row.inventoryItemId,
      inventoryItemId: row.inventoryItemId,
      transactionAccount: row.transactionAccountId,
      transactionAccountId: row.transactionAccountId === 'other' ? null : row.transactionAccountId,
      transactionAccountType: row.transactionAccountId === 'other' ? 'other' : 'bank',
      unitAmount,
      amount,
      unitServiceCharge,
      serviceCharge,
      unitBankCharge,
      bankCharge,
      unitOtherCharge,
      otherCharge,
      totalAmount: amount + serviceCharge + bankCharge + otherCharge,
      remark: row.remark,
    };
  }));
  const [removedRowIds, setRemovedRowIds] = useState<string[]>([]);
  // customer is required before saving transaction rows.
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialCustomerId);
  const [selectedCustomerSnapshot, setSelectedCustomerSnapshot] = useState<BusinessCustomer | null>(
    initialCustomer,
  );
  const initialNewCustomerDraft = useMemo<NewCustomerDraft>(() => ({
    customerName: draft?.customerName && !initialCustomerId ? draft.customerName : '',
    mobileNo: draft?.customerPhone && !initialCustomerId ? draft.customerPhone : '',
    address: '',
    dob: '',
    email: draft?.customerEmail && !initialCustomerId ? draft.customerEmail : '',
  }), [draft?.customerEmail, draft?.customerName, draft?.customerPhone, initialCustomerId]);
  const newCustomerDraftRef = useRef<NewCustomerDraft>(initialNewCustomerDraft);
  const [hasCompleteNewCustomerDraft, setHasCompleteNewCustomerDraft] = useState(
    Boolean(initialNewCustomerDraft.customerName.trim() && initialNewCustomerDraft.mobileNo.trim()),
  );
  const [validationError, setValidationError] = useState('');
  const [isCustomerPanelHighlighted, setIsCustomerPanelHighlighted] = useState(false);
  const [formResetCount, setFormResetCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaveConfirmationOpen, setIsSaveConfirmationOpen] = useState(false);
  const [hasUserChanges, setHasUserChanges] = useState(false);
  const selectedCounterId = selectedDepartment?.id || '';

  useEffect(() => {
    if (initialCustomer && selectedCustomerId === initialCustomer.id) {
      setSelectedCustomerSnapshot(initialCustomer);
    }
  }, [initialCustomer, selectedCustomerId]);

  const inventoryItems = useMemo(() => {
    const byId = new Map<string, Service>();
    services.forEach((service) => {
      if (service.status === 'Active') {
        byId.set(service.id, service);
      }
    });

    return Array.from(byId.values());
  }, [services]);

  const isInventoryValidForSelectedDepartment = (inventoryId: string | number | null | undefined) => (
    inventoryItems.some((service) => idsMatch(service.id, inventoryId))
  );

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
    const currentBase = isCurrentRowEmpty(currentRow)
      ? { amount: 0, serviceCharge: 0, bankCharge: 0, otherCharge: 0, totalAmount: 0 }
      : {
          amount: qty * currentAmounts.amount,
          serviceCharge: qty * currentAmounts.serviceCharge,
          bankCharge: qty * currentAmounts.bankCharge,
          otherCharge: qty * currentAmounts.otherCharge,
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

  const currentSelectedInventory = inventoryItems.find((service) => service.id === currentRow.inventoryItemId);
  const stockValidationError = useMemo(() => {
    const requestedQuantityByInventory: Record<string, number> = {};

    if (!isCurrentRowEmpty(currentRow) && currentRow.inventoryItemId) {
      requestedQuantityByInventory[currentRow.inventoryItemId] = (
        requestedQuantityByInventory[currentRow.inventoryItemId] || 0
      ) + currentAmounts.noOfTransaction;
    }

    savedRows.forEach((row) => {
      requestedQuantityByInventory[row.inventoryId] = (
        requestedQuantityByInventory[row.inventoryId] || 0
      ) + row.noOfTransaction;
    });

    const hasInsufficientStock = Object.entries(requestedQuantityByInventory).some(([inventoryId, requestedQuantity]) => {
      const selectedService = inventoryItems.find((service) => service.id === inventoryId);
      return isStockManagedProduct(selectedService) && requestedQuantity > getAvailableStock(selectedService);
    });

    return hasInsufficientStock ? 'Insufficient stock available.' : '';
  }, [currentAmounts.noOfTransaction, currentRow, inventoryItems, savedRows]);

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
    setHasUserChanges(true);
    setValidationError('');
  };

  useEffect(() => {
    onDirtyChange?.(isEditMode
      ? hasUserChanges
      : !isCurrentRowEmpty(currentRow)
        || savedRows.length > 0
        || Boolean(selectedCustomerId)
        || hasCompleteNewCustomerDraft);
  }, [currentRow, hasCompleteNewCustomerDraft, hasUserChanges, isEditMode, onDirtyChange, savedRows.length, selectedCustomerId]);

  const selectedCustomer = selectedCustomerSnapshot;
  const hasCustomerForTransaction = Boolean(selectedCustomerId || hasCompleteNewCustomerDraft);
  const isTransactionEntryLocked = !hasCustomerForTransaction || !selectedDepartment?.id;
  const isTransactionEntryReadOnly = isTransactionEntryLocked || isSubmitting;
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
    hasCustomerForTransaction ? true : showCustomerRequiredMessage()
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

  const handleCustomerSelected = useCallback((customer: BusinessCustomer) => {
    setSelectedCustomerId(customer.id);
    setSelectedCustomerSnapshot(customer);
    setIsCustomerPanelHighlighted(false);
    newCustomerDraftRef.current = createEmptyCustomerDraft();
    setHasCompleteNewCustomerDraft(false);
    setValidationError('');
  }, []);

  const handleCustomerCleared = useCallback(() => {
    setSelectedCustomerId('');
    setSelectedCustomerSnapshot(null);
    newCustomerDraftRef.current = createEmptyCustomerDraft();
    setHasCompleteNewCustomerDraft(false);
    setValidationError('');
  }, []);

  const handleCustomerDraftChange = useCallback((nextDraft: NewCustomerDraft) => {
    newCustomerDraftRef.current = nextDraft;
    const isComplete = Boolean(nextDraft.customerName.trim() && nextDraft.mobileNo.trim());
    setHasCompleteNewCustomerDraft((current) => current === isComplete ? current : isComplete);
  }, []);

  const clearValidationError = useCallback(() => {
    setValidationError('');
  }, []);

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

    const unitAmount = toSafeAmount(row.amount);
    const unitServiceCharge = toSafeAmount(row.serviceCharge);
    const unitBankCharge = toSafeAmount(row.bankCharge);
    const unitOtherCharge = toSafeAmount(row.otherCharge);
    const amount = noOfTransaction * unitAmount;
    const serviceCharge = noOfTransaction * unitServiceCharge;
    const bankCharge = noOfTransaction * unitBankCharge;
    const otherCharge = noOfTransaction * unitOtherCharge;
    const selectedService = inventoryItems.find((service) => service.id === row.inventoryItemId);
    if (!selectedService) {
      setValidationError('Please select an active service/product from the selected department.');
      return null;
    }
    if (isStockManagedProduct(selectedService) && noOfTransaction > getAvailableStock(selectedService)) {
      setValidationError('Insufficient stock available.');
      return null;
    }

    return {
      childId: row.childId,
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
      unitAmount,
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

  const resetCurrentRow = () => {
    setCurrentRow(createEmptyRow(defaultTransactionAccountId));
  };

  const resetForm = () => {
    resetCurrentRow();
    setSavedRows([]);
    setSelectedCustomerId('');
    setSelectedCustomerSnapshot(null);
    setFormResetCount((c) => c + 1);
    newCustomerDraftRef.current = createEmptyCustomerDraft();
    setHasCompleteNewCustomerDraft(false);
    setIsCustomerPanelHighlighted(false);
    setHasUserChanges(false);
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
    setHasUserChanges(true);
    setValidationError('');
  };

  const handleRemoveSavedRow = (rowId: string) => {
    setHasUserChanges(true);
    setSavedRows((rows) => {
      const removedRow = rows.find((row) => row.id === rowId);
      if (removedRow?.childId) {
        setRemovedRowIds((ids) => ids.includes(removedRow.childId as string) ? ids : [...ids, removedRow.childId as string]);
      }
      return rows.filter((row) => row.id !== rowId);
    });
  };

  const handleRemoveCurrentRow = () => {
    setHasUserChanges(true);
    if (currentRow.childId) {
      setRemovedRowIds((ids) => ids.includes(currentRow.childId as string) ? ids : [...ids, currentRow.childId as string]);
    }

    setSavedRows((rows) => {
      const [nextCurrentRow, ...remainingRows] = rows;
      setCurrentRow(nextCurrentRow ? savedRowToDraftRow(nextCurrentRow) : createEmptyRow(defaultTransactionAccountId));
      return remainingRows;
    });
    setValidationError('');
  };

  const updateSavedRow = (rowId: string, values: Partial<SavedTransactionRow>) => {
    setHasUserChanges(true);
    setSavedRows((rows) => rows.map((row) => {
      if (row.id !== rowId) return row;

      const nextRow = { ...row, ...values };
      const noOfTransaction = nextRow.noOfTransaction || 1;
      const unitAmount = nextRow.unitAmount;
      const unitServiceCharge = nextRow.unitServiceCharge;
      const unitBankCharge = nextRow.unitBankCharge;
      const unitOtherCharge = nextRow.unitOtherCharge;
      const amount = noOfTransaction * unitAmount;
      const serviceCharge = noOfTransaction * unitServiceCharge;
      const bankCharge = noOfTransaction * unitBankCharge;
      const otherCharge = noOfTransaction * unitOtherCharge;

      return {
        ...nextRow,
        amount,
        serviceCharge,
        bankCharge,
        otherCharge,
        totalAmount: amount + serviceCharge + bankCharge + otherCharge,
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

  const submitTransaction = async () => {
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
    if (rowsToSubmit.length === 0) {
      setValidationError('Please add at least one transaction row before saving.');
      return;
    }
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
    const requestedQuantityByInventory = rowsToSubmit.reduce<Record<string, number>>((totalsByInventory, row) => {
      totalsByInventory[row.inventoryId] = (totalsByInventory[row.inventoryId] || 0) + row.noOfTransaction;
      return totalsByInventory;
    }, {});
    const hasInsufficientStock = Object.entries(requestedQuantityByInventory).some(([inventoryId, requestedQuantity]) => {
      const selectedService = inventoryItems.find((service) => service.id === inventoryId);
      return isStockManagedProduct(selectedService) && requestedQuantity > getAvailableStock(selectedService);
    });
    if (hasInsufficientStock) {
      setValidationError('Insufficient stock available.');
      return;
    }
    const selectedDepartmentId = selectedDepartment?.id;
    if (!selectedDepartmentId) {
      setValidationError('Please select department first.');
      return;
    }
    if (isEditMode && !initialTransaction?.id) {
      setValidationError('Transaction id is required in edit mode.');
      return;
    }

    const pendingNewCustomerDraft = newCustomerDraftRef.current;
    setIsSubmitting(true);
    resetForm();
    try {
      let transactionCustomerId = selectedCustomerId;
      let customerWasCreated = false;

      if (!transactionCustomerId) {
        const newCustomerDraft = pendingNewCustomerDraft;
        const customerName = newCustomerDraft.customerName.trim();
        const mobileNo = newCustomerDraft.mobileNo.trim();

        if (!customerName || !mobileNo) {
          setValidationError('Customer name and mobile number are required.');
          return;
        }

        const customerResult = await createCustomer({
          customerName,
          mobileNo,
          email: newCustomerDraft.email.trim() || null,
          address: newCustomerDraft.address.trim() || null,
          dob: newCustomerDraft.dob || null,
          remark: null,
        });

        if (!customerResult.success) {
          setValidationError(customerResult.message || 'Unable to create customer.');
          return;
        }

        const createdCustomer = mapCreatedCustomerResponse(customerResult.customer, {
          ...newCustomerDraft,
          customerName,
          mobileNo,
        });
        if (!createdCustomer) {
          setValidationError('Customer was created, but the customer ID was missing from the API response.');
          return;
        }

        transactionCustomerId = createdCustomer.id;
        customerWasCreated = true;
        newCustomerDraftRef.current = createEmptyCustomerDraft();
        setHasCompleteNewCustomerDraft(false);
        setIsCustomerPanelHighlighted(false);
        dispatch({
          type: 'ADD_CUSTOMER',
          businessId,
          payload: createdCustomer,
        });
        onCustomersChanged?.();
      }

      const noOfTransaction = rowsToSubmit.reduce((sum, row) => sum + row.noOfTransaction, 0);
      const transactionRows = rowsToSubmit.map((row) => ({
        ...(row.childId ? { id: row.childId } : {}),
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
      }));
      const result = isEditMode && initialTransaction
        ? await updateTransaction({
            transactionId: initialTransaction.id,
            customerId: transactionCustomerId,
            counterId: selectedDepartmentId,
            rows: transactionRows,
            removedRowIds,
          })
        : await createTransaction({
            customerId: transactionCustomerId,
            counterId: selectedDepartmentId,
            date: new Date().toISOString().split('T')[0],
            rows: transactionRows,
          });

      if (!result.success) {
        setValidationError(
          customerWasCreated
            ? `Customer created, but transaction failed. ${result.message || 'Please try transaction again.'}`
            : result.message || `Unable to ${isEditMode ? 'update' : 'save'} transaction.`,
        );
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
          message: isEditMode ? 'Transaction updated successfully.' : 'Transaction created successfully.',
        },
      });

      await onTransactionsChanged?.();
      if (isEditMode) {
        window.location.assign('/transactions/list');
      } else {
        router.refresh();
      }
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : 'Unable to save transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    if (stockValidationError) {
      setValidationError(stockValidationError);
      return;
    }
    setIsSaveConfirmationOpen(true);
  };

  const handleConfirmSubmit = async () => {
    if (isSubmitting) return;
    await submitTransaction();
    setIsSaveConfirmationOpen(false);
  };

  return (
    <form onSubmit={handleSubmit} className="service-workflow-form" noValidate>
      <div className="form-section-card mb-4">
        {(validationError || stockValidationError) ? (
          <div className="form-alert" role="alert">
            {validationError || stockValidationError}
          </div>
        ) : null}

        <div ref={customerPanelRef}>
          <CustomerSearchPanel
            key={formResetCount}
            inputRef={customerSearchInputRef}
            isEditMode={isEditMode}
            isHighlighted={isCustomerPanelHighlighted}
            selectedCustomer={selectedCustomer}
            initialDraft={initialNewCustomerDraft}
            onCustomerSelected={handleCustomerSelected}
            onCustomerCleared={handleCustomerCleared}
            onDraftChange={handleCustomerDraftChange}
            onValidationClear={clearValidationError}
          />
        </div>
        <div className="transaction-section-header">
          <div>
            <div className="form-section-title mb-1">Transaction Details</div>
            <p className="page-muted small mb-0">Create a transaction record with account, charges, total, and remark.</p>
            {!selectedDepartment?.id ? (
              <p className="form-hint">Please select department first.</p>
            ) : null}
          </div>
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
                <th>Service</th>
                <th>Bank</th>
                <th>Other</th>
                <th>Total</th>
                <th>Remark</th>
                <th aria-label="Actions" />
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
                    {currentSelectedInventory ? (
                      <p className="form-hint transaction-entry-table__stock-hint">
                        {getAvailableStockLabel(currentSelectedInventory)}
                      </p>
                    ) : null}
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
                <td data-label="Add Row" className="transaction-entry-table__action-cell">
                  <div className="transaction-entry-table__action-stack">
                    <button
                      type="button"
                      className="btn-icon-sm btn-icon-sm--primary transaction-entry-table__add-row"
                      onClick={handleAddRow}
                      disabled={isSubmitting || Boolean(stockValidationError)}
                      aria-label="Add transaction row"
                      title="Add Row"
                    >
                      <FaPlus size={12} />
                      
                    </button>
                    {isEditMode && currentRow.childId ? (
                      <button
                        type="button"
                        className="transaction-entry-table__remove-row"
                        onClick={handleRemoveCurrentRow}
                        disabled={isSubmitting}
                        aria-label="Remove transaction row"
                        title="Remove row"
                      >
                        x
                      </button>
                    ) : null}
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
                      {(() => {
                        const selectedInventory = inventoryItems.find((service) => service.id === row.inventoryId);
                        return selectedInventory ? (
                          <p className="form-hint transaction-entry-table__stock-hint">
                            {getAvailableStockLabel(selectedInventory)}
                          </p>
                        ) : null;
                      })()}
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
                        value={row.unitServiceCharge}
                        onChange={(event) => updateSavedRow(row.id, { unitServiceCharge: toSafeAmount(event.target.value) })}
                      />
                    </td>
                    <td data-label="Bank Chg.">
                      <input
                        aria-label="Saved Bank Chg."
                        className="form-control"
                        min="0"
                        type="number"
                        value={row.unitBankCharge}
                        onChange={(event) => updateSavedRow(row.id, { unitBankCharge: toSafeAmount(event.target.value) })}
                      />
                    </td>
                    <td data-label="Other Chg.">
                      <input
                        aria-label="Saved Other Chg."
                        className="form-control"
                        min="0"
                        type="number"
                        value={row.unitOtherCharge}
                        onChange={(event) => updateSavedRow(row.id, { unitOtherCharge: toSafeAmount(event.target.value) })}
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
                      </div>
                    </td>
                    <td data-label="Action" className="transaction-entry-table__action-cell">
                      <button
                        type="button"
                        className="transaction-entry-table__remove-row"
                        onClick={() => handleRemoveSavedRow(row.id)}
                        aria-label="Remove transaction row"
                        title="Remove row"
                      >
                        x
                      </button>
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
                <td className="transaction-entry-table__action-cell" />
              </tr>
            </tbody>
          </table>
        </div>

        <div className="modal-actions transaction-entry-table__actions transaction-entry-table__save-actions mt-4">
          <button type="submit" className="btn-app btn-app-primary" disabled={isSubmitting || Boolean(stockValidationError)}>
            {isSubmitting ? (isEditMode ? 'Updating...' : 'Submitting...') : isEditMode ? 'Update' : 'Submit'}
          </button>
        </div>
      </div>
      {isSaveConfirmationOpen ? (
        <ConfirmActionModal
          title="Save Transaction"
          description="Are you sure you want to save this transaction?"
          confirmLabel="Confirm"
          confirmingLabel={isEditMode ? 'Updating...' : 'Saving...'}
          cancelLabel="Cancel"
          isConfirming={isSubmitting}
          onConfirm={handleConfirmSubmit}
          onCancel={() => setIsSaveConfirmationOpen(false)}
        />
      ) : null}
    </form>
  );
};

export default ServiceForm;


