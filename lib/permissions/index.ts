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
} from './types';

export { roleLabels, getRoleLabel } from './roles';
export {
  adminDashboardModules,
  canAccessModule,
  getAllowedModules,
  getModuleById,
  getModuleDisplay,
  getModuleDisplayById,
  getSidebarModules,
  pageHeadings,
  userDashboardModules,
  workflowSteps,
} from './modules';
export {
  customerPermissionOptions,
  customerPermissionSections,
  customerPermissionToggleItems,
} from './catalog';
export {
  buildDefaultCustomerPermissions,
  createCustomerPermissions,
  intersectCustomerPermissions,
  normalizeCustomerPermissions,
} from './normalize';
export {
  hasAnyEnabledPermission,
  hasAnyPermission,
  hasEnabledPermissionPrefix,
  isPermissionEnabled,
} from './checks';
export {
  canViewModuleByPermissions,
  getCanonicalPermissionModuleId,
  getModulePermissionKeys,
  hasAnyModulePermission,
  modulePermissionMap,
  moduleRequiresPermissions,
  safeBaseModules,
} from './module-permissions';
export { canUseBusinessFeature } from './feature-access';
export {
  canAccessModuleForSession,
  getBusinessEnabledModules,
  getPermissionBasedSidebarModules,
  getSidebarModulesForSession,
} from './session-access';
export {
  canDeleteModuleForSession,
  canDeleteRecordsForRole,
  canManageModuleForSession,
  canPerformModuleActionForSession,
  canViewModuleRecordsForSession,
} from './module-actions';
