'use client';

import { useMemo, useState } from 'react';
import { FaEdit, FaPlusCircle, FaTrashAlt } from 'react-icons/fa';
import {
  createRoleTemplate,
  deleteRoleTemplate,
  updateRoleTemplate,
} from '../../../lib/actions/role-template-actions';
import type {
  RoleTemplate,
  RoleTemplateFormValues,
} from '../../../lib/types/role-template';
import ActionModal from '../../ui/ActionModal';
import ConfirmActionModal from '../../ui/state/ConfirmActionModal';
import ReusableListTable from '../../common/ReusableListTable';
import SectionHero from '../SectionHero';
import RoleTemplateForm from '../../admin/roles/RoleTemplateForm';
import type { DashboardTabContext } from './types';

interface RoleTabProps {
  ctx: DashboardTabContext;
}

type RoleModalMode = 'create' | 'edit' | 'delete' | null;

export default function RoleTab({ ctx }: RoleTabProps) {
  const {
    roleTemplates,
    isRoleTemplatesLoading,
    roleTemplatesError,
    reloadRoleTemplates,
    showNotification,
  } = ctx;
  const [modalMode, setModalMode] = useState<RoleModalMode>(null);
  const [selectedRole, setSelectedRole] = useState<RoleTemplate | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState('');

  const columns = useMemo(() => [
    {
      key: 'id',
      header: 'ID',
      render: (role: RoleTemplate) => role.id,
    },
    {
      key: 'roleName',
      header: 'Role Name',
      render: (role: RoleTemplate) => <span className="data-table__primary">{role.roleName}</span>,
    },
    {
      key: 'createdDate',
      header: 'Created Date',
      render: (role: RoleTemplate) => role.createdDate || 'Not added',
    },
    {
      key: 'updatedDate',
      header: 'Updated Date',
      render: (role: RoleTemplate) => role.updatedDate || 'Not added',
    },
    {
      key: 'status',
      header: 'Status',
      render: (role: RoleTemplate) => (
        <span className={`status-chip ${role.status === 'Inactive' || role.status === '0' ? 'status-chip--inactive' : 'status-chip--active'}`}>
          {role.status || 'Active'}
        </span>
      ),
    },
    {
      key: 'privileges',
      header: 'Privileges',
      render: (role: RoleTemplate) => `${Object.values(role.privileges).filter((enabled) => enabled === 1).length} enabled`,
    },
  ], []);

  const closeModal = () => {
    setModalMode(null);
    setSelectedRole(null);
    setActionError('');
    setIsSaving(false);
  };

  const openCreateModal = () => {
    setSelectedRole(null);
    setActionError('');
    setModalMode('create');
  };

  const openEditModal = (role: RoleTemplate) => {
    setSelectedRole(role);
    setActionError('');
    setModalMode('edit');
  };

  const openDeleteModal = (role: RoleTemplate) => {
    setSelectedRole(role);
    setActionError('');
    setModalMode('delete');
  };

  const handleSaveRole = async (values: RoleTemplateFormValues) => {
    if (!values.roleName) {
      setActionError('Role name is required.');
      return;
    }

    setIsSaving(true);
    setActionError('');

    const result = selectedRole
      ? await updateRoleTemplate({
          id: selectedRole.id,
          roleName: values.roleName,
          privileges: values.privileges,
          backendPrivileges: selectedRole.backendPrivileges,
        })
      : await createRoleTemplate({
          roleName: values.roleName,
          privileges: values.privileges,
        });

    setIsSaving(false);

    if (!result.ok) {
      setActionError(result.error || 'Unable to save role.');
      showNotification('error', result.error || 'Unable to save role.');
      return;
    }

    showNotification('success', selectedRole ? 'Role updated successfully.' : 'Role created successfully.');
    reloadRoleTemplates();
    closeModal();
  };

  const handleDeleteRole = async () => {
    if (!selectedRole) {
      return;
    }

    setIsSaving(true);
    setActionError('');

    const result = await deleteRoleTemplate(selectedRole.id);
    setIsSaving(false);

    if (!result.ok) {
      setActionError(result.error || 'Unable to delete role.');
      showNotification('error', result.error || 'Unable to delete role.');
      return;
    }

    showNotification('success', 'Role deleted successfully.');
    reloadRoleTemplates();
    closeModal();
  };

  return (
    <div className="row g-4">
      {modalMode === 'create' || modalMode === 'edit' ? (
        <ActionModal
          title={selectedRole ? 'Edit Role' : 'Create Role'}
          eyebrow="Role Template"
          description="Define reusable privileges Admin can apply while creating users."
          onClose={closeModal}
        >
          {actionError ? <div className="alert alert-danger mb-3">{actionError}</div> : null}
          <RoleTemplateForm
            initialValues={selectedRole || undefined}
            submitLabel={isSaving ? 'Saving...' : selectedRole ? 'Update Role' : 'Create Role'}
            onCancel={closeModal}
            onSubmit={handleSaveRole}
          />
        </ActionModal>
      ) : null}

      {modalMode === 'delete' && selectedRole ? (
        <ConfirmActionModal
          title="Delete Role"
          eyebrow="Role Template"
          description="This removes the predefined role template from the Admin role list."
          promptTitle={`Delete ${selectedRole.roleName}?`}
          promptDescription="Existing users keep their saved permissions. Only this reusable template is removed."
          confirmLabel={isSaving ? 'Deleting...' : 'Delete Role'}
          confirmVariant="danger"
          tone="danger"
          onConfirm={handleDeleteRole}
          onCancel={closeModal}
        >
          {actionError ? <div className="alert alert-danger mb-3">{actionError}</div> : null}
        </ConfirmActionModal>
      ) : null}

      <div className="col-12">
        <SectionHero
          eyebrow="Role Templates"
          title="Manage reusable roles"
          description="Create predefined privilege sets such as Business, Cashier, or Data Entry and apply them during user creation."
          action={{
            label: 'Create Role',
            icon: <FaPlusCircle />,
            onClick: openCreateModal,
          }}
        />
      </div>

      <div className="col-12">
        <ReusableListTable
          data={roleTemplates}
          columns={columns}
          rowKey={(role) => role.id}
          loading={isRoleTemplatesLoading}
          error={roleTemplatesError}
          emptyMessage="No role templates found."
          eyebrow="Roles"
          title="Predefined roles"
          copy="Reusable privilege templates for Admin user creation."
          actionsLabel="Actions"
          renderActions={(role) => (
            <div className="table-actions">
              <button type="button" className="btn-icon-sm btn-icon-sm--primary" onClick={() => openEditModal(role)}>
                <FaEdit size={12} />
                Edit
              </button>
              <button type="button" className="btn-icon-sm btn-icon-sm--danger" onClick={() => openDeleteModal(role)}>
                <FaTrashAlt size={12} />
                Delete
              </button>
            </div>
          )}
        />
      </div>
    </div>
  );
}
