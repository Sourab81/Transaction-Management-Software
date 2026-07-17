'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { FaEdit, FaEye, FaPlusCircle } from 'react-icons/fa';
import { useCustomerCategories } from '../../../lib/hooks/useCustomerCategories';
import { getCustomers } from '../../../lib/api/customers';
import type { CustomerCategory, CustomerCategoryStatus } from '../../../lib/api/customerCategories';
import ActionModal from '../../ui/ActionModal';
import DataTable from '../../tables/DataTable';
import SectionHero from '../SectionHero';
import type { DashboardTabContext } from './types';

interface CustomerCategoryTabProps {
  ctx: DashboardTabContext;
}

const emptyCategoryForm = {
  name: '',
  status: 'Active' as CustomerCategoryStatus,
};

export default function CustomerCategoryTab({ ctx }: CustomerCategoryTabProps) {
  const { showNotification } = ctx;
  const { categories, isLoading, error, saveCategory } = useCustomerCategories();
  const [search, setSearch] = useState('');
  const [editingCategory, setEditingCategory] = useState<CustomerCategory | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyCategoryForm);
  const [formError, setFormError] = useState('');

  const [viewCategory, setViewCategory] = useState<CustomerCategory | null>(null);
  const [customerRecords, setCustomerRecords] = useState<unknown[]>([]);
  const [customerTotal, setCustomerTotal] = useState(0);
  const [customerPage, setCustomerPage] = useState(1);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const CUSTOMER_PAGE_SIZE = 10;

  const fetchCategoryCustomers = useCallback(async (categoryId: string, page: number) => {
    setIsLoadingCustomers(true);
    try {
      const response = await getCustomers({ categoryId, pageNo: page, limit: CUSTOMER_PAGE_SIZE });
      const data = (response as Record<string, unknown>)?.data;
      const pagination = (response as Record<string, unknown>)?.pagination as Record<string, unknown> | undefined;
      setCustomerRecords(Array.isArray(data) ? data : []);
      setCustomerTotal(Number(pagination?.total_records ?? 0));
    } catch {
      setCustomerRecords([]);
      setCustomerTotal(0);
    } finally {
      setIsLoadingCustomers(false);
    }
  }, []);

  const openViewModal = (category: CustomerCategory) => {
    setViewCategory(category);
    setCustomerPage(1);
    fetchCategoryCustomers(category.id, 1);
  };

  const closeViewModal = () => {
    setViewCategory(null);
    setCustomerRecords([]);
    setCustomerTotal(0);
    setCustomerPage(1);
  };

  const handleViewPageChange = (page: number) => {
    if (!viewCategory) return;
    setCustomerPage(page);
    fetchCategoryCustomers(viewCategory.id, page);
  };

  useEffect(() => {
    if (viewCategory) {
      fetchCategoryCustomers(viewCategory.id, customerPage);
    }
  }, [viewCategory, customerPage, fetchCategoryCustomers]);

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return categories;

    return categories.filter((category) => (
      category.name.toLowerCase().includes(query)
      || category.status.toLowerCase().includes(query)
      || (category.addedByName || '').toLowerCase().includes(query)
    ));
  }, [categories, search]);

  const openAddModal = () => {
    setEditingCategory(null);
    setForm(emptyCategoryForm);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (category: CustomerCategory) => {
    setEditingCategory(category);
    setForm({
      name: category.name,
      status: category.status,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setForm(emptyCategoryForm);
    setFormError('');
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setFormError('Category name is required.');
      return;
    }

    const result = await saveCategory({
      name: form.name.trim(),
      status: form.status,
    }, editingCategory?.id);

    if (!result.success) {
      setFormError(result.message);
      showNotification('error', result.message);
      return;
    }

    showNotification('success', result.message);
    closeModal();
  };

  return (
    <div className="row g-4">
      <div className="col-12">
        <DataTable
          rows={filteredCategories}
          getRowKey={(category) => category.id}
          eyebrow="Customer Categories"
          title="Customer Category Master"
          copy="Create and manage categories that can be assigned to customers."
          emptyLabel={error || 'No categories found.'}
          isLoading={isLoading}
          headerAction={(
            <div className="table-filter-trigger">
              <input
                className="form-control"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search categories"
                style={{ minWidth: '14rem' }}
              />
              {ctx.canManageModule('customer-categories') ? (
                <button type="button" className="btn-app btn-app-primary" onClick={openAddModal}>
                  <FaPlusCircle />
                  Add Category
                </button>
              ) : null}
            </div>
          )}
          columns={[
            { key: 'serial', header: 'S.No.', render: (_category, index) => index + 1 },
            { key: 'name', header: 'Category Name', render: (category) => <span className="data-table__primary">{category.name}</span> },
            {
              key: 'status',
              header: 'Status',
              render: (category) => (
                <span className={`status-chip ${category.status === 'Active' ? 'status-chip--active' : 'status-chip--inactive'}`}>
                  {category.status}
                </span>
              ),
            },
            { key: 'addedBy', header: 'Added By', render: (category) => category.addedByName || '-' },
          ]}
          renderActions={(category) => (
            <div className="table-actions">
              <button type="button" className="btn-icon-sm btn-icon-sm--primary" onClick={() => openViewModal(category)}>
                <FaEye size={12} />
                View
              </button>
              {ctx.canManageModule('customer-categories') ? (
                <button type="button" className="btn-icon-sm btn-icon-sm--primary" onClick={() => openEditModal(category)}>
                  <FaEdit size={12} />
                  Edit
                </button>
              ) : null}
            </div>
          )}
        />
      </div>

      {isModalOpen ? (
        <ActionModal
          title={editingCategory ? 'Edit Category' : 'Add Category'}
          eyebrow="Customer Category Master"
          description="Enter a clear name for the customer category."
          onClose={closeModal}
        >
          <form onSubmit={handleSubmit}>
            {formError ? <div className="form-alert" role="alert">{formError}</div> : null}
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="category-master-name">Category Name</label>
                <input
                  id="category-master-name"
                  className="form-control"
                  value={form.name}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, name: event.target.value }));
                    setFormError('');
                  }}
                  required
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="category-master-status">Status</label>
                <select
                  id="category-master-status"
                  className="form-select"
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as CustomerCategoryStatus }))}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-app btn-app-secondary" onClick={closeModal}>Cancel</button>
              <button type="submit" className="btn-app btn-app-primary">Save</button>
            </div>
          </form>
        </ActionModal>
      ) : null}

      {viewCategory ? (
        <ActionModal
          title={`Customers in "${viewCategory.name}"`}
          eyebrow="Customer Category"
          onClose={closeViewModal}
        >
          {isLoadingCustomers ? (
            <div className="text-center py-4">
              <span className="spinner-border spinner-border-sm me-2" role="status" />
              Loading customers...
            </div>
          ) : customerRecords.length === 0 ? (
            <div className="text-center py-4 page-muted">
              No customers found in this category.
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-sm table-hover mb-0">
                  <thead>
                    <tr>
                      <th style={{ width: '3rem' }}>#</th>
                      <th>Code</th>
                      <th>Customer Name</th>
                      <th>Mobile No</th>
                      <th>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerRecords.map((record, index) => {
                      const r = record as Record<string, unknown>;
                      const name = String(r.customer_name ?? r.name ?? '');
                      const mobile = String(r.mobile_no ?? r.phone ?? '');
                      const email = String(r.email ?? '');
                      const colorCode = String(r.color_code ?? r.color ?? '');
                      return (
                        <tr key={String(r.id ?? index)}>
                          <td className="page-muted">{(customerPage - 1) * CUSTOMER_PAGE_SIZE + index + 1}</td>
                          <td className="text-nowrap">{String(r.customer_code ?? r.customerCode ?? '-')}</td>
                          <td>
                            {colorCode ? (
                              <span style={{ color: colorCode, fontWeight: 600 }}>{name || '-'}</span>
                            ) : (
                              <span className="fw-semibold">{name || '-'}</span>
                            )}
                          </td>
                          <td>{mobile || '-'}</td>
                          <td>{email || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {customerTotal > CUSTOMER_PAGE_SIZE ? (
                <div className="d-flex justify-content-between align-items-center mt-3">
                  <span className="page-muted small">
                    Showing {(customerPage - 1) * CUSTOMER_PAGE_SIZE + 1}–
                    {Math.min(customerPage * CUSTOMER_PAGE_SIZE, customerTotal)} of {customerTotal}
                  </span>
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn-app btn-app-secondary"
                      disabled={customerPage <= 1}
                      onClick={() => handleViewPageChange(customerPage - 1)}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      className="btn-app btn-app-secondary"
                      disabled={customerPage * CUSTOMER_PAGE_SIZE >= customerTotal}
                      onClick={() => handleViewPageChange(customerPage + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          )}
          <div className="modal-actions">
            <button type="button" className="btn-app btn-app-secondary" onClick={closeViewModal}>Close</button>
          </div>
        </ActionModal>
      ) : null}
    </div>
  );
}
