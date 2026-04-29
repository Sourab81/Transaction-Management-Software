'use client';

import React, { useState } from 'react';
import {
  buildDefaultCustomerPermissions,
  normalizeCustomerPermissions,
} from '../../../lib/platform-structure';
import type {
  RoleTemplate,
  RoleTemplateFormValues,
} from '../../../lib/types/role-template';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import PermissionEditor from '../../forms/PermissionEditor';

interface RoleTemplateFormProps {
  initialValues?: RoleTemplate;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (values: RoleTemplateFormValues) => void;
}

const RoleTemplateForm: React.FC<RoleTemplateFormProps> = ({
  initialValues,
  submitLabel,
  onCancel,
  onSubmit,
}) => {
  const [roleName, setRoleName] = useState(initialValues?.roleName || '');
  const [privileges, setPrivileges] = useState(
    normalizeCustomerPermissions(initialValues?.privileges ?? buildDefaultCustomerPermissions()),
  );

  const enabledPrivilegeCount = Object.values(privileges).filter((enabled) => enabled === 1).length;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    onSubmit({
      roleName: roleName.trim(),
      privileges,
    });
  };

  return (
    <form className="business-form" onSubmit={handleSubmit}>
      <div className="form-workflow-panel business-form__intro">
        <div>
          <p className="eyebrow mb-2">Role Template</p>
          <h3 className="h5 fw-semibold mb-1">{initialValues ? 'Update predefined role' : 'Create predefined role'}</h3>
          <p className="page-muted small mb-0">These privileges prefill permissions when Admin creates a new user.</p>
        </div>
        <span className="status-chip status-chip--info">{enabledPrivilegeCount} enabled</span>
      </div>

      <div className="form-section-card business-form__section">
        <div className="form-section-title mb-3">Role Details</div>
        <Input
          label="Role Name"
          placeholder="Example: Cashier"
          value={roleName}
          onChange={(event) => setRoleName(event.target.value)}
          required
        />
      </div>

      <div className="form-section-card business-form__section">
        <div className="business-form__section-header">
          <div>
            <div className="form-section-title mb-1">Privileges</div>
            <p className="page-muted small mb-0">Choose the permissions this role should apply by default.</p>
          </div>
        </div>
        <PermissionEditor permissions={privileges} onChange={setPrivileges} />
      </div>

      <div className="modal-actions">
        <button type="button" className="btn-app btn-app-secondary" onClick={onCancel}>Cancel</button>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
};

export default RoleTemplateForm;
