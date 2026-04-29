import {
  canAccessModule as canAccessModuleCore,
  canAccessModuleForSession as canAccessModuleForSessionCore,
  canUseBusinessFeature as canUseBusinessFeatureCore,
  getAllowedModules as getAllowedModulesCore,
  getBusinessEnabledModules as getBusinessEnabledModulesCore,
  getModuleById as getModuleByIdCore,
  getModuleDisplay as getModuleDisplayCore,
  getModuleDisplayById as getModuleDisplayByIdCore,
  getRoleLabel as getRoleLabelCore,
  getSidebarModules as getSidebarModulesCore,
  getSidebarModulesForSession as getSidebarModulesForSessionCore,
  hasAnyEnabledPermission as hasAnyEnabledPermissionCore,
  hasEnabledPermissionPrefix as hasEnabledPermissionPrefixCore,
  isPermissionEnabled as isPermissionEnabledCore,
  normalizeCustomerPermissions as normalizeCustomerPermissionsCore,
  createCustomerPermissions as createCustomerPermissionsCore,
  intersectCustomerPermissions as intersectCustomerPermissionsCore,
  buildDefaultCustomerPermissions as buildDefaultCustomerPermissionsCore,
} from './permissions';
import type {
  BusinessFeatureAction,
  CustomerPermissions,
  PlatformModule,
  SessionAccessContext,
  UserRole,
} from './permissions';

export type {
  BusinessFeatureAction,
  CustomerPermissionItem,
  CustomerPermissionOption,
  CustomerPermissions,
  CustomerPermissionSection,
  PermissionFlag,
  PlatformModule,
  SessionAccessContext,
  UserRole,
} from './permissions';

export {
  adminDashboardModules,
  customerPermissionOptions,
  customerPermissionSections,
  customerPermissionToggleItems,
  pageHeadings,
  roleLabels,
  userDashboardModules,
  workflowSteps,
} from './permissions';

export const getRoleLabel = (role: UserRole) => getRoleLabelCore(role);

export const getModuleDisplay = (platformModule: PlatformModule, role: UserRole) =>
  getModuleDisplayCore(platformModule, role);

export const buildDefaultCustomerPermissions = () => buildDefaultCustomerPermissionsCore();

export const normalizeCustomerPermissions = (permissions?: Record<string, unknown> | null) =>
  normalizeCustomerPermissionsCore(permissions);

export const createCustomerPermissions = (enabledPermissionIds: string[] = []) =>
  createCustomerPermissionsCore(enabledPermissionIds);

export const intersectCustomerPermissions = (
  basePermissions: CustomerPermissions | null | undefined,
  scopedPermissions: CustomerPermissions | null | undefined,
) => intersectCustomerPermissionsCore(basePermissions, scopedPermissions);

export const isPermissionEnabled = (
  permissions: CustomerPermissions | null | undefined,
  permissionId: string,
) => isPermissionEnabledCore(permissions, permissionId);

export const hasAnyEnabledPermission = (
  permissions: CustomerPermissions | null | undefined,
  permissionIds: string[],
) => hasAnyEnabledPermissionCore(permissions, permissionIds);

export const hasEnabledPermissionPrefix = (
  permissions: CustomerPermissions | null | undefined,
  prefix: string,
) => hasEnabledPermissionPrefixCore(permissions, prefix);

export const canUseBusinessFeature = (
  permissions: CustomerPermissions | null | undefined,
  moduleId: string,
  action: BusinessFeatureAction,
) => canUseBusinessFeatureCore(permissions, moduleId, action);

export const getSidebarModules = (role: UserRole) => getSidebarModulesCore(role);

export const getAllowedModules = (role: UserRole) => getAllowedModulesCore(role);

export const getModuleById = (moduleId: string) => getModuleByIdCore(moduleId);

export const getModuleDisplayById = (moduleId: string, role: UserRole) =>
  getModuleDisplayByIdCore(moduleId, role);

export const canAccessModule = (role: UserRole, moduleId: string) =>
  canAccessModuleCore(role, moduleId);

export const getBusinessEnabledModules = (permissions: CustomerPermissions | null | undefined) =>
  getBusinessEnabledModulesCore(permissions);

export const canAccessModuleForSession = (context: SessionAccessContext, moduleId: string) =>
  canAccessModuleForSessionCore(context, moduleId);

export const getSidebarModulesForSession = (context: SessionAccessContext) =>
  getSidebarModulesForSessionCore(context);
