'use client';

import React, { useMemo, useRef, useState } from 'react';
import { FaArrowRight, FaBuilding, FaCheckCircle, FaDownload, FaRegBuilding, FaUniversity, FaUpload, FaWrench } from 'react-icons/fa';
import { extractCustomersFromFile, formatImportedCustomers, parseCustomerImportText, type ImportedCustomerRow } from '../../lib/customer-import';
import { parseNonNegativeNumber } from '../../lib/number-validation';
import type { Account, Business, BusinessCustomer, BusinessOnboardingStep, Counter, Service } from '../../lib/store';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';

interface BusinessOnboardingProps {
  business: Business;
  currentStep: BusinessOnboardingStep;
  departments: Counter[];
  accounts: Account[];
  services: Service[];
  customers: BusinessCustomer[];
  canAddMoreDepartments: boolean;
  canAddMoreAccounts: boolean;
  canAccessServices: boolean;
  onLogout: () => void;
  onSaveBusinessName: (name: string) => void;
  onSaveDepartment: (values: { name: string; code: string }) => void;
  onAdvanceDepartments: () => void;
  onSaveAccount: (values: {
    accountHolder: string;
    bankName: string;
    accountNumber: string;
    ifsc: string;
  }) => void;
  onAdvanceAccounts: () => void;
  onSaveService: (values: {
    departmentId: string;
    departmentName: string;
    name: string;
    category: string;
    description: string;
    price: number;
  }) => void;
  onAdvanceServices: () => void;
  onImportCustomers: (rows: ImportedCustomerRow[]) => void;
  onSkipCustomers: () => void;
}

const buildDepartmentCode = (index: number) => `D${index}`;

