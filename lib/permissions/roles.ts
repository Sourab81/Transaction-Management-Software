import type { UserRole } from './types';

export const roleLabels: Record<UserRole, string> = {
  Admin: 'Admin',
  Employee: 'Employee',
  Customer: 'Business',
};

export const getRoleLabel = (role: UserRole) => roleLabels[role];
