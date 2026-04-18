'use client';

import React, { useMemo, useState } from 'react';
import { FaPlusCircle, FaTrashAlt } from 'react-icons/fa';
import { parseNonNegativeNumber } from '../../lib/number-validation';
import { deriveTransactionStatus } from '../../lib/transaction-workflow';
import {
  validateTransactionAccountSelection,
  validateTransactionAmounts,
} from '../../lib/transaction-rules';
import {
  createRecordId,
  getDepartmentDefaultAccount,
  getDepartmentLinkedAccounts,
  getServicesForDepartment,
  type BusinessCustomer,
  type Counter,
  type Service,
  type Transaction,
  type TransactionPaymentDetails,
  useAppDispatch,
} from '../../lib/store';
import {
  useBusinessWorkspaceData,
  useCustomerSearchMatches,
} from '../../lib/dashboard-selectors';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';

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

interface ServiceTransactionLine {
  id: string;
  serviceId: string;
  totalAmount: string;
  paidAmount: string;
  paymentMode: Transaction['paymentMode'];
  status: Transaction['status'];
}

interface ServiceFormInitialState {
  customerSearch: string;
  transactionLines: ServiceTransactionLine[];
  phone: string;
  name: string;
  email: string;
  note: string;
}

type CardTypeOption = 'credit' | 'debit' | 'other';
type CardNetworkOption = 'visa' | 'mastercard' | 'rupay' | 'amex' | 'other';

interface UpiPaymentDetailFormState {
  transactionId: string;
  utrNumber: string;
}

interface CardPaymentDetailFormState {
  transactionId: string;
  cardType: CardTypeOption;
  customCardType: string;
  cardNetwork: CardNetworkOption;
  customCardNetwork: string;
  lastFourDigits: string;
}

interface BankPaymentDetailFormState {
  bankTransferType: string;
  bankTransactionReferenceNumber: string;
  senderAccountHolderName: string;
  senderBankName: string;
  senderAccountNumber: string;
}

const paymentModeOptions = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank', label: 'Bank' },
  { value: 'card', label: 'Card' },
];

const transactionStatusOptions = [
  { value: 'completed', label: 'Completed' },
  { value: 'pending', label: 'Pending' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refunded', label: 'Refunded' },
];

const cardTypeOptions = [
  { value: 'credit', label: 'Credit' },
  { value: 'debit', label: 'Debit' },
  { value: 'other', label: 'Other' },
];

const cardNetworkOptions = [
  { value: 'visa', label: 'Visa' },
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'rupay', label: 'RuPay' },
  { value: 'amex', label: 'Amex' },
  { value: 'other', label: 'Other' },
];

const bankTransferTypeOptions = [
  { value: 'NEFT', label: 'NEFT' },
  { value: 'RTGS', label: 'RTGS' },
  { value: 'IMPS', label: 'IMPS' },
  { value: 'Cash Deposit', label: 'Cash Deposit' },
  { value: 'Cheque', label: 'Cheque' },
  { value: 'Online Net Banking', label: 'Online Net Banking' },
];

const createEmptyUpiPaymentDetails = (): UpiPaymentDetailFormState => ({
  transactionId: '',
  utrNumber: '',
});

const createEmptyCardPaymentDetails = (): CardPaymentDetailFormState => ({
  transactionId: '',
  cardType: 'credit',
  customCardType: '',
  cardNetwork: 'visa',
  customCardNetwork: '',
  lastFourDigits: '',
});

const createEmptyBankPaymentDetails = (): BankPaymentDetailFormState => ({
  bankTransferType: 'NEFT',
  bankTransactionReferenceNumber: '',
  senderAccountHolderName: '',
  senderBankName: '',
  senderAccountNumber: '',
});

const createTransactionLine = (
  overrides: Partial<Omit<ServiceTransactionLine, 'id'>> = {},
): ServiceTransactionLine => ({
  id: createRecordId(),
  serviceId: overrides.serviceId ?? '',
  totalAmount: overrides.totalAmount ?? '',
  paidAmount: overrides.paidAmount ?? '',
  paymentMode: overrides.paymentMode ?? 'cash',
  status: overrides.status ?? 'completed',
});

const buildInitialState = (
  draft: ServiceWorkflowDraft | null | undefined,
  customers: BusinessCustomer[],
  services: Service[],
): ServiceFormInitialState => {
  const matchedById = draft?.customerId
    ? customers.find((customer) => customer.id === draft.customerId)
    : null;
  const matchedByPhone = draft?.customerPhone
    ? customers.find((customer) => customer.phone === draft.customerPhone)
    : null;
  const matchedCustomer = matchedById || matchedByPhone;
  const matchedService = draft?.serviceId
    ? services.find((service) => service.id === draft.serviceId)
    : null;
  const resolvedPhone = draft?.customerPhone || matchedCustomer?.phone || '';
  const resolvedName = draft?.customerName || matchedCustomer?.name || '';
  const resolvedEmail = draft?.customerEmail ?? matchedCustomer?.email ?? '';
  const resolvedTotalAmount = typeof draft?.totalAmount === 'number'
    ? draft.totalAmount
    : matchedService?.price;
  const resolvedPaidAmount = typeof draft?.paidAmount === 'number'
    ? draft.paidAmount
    : resolvedTotalAmount;

  return {
    customerSearch: resolvedName || resolvedPhone
      ? `${resolvedName || 'Customer'}${resolvedPhone ? ` | ${resolvedPhone}` : ''}`
      : '',
    transactionLines: [
      createTransactionLine({
        serviceId: matchedService?.id || '',
        totalAmount: typeof resolvedTotalAmount === 'number' ? String(resolvedTotalAmount) : '',
        paidAmount: typeof resolvedPaidAmount === 'number' ? String(resolvedPaidAmount) : '',
        paymentMode: draft?.paymentMode || 'cash',
        status: draft?.status || 'completed',
      }),
    ],
    phone: resolvedPhone,
    name: resolvedName,
    email: resolvedEmail,
    note: draft?.note || '',
  };
};

interface ServiceFormProps {
  availableDepartments: Counter[];
  businessId: string;
  selectedDepartment?: Counter | null;
  actor: {
    id: string;
    name: string;
    role: 'Customer' | 'Employee';
  };
  draft?: ServiceWorkflowDraft | null;
}

