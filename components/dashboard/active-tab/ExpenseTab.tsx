'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { usePathname } from 'next/navigation';
import { FaCalendarAlt, FaEdit, FaFilter, FaMoneyBillWave, FaReceipt, FaTrashAlt, FaWallet } from 'react-icons/fa';
import {
  createExpenseCategory,
  deleteExpenseCategory,
  getExpenseCategories,
  mapExpenseCategoriesResponse,
  updateExpenseCategory,
  type ExpenseCategory,
} from '../../../lib/api/expenseCategories';
import {
  createExpense,
  deleteExpense,
  updateExpense,
  type ExpenseFilters,
  type ExpenseMutationPayload,
  type ExpensePaymentMode,
  type ExpenseRecord,
} from '../../../lib/api/expenses';
import { useExpenses } from '../../../lib/hooks/useExpenses';
import ActionModal from '../../ui/ActionModal';
import ConfirmActionModal from '../../ui/state/ConfirmActionModal';
import ExpenseEntryForm from '../../forms/ExpenseEntryForm';
import ExpensesTable from '../../tables/ExpensesTable';
import ReusableListTable from '../../common/ReusableListTable';
import SectionHero from '../SectionHero';
import type { DashboardTabContext } from './types';
import type { SummaryCardProps } from '../SummaryCard';

interface ExpenseTabProps {
  ctx: DashboardTabContext;
}

type ExpenseView = 'add' | 'list' | 'categories';

interface ExpenseFilterState {
  dateFrom: string;
  dateTo: string;
  categoryId: string;
  counterIds: string[];
  addedById: string;
  paymentMode: ExpensePaymentMode | 'all';
}

const emptyFilters: ExpenseFilterState = {
  dateFrom: '',
  dateTo: '',
  categoryId: '',
  counterIds: [],
  addedById: '',
  paymentMode: 'all',
};

const getExpenseViewFromPath = (pathname: string): ExpenseView => {
  if (pathname.endsWith('/expenses/categories')) return 'categories';
  if (pathname.endsWith('/expenses/list')) return 'list';
  return 'add';
};

const normalizeStatusLabel = (status: ExpenseCategory['status']) => {
  const normalizedStatus = String(status ?? 1).trim().toLowerCase();
  return ['0', 'inactive', 'false'].includes(normalizedStatus) ? 'Inactive' : 'Active';
};

const getStatusValue = (status: ExpenseCategory['status']) => (
  normalizeStatusLabel(status) === 'Active' ? 1 : 0
);

const formatMoney = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

const getExpenseDate = (expense: ExpenseRecord) => {
  const rawDate = expense.date || '';
  if (/^\d{4}-\d{2}-\d{2}/.test(rawDate)) return rawDate.slice(0, 10);
  const parsed = new Date(rawDate);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
};

const sumExpenses = (rows: ExpenseRecord[]) => rows.reduce((total, expense) => total + Number(expense.amount || 0), 0);

const normalizeExpenseError = (message: string) => (
  /insufficient/i.test(message) ? 'Insufficient balance available.' : message
);

