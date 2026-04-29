import type { CustomerPermissions } from '../permissions';

export interface RoleTemplate {
  id: string;
  roleName: string;
  privileges: CustomerPermissions;
  backendPrivileges: Record<string, unknown>;
  createdDate?: string;
  updatedDate?: string;
  status?: string;
  raw: Record<string, unknown>;
}

export interface RoleTemplateFormValues {
  roleName: string;
  privileges: CustomerPermissions;
}
