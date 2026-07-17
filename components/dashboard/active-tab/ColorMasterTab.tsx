'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { FaEdit, FaPlusCircle } from 'react-icons/fa';
import { useCustomerColors } from '../../../lib/hooks/useCustomerColors';
import type { CustomerColor, CustomerColorStatus } from '../../../lib/api/customerColors';
import ActionModal from '../../ui/ActionModal';
import DataTable from '../../tables/DataTable';
import RemarkCell from '../../common/RemarkCell';
import SectionHero from '../SectionHero';
import type { DashboardTabContext } from './types';

interface ColorMasterTabProps {
  ctx: DashboardTabContext;
}

const emptyColorForm = {
  name: '',
  hexCode: '#3B82F6',
  remark: '',
  status: 'Active' as CustomerColorStatus,
};

const normalizeHexCode = (value: string) => {
  const trimmedValue = value.trim();
  return trimmedValue.startsWith('#') ? trimmedValue : `#${trimmedValue}`;
};

export default function ColorMasterTab({ ctx }: ColorMasterTabProps) {
  const { showNotification } = ctx;
  const { colors, isLoading, error, saveColor } = useCustomerColors();
  const [search, setSearch] = useState('');
  const [editingColor, setEditingColor] = useState<CustomerColor | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyColorForm);
  const [formError, setFormError] = useState('');

  const filteredColors = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return colors;

    return colors.filter((color) => (
      color.name.toLowerCase().includes(query)
      || color.hexCode.toLowerCase().includes(query)
      || (color.remark || '').toLowerCase().includes(query)
      || color.status.toLowerCase().includes(query)
      || (color.addedByName || '').toLowerCase().includes(query)
    ));
  }, [colors, search]);

  const openAddModal = () => {
    setEditingColor(null);
    setForm(emptyColorForm);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (color: CustomerColor) => {
    setEditingColor(color);
    setForm({
      name: color.name,
      hexCode: color.hexCode,
      remark: color.remark || '',
      status: color.status,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingColor(null);
    setForm(emptyColorForm);
    setFormError('');
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setFormError('Color name is required.');
      return;
    }

    if (!form.hexCode.trim()) {
      setFormError('Color is required.');
      return;
    }

    const result = await saveColor({
      name: form.name.trim(),
      hexCode: normalizeHexCode(form.hexCode),
      remark: form.remark.trim() || null,
      status: form.status,
    }, editingColor?.id);

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
          rows={filteredColors}
          getRowKey={(color) => color.id}
          eyebrow="Colors"
          title="Color Master"
          copy="Create and manage colors that can be assigned to customers."
          emptyLabel={error || 'No colors found.'}
          isLoading={isLoading}
          headerAction={(
            <div className="table-filter-trigger">
              <input
                className="form-control"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search colors"
                style={{ minWidth: '14rem' }}
              />
              {ctx.canManageModule('colors') ? (
                <button type="button" className="btn-app btn-app-primary" onClick={openAddModal}>
                  <FaPlusCircle />
                  Add Color
                </button>
              ) : null}
            </div>
          )}
          columns={[
            { key: 'serial', header: 'S.No.', render: (_color, index) => index + 1 },
            { key: 'name', header: 'Name', render: (color) => <span className="data-table__primary">{color.name}</span> },
            {
              key: 'color',
              header: 'Color',
              render: (color) => (
                <span className="color-master-cell">
                  <span className="color-master-cell__swatch" style={{ backgroundColor: color.hexCode }} />
                  {color.name}
                </span>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (color) => (
                <span className={`status-chip ${color.status === 'Active' ? 'status-chip--active' : 'status-chip--inactive'}`}>
                  {color.status}
                </span>
              ),
            },
            { key: 'remark', header: 'Remark', render: (color) => <RemarkCell value={color.remark} /> },
            { key: 'addedBy', header: 'Added By', render: (color) => color.addedByName || '-' },
          ]}
          renderActions={(color) => (
            <div className="table-actions">
              {ctx.canManageModule('colors') ? (
                <button type="button" className="btn-icon-sm btn-icon-sm--primary" onClick={() => openEditModal(color)}>
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
          title={editingColor ? 'Edit Color' : 'Add Color'}
          eyebrow="Color Master"
          description="Use a clear name and hex code for customer display colors."
          onClose={closeModal}
        >
          <form onSubmit={handleSubmit}>
            {formError ? <div className="form-alert" role="alert">{formError}</div> : null}
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="color-master-name">Color Name</label>
                <input
                  id="color-master-name"
                  className="form-control"
                  value={form.name}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, name: event.target.value }));
                    setFormError('');
                  }}
                  required
                />
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label" htmlFor="color-master-picker">Color Picker</label>
                <input
                  id="color-master-picker"
                  className="form-control form-control-color"
                  type="color"
                  value={form.hexCode}
                  onChange={(event) => setForm((current) => ({ ...current, hexCode: event.target.value.toUpperCase() }))}
                  style={{ width: '100%', height: 44 }}
                  required
                />
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label" htmlFor="color-master-hex">Hex Code</label>
                <input
                  id="color-master-hex"
                  className="form-control"
                  value={form.hexCode}
                  onChange={(event) => setForm((current) => ({ ...current, hexCode: normalizeHexCode(event.target.value).toUpperCase() }))}
                  required
                />
              </div>
              <div className="col-12">
                <label className="form-label" htmlFor="color-master-remark">Remark</label>
                <textarea
                  id="color-master-remark"
                  className="form-control styled-textarea"
                  rows={3}
                  value={form.remark}
                  onChange={(event) => setForm((current) => ({ ...current, remark: event.target.value }))}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label" htmlFor="color-master-status">Status</label>
                <select
                  id="color-master-status"
                  className="form-select"
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as CustomerColorStatus }))}
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
    </div>
  );
}