export default function ExpenseTab({ ctx }: ExpenseTabProps) {
  const pathname = usePathname();
  const view = getExpenseViewFromPath(pathname);
  const {
    accounts,
    counters,
    employees,
    selectedCounter,
    canManageModule,
    canDeleteModule,
    reloadAccounts,
    reloadDepartments,
    renderSummaryCards,
    showNotification,
  } = ctx;
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<ExpenseRecord | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryRemark, setCategoryRemark] = useState('');
  const [categoryStatus, setCategoryStatus] = useState('1');
  const [categorySearch, setCategorySearch] = useState('');
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<ExpenseCategory | null>(null);
  const [draftFilters, setDraftFilters] = useState<ExpenseFilterState>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<ExpenseFilterState>(emptyFilters);

  const expenseFilters = useMemo<ExpenseFilters>(() => ({
    status: 1,
    ...(appliedFilters.dateFrom ? { dateFrom: appliedFilters.dateFrom } : {}),
    ...(appliedFilters.dateTo ? { dateTo: appliedFilters.dateTo } : {}),
    ...(appliedFilters.categoryId ? { categoryId: appliedFilters.categoryId } : {}),
    ...(appliedFilters.counterIds.length === 1 ? { counterId: appliedFilters.counterIds[0] } : {}),
    ...(appliedFilters.addedById ? { staffId: appliedFilters.addedById } : {}),
    ...(appliedFilters.paymentMode !== 'all' ? { paymentMode: appliedFilters.paymentMode } : {}),
  }), [appliedFilters]);
  const {
    expenses,
    pagination: expensePagination,
    isLoading: isExpensesLoading,
    error: expensesError,
    setPage: setExpensePage,
    setLimit: setExpenseLimit,
    reload: reloadExpenses,
  } = useExpenses(view !== 'categories', expenseFilters);
  const canManageExpenses = canManageModule('expense');
  const canDeleteExpenses = canDeleteModule('expense');

  const loadCategories = async () => {
    setIsCategoriesLoading(true);
    setCategoriesError('');

    try {
      setCategories(mapExpenseCategoriesResponse(await getExpenseCategories()));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load expense types.';
      setCategoriesError(message);
    } finally {
      setIsCategoriesLoading(false);
    }
  };

  useEffect(() => {
    void loadCategories();
  }, [view]);

  const refreshBalances = () => {
    reloadAccounts();
    reloadDepartments();
  };

  const filteredCategories = useMemo(() => {
    const query = categorySearch.trim().toLowerCase();
    if (!query) return categories;
    return categories.filter((category) => (
      category.name.toLowerCase().includes(query)
      || (category.remark || '').toLowerCase().includes(query)
      || normalizeStatusLabel(category.status).toLowerCase().includes(query)
      || (category.addedByName || '').toLowerCase().includes(query)
    ));
  }, [categories, categorySearch]);

  const filteredExpenses = useMemo(() => expenses.filter((expense) => {
    const expenseDate = getExpenseDate(expense);
    const matchesDate = (!appliedFilters.dateFrom || expenseDate >= appliedFilters.dateFrom)
      && (!appliedFilters.dateTo || expenseDate <= appliedFilters.dateTo);
    const matchesDepartment = appliedFilters.counterIds.length === 0
      || appliedFilters.counterIds.includes(String(expense.counterId));
    const matchesAddedBy = !appliedFilters.addedById
      || String(expense.addedById || '') === appliedFilters.addedById
      || String(expense.addedByName || '').toLowerCase() === appliedFilters.addedById.toLowerCase();

    return matchesDate && matchesDepartment && matchesAddedBy;
  }), [appliedFilters, expenses]);

  const addedByOptions = useMemo(() => {
    const map = new Map<string, string>();
    employees.forEach((employee) => map.set(employee.id, employee.name));
    expenses.forEach((expense) => {
      if (expense.addedById && expense.addedByName) map.set(expense.addedById, expense.addedByName);
      else if (expense.addedByName) map.set(expense.addedByName, expense.addedByName);
    });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [employees, expenses]);

  const summaryCards = useMemo<SummaryCardProps[]>(() => {
    const today = new Date().toLocaleDateString('en-CA');
    const currentMonth = today.slice(0, 7);
    const todayTotal = sumExpenses(expenses.filter((expense) => getExpenseDate(expense) === today));
    const monthlyTotal = sumExpenses(expenses.filter((expense) => getExpenseDate(expense).startsWith(currentMonth)));
    const filteredTotal = sumExpenses(filteredExpenses);
    const loadedTotal = sumExpenses(expenses);

    return [
      { title: "Today's Expense", value: formatMoney(todayTotal), detail: 'Expenses recorded today', icon: <FaCalendarAlt />, colorClass: 'bg-warning' },
      { title: 'Monthly Expense', value: formatMoney(monthlyTotal), detail: 'Expenses in current month', icon: <FaReceipt />, colorClass: 'bg-primary' },
      { title: 'Filtered Expense', value: formatMoney(filteredTotal), detail: 'Total for selected filters', icon: <FaFilter />, colorClass: 'bg-success' },
      { title: 'Total Expense', value: formatMoney(loadedTotal), detail: 'Total in loaded result set', icon: <FaMoneyBillWave />, colorClass: 'bg-info' },
    ];
  }, [expenses, filteredExpenses]);

  const handleCreateExpense = async (payload: ExpenseMutationPayload) => {
    setIsSaving(true);
    setActionError('');

    const result = await createExpense(payload);
    setIsSaving(false);

    if (!result.success) {
      const message = normalizeExpenseError(result.message || 'Unable to save expense.');
      setActionError(message);
      showNotification('error', message);
      return false;
    }

    showNotification('success', result.message || 'Expense saved successfully.');
    reloadExpenses();
    refreshBalances();
    return true;
  };

  const closeExpenseModal = () => {
    setEditingExpense(null);
    setDeletingExpense(null);
    setActionError('');
    setIsSaving(false);
  };

  const handleUpdateExpense = async (payload: ExpenseMutationPayload) => {
    if (!editingExpense) return false;

    setIsSaving(true);
    setActionError('');

    const result = await updateExpense({ ...payload, id: editingExpense.id });
    setIsSaving(false);

    if (!result.success) {
      const message = normalizeExpenseError(result.message || 'Unable to update expense.');
      setActionError(message);
      showNotification('error', message);
      return false;
    }

    showNotification('success', result.message || 'Expense updated successfully.');
    reloadExpenses();
    refreshBalances();
    closeExpenseModal();
    return true;
  };

  const handleDeleteExpense = async () => {
    if (!deletingExpense) return;

    setIsSaving(true);
    setActionError('');

    const result = await deleteExpense(deletingExpense.id);
    setIsSaving(false);

    if (!result.success) {
      const message = result.message || 'Unable to delete expense.';
      setActionError(message);
      showNotification('error', message);
      return;
    }

    showNotification('success', result.message || 'Expense deleted successfully.');
    reloadExpenses();
    refreshBalances();
    closeExpenseModal();
  };

  const resetCategoryForm = () => {
    setCategoryName('');
    setCategoryRemark('');
    setCategoryStatus('1');
    setEditingCategory(null);
    setActionError('');
  };

  const handleSaveCategory = async (event: FormEvent) => {
    event.preventDefault();
    if (!categoryName.trim()) {
      setActionError('Expense Type Name is required.');
      return;
    }

    setIsSaving(true);
    setActionError('');

    const payload = {
      name: categoryName.trim(),
      remark: categoryRemark.trim() || null,
      status: categoryStatus,
    };
    const result = editingCategory
      ? await updateExpenseCategory({ id: editingCategory.id, ...payload })
      : await createExpenseCategory(payload);
    setIsSaving(false);

    if (!result.success) {
      const message = result.message || 'Unable to save expense type.';
      setActionError(message);
      showNotification('error', message);
      return;
    }

    showNotification('success', result.message || 'Expense type saved successfully.');
    resetCategoryForm();
    void loadCategories();
  };

  const handleToggleCategoryStatus = async (category: ExpenseCategory) => {
    setIsSaving(true);
    setActionError('');

    const nextStatus = getStatusValue(category.status) === 1 ? 0 : 1;
    const result = await updateExpenseCategory({
      id: category.id,
      name: category.name,
      remark: category.remark ?? null,
      status: nextStatus,
    });
    setIsSaving(false);

    if (!result.success) {
      const message = result.message || 'Unable to update expense type status.';
      setActionError(message);
      showNotification('error', message);
      return;
    }

    showNotification('success', result.message || 'Expense type status updated.');
    void loadCategories();
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;

    setIsSaving(true);
    setActionError('');

    const result = await deleteExpenseCategory(deletingCategory.id);
    setIsSaving(false);

    if (!result.success) {
      const message = result.message || 'Unable to delete expense type.';
      setActionError(message);
      showNotification('error', message);
      return;
    }

    showNotification('success', result.message || 'Expense type deleted successfully.');
    setDeletingCategory(null);
    void loadCategories();
  };

  const applyFilters = () => {
    setAppliedFilters(draftFilters);
  };

  const clearFilters = () => {
    setDraftFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  };

  const toggleDepartmentFilter = (counterId: string) => {
    setDraftFilters((filters) => ({
      ...filters,
      counterIds: filters.counterIds.includes(counterId)
        ? filters.counterIds.filter((id) => id !== counterId)
        : [...filters.counterIds, counterId],
    }));
  };

  if (view === 'categories') {
    return (
      <div className="row g-4">
        <div className="col-12">
          <SectionHero
            eyebrow="Expense Types"
            title="Expense Type Master"
            description="Create and maintain expense types used while recording expenses."
          />
        </div>
        <div className="col-12 col-xl-4">
          <form className="form-section-card expense-type-form" onSubmit={handleSaveCategory}>
            <div className="form-section-title mb-3">{editingCategory ? 'Edit Expense Type' : 'Add Expense Type'}</div>
            {actionError ? <div className="form-alert" role="alert">{actionError}</div> : null}
            <div className="row g-3">
              <div className="col-12">
                <label className="form-label" htmlFor="expense-type-name">Expense Type Name *</label>
                <input
                  id="expense-type-name"
                  className="form-control"
                  value={categoryName}
                  onChange={(event) => {
                    setCategoryName(event.target.value);
                    setActionError('');
                  }}
                  placeholder="Internet"
                  required
                />
              </div>
              <div className="col-12">
                <label className="form-label" htmlFor="expense-type-remark">Remark</label>
                <textarea
                  id="expense-type-remark"
                  className="form-control styled-textarea"
                  rows={3}
                  value={categoryRemark}
                  onChange={(event) => setCategoryRemark(event.target.value)}
                  placeholder="Optional note"
                />
              </div>
              <div className="col-12">
                <label className="form-label" htmlFor="expense-type-status">Status</label>
                <select
                  id="expense-type-status"
                  className="form-select"
                  value={categoryStatus}
                  onChange={(event) => setCategoryStatus(event.target.value)}
                >
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-app btn-app-secondary" onClick={resetCategoryForm} disabled={isSaving}>
                Reset
              </button>
              <button type="submit" className="btn-app btn-app-primary" disabled={isSaving || !canManageExpenses}>
                {isSaving ? 'Saving...' : editingCategory ? 'Update' : 'Save'}
              </button>
            </div>
          </form>
        </div>
        <div className="col-12 col-xl-8">
          <ReusableListTable
            data={filteredCategories}
            columns={[
              { key: 'serial', header: 'S.No', render: (_category, index) => index + 1 },
              { key: 'name', header: 'Expense Type Name', render: (category) => <span className="data-table__primary">{category.name}</span> },
              { key: 'remark', header: 'Remark', render: (category) => category.remark || '-' },
              {
                key: 'status',
                header: 'Status',
                render: (category) => (
                  <button
                    type="button"
                    className={`status-toggle-pill ${getStatusValue(category.status) === 1 ? 'is-active' : 'is-inactive'}`}
                    onClick={() => handleToggleCategoryStatus(category)}
                    disabled={!canManageExpenses || isSaving}
                  >
                    {normalizeStatusLabel(category.status)}
                  </button>
                ),
              },
              { key: 'addedBy', header: 'Added By', render: (category) => category.addedByName || '-' },
            ]}
            rowKey={(category) => category.id}
            loading={isCategoriesLoading}
            error={categoriesError}
            emptyMessage="No expense types found."
            eyebrow="Expense Types"
            title="Expense Type List"
            copy="Search, edit, and toggle expense type status."
            headerAction={(
              <input
                className="form-control table-search-input"
                type="search"
                value={categorySearch}
                onChange={(event) => setCategorySearch(event.target.value)}
                placeholder="Search expense types"
                aria-label="Search expense types"
              />
            )}
            renderActions={(category) => (
              <div className="table-actions">
                <button
                  type="button"
                  className="btn-icon-sm btn-icon-sm--primary"
                  onClick={() => {
                    setEditingCategory(category);
                    setCategoryName(category.name);
                    setCategoryRemark(category.remark || '');
                    setCategoryStatus(String(getStatusValue(category.status)));
                    setActionError('');
                  }}
                  disabled={!canManageExpenses}
                >
                  <FaEdit size={12} />
                  Edit
                </button>
                <button
                  type="button"
                  className="btn-icon-sm btn-icon-sm--danger"
                  onClick={() => setDeletingCategory(category)}
                  disabled={!canDeleteExpenses}
                >
                  <FaTrashAlt size={12} />
                  Delete
                </button>
              </div>
            )}
          />
        </div>
        {deletingCategory ? (
          <ConfirmActionModal
            title="Delete Expense Type"
            eyebrow="Expense Type"
            description="This disables or deletes the expense type if the backend supports it."
            promptTitle={`Delete ${deletingCategory.name}?`}
            promptDescription="Existing expenses may continue to show the saved expense type name."
            confirmLabel={isSaving ? 'Deleting...' : 'Delete Expense Type'}
            confirmVariant="danger"
            tone="danger"
            isConfirming={isSaving}
            onConfirm={handleDeleteCategory}
            onCancel={() => {
              setDeletingCategory(null);
              setActionError('');
            }}
          >
            {actionError ? <div className="alert alert-danger mb-3">{actionError}</div> : null}
          </ConfirmActionModal>
        ) : null}
      </div>
    );
  }

  return (
    <div className="row g-4">
      {editingExpense ? (
        <ActionModal
          title="Edit Expense"
          eyebrow="Expense"
          description="Update this expense. Balances are adjusted by the backend after save."
          onClose={closeExpenseModal}
        >
          <ExpenseEntryForm
            accounts={accounts}
            categories={categories}
            departments={counters}
            initialValues={editingExpense}
            defaultDepartmentId={selectedCounter?.id || ''}
            isSubmitting={isSaving}
            submitError={actionError}
            submitLabel="Update Expense"
            onSubmit={handleUpdateExpense}
            onCancel={closeExpenseModal}
          />
        </ActionModal>
      ) : null}

      {deletingExpense ? (
        <ConfirmActionModal
          title="Delete Expense"
          eyebrow="Expense"
          description="Deleting this expense will reverse account and department balance."
          promptTitle="Are you sure you want to delete this expense?"
          promptDescription="Deleting this expense will reverse account and department balance. Are you sure?"
          confirmLabel={isSaving ? 'Deleting...' : 'Delete Expense'}
          confirmVariant="danger"
          tone="danger"
          isConfirming={isSaving}
          onConfirm={handleDeleteExpense}
          onCancel={closeExpenseModal}
        >
          {actionError ? <div className="alert alert-danger mb-3">{actionError}</div> : null}
        </ConfirmActionModal>
      ) : null}

      <div className="col-12">
        <SectionHero
          eyebrow="Expenses"
          title="Expense Management"
          description="Record expenses and review expense history with filters, summaries, and pagination."
          action={{
            label: 'Refresh',
            icon: <FaFilter />,
            onClick: reloadExpenses,
          }}
        />
      </div>

      <div className="col-12">
        <div className="app-card">
          <ExpenseEntryForm
            accounts={accounts}
            categories={categories}
            departments={counters}
            defaultDepartmentId={selectedCounter?.id || ''}
            isSubmitting={isSaving}
            submitError={actionError}
            onSubmit={handleCreateExpense}
          />
          {categoriesError ? <p className="text-danger small mb-0 mt-3">{categoriesError}</p> : null}
        </div>
      </div>

      {renderSummaryCards(summaryCards)}

      <div className="col-12">
        <div className="form-section-card expense-filter-panel">
          <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-3">
            <div>
              <p className="eyebrow mb-1">Expense List</p>
              <h3 className="table-panel__title mb-0">Filters</h3>
            </div>
            <div className="modal-actions m-0 p-0 border-0">
              <button type="button" className="btn-app btn-app-secondary" onClick={clearFilters}>Clear</button>
              <button type="button" className="btn-app btn-app-primary" onClick={applyFilters}>Apply</button>
            </div>
          </div>
          <div className="row g-3">
            <div className="col-12 col-md-6 col-xl-3">
              <label className="form-label" htmlFor="expense-filter-from">From Date</label>
              <input
                id="expense-filter-from"
                className="form-control"
                type="date"
                value={draftFilters.dateFrom}
                max={draftFilters.dateTo || undefined}
                onChange={(event) => setDraftFilters((filters) => ({ ...filters, dateFrom: event.target.value }))}
              />
            </div>
            <div className="col-12 col-md-6 col-xl-3">
              <label className="form-label" htmlFor="expense-filter-to">To Date</label>
              <input
                id="expense-filter-to"
                className="form-control"
                type="date"
                value={draftFilters.dateTo}
                min={draftFilters.dateFrom || undefined}
                onChange={(event) => setDraftFilters((filters) => ({ ...filters, dateTo: event.target.value }))}
              />
            </div>
            <div className="col-12 col-md-6 col-xl-3">
              <label className="form-label" htmlFor="expense-filter-category">Expense Type</label>
              <select
                id="expense-filter-category"
                className="form-select"
                value={draftFilters.categoryId}
                onChange={(event) => setDraftFilters((filters) => ({ ...filters, categoryId: event.target.value }))}
              >
                <option value="">All Expense Types</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-6 col-xl-3">
              <label className="form-label" htmlFor="expense-filter-added-by">Added By</label>
              <select
                id="expense-filter-added-by"
                className="form-select"
                value={draftFilters.addedById}
                onChange={(event) => setDraftFilters((filters) => ({ ...filters, addedById: event.target.value }))}
              >
                <option value="">All Users</option>
                {addedByOptions.map((user) => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-6 col-xl-3">
              <label className="form-label" htmlFor="expense-filter-source">Source Type</label>
              <select
                id="expense-filter-source"
                className="form-select"
                value={draftFilters.paymentMode}
                onChange={(event) => setDraftFilters((filters) => ({ ...filters, paymentMode: event.target.value as ExpensePaymentMode | 'all' }))}
              >
                <option value="all">All Sources</option>
                <option value="account">Account</option>
                <option value="department">Department</option>
              </select>
            </div>
            <div className="col-12 col-xl-9">
              <span className="form-label d-block">Department Filter</span>
              <div className="expense-multiselect">
                {counters.map((counter) => (
                  <label key={counter.id} className="expense-multiselect__option">
                    <input
                      type="checkbox"
                      checked={draftFilters.counterIds.includes(counter.id)}
                      onChange={() => toggleDepartmentFilter(counter.id)}
                    />
                    <span>{counter.code ? `${counter.code} / ${counter.name}` : counter.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="col-12">
        <ExpensesTable
          expenses={filteredExpenses}
          isLoading={isExpensesLoading}
          error={expensesError}
          pagination={{
            ...expensePagination,
            isLoading: isExpensesLoading,
            onPageChange: setExpensePage,
            onLimitChange: setExpenseLimit,
          }}
          onEdit={canManageExpenses ? setEditingExpense : undefined}
          onDelete={canDeleteExpenses ? (expenseId) => {
            const expense = filteredExpenses.find((entry) => entry.id === expenseId);
            if (expense) setDeletingExpense(expense);
          } : undefined}
        />
      </div>
    </div>
  );
}
