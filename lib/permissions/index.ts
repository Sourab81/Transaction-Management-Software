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
  hasEnabledPermissionPrefix,
  isPermissionEnabled,
} from './checks';
export { canUseBusinessFeature } from './feature-access';
export {
  canAccessModuleForSession,
  getBusinessEnabledModules,
  getSidebarModulesForSession,
} from './session-access';
export {
  canDeleteModuleForSession,
  canDeleteRecordsForRole,
  canManageModuleForSession,
  canPerformModuleActionForSession,
  canViewModuleRecordsForSession,
} from './module-actions';
