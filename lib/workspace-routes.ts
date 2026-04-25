import { getAllowedModules, getModuleById, type UserRole } from './platform-structure';

export const DEFAULT_WORKSPACE_MODULE_ID = 'dashboard';
export const LOGIN_ROUTE = '/login';
export type CustomerWorkspaceView = 'list' | 'payments' | 'outstanding';

const customerWorkspaceViewPathMap: Record<CustomerWorkspaceView, string> = {
  list: '/customers',
  payments: '/customers/payments',
  outstanding: '/customers/outstanding',
};

export const isWorkspaceModuleId = (moduleId: string) => Boolean(getModuleById(moduleId));

export const getWorkspaceModulePath = (moduleId: string) => `/${moduleId}`;

export const getDefaultWorkspacePath = (role?: UserRole) => {
  if (!role) {
    return getWorkspaceModulePath(DEFAULT_WORKSPACE_MODULE_ID);
  }

  const defaultModule = getAllowedModules(role).find((module) => module.id === DEFAULT_WORKSPACE_MODULE_ID)
    ?? getAllowedModules(role)[0];

  return getWorkspaceModulePath(defaultModule?.id ?? DEFAULT_WORKSPACE_MODULE_ID);
};

export const isCustomerWorkspaceView = (view: string): view is Exclude<CustomerWorkspaceView, 'list'> =>
  view === 'payments' || view === 'outstanding';

export const getCustomerWorkspacePath = (view: CustomerWorkspaceView = 'list') => customerWorkspaceViewPathMap[view];