const ServiceForm: React.FC<ServiceFormProps> = ({ availableDepartments, businessId, selectedDepartment, actor, draft }) => {
  const dispatch = useAppDispatch();
  const workspace = useBusinessWorkspaceData(businessId);
  const services = useMemo(
    () => getServicesForDepartment(workspace.services, selectedDepartment?.id),
    [selectedDepartment?.id, workspace.services],
  );
  const activeServices = useMemo(
    () => services.filter((service) => service.status === 'Active'),
    [services],
  );
  const customers = workspace.customers;
  const accounts = workspace.accounts;
  const initialState = buildInitialState(draft, customers, services);
  const [customerSearch, setCustomerSearch] = useState(initialState.customerSearch);
  const [transactionLines, setTransactionLines] = useState<ServiceTransactionLine[]>(initialState.transactionLines);
  const [phone, setPhone] = useState<string>(initialState.phone);
  const [name, setName] = useState<string>(initialState.name);
  const [email, setEmail] = useState<string>(initialState.email);
  const [note, setNote] = useState(initialState.note);
  const [sharedPaymentMode, setSharedPaymentMode] = useState<Transaction['paymentMode']>(
    initialState.transactionLines[0]?.paymentMode || 'cash',
  );
  const [sharedStatus, setSharedStatus] = useState<Transaction['status']>(
    initialState.transactionLines[0]?.status || 'completed',
  );
  const [upiPaymentDetails, setUpiPaymentDetails] = useState<UpiPaymentDetailFormState>(createEmptyUpiPaymentDetails());
  const [cardPaymentDetails, setCardPaymentDetails] = useState<CardPaymentDetailFormState>(createEmptyCardPaymentDetails());
  const [bankPaymentDetails, setBankPaymentDetails] = useState<BankPaymentDetailFormState>(createEmptyBankPaymentDetails());
  const [validationError, setValidationError] = useState('');
  const [isQuickServiceCreatorOpen, setIsQuickServiceCreatorOpen] = useState(false);
  const [quickServiceDepartmentId, setQuickServiceDepartmentId] = useState(
    selectedDepartment?.status === 'Active'
      ? selectedDepartment.id
      : availableDepartments.find((department) => department.status === 'Active')?.id || '',
  );
  const [quickServiceName, setQuickServiceName] = useState('');
  const [quickServiceCategory, setQuickServiceCategory] = useState('General');
  const [quickServicePrice, setQuickServicePrice] = useState('');
  const [quickServiceDescription, setQuickServiceDescription] = useState('');
  const [quickServiceError, setQuickServiceError] = useState('');
  const departmentAccounts = useMemo(
    () => getDepartmentLinkedAccounts(selectedDepartment, accounts),
    [accounts, selectedDepartment],
  );
  const defaultDepartmentAccount = useMemo(
    () => getDepartmentDefaultAccount(selectedDepartment, accounts),
    [accounts, selectedDepartment],
  );
  const [selectedTransactionAccountId, setSelectedTransactionAccountId] = useState(defaultDepartmentAccount?.id || '');
  const resolvedSelectedTransactionAccountId = departmentAccounts.some((account) => account.id === selectedTransactionAccountId)
    ? selectedTransactionAccountId
    : defaultDepartmentAccount?.id || '';
  const isSingleServiceEntry = transactionLines.length === 1;
  const activePaymentMode = isSingleServiceEntry
    ? transactionLines[0]?.paymentMode || 'cash'
    : sharedPaymentMode;
  const activeRequestedStatus = isSingleServiceEntry
    ? transactionLines[0]?.status || 'completed'
    : sharedStatus;
  const accessibleDepartments = availableDepartments.length > 0
    ? availableDepartments
    : selectedDepartment
      ? [selectedDepartment]
      : [];
  const activeAccessibleDepartments = accessibleDepartments.filter((department) => department.status === 'Active');
  const isSelectedDepartmentActive = selectedDepartment?.status === 'Active';
  const inactiveServiceCount = services.length - activeServices.length;
  const canOpenQuickServiceCreator = Boolean(selectedDepartment) && isSelectedDepartmentActive && activeAccessibleDepartments.length > 0;
  const canAddTransactionLines = Boolean(selectedDepartment) && isSelectedDepartmentActive && activeServices.length > 0;
  const canSaveTransaction = Boolean(selectedDepartment) && isSelectedDepartmentActive && activeServices.length > 0;
  const transactionRestrictionMessage = !selectedDepartment
    ? 'Select a department before saving the transaction.'
    : !isSelectedDepartmentActive
      ? `${selectedDepartment.name} is inactive. Activate the department before creating transactions.`
      : '';
  const serviceAvailabilityMessage = selectedDepartment && isSelectedDepartmentActive
    ? services.length === 0
      ? 'Use New Service to create the first service for this department, or add it from the Services page.'
      : activeServices.length === 0
        ? 'All services in this department are inactive. Activate a service before creating a transaction.'
        : ''
    : '';

  const matchedCustomer = phone
    ? customers.find((customer) => customer.phone === phone) || null
    : null;

  const customerMatches = useCustomerSearchMatches(customers, customerSearch);

  const serviceOptions = [
    {
      value: '',
      label: !selectedDepartment
        ? 'Select a department first'
        : !isSelectedDepartmentActive
          ? 'Selected department is inactive'
          : activeServices.length > 0
            ? 'Select Service'
            : services.length > 0
              ? 'No active service in this department'
              : 'No service in this department',
    },
    ...activeServices.map((service) => ({
      value: service.id,
      label: `${service.name} | Rs. ${service.price}`,
    })),
  ];
  const selectedTransactionAccount = departmentAccounts.find((account) => account.id === resolvedSelectedTransactionAccountId) || defaultDepartmentAccount;
  const hasNonCashTransactionLine = activePaymentMode !== 'cash';
  const isEmployeeDepartmentLocked = actor.role === 'Employee';

  const selectCustomer = (customerId: string) => {
    const customer = customers.find((item) => item.id === customerId);
    if (!customer) return;

    setCustomerSearch(`${customer.name} | ${customer.phone}`);
    setPhone(customer.phone);
    setName(customer.name);
    setEmail(customer.email || '');
  };

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    const foundCustomer = customers.find((customer) => customer.phone === value);
    if (foundCustomer) {
      setName(foundCustomer.name);
      setEmail(foundCustomer.email || '');
      setCustomerSearch(`${foundCustomer.name} | ${foundCustomer.phone}`);
    }
  };

  const updateTransactionLine = (
    lineId: string,
    updater: (line: ServiceTransactionLine) => ServiceTransactionLine,
  ) => {
    setTransactionLines((currentLines) =>
      currentLines.map((line) => (line.id === lineId ? updater(line) : line))
    );
  };

  const updateUpiPaymentDetail = (field: keyof UpiPaymentDetailFormState, value: string) => {
    setValidationError('');
    setUpiPaymentDetails((currentDetails) => ({
      ...currentDetails,
      [field]: value,
    }));
  };

  const updateCardPaymentDetail = (field: keyof CardPaymentDetailFormState, value: string) => {
    setValidationError('');
    setCardPaymentDetails((currentDetails) => ({
      ...currentDetails,
      [field]: value,
    }));
  };

  const updateBankPaymentDetail = (field: keyof BankPaymentDetailFormState, value: string) => {
    setValidationError('');
    setBankPaymentDetails((currentDetails) => ({
      ...currentDetails,
      [field]: value,
    }));
  };

  const handleServiceChange = (lineId: string, serviceId: string) => {
    const service = activeServices.find((item) => item.id === serviceId);
    setValidationError('');

    updateTransactionLine(lineId, (line) => {
      if (!service) {
        return {
          ...line,
          serviceId,
          totalAmount: '',
          paidAmount: '',
        };
      }

      const nextTotalAmount = String(service.price);
      const parsedCurrentPaidAmount = parseNonNegativeNumber(line.paidAmount);

      return {
        ...line,
        serviceId,
        totalAmount: nextTotalAmount,
        paidAmount:
          parsedCurrentPaidAmount === null || parsedCurrentPaidAmount > service.price
            ? nextTotalAmount
            : line.paidAmount,
      };
    });
  };

  const updateTransactionField = (
    lineId: string,
    field: 'totalAmount' | 'paidAmount' | 'paymentMode' | 'status',
    value: string,
  ) => {
    setValidationError('');
    updateTransactionLine(lineId, (line) => ({
      ...line,
      [field]: value,
    }) as ServiceTransactionLine);
  };

  const resetQuickServiceCreator = () => {
    setQuickServiceDepartmentId(
      selectedDepartment?.status === 'Active'
        ? selectedDepartment.id
        : activeAccessibleDepartments[0]?.id || '',
    );
    setQuickServiceName('');
    setQuickServiceCategory('General');
    setQuickServicePrice('');
    setQuickServiceDescription('');
    setQuickServiceError('');
  };

  const openQuickServiceCreator = () => {
    resetQuickServiceCreator();
    setValidationError('');
    setIsQuickServiceCreatorOpen(true);
  };

  const closeQuickServiceCreator = () => {
    resetQuickServiceCreator();
    setIsQuickServiceCreatorOpen(false);
  };

  const handleQuickServiceCreate = () => {
    const selectedServiceDepartment = activeAccessibleDepartments.find((department) => department.id === quickServiceDepartmentId);
    if (!selectedServiceDepartment) {
      setQuickServiceError('Choose an active department that should own this service.');
      return;
    }

    const parsedServicePrice = parseNonNegativeNumber(quickServicePrice);
    if (!quickServiceName.trim() || !quickServiceCategory.trim() || !quickServiceDescription.trim()) {
      setQuickServiceError('Department, service name, category, and description are required.');
      return;
    }

    if (parsedServicePrice === null) {
      setQuickServiceError('Service price must be a valid zero or positive number.');
      return;
    }

    const newServiceId = createRecordId();
    setValidationError('');
    dispatch({
      type: 'ADD_SERVICE',
      businessId,
      payload: {
        id: newServiceId,
        departmentId: selectedServiceDepartment.id,
        departmentName: selectedServiceDepartment.name,
        name: quickServiceName.trim(),
        category: quickServiceCategory.trim(),
        price: parsedServicePrice,
        status: 'Active',
        description: quickServiceDescription.trim(),
      },
    });

    dispatch({
      type: 'ADD_HISTORY_EVENT',
      businessId,
      payload: {
        title: `${quickServiceName.trim()} service added for ${selectedServiceDepartment.name}`,
        module: 'Services',
        actor: actor.name,
        status: 'Completed',
      },
    });

    dispatch({
      type: 'ADD_NOTIFICATION',
      businessId,
      payload: {
        type: 'success',
        message: `${quickServiceName.trim()} is ready in ${selectedServiceDepartment.name}.`,
      },
    });

    if (selectedDepartment?.id === selectedServiceDepartment.id) {
      const targetLineId = transactionLines.find((line) => !line.serviceId)?.id || transactionLines[0]?.id;

      if (targetLineId) {
        updateTransactionLine(targetLineId, (line) => {
          const nextTotalAmount = String(parsedServicePrice);
          const parsedCurrentPaidAmount = parseNonNegativeNumber(line.paidAmount);

          return {
            ...line,
            serviceId: newServiceId,
            totalAmount: nextTotalAmount,
            paidAmount:
              parsedCurrentPaidAmount === null || parsedCurrentPaidAmount > parsedServicePrice
                ? nextTotalAmount
                : line.paidAmount,
          };
        });
      }
    }

    closeQuickServiceCreator();
  };

  const addTransactionLine = () => {
    setSharedPaymentMode(activePaymentMode);
    setSharedStatus(activeRequestedStatus);
    setTransactionLines((currentLines) => [
      ...currentLines,
      createTransactionLine({
        paymentMode: activePaymentMode,
        status: activeRequestedStatus,
      }),
    ]);
    setValidationError('');
  };

  const removeTransactionLine = (lineId: string) => {
    setTransactionLines((currentLines) => {
      if (currentLines.length === 1) {
        return currentLines;
      }

      const nextLines = currentLines.filter((line) => line.id !== lineId);
      if (nextLines.length !== 1) {
        return nextLines;
      }

      return nextLines.map((line) => ({
        ...line,
        paymentMode: activePaymentMode,
        status: activeRequestedStatus,
      }));
    });
    setValidationError('');
  };

  const getDueAmount = (line: ServiceTransactionLine) =>
    Math.max((parseNonNegativeNumber(line.totalAmount) || 0) - (parseNonNegativeNumber(line.paidAmount) || 0), 0);

  const getBatchStatus = (statuses: Transaction['status'][]): 'Completed' | 'Pending' | 'Failed' => {
    if (statuses.every((currentStatus) => currentStatus === 'completed')) {
      return 'Completed';
    }

    if (statuses.some((currentStatus) => currentStatus === 'pending')) {
      return 'Pending';
    }

    return 'Failed';
  };

  const buildPaymentDetailsPayload = (paymentMode: Transaction['paymentMode']): TransactionPaymentDetails | undefined => {
    if (paymentMode === 'cash') {
      return undefined;
    }

    if (paymentMode === 'upi') {
      const transactionId = upiPaymentDetails.transactionId.trim();
      const utrNumber = upiPaymentDetails.utrNumber.trim();

      if (!transactionId || !utrNumber) {
        throw new Error('Fill transaction ID and UTR number for the UPI payment.');
      }

      return {
        kind: 'upi',
        transactionId,
        utrNumber,
      };
    }

    if (paymentMode === 'card') {
      const transactionId = cardPaymentDetails.transactionId.trim();
      const cardType = cardPaymentDetails.cardType === 'other'
        ? cardPaymentDetails.customCardType.trim()
        : cardTypeOptions.find((option) => option.value === cardPaymentDetails.cardType)?.label || '';
      const cardNetwork = cardPaymentDetails.cardNetwork === 'other'
        ? cardPaymentDetails.customCardNetwork.trim()
        : cardNetworkOptions.find((option) => option.value === cardPaymentDetails.cardNetwork)?.label || '';
      const lastFourDigits = cardPaymentDetails.lastFourDigits.trim();

      if (!transactionId || !cardType || !cardNetwork || !lastFourDigits) {
        throw new Error('Fill transaction ID, card type, card network, and the last 4 digits for the card payment.');
      }

      if (!/^\d{4}$/.test(lastFourDigits)) {
        throw new Error('Enter exactly 4 digits for the card number.');
      }

      return {
        kind: 'card',
        transactionId,
        cardType,
        cardNetwork,
        lastFourDigits,
      };
    }

    const bankTransferType = bankPaymentDetails.bankTransferType.trim();
    const bankTransactionReferenceNumber = bankPaymentDetails.bankTransactionReferenceNumber.trim();
    const senderAccountHolderName = bankPaymentDetails.senderAccountHolderName.trim();
    const senderBankName = bankPaymentDetails.senderBankName.trim();
    const senderAccountNumber = bankPaymentDetails.senderAccountNumber.trim();

    if (!bankTransferType || !bankTransactionReferenceNumber || !senderAccountHolderName || !senderBankName || !senderAccountNumber) {
      throw new Error('Fill the bank transfer type, reference number, sender name, sender bank, and sender account number.');
    }

    return {
      kind: 'bank',
      bankTransferType,
      bankTransactionReferenceNumber,
      senderAccountHolderName,
      senderBankName,
      senderAccountNumber,
    };
  };

  const resetForm = () => {
    setCustomerSearch('');
    setPhone('');
    setName('');
    setEmail('');
    setTransactionLines([createTransactionLine()]);
    setNote('');
    setSharedPaymentMode('cash');
    setSharedStatus('completed');
    setUpiPaymentDetails(createEmptyUpiPaymentDetails());
    setCardPaymentDetails(createEmptyCardPaymentDetails());
    setBankPaymentDetails(createEmptyBankPaymentDetails());
    setSelectedTransactionAccountId('');
    setValidationError('');
    closeQuickServiceCreator();
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedDepartment) {
      setValidationError('Select a department before saving the transaction.');
      return;
    }

    if (selectedDepartment.status !== 'Active') {
      setValidationError(`${selectedDepartment.name} is inactive. Activate the department before creating transactions.`);
      return;
    }

    if (!phone.trim() || !name.trim()) {
      setValidationError('Customer phone and name are required.');
      return;
    }

    try {
      const paymentMode = activePaymentMode;
      const requestedStatus = activeRequestedStatus;
      const normalizedTransactionLines = transactionLines.map((line, index) => {
        const selectedServiceRecord = services.find((service) => service.id === line.serviceId);
        if (!selectedServiceRecord) {
          throw new Error(`Select a service in transaction row ${index + 1}.`);
        }

        if (selectedServiceRecord.status !== 'Active') {
          throw new Error(`${selectedServiceRecord.name} is inactive in transaction row ${index + 1}. Activate the service before saving.`);
        }

        const parsedTotalAmount = parseNonNegativeNumber(line.totalAmount);
        const parsedPaidAmount = parseNonNegativeNumber(line.paidAmount);

        if (parsedTotalAmount === null || parsedPaidAmount === null) {
          throw new Error(`Amounts in transaction row ${index + 1} must be zero or positive numbers.`);
        }

        if (parsedPaidAmount > parsedTotalAmount) {
          throw new Error(`Paid amount cannot be more than total amount in transaction row ${index + 1}.`);
        }

        return {
          line,
          service: selectedServiceRecord,
          totalAmount: parsedTotalAmount,
          paidAmount: parsedPaidAmount,
          normalizedStatus: (() => {
            const normalizedStatus = deriveTransactionStatus(requestedStatus, parsedTotalAmount, parsedPaidAmount);
            const amountErrors = validateTransactionAmounts({
              totalAmount: parsedTotalAmount,
              paidAmount: parsedPaidAmount,
              dueAmount: normalizedStatus.dueAmount,
              status: normalizedStatus.status,
            });

            if (amountErrors.length > 0) {
              throw new Error(amountErrors[0]);
            }

            return normalizedStatus;
          })(),
        };
      });

      if (normalizedTransactionLines.length === 0) {
        throw new Error('Add at least one service before saving the transaction.');
      }

      let paymentDetails: TransactionPaymentDetails | undefined;

      if (paymentMode !== 'cash') {
        if (departmentAccounts.length === 0) {
          throw new Error('Link at least one bank account to this department before saving non-cash transactions.');
        }

        if (!selectedTransactionAccount) {
          throw new Error('Select the bank account for this non-cash transaction.');
        }

        paymentDetails = buildPaymentDetailsPayload(paymentMode);
        const accountErrors = validateTransactionAccountSelection({
          paymentMode,
          accountId: selectedTransactionAccount.id,
          paymentDetails,
          selectedAccount: selectedTransactionAccount,
          selectedDepartment,
        });
        if (accountErrors.length > 0) {
          throw new Error(accountErrors[0]);
        }
      }

      setValidationError('');

      const savedCustomer = customers.find((customer) => customer.phone === phone.trim());
      const customerId = savedCustomer?.id || createRecordId();

      if (savedCustomer) {
        if (
          savedCustomer.name !== name.trim() ||
          (savedCustomer.email || '') !== email.trim().toLowerCase()
        ) {
          dispatch({
            type: 'UPDATE_CUSTOMER',
            businessId,
            payload: {
              ...savedCustomer,
              name: name.trim(),
              email: email.trim().toLowerCase(),
            },
          });
        }
      } else {
        dispatch({
          type: 'ADD_CUSTOMER',
          businessId,
          payload: {
            id: customerId,
            name: name.trim(),
            phone: phone.trim(),
            email: email.trim().toLowerCase(),
            status: 'Active',
            joinedDate: new Date().toISOString().split('T')[0],
          },
        });
      }

      normalizedTransactionLines
        .slice()
        .reverse()
        .forEach(({ service, totalAmount: lineTotalAmount, paidAmount: linePaidAmount, normalizedStatus }) => {
          const usesDepartmentAccount = paymentMode !== 'cash';
          const activeTransactionAccount = usesDepartmentAccount ? selectedTransactionAccount : undefined;

          dispatch({
            type: 'ADD_TRANSACTION',
            businessId,
            payload: {
              customerId,
              customerName: name.trim(),
              customerPhone: phone.trim(),
              serviceId: service.id,
              service: service.name,
              servicePrice: service.price,
              totalAmount: lineTotalAmount,
              paidAmount: linePaidAmount,
              dueAmount: normalizedStatus.dueAmount,
              paymentMode,
              paymentDetails: usesDepartmentAccount ? paymentDetails : undefined,
              departmentId: selectedDepartment.id,
              departmentName: selectedDepartment.name,
              accountId: activeTransactionAccount?.id,
              accountLabel: activeTransactionAccount ? `${activeTransactionAccount.accountHolder} | ${activeTransactionAccount.bankName}` : 'Cash',
              handledById: actor.id,
              handledByName: actor.name,
              handledByRole: actor.role,
              note: note.trim(),
              status: normalizedStatus.status,
            },
          });
        });

      const savedStatuses = normalizedTransactionLines.map(({ normalizedStatus }) => normalizedStatus.status);
      const savedServiceNames = normalizedTransactionLines.map(({ service }) => service.name);
      const savedTransactionCount = normalizedTransactionLines.length;
      const historyTitle = savedTransactionCount === 1
        ? `${savedServiceNames[0]} processed for ${name.trim()}`
        : `${savedTransactionCount} services processed for ${name.trim()}`;
      const notificationPreview = savedServiceNames.slice(0, 2).join(', ');
      const notificationSuffix = savedServiceNames.length > 2 ? ` +${savedServiceNames.length - 2} more` : '';
      const notificationType = savedStatuses.every((currentStatus) => currentStatus === 'completed')
        ? 'success'
        : savedStatuses.some((currentStatus) => currentStatus === 'pending')
          ? 'warning'
          : 'info';
      const notificationMessage = savedTransactionCount === 1
        ? `${savedServiceNames[0]} saved for ${name.trim()} with ${paymentMode.toUpperCase()} payment.`
        : `${savedTransactionCount} transactions saved for ${name.trim()} (${notificationPreview}${notificationSuffix}).`;

      dispatch({
        type: 'ADD_HISTORY_EVENT',
        businessId,
        payload: {
          title: historyTitle,
          module: 'Transactions',
          actor: actor.name,
          status: getBatchStatus(savedStatuses),
        },
      });

      dispatch({
        type: 'ADD_NOTIFICATION',
        businessId,
        payload: {
          type: notificationType,
          message: notificationMessage,
        },
      });

      resetForm();
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : 'Unable to save the transaction.');
    }
  };

  const renderPaymentDetailsTable = (includeStatusColumn: boolean) => {
    if (activePaymentMode === 'cash') {
      return null;
    }

    const transactionAccountCell = departmentAccounts.length > 1 ? (
      <Select
        value={resolvedSelectedTransactionAccountId}
        onChange={(event) => {
          setValidationError('');
          setSelectedTransactionAccountId(event.target.value);
        }}
        options={[
          { value: '', label: 'Select Account' },
          ...departmentAccounts.map((account) => ({
            value: account.id,
            label: `${account.accountHolder} | ${account.bankName}`,
          })),
        ]}
      />
    ) : (
      <div className="transaction-payment-table__account-chip">
        <span className="fw-semibold">
          {selectedTransactionAccount ? `${selectedTransactionAccount.accountHolder} (Default)` : 'No linked account'}
        </span>
        <span className="page-muted small d-block">
          {selectedTransactionAccount ? selectedTransactionAccount.bankName : 'Link an account to continue'}
        </span>
      </div>
    );

    if (activePaymentMode === 'upi') {
      return (
        <div className="transaction-payment-table">
          <table className="table data-table align-middle transaction-payment-table__grid transaction-payment-table__grid--upi">
            <thead>
              <tr>
                <th>Transaction Account</th>
                <th>Transaction ID</th>
                <th>UTR Number</th>
                {includeStatusColumn ? <th>Transaction Status</th> : null}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td data-label="Transaction Account">
                  {transactionAccountCell}
                </td>
                <td data-label="Transaction ID">
                  <Input
                    value={upiPaymentDetails.transactionId}
                    onChange={(event) => updateUpiPaymentDetail('transactionId', event.target.value)}
                    placeholder="Enter transaction ID"
                    required
                  />
                </td>
                <td data-label="UTR Number">
                  <Input
                    value={upiPaymentDetails.utrNumber}
                    onChange={(event) => updateUpiPaymentDetail('utrNumber', event.target.value)}
                    placeholder="Enter UTR number"
                    required
                  />
                </td>
                {includeStatusColumn ? (
                  <td data-label="Transaction Status">
                    <Select
                      value={sharedStatus}
                      onChange={(event) => {
                        setValidationError('');
                        setSharedStatus(event.target.value as Transaction['status']);
                      }}
                      options={transactionStatusOptions}
                    />
                  </td>
                ) : null}
              </tr>
            </tbody>
          </table>
        </div>
      );
    }

    if (activePaymentMode === 'card') {
      return (
        <div className="transaction-payment-table">
          <table className="table data-table align-middle transaction-payment-table__grid transaction-payment-table__grid--card">
            <thead>
              <tr>
                <th>Transaction Account</th>
                <th>Transaction ID</th>
                <th>Card Type</th>
                <th>Card Network</th>
                <th>Last 4 Digits of Card Number</th>
                {includeStatusColumn ? <th>Transaction Status</th> : null}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td data-label="Transaction Account">
                  {transactionAccountCell}
                </td>
                <td data-label="Transaction ID">
                  <Input
                    value={cardPaymentDetails.transactionId}
                    onChange={(event) => updateCardPaymentDetail('transactionId', event.target.value)}
                    placeholder="Enter transaction ID"
                    required
                  />
                </td>
                <td data-label="Card Type">
                  <div className="transaction-payment-table__stack">
                    <Select
                      value={cardPaymentDetails.cardType}
                      onChange={(event) => updateCardPaymentDetail('cardType', event.target.value)}
                      options={cardTypeOptions}
                    />
                    {cardPaymentDetails.cardType === 'other' ? (
                      <Input
                        value={cardPaymentDetails.customCardType}
                        onChange={(event) => updateCardPaymentDetail('customCardType', event.target.value)}
                        placeholder="Enter card type"
                        required
                      />
                    ) : null}
                  </div>
                </td>
                <td data-label="Card Network">
                  <div className="transaction-payment-table__stack">
                    <Select
                      value={cardPaymentDetails.cardNetwork}
                      onChange={(event) => updateCardPaymentDetail('cardNetwork', event.target.value)}
                      options={cardNetworkOptions}
                    />
                    {cardPaymentDetails.cardNetwork === 'other' ? (
                      <Input
                        value={cardPaymentDetails.customCardNetwork}
                        onChange={(event) => updateCardPaymentDetail('customCardNetwork', event.target.value)}
                        placeholder="Enter card network"
                        required
                      />
                    ) : null}
                  </div>
                </td>
                <td data-label="Last 4 Digits of Card Number">
                  <Input
                    value={cardPaymentDetails.lastFourDigits}
                    onChange={(event) => updateCardPaymentDetail('lastFourDigits', event.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="Last 4 digits"
                    inputMode="numeric"
                    maxLength={4}
                    required
                  />
                </td>
                {includeStatusColumn ? (
                  <td data-label="Transaction Status">
                    <Select
                      value={sharedStatus}
                      onChange={(event) => {
                        setValidationError('');
                        setSharedStatus(event.target.value as Transaction['status']);
                      }}
                      options={transactionStatusOptions}
                    />
                  </td>
                ) : null}
              </tr>
            </tbody>
          </table>
        </div>
      );
    }

    return (
      <div className="transaction-payment-table">
        <table className="table data-table align-middle transaction-payment-table__grid transaction-payment-table__grid--bank">
          <thead>
            <tr>
              <th>Transaction Account</th>
              <th>Bank Transfer Type</th>
              <th>Bank Transaction Reference Number</th>
              <th>Sender Account Holder Name</th>
              <th>Sender Bank Name</th>
              <th>Sender Account Number</th>
              {includeStatusColumn ? <th>Transaction Status</th> : null}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td data-label="Transaction Account">
                {transactionAccountCell}
              </td>
              <td data-label="Bank Transfer Type">
                <Select
                  value={bankPaymentDetails.bankTransferType}
                  onChange={(event) => updateBankPaymentDetail('bankTransferType', event.target.value)}
                  options={bankTransferTypeOptions}
                />
              </td>
              <td data-label="Bank Transaction Reference Number">
                <Input
                  value={bankPaymentDetails.bankTransactionReferenceNumber}
                  onChange={(event) => updateBankPaymentDetail('bankTransactionReferenceNumber', event.target.value)}
                  placeholder="Enter reference number"
                  required
                />
              </td>
              <td data-label="Sender Account Holder Name">
                <Input
                  value={bankPaymentDetails.senderAccountHolderName}
                  onChange={(event) => updateBankPaymentDetail('senderAccountHolderName', event.target.value)}
                  placeholder="Enter sender name"
                  required
                />
              </td>
              <td data-label="Sender Bank Name">
                <Input
                  value={bankPaymentDetails.senderBankName}
                  onChange={(event) => updateBankPaymentDetail('senderBankName', event.target.value)}
                  placeholder="Enter sender bank"
                  required
                />
              </td>
              <td data-label="Sender Account Number">
                <Input
                  value={bankPaymentDetails.senderAccountNumber}
                  onChange={(event) => updateBankPaymentDetail('senderAccountNumber', event.target.value)}
                  placeholder="Enter account number"
                  required
                />
              </td>
              {includeStatusColumn ? (
                <td data-label="Transaction Status">
                  <Select
                    value={sharedStatus}
                    onChange={(event) => {
                      setValidationError('');
                      setSharedStatus(event.target.value as Transaction['status']);
                    }}
                    options={transactionStatusOptions}
                  />
                </td>
              ) : null}
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="transaction-form-card p-4 p-lg-5">
      <div className="form-workflow-panel mb-4">
        <div>
          <p className="eyebrow mb-2">Transaction workflow</p>
          <h2 className="h4 mb-1 fw-semibold text-dark">New Transaction</h2>
          <p className="page-muted small mb-0">Search the customer, choose a service, capture payment details, and save the transaction record.</p>
        </div>
        <div className="counter-chip">
          <span className="page-muted small d-block">Department</span>
          <span className="fw-semibold">{selectedDepartment?.name || 'Not selected'}</span>
          <span className="page-muted small d-block mt-2">Default Account</span>
          <span className="fw-semibold">{defaultDepartmentAccount ? defaultDepartmentAccount.accountHolder : 'Not linked'}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {validationError && (
          <div className="form-alert" role="alert">
            {validationError}
          </div>
        )}

        {transactionRestrictionMessage ? (
          <div className="form-alert" role="status">
            {transactionRestrictionMessage}
          </div>
        ) : null}

        <div className="form-section-card mb-4">
          <div className="d-flex flex-column flex-md-row justify-content-between gap-3 mb-3">
            <div>
              <div className="form-section-title mb-1">Customer Search</div>
              <p className="page-muted small mb-0">Search by mobile number or name. Existing customer details will fill automatically.</p>
            </div>
            {matchedCustomer ? (
              <span className="status-chip status-chip--active align-self-start">Existing customer</span>
            ) : null}
          </div>
          <div className="row g-3">
            <div className="col-12">
              <Input
                label="Search Customer"
                value={customerSearch}
                onChange={(event) => setCustomerSearch(event.target.value)}
                placeholder="Search by phone or name"
              />
            </div>
            {customerMatches.length > 0 ? (
              <div className="col-12">
                <div className="d-flex flex-column gap-2">
                  {customerMatches.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      className="btn-app btn-app-secondary text-start"
                      onClick={() => selectCustomer(customer.id)}
                    >
                      {customer.name} | {customer.phone}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="col-12 col-md-6">
              <Input
                label="Customer Phone"
                value={phone}
                onChange={(event) => handlePhoneChange(event.target.value)}
                placeholder="Enter mobile number"
                required
              />
            </div>
            <div className="col-12 col-md-6">
              <Input
                label="Customer Name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter customer name"
                required
              />
            </div>
            <div className="col-12">
              <Input
                label="Email Optional"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="customer@example.com"
              />
            </div>
          </div>
        </div>

        <div className="form-section-card mb-4">
          <div className="d-flex flex-column flex-md-row justify-content-between gap-3 mb-3">
            <div>
              <div className="form-section-title mb-1">Service And Payment</div>
              <p className="page-muted small mb-0">Add one or more services for the same customer, then save them together as separate transactions.</p>
            </div>
            <div className="transaction-entry-table__toolbar">
              <Button
                type="button"
                variant="secondary"
                className="transaction-entry-table__mobile-service-action"
                onClick={openQuickServiceCreator}
                disabled={!canOpenQuickServiceCreator}
              >
                <FaPlusCircle />
                New Service
              </Button>
              <Button type="button" variant="secondary" onClick={addTransactionLine} disabled={!canAddTransactionLines}>
                <FaPlusCircle />
                Add Row
              </Button>
            </div>
          </div>

          <div className="transaction-entry-table">
            <table
              className={`table data-table align-middle transaction-entry-table__grid ${
                isSingleServiceEntry
                  ? 'transaction-entry-table__grid--single'
                  : 'transaction-entry-table__grid--batch'
              }`}
            >
              <thead>
                <tr>
                  <th>S. No.</th>
                  <th>
                    <div className="transaction-entry-table__header-cell">
                      <span>Service</span>
                      <button
                        type="button"
                        className="transaction-entry-table__header-action"
                        onClick={openQuickServiceCreator}
                        disabled={!canOpenQuickServiceCreator}
                      >
                        <FaPlusCircle size={10} />
                        New Service
                      </button>
                    </div>
                  </th>
                  <th>Total Amount</th>
                  <th>Paid Amount</th>
                  {isSingleServiceEntry ? (
                    <>
                      <th>Payment Mode</th>
                      <th>Transaction Status</th>
                    </>
                  ) : null}
                  <th>Due Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactionLines.map((line, index) => (
                  <tr key={line.id}>
                    <td data-label="S. No.">
                      <div className="transaction-entry-table__index">
                        <div className="transaction-entry-table__txn-box" aria-label={`Transaction row ${index + 1}`}>
                          {index + 1}
                        </div>
                        {transactionLines.length > 1 ? (
                          <button
                            type="button"
                            className="transaction-entry-table__remove"
                            onClick={() => removeTransactionLine(line.id)}
                            aria-label={`Remove transaction row ${index + 1}`}
                          >
                            <FaTrashAlt size={10} />
                          </button>
                        ) : null}
                      </div>
                    </td>
                    <td data-label="Service">
                      <Select
                        value={line.serviceId}
                        onChange={(event) => handleServiceChange(line.id, event.target.value)}
                        options={serviceOptions}
                        disabled={!selectedDepartment || !isSelectedDepartmentActive || activeServices.length === 0}
                        required
                      />
                    </td>
                    <td data-label="Total Amount">
                      <Input
                        type="number"
                        min="0"
                        value={line.totalAmount}
                        onChange={(event) => updateTransactionField(line.id, 'totalAmount', event.target.value)}
                        placeholder="Enter total amount"
                        required
                      />
                    </td>
                    <td data-label="Paid Amount">
                      <Input
                        type="number"
                        min="0"
                        value={line.paidAmount}
                        onChange={(event) => updateTransactionField(line.id, 'paidAmount', event.target.value)}
                        placeholder="Enter paid amount"
                        required
                      />
                    </td>
                    {isSingleServiceEntry ? (
                      <>
                        <td data-label="Payment Mode">
                          <Select
                            value={line.paymentMode}
                            onChange={(event) => updateTransactionField(line.id, 'paymentMode', event.target.value)}
                            options={paymentModeOptions}
                          />
                        </td>
                        <td data-label="Transaction Status">
                          <Select
                            value={line.status}
                            onChange={(event) => updateTransactionField(line.id, 'status', event.target.value)}
                            options={transactionStatusOptions}
                          />
                        </td>
                      </>
                    ) : null}
                    <td data-label="Due Amount">
                      <div className="transaction-entry-table__due">
                        <strong>Rs. {getDueAmount(line).toLocaleString('en-IN')}</strong>
                        <span>Auto-calculated</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {isQuickServiceCreatorOpen ? (
            <div className="transaction-entry-table__quick-service">
              <div className="d-flex flex-column flex-md-row justify-content-between gap-3 mb-3">
                <div>
                  <div className="form-section-title mb-1">Create Service</div>
                  <p className="page-muted small mb-0">Save a new department-specific service without leaving this transaction flow.</p>
                </div>
                <span className="status-chip status-chip--info">
                  {selectedDepartment ? `${selectedDepartment.name} workspace` : 'Choose a department'}
                </span>
              </div>

              {quickServiceError ? (
                <div className="form-alert" role="alert">
                  {quickServiceError}
                </div>
              ) : null}

              <div className="row g-3">
                <div className="col-12 col-lg-4">
                  <Select
                    label="Department"
                    value={quickServiceDepartmentId}
                    onChange={(event) => {
                      setQuickServiceDepartmentId(event.target.value);
                      setQuickServiceError('');
                    }}
                    options={[
                      { value: '', label: activeAccessibleDepartments.length > 0 ? 'Select Department' : 'No Active Department Available' },
                      ...activeAccessibleDepartments.map((department) => ({
                        value: department.id,
                        label: `${department.name} (${department.code})`,
                      })),
                    ]}
                    disabled={isEmployeeDepartmentLocked || activeAccessibleDepartments.length === 0}
                    required
                  />
                  {isEmployeeDepartmentLocked ? (
                    <p className="form-hint">Your department is assigned by the business user and stays fixed here.</p>
                  ) : null}
                </div>
                <div className="col-12 col-lg-4">
                  <Input
                    label="Service Name"
                    value={quickServiceName}
                    onChange={(event) => {
                      setQuickServiceName(event.target.value);
                      setQuickServiceError('');
                    }}
                    placeholder="Example: Passport Renewal"
                    required
                  />
                </div>
                <div className="col-12 col-lg-4">
                  <Input
                    label="Category"
                    value={quickServiceCategory}
                    onChange={(event) => {
                      setQuickServiceCategory(event.target.value);
                      setQuickServiceError('');
                    }}
                    placeholder="Example: Documentation"
                    required
                  />
                </div>
                <div className="col-12 col-lg-4">
                  <Input
                    label="Price"
                    type="number"
                    min="0"
                    value={quickServicePrice}
                    onChange={(event) => {
                      setQuickServicePrice(event.target.value);
                      setQuickServiceError('');
                    }}
                    placeholder="0"
                    required
                  />
                </div>
                <div className="col-12 col-lg-8">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-control styled-textarea"
                    rows={3}
                    value={quickServiceDescription}
                    onChange={(event) => {
                      setQuickServiceDescription(event.target.value);
                      setQuickServiceError('');
                    }}
                    placeholder="Short note operators can understand quickly"
                    required
                  />
                </div>
              </div>

              <div className="modal-actions">
                <Button type="button" variant="secondary" onClick={closeQuickServiceCreator}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleQuickServiceCreate}>
                  Save Service
                </Button>
              </div>
            </div>
          ) : null}

          <div className="transaction-entry-table__summary">
            <span className="page-muted small">
              {transactionLines.length} service row{transactionLines.length === 1 ? '' : 's'} ready to save.
            </span>
            {!isSingleServiceEntry ? (
              <span className="page-muted small">
                One shared payment mode and status will be applied to all rows in this save.
              </span>
            ) : null}
            {serviceAvailabilityMessage ? (
              <span className="page-muted small">{serviceAvailabilityMessage}</span>
            ) : null}
            {inactiveServiceCount > 0 && isSelectedDepartmentActive ? (
              <span className="page-muted small">
                {inactiveServiceCount} inactive service{inactiveServiceCount === 1 ? '' : 's'} hidden from this transaction form.
              </span>
            ) : null}
          </div>

          {!isSingleServiceEntry ? (
            <div className="transaction-payment-panel">
              <div className="transaction-payment-panel__header">
                <div>
                  <div className="form-section-title mb-1">Shared Payment Details</div>
                  <p className="page-muted small mb-0">Choose one payment mode for all service rows in this transaction and complete the required reference details.</p>
                </div>
              </div>
              <div className="row g-3">
                <div className="col-12 col-lg-6">
                  <Select
                    label="Payment Mode"
                    value={sharedPaymentMode}
                    onChange={(event) => {
                      setValidationError('');
                      setSharedPaymentMode(event.target.value as Transaction['paymentMode']);
                    }}
                    options={paymentModeOptions}
                  />
                </div>
                {activePaymentMode === 'cash' ? (
                  <div className="col-12 col-lg-6">
                    <Select
                      label="Transaction Status"
                      value={sharedStatus}
                      onChange={(event) => {
                        setValidationError('');
                        setSharedStatus(event.target.value as Transaction['status']);
                      }}
                      options={transactionStatusOptions}
                    />
                  </div>
                ) : null}
              </div>
              {hasNonCashTransactionLine ? renderPaymentDetailsTable(true) : null}
            </div>
          ) : hasNonCashTransactionLine ? (
            <div className="transaction-payment-panel">
              <div className="transaction-payment-panel__header">
                <div>
                  <div className="form-section-title mb-1">Payment Details</div>
                  <p className="page-muted small mb-0">Fill the reference details for the selected {activePaymentMode.toUpperCase()} payment before saving.</p>
                </div>
              </div>
              {renderPaymentDetailsTable(false)}
            </div>
          ) : null}

          <div className="row g-3 mt-1">
            <div className="col-12">
              <div className="app-field">
                <label className="form-label">Notes / Remarks</label>
                <textarea
                  className="form-control styled-textarea"
                  rows={3}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Add transaction notes, receipt remarks, or follow-up details for all service rows"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center justify-content-end gap-3 mt-4">
          <p className="page-muted small mb-0 me-sm-auto">
            Saving this creates {transactionLines.length} transaction record{transactionLines.length === 1 ? '' : 's'} and updates the customer record, balances, history, and notifications.
          </p>
          <Button type="submit" className="form-submit-button" disabled={!canSaveTransaction}>
            Save Transaction
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ServiceForm;
