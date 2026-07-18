'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaSave, FaSpinner } from 'react-icons/fa';
import { getUsersDirectory, updateUserPermissions, type UserDirectoryEntry } from '../../../lib/api/permissions-management';
import { buildDefaultCustomerPermissions, normalizeCustomerPermissions } from '../../../lib/platform-structure';
import PermissionEditor from '../../forms/PermissionEditor';
import SectionHero from '../SectionHero';
import type { CustomerPermissions } from '../../../lib/platform-structure';
import type { DashboardTabContext } from './types';

interface PermissionsTabProps {
  ctx: DashboardTabContext;
}

interface UserOption {
  id: number;
  label: string;
  type: 'Business' | 'Employee';
  businessId?: number;
  permissions: Record<string, unknown>;
}

export default function PermissionsTab({ ctx }: PermissionsTabProps) {
  const isAdmin = ctx.currentRole === 'Admin';
  const { permissionsPreselectUserId, clearPermissionsPreselectUserId } = ctx;
  const [directory, setDirectory] = useState<UserDirectoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [permissions, setPermissions] = useState<CustomerPermissions>(buildDefaultCustomerPermissions());
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setIsLoading(true);
    getUsersDirectory()
      .then((res) => {
        if (res.status && res.data) {
          setDirectory(res.data);
        } else {
          setMessage({ type: 'error', text: res.message || 'Failed to load users.' });
        }
      })
      .catch(() => {
        setMessage({ type: 'error', text: 'Failed to load users.' });
      })
      .finally(() => setIsLoading(false));
  }, []);

  const userOptions = useMemo<UserOption[]>(() => {
    const options: UserOption[] = [];
    for (const business of directory) {
      if (isAdmin) {
        options.push({
          id: business.id,
          label: `${business.fullname} (Business)`,
          type: 'Business',
          permissions: business.permissions,
        });
      }
      for (const emp of business.employees ?? []) {
        options.push({
          id: emp.id,
          label: `${emp.fullname} (Employee)`,
          type: 'Employee',
          businessId: emp.business_id,
          permissions: emp.permissions,
        });
      }
    }
    return options;
  }, [directory, isAdmin]);

  const selectedUser = useMemo(
    () => userOptions.find((u) => u.id === selectedUserId) ?? null,
    [userOptions, selectedUserId],
  );

  const handleSelectUser = useCallback((userId: string) => {
    const id = Number(userId);
    setSelectedUserId(id);
    const user = userOptions.find((u) => u.id === id);
    if (user) {
      setPermissions(normalizeCustomerPermissions(user.permissions));
    } else {
      setPermissions(buildDefaultCustomerPermissions());
    }
    setMessage(null);
  }, [userOptions]);

  useEffect(() => {
    if (permissionsPreselectUserId != null && userOptions.length > 0) {
      const targetUser = userOptions.find((u) => u.id === permissionsPreselectUserId);
      if (targetUser) {
        handleSelectUser(String(permissionsPreselectUserId));
      }
      clearPermissionsPreselectUserId();
    }
  }, [permissionsPreselectUserId, userOptions, clearPermissionsPreselectUserId, handleSelectUser]);

  const handleSave = useCallback(async () => {
    if (!selectedUser) return;
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await updateUserPermissions(selectedUser.id, selectedUser.type, permissions);
      if (res.status) {
        setMessage({ type: 'success', text: 'Permissions updated successfully.' });
        // Update local directory state
        setDirectory((prev) =>
          prev.map((b) => {
            if (b.id === selectedUser.id && selectedUser.type === 'Business') {
              return { ...b, permissions };
            }
            return {
              ...b,
              employees: (b.employees ?? []).map((e) =>
                e.id === selectedUser.id ? { ...e, permissions } : e,
              ),
            };
          }),
        );
      } else {
        setMessage({ type: 'error', text: res.message || 'Failed to update permissions.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to update permissions.' });
    } finally {
      setIsSaving(false);
    }
  }, [selectedUser, permissions]);

  if (isLoading) {
    return (
      <div className="dashboard-page-stack">
        <SectionHero eyebrow="Tools" title="Permissions Management" description="Manage user and employee permissions." />
        <div className="d-flex justify-content-center py-5">
          <FaSpinner className="fa-spin fs-3 text-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page-stack">
      <SectionHero
        eyebrow="Tools"
        title="Permissions Management"
        description="Select a user and manage their permissions. Changes take effect immediately after saving."
      />

      <div className="form-section-card">
        <div className="row g-4">
          <div className="col-12 col-md-6 col-lg-4">
            <label className="form-label fw-semibold">Select User</label>
            <select
              className="form-select"
              value={selectedUserId ?? ''}
              onChange={(e) => handleSelectUser(e.target.value)}
            >
              <option value="" disabled>
                {userOptions.length === 0 ? 'No users found' : 'Choose a user...'}
              </option>
              {isAdmin ? (
                directory.map((business) => (
                  <option key={business.id} value={business.id}>
                    {business.fullname} (Business)
                  </option>
                ))
              ) : (
                <optgroup label="Employees">
                  {userOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        </div>
      </div>

      {message && (
        <div className={`alert alert-${message.type === 'success' ? 'success' : 'danger'} alert-dismissible fade show`} role="alert">
          {message.text}
          <button type="button" className="btn-close" onClick={() => setMessage(null)} />
        </div>
      )}

      {selectedUser && (
        <div className="form-section-card">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <div>
              <h5 className="mb-1">
                Editing: {selectedUser.label}
              </h5>
              <p className="text-muted mb-0 small">
                Toggle permissions on or off for this user.
              </p>
            </div>
            <button
              type="button"
              className="btn-app btn-app-primary"
              onClick={handleSave}
              disabled={isSaving}
              style={!ctx.canManageModule('permissions') ? { display: 'none' } : undefined}
            >
              {isSaving ? (
                <>
                  <FaSpinner className="fa-spin me-1" /> Saving...
                </>
              ) : (
                <>
                  <FaSave className="me-1" /> Save Permissions
                </>
              )}
            </button>
          </div>
          <PermissionEditor
            permissions={permissions}
            onChange={setPermissions}
          />
        </div>
      )}

      {!selectedUser && !isLoading && (
        <div className="form-section-card">
          <p className="text-muted mb-0">
            Select a user from the dropdown above to view and edit their permissions.
          </p>
        </div>
      )}
    </div>
  );
}