const BusinessOnboarding: React.FC<BusinessOnboardingProps> = ({
  business,
  currentStep,
  departments,
  accounts,
  services,
  customers,
  canAddMoreDepartments,
  canAddMoreAccounts,
  canAccessServices,
  onLogout,
  onSaveBusinessName,
  onSaveDepartment,
  onAdvanceDepartments,
  onSaveAccount,
  onAdvanceAccounts,
  onSaveService,
  onAdvanceServices,
  onImportCustomers,
  onSkipCustomers,
}) => {
  const visibleSteps = useMemo(() => ([
    { id: 'welcome' as const, label: 'Welcome', icon: <FaBuilding size={14} /> },
    { id: 'departments' as const, label: 'Departments', icon: <FaRegBuilding size={14} /> },
    { id: 'accounts' as const, label: 'Accounts', icon: <FaUniversity size={14} /> },
    ...(canAccessServices ? [{ id: 'services' as const, label: 'Services', icon: <FaWrench size={14} /> }] : []),
    { id: 'customers' as const, label: 'Import Customers', icon: <FaDownload size={14} /> },
  ]), [canAccessServices]);

  const activeStepIndex = Math.max(visibleSteps.findIndex((step) => step.id === currentStep), 0);
  const configuredDepartments = departments;
  const availableDepartments = departments;
  const configuredAccounts = accounts;
  const [businessName, setBusinessName] = useState(business.name);
  const [departmentName, setDepartmentName] = useState('');
  const [departmentCode, setDepartmentCode] = useState(buildDepartmentCode(configuredDepartments.length + 1));
  const [showDepartmentForm, setShowDepartmentForm] = useState(configuredDepartments.length === 0);
  const [accountHolder, setAccountHolder] = useState(business.name);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [showAccountForm, setShowAccountForm] = useState(configuredAccounts.length === 0);
  const [serviceName, setServiceName] = useState('');
  const [serviceDepartmentId, setServiceDepartmentId] = useState(availableDepartments[0]?.id || '');
  const [serviceCategory, setServiceCategory] = useState('General');
  const [serviceDescription, setServiceDescription] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [showServiceForm, setShowServiceForm] = useState(services.length === 0);
  const [customerImportText, setCustomerImportText] = useState('');
  const [uploadFeedback, setUploadFeedback] = useState('');
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [validationError, setValidationError] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const resetDepartmentForm = () => {
    setDepartmentName('');
    setDepartmentCode(buildDepartmentCode(configuredDepartments.length + 1));
    setShowDepartmentForm(true);
  };

  const resetAccountForm = () => {
    setAccountHolder(business.name);
    setBankName('');
    setAccountNumber('');
    setIfsc('');
    setShowAccountForm(true);
  };

  const resetServiceForm = () => {
    setServiceName('');
    setServiceDepartmentId(availableDepartments[0]?.id || '');
    setServiceCategory('General');
    setServiceDescription('');
    setServicePrice('');
    setShowServiceForm(true);
  };

  const handleWelcomeSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextName = businessName.trim();

    if (!nextName) {
      setValidationError('Choose your business name before continuing.');
      return;
    }

    setValidationError('');
    onSaveBusinessName(nextName);
  };

  const handleDepartmentSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!departmentName.trim() || !departmentCode.trim()) {
      setValidationError('Department name and code are required.');
      return;
    }

    setValidationError('');
    onSaveDepartment({
      name: departmentName.trim(),
      code: departmentCode.trim().toUpperCase(),
    });

    if (canAddMoreDepartments) {
      setDepartmentName('');
      setDepartmentCode(buildDepartmentCode(configuredDepartments.length + 2));
      setShowDepartmentForm(false);
      return;
    }

    onAdvanceDepartments();
  };

  const handleAccountSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!accountHolder.trim() || !bankName.trim() || !accountNumber.trim() || !ifsc.trim()) {
      setValidationError('Account holder, bank name, account number, and IFSC are required.');
      return;
    }

    setValidationError('');
    onSaveAccount({
      accountHolder: accountHolder.trim(),
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      ifsc: ifsc.trim().toUpperCase(),
    });

    if (canAddMoreAccounts) {
      setAccountHolder(business.name);
      setBankName('');
      setAccountNumber('');
      setIfsc('');
      setShowAccountForm(false);
      return;
    }

    onAdvanceAccounts();
  };

  const handleServiceSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsedPrice = parseNonNegativeNumber(servicePrice);

    if (!serviceName.trim() || !serviceCategory.trim() || !serviceDescription.trim()) {
      setValidationError('Service name, category, and description are required.');
      return;
    }

    const selectedDepartment = availableDepartments.find((department) => department.id === serviceDepartmentId);
    if (!selectedDepartment) {
      setValidationError('Choose the department that should own this service.');
      return;
    }

    if (parsedPrice === null) {
      setValidationError('Service price must be a valid zero or positive number.');
      return;
    }

    setValidationError('');
    onSaveService({
      departmentId: selectedDepartment.id,
      departmentName: selectedDepartment.name,
      name: serviceName.trim(),
      category: serviceCategory.trim(),
      description: serviceDescription.trim(),
      price: parsedPrice,
    });

    setServiceName('');
    setServiceDepartmentId(availableDepartments[0]?.id || '');
    setServiceCategory('General');
    setServiceDescription('');
    setServicePrice('');
    setShowServiceForm(false);
  };

  const handleCustomerImport = (event: React.FormEvent) => {
    event.preventDefault();

    try {
      const importedCustomers = parseCustomerImportText(customerImportText);
      if (importedCustomers.length === 0) {
        setValidationError('Paste at least one customer row or skip this step.');
        return;
      }

      setValidationError('');
      onImportCustomers(importedCustomers);
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : 'Unable to import customers.');
    }
  };

  const handleCustomerFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      return;
    }

    setIsProcessingUpload(true);
    setValidationError('');
    setUploadFeedback('');

    try {
      const importedCustomers = await extractCustomersFromFile(selectedFile);
      if (importedCustomers.length === 0) {
        throw new Error('No customer records were found in the uploaded file.');
      }

      const formattedRows = formatImportedCustomers(importedCustomers);

      setCustomerImportText((currentValue) =>
        currentValue.trim()
          ? `${currentValue.trim()}\n${formattedRows}`
          : formattedRows,
      );
      setUploadFeedback(`${importedCustomers.length} customers extracted from ${selectedFile.name}. Review the rows below, then import them.`);
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : 'Unable to extract customers from the uploaded file.');
    } finally {
      setIsProcessingUpload(false);
      event.target.value = '';
    }
  };

  const stepTitle = currentStep === 'welcome'
    ? 'Set up your business workspace'
    : currentStep === 'departments'
      ? 'Add your departments'
      : currentStep === 'accounts'
        ? `Add bank accounts for ${business.name}`
        : currentStep === 'services'
          ? `Add services for ${business.name}`
          : 'Import existing customers';

  const stepCopy = currentStep === 'welcome'
    ? 'Choose the business name your team will see throughout the workspace.'
    : currentStep === 'departments'
      ? 'Start with at least one department so the workspace can organize operations correctly.'
      : currentStep === 'accounts'
        ? 'Add the bank accounts your business will use for linked transactions and department posting.'
        : currentStep === 'services'
          ? 'Add at least one service so operators can start processing transactions right away.'
          : 'Paste an existing customer list now, or skip and add them later inside the dashboard.';

  return (
    <main className="onboarding-shell">
      <section className="onboarding-card">
        <aside className="onboarding-sidebar">
          <p className="eyebrow mb-2">First-time setup</p>
          <h1 className="onboarding-title">Welcome to {business.name || 'your workspace'}</h1>
          <p className="page-muted mb-0">Complete the quick setup flow once, then continue into the main dashboard.</p>

          <div className="onboarding-steps">
            {visibleSteps.map((step, index) => {
              const isActive = index === activeStepIndex;
              const isComplete = index < activeStepIndex;

              return (
                <div
                  key={step.id}
                  className={`onboarding-step ${isActive ? 'is-active' : ''} ${isComplete ? 'is-complete' : ''}`}
                >
                  <div className="onboarding-step__icon">
                    {isComplete ? <FaCheckCircle size={14} /> : step.icon}
                  </div>
                  <div>
                    <p className="onboarding-step__label">{step.label}</p>
                    <p className="onboarding-step__meta">{isActive ? 'Current step' : isComplete ? 'Completed' : 'Pending'}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <Button type="button" variant="ghost" onClick={onLogout} className="onboarding-logout">
            Logout
          </Button>
        </aside>

        <div className="onboarding-content">
          <div className="form-workflow-panel mb-4">
            <div>
              <p className="eyebrow mb-2">Setup Workflow</p>
              <h2 className="h4 fw-semibold mb-1">{stepTitle}</h2>
              <p className="page-muted small mb-0">{stepCopy}</p>
            </div>
            <span className="status-chip status-chip--info">Step {activeStepIndex + 1} of {visibleSteps.length}</span>
          </div>

          {validationError ? (
            <div className="form-alert" role="alert">
              {validationError}
            </div>
          ) : null}

          {currentStep === 'welcome' ? (
            <form onSubmit={handleWelcomeSubmit}>
              <div className="form-section-card">
                <div className="form-section-title">Business Name</div>
                <div className="row g-3">
                  <div className="col-12">
                    <Input
                      label="Choose your business name"
                      value={businessName}
                      onChange={(event) => {
                        setBusinessName(event.target.value);
                        setValidationError('');
                      }}
                      placeholder="Example: Riya Services"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <p className="modal-actions__copy">You can still update the business name later from the admin or business settings flow.</p>
                <Button type="submit">
                  Continue
                  <FaArrowRight />
                </Button>
              </div>
            </form>
          ) : null}

          {currentStep === 'departments' ? (
            <div className="d-flex flex-column gap-4">
              {configuredDepartments.length > 0 ? (
                <section className="form-section-card">
                  <div className="d-flex flex-column flex-md-row justify-content-between gap-3 mb-3">
                    <div>
                      <div className="form-section-title mb-1">Saved Departments</div>
                      <p className="page-muted small mb-0">{configuredDepartments.length} department{configuredDepartments.length === 1 ? '' : 's'} ready.</p>
                    </div>
                    <span className="status-chip status-chip--active">{configuredDepartments.length} added</span>
                  </div>
                  <div className="onboarding-list">
                    {configuredDepartments.map((department) => (
                      <div key={department.id} className="onboarding-list__item">
                        <strong>{department.name}</strong>
                        <span>{department.code}</span>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {showDepartmentForm ? (
                <form onSubmit={handleDepartmentSubmit} className="form-section-card">
                  <div className="form-section-title">Department Details</div>
                  <div className="row g-3">
                    <div className="col-12 col-md-7">
                      <Input
                        label="Department Name"
                        value={departmentName}
                        onChange={(event) => {
                          setDepartmentName(event.target.value);
                          setValidationError('');
                        }}
                        placeholder="Example: Main Counter"
                        required
                      />
                    </div>
                    <div className="col-12 col-md-5">
                      <Input
                        label="Code"
                        value={departmentCode}
                        onChange={(event) => {
                          setDepartmentCode(event.target.value.toUpperCase());
                          setValidationError('');
                        }}
                        placeholder="D1"
                        required
                      />
                    </div>
                  </div>

                  <div className="modal-actions">
                    {configuredDepartments.length > 0 ? (
                      <Button type="button" variant="secondary" onClick={() => setShowDepartmentForm(false)}>
                        Back to Summary
                      </Button>
                    ) : null}
                    <Button type="submit">{configuredDepartments.length > 0 ? 'Save Department' : 'Save and Continue'}</Button>
                  </div>
                </form>
              ) : (
                <div className="form-section-card">
                  <div className="form-section-title mb-2">Add another department?</div>
                  <p className="page-muted small mb-0">You can add more departments now, or continue to account setup.</p>
                  <div className="modal-actions mt-4">
                    <Button type="button" variant="secondary" onClick={resetDepartmentForm}>
                      Add Another Department
                    </Button>
                    <Button type="button" onClick={onAdvanceDepartments}>
                      Next
                      <FaArrowRight />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {currentStep === 'accounts' ? (
            <div className="d-flex flex-column gap-4">
              {configuredAccounts.length > 0 ? (
                <section className="form-section-card">
                  <div className="d-flex flex-column flex-md-row justify-content-between gap-3 mb-3">
                    <div>
                      <div className="form-section-title mb-1">Linked Accounts</div>
                      <p className="page-muted small mb-0">{configuredAccounts.length} account{configuredAccounts.length === 1 ? '' : 's'} linked to {business.name}.</p>
                    </div>
                    <span className="status-chip status-chip--active">{configuredAccounts.length} added</span>
                  </div>
                  <div className="onboarding-list">
                    {configuredAccounts.map((account) => (
                      <div key={account.id} className="onboarding-list__item">
                        <strong>{account.accountHolder}</strong>
                        <span>{account.bankName} | {account.accountNumber}</span>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {showAccountForm ? (
                <form onSubmit={handleAccountSubmit} className="form-section-card">
                  <div className="form-section-title">Bank Account Details</div>
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <Input
                        label="Account Holder"
                        value={accountHolder}
                        onChange={(event) => {
                          setAccountHolder(event.target.value);
                          setValidationError('');
                        }}
                        placeholder="Example: Riya Services"
                        required
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <Input
                        label="Bank Name"
                        value={bankName}
                        onChange={(event) => {
                          setBankName(event.target.value);
                          setValidationError('');
                        }}
                        placeholder="Example: HDFC Bank"
                        required
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <Input
                        label="Account Number"
                        value={accountNumber}
                        onChange={(event) => {
                          setAccountNumber(event.target.value);
                          setValidationError('');
                        }}
                        placeholder="Enter account number"
                        required
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <Input
                        label="IFSC"
                        value={ifsc}
                        onChange={(event) => {
                          setIfsc(event.target.value.toUpperCase());
                          setValidationError('');
                        }}
                        placeholder="Example: HDFC0001234"
                        required
                      />
                    </div>
                  </div>

                  <div className="modal-actions">
                    {configuredAccounts.length > 0 ? (
                      <Button type="button" variant="secondary" onClick={() => setShowAccountForm(false)}>
                        Back to Summary
                      </Button>
                    ) : null}
                    <Button type="submit">{configuredAccounts.length > 0 ? 'Save Account' : 'Save and Continue'}</Button>
                  </div>
                </form>
              ) : (
                <div className="form-section-card">
                  <div className="form-section-title mb-2">Add another account?</div>
                  <p className="page-muted small mb-0">You can link more bank accounts now, or move ahead to the next setup step.</p>
                  <div className="modal-actions mt-4">
                    <Button type="button" variant="secondary" onClick={resetAccountForm}>
                      Add Another Account
                    </Button>
                    <Button type="button" onClick={onAdvanceAccounts}>
                      Next
                      <FaArrowRight />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {currentStep === 'services' ? (
            <div className="d-flex flex-column gap-4">
              {services.length > 0 ? (
                <section className="form-section-card">
                  <div className="d-flex flex-column flex-md-row justify-content-between gap-3 mb-3">
                    <div>
                      <div className="form-section-title mb-1">Saved Services</div>
                      <p className="page-muted small mb-0">{services.length} service{services.length === 1 ? '' : 's'} ready for transaction entry.</p>
                    </div>
                    <span className="status-chip status-chip--active">{services.length} added</span>
                  </div>
                  <div className="onboarding-list">
                    {services.map((service) => (
                      <div key={service.id} className="onboarding-list__item">
                        <strong>{service.name}</strong>
                        <span>{service.departmentName} | {service.category} | Rs. {service.price.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {showServiceForm ? (
                <form onSubmit={handleServiceSubmit} className="form-section-card">
                  <div className="form-section-title">Service Details</div>
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <Select
                        label="Department"
                        value={serviceDepartmentId}
                        onChange={(event) => {
                          setServiceDepartmentId(event.target.value);
                          setValidationError('');
                        }}
                        options={[
                          { value: '', label: availableDepartments.length > 0 ? 'Select Department' : 'No Department Available' },
                          ...availableDepartments.map((department) => ({
                            value: department.id,
                            label: `${department.name} (${department.code})`,
                          })),
                        ]}
                        required
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <Input
                        label="Service Name"
                        value={serviceName}
                        onChange={(event) => {
                          setServiceName(event.target.value);
                          setValidationError('');
                        }}
                        placeholder="Example: Passport Assistance"
                        required
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <Input
                        label="Category"
                        value={serviceCategory}
                        onChange={(event) => {
                          setServiceCategory(event.target.value);
                          setValidationError('');
                        }}
                        placeholder="Example: Documentation"
                        required
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <Input
                        label="Price"
                        type="number"
                        min="0"
                        value={servicePrice}
                        onChange={(event) => {
                          setServicePrice(event.target.value);
                          setValidationError('');
                        }}
                        placeholder="0"
                        required
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Description</label>
                      <textarea
                        className="form-control styled-textarea"
                        rows={3}
                        value={serviceDescription}
                        onChange={(event) => {
                          setServiceDescription(event.target.value);
                          setValidationError('');
                        }}
                        placeholder="Short note operators can understand quickly"
                        required
                      />
                    </div>
                  </div>

                  <div className="modal-actions">
                    {services.length > 0 ? (
                      <Button type="button" variant="secondary" onClick={() => setShowServiceForm(false)}>
                        Back to Summary
                      </Button>
                    ) : null}
                    <Button type="submit">{services.length > 0 ? 'Save Service' : 'Save and Continue'}</Button>
                  </div>
                </form>
              ) : (
                <div className="form-section-card">
                  <div className="form-section-title mb-2">Add another service?</div>
                  <p className="page-muted small mb-0">You can keep building your service catalog now, or continue to customer import.</p>
                  <div className="modal-actions mt-4">
                    <Button type="button" variant="secondary" onClick={resetServiceForm}>
                      Add Another Service
                    </Button>
                    <Button type="button" onClick={onAdvanceServices}>
                      Next
                      <FaArrowRight />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {currentStep === 'customers' ? (
            <section className="form-section-card">
              <div className="d-flex flex-column flex-md-row justify-content-between gap-3 mb-3">
                <div>
                  <div className="form-section-title mb-1">Import Existing Customers</div>
                  <p className="page-muted small mb-0">Paste one customer per line using `Name, Phone, Email`. A header row is optional.</p>
                </div>
                {customers.length > 0 ? (
                  <span className="status-chip status-chip--active">{customers.length} imported</span>
                ) : (
                  <span className="status-chip status-chip--info">Optional</span>
                )}
              </div>

              <div className="onboarding-example">
                <strong>Example</strong>
                <code>{'Name, Phone, Email\nRiya Sharma, 9876543210, riya@example.com'}</code>
              </div>

              <form onSubmit={handleCustomerImport}>
                <div className="onboarding-upload-panel">
                  <div>
                    <div className="form-section-title mb-1">Upload Customer File</div>
                    <p className="page-muted small mb-0">Supported formats: Excel `.xlsx`/`.xls`, XML `.xml`, Word `.docx`, CSV `.csv`, and text `.txt`.</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="d-none"
                    accept=".xlsx,.xls,.xml,.docx,.doc,.csv,.txt"
                    onChange={handleCustomerFileUpload}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessingUpload}
                  >
                    <FaUpload />
                    {isProcessingUpload ? 'Extracting...' : 'Upload File'}
                  </Button>
                </div>
                {uploadFeedback ? (
                  <p className="form-hint mt-3 mb-0">{uploadFeedback}</p>
                ) : null}
                <label className="form-label mt-3">Customer List</label>
                <textarea
                  className="form-control styled-textarea onboarding-textarea"
                  rows={8}
                  value={customerImportText}
                  onChange={(event) => {
                    setCustomerImportText(event.target.value);
                    setValidationError('');
                  }}
                  placeholder={'Name, Phone, Email\nRiya Sharma, 9876543210, riya@example.com'}
                />

                <div className="modal-actions">
                  <Button type="button" variant="secondary" onClick={onSkipCustomers}>
                    {customers.length > 0 ? 'Continue to Dashboard' : 'Skip for Now'}
                  </Button>
                  <Button type="submit">
                    {customers.length > 0 ? 'Import More Customers' : 'Import Customers'}
                  </Button>
                </div>
              </form>
            </section>
          ) : null}
        </div>
      </section>
    </main>
  );
};

export default BusinessOnboarding;
