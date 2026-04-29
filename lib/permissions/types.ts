import type { IconType } from 'react-icons';

export type UserRole = 'Admin' | 'Employee' | 'Customer';

export interface PlatformModule {
  id: string;
  label: string;
  sidebarLabel: string;
  heading: string;
  description: string;
  icon: IconType;
  allowedRoles: UserRole[];
  sidebarRoles?: UserRole[];
}

export interface CustomerPermissionItem {
  id: string;
  label: string;
  indent?: number;
  kind?: 'toggle' | 'label';
}

export interface CustomerPermissionSection {
  id: string;
  label: string;
  items: CustomerPermissionItem[];
}

export interface CustomerPermissionOption {
  id: string;
  label: string;
  sectionId: string;
  sectionLabel: string;
}

export type PermissionFlag = 0 | 1;
export type CustomerPermissions = Record<string, PermissionFlag>;
export type BusinessFeatureAction = 'view' | 'add' | 'edit' | 'delete';

export interface SessionAccessContext {
  role: UserRole;
  permissions?: CustomerPermissions | null;
  businessId?: string;
}
