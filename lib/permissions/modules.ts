import {
  FaBell,
  FaBuilding,
  FaChartBar,
  FaCog,
  FaDollarSign,
  FaExchangeAlt,
  FaHistory,
  FaPlusSquare,
  FaTachometerAlt,
  FaUniversity,
  FaUserCircle,
  FaUserShield,
  FaUserTie,
  FaUsers,
} from 'react-icons/fa';
import type { PlatformModule, UserRole } from './types';

export const getModuleDisplay = (platformModule: PlatformModule, role: UserRole) => {
  if (role === 'Admin' && platformModule.id === 'customers') {
    return {
      ...platformModule,
      label: 'Users',
      sidebarLabel: 'Users',
      heading: 'Users',
    };
  }

  return platformModule;
};

export const userDashboardModules: PlatformModule[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    sidebarLabel: 'Dashboard',
    heading: 'Dashboard',
    description: ' ',
    icon: FaTachometerAlt,
    allowedRoles: ['Admin', 'Employee', 'Customer'],
    sidebarRoles: ['Admin', 'Employee', 'Customer'],
  },
  {
    id: 'transactions',
    label: 'Transactions',
    sidebarLabel: 'Transactions',
    heading: 'Transactions',
    description: ' ',
    icon: FaExchangeAlt,
    allowedRoles: ['Admin', 'Employee', 'Customer'],
    sidebarRoles: ['Employee', 'Customer'],
  },
  {
    id: 'customers',
    label: 'Customer',
    sidebarLabel: 'Customers',

    heading: 'Customer',
    description: ' ',
    icon: FaUsers,
    allowedRoles: ['Admin', 'Employee', 'Customer'],
    sidebarRoles: ['Admin', 'Employee', 'Customer'],
  },
  {
    id: 'reminder',
    label: 'Reminder',
    sidebarLabel: 'Reminder',
    heading: 'Reminder',
    description: ' ',
    icon: FaBell,
    allowedRoles: ['Admin', 'Employee'],
    sidebarRoles: ['Admin', 'Employee'],
  },
  {
    id: 'employee',
    label: 'Employee',
    sidebarLabel: 'Employee',
    heading: 'Employee',
    description: ' ',
    icon: FaUserTie,
    allowedRoles: ['Customer'],
    sidebarRoles: ['Customer'],
  },
  {
    id: 'departments',
    label: 'Department',
    sidebarLabel: 'Department',
    heading: 'Department',
    description: ' ',
    icon: FaBuilding,
    allowedRoles: ['Customer'],
    sidebarRoles: ['Customer'],
  },
  {
    id: 'services',
    label: 'Service',
    sidebarLabel: 'Services',
    heading: 'Service',
    description: ' ',
    icon: FaCog,
    allowedRoles: ['Admin', 'Employee', 'Customer'],
    sidebarRoles: ['Employee', 'Customer'],
  },
  {
    id: 'accounts',
    label: 'Account',
    sidebarLabel: 'Account',
    heading: 'Account',
    description: ' ',
    icon: FaUniversity,
    allowedRoles: ['Admin', 'Employee', 'Customer'],
    sidebarRoles: ['Employee', 'Customer'],
  },
  {
    id: 'reports',
    label: 'Reports',
    sidebarLabel: 'Reports',
    heading: 'Reports',
    description: ' ',
    icon: FaChartBar,
    allowedRoles: ['Admin', 'Employee', 'Customer'],
    sidebarRoles: ['Admin', 'Employee', 'Customer'],
  },
  {
    id: 'role',
    label: 'Role',
    sidebarLabel: 'Role',
    heading: 'Role',
    description: ' ',
    icon: FaUserShield,
    allowedRoles: ['Admin'],
    sidebarRoles: ['Admin'],
  },
  {
    id: 'profile',
    label: 'Profile',
    sidebarLabel: 'Profile',
    heading: 'Profile',
    description: ' ',
    icon: FaUserCircle,
    allowedRoles: ['Admin', 'Employee', 'Customer'],
    sidebarRoles: ['Admin', 'Employee', 'Customer'],
  },
  {
    id: 'expense',
    label: 'Expense',
    sidebarLabel: 'Expense',
    heading: 'Expense',
    description: ' ',
    icon: FaDollarSign,
    allowedRoles: ['Customer'],
    sidebarRoles: ['Customer'],
  },
  {
    id: 'history',
    label: 'Activity Timeline',
    sidebarLabel: 'History',
    heading: 'Activity Timeline',
    description: ' ',
    icon: FaHistory,
    allowedRoles: ['Admin', 'Employee'],
    sidebarRoles: [],
  },
  {
    id: 'additions',
    label: 'System Settings',
    sidebarLabel: 'Settings',
    heading: 'System Settings',
    description: ' ',
    icon: FaPlusSquare,
    allowedRoles: ['Admin'],
    sidebarRoles: [],
  },
];

export const adminDashboardModules = [
  'Dashboard',
  'Customers',
  'Reminder',
  'Reports',
];

export const workflowSteps = [
  'Login',
  'Service Selection',
  'Customer Entry Or Autofill',
  'Transaction Processing',
  'Save Record',
  'Report Generation',
];

export const pageHeadings = userDashboardModules.reduce<Record<string, string>>((headings, module) => {
  headings[module.id] = module.heading;
  return headings;
}, {});

export const getSidebarModules = (role: UserRole) => {
  return userDashboardModules.filter((module) => (module.sidebarRoles ?? module.allowedRoles).includes(role));
};

export const getAllowedModules = (role: UserRole) => {
  return userDashboardModules.filter((module) => module.allowedRoles.includes(role));
};

export const getModuleById = (moduleId: string) => {
  return userDashboardModules.find((platformModule) => platformModule.id === moduleId);
};

export const getModuleDisplayById = (moduleId: string, role: UserRole) => {
  const platformModule = getModuleById(moduleId);
  return platformModule ? getModuleDisplay(platformModule, role) : undefined;
};

export const canAccessModule = (role: UserRole, moduleId: string) => {
  const platformModule = getModuleById(moduleId);
  return Boolean(platformModule?.allowedRoles.includes(role));
};
