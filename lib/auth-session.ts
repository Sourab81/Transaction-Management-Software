import type { UserRole } from './platform-structure';
import {
  APP_STATE_STORAGE_KEY,
  type AppState,
  type Business,
  type Employee,
} from './store';
import { getBusinessAccessState } from './subscription';

export type LoginRole = 'Admin' | 'Employee' | 'Customer';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  businessId?: string;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  businessId?: string;
}

const STATIC_AUTH_USERS: AuthUser[] = [
  {
    id: 'admin-1',
    name: 'Admin User',
    email: 'admin@enest.com',
    password: 'admin123',
    role: 'Admin',
  },
];

const SESSION_KEY = 'enest-auth-user';

const readAppState = (): AppState | null => {
  if (typeof window === 'undefined') return null;

  try {
    const rawState = localStorage.getItem(APP_STATE_STORAGE_KEY);
    if (!rawState) return null;

    return JSON.parse(rawState) as AppState;
  } catch {
    return null;
  }
};

const canBusinessOwnerSignIn = (business: Partial<Business> | undefined) =>
  getBusinessAccessState(business).allowBusinessOwnerLogin;

const canEmployeeSignIn = (business: Partial<Business> | undefined) =>
  getBusinessAccessState(business).allowEmployeeLogin;

const readBusinessUsers = (state: AppState): AuthUser[] =>
  state.businesses
    .filter((business) => Boolean(business.id && business.name && business.email && business.password))
    .filter((business) => canBusinessOwnerSignIn(business))
    .map((business) => ({
      id: business.id,
      name: business.name,
      email: business.email.trim().toLowerCase(),
      password: business.password,
      role: 'Customer' as const,
      businessId: business.id,
    }));

const readEmployeeUsers = (state: AppState): AuthUser[] => {
  const employeeUsers: AuthUser[] = [];
  const seenEmails = new Set<string>();

  state.businesses
    .filter((business) => canEmployeeSignIn(business))
    .forEach((business) => {
      const workspace = state.businessWorkspacesById[business.id];
      if (!workspace) return;

      workspace.employees
        .filter((employee): employee is Employee => Boolean(employee?.id && employee?.name && employee?.email))
        .forEach((employee) => {
          const normalizedEmail = employee.email.trim().toLowerCase();
          if (!normalizedEmail || seenEmails.has(normalizedEmail)) return;

          seenEmails.add(normalizedEmail);
          employeeUsers.push({
            id: employee.id,
            name: employee.name,
            email: normalizedEmail,
            password: employee.password || 'employee123',
            role: 'Employee',
            businessId: business.id,
          });
        });
    });

  return employeeUsers;
};

export const getAvailableUsersFromState = (state: AppState): AuthUser[] => {
  const authUsers = [...STATIC_AUTH_USERS];
  const businessUsers = readBusinessUsers(state);
  const employeeUsers = readEmployeeUsers(state);

  const seenKeys = new Set(authUsers.map((user) => `${user.role}:${user.email}`));

  businessUsers.forEach((user) => {
    const key = `${user.role}:${user.email}`;
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    authUsers.push(user);
  });

  employeeUsers.forEach((user) => {
    const key = `${user.role}:${user.email}`;
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    authUsers.push(user);
  });

  return authUsers;
};

export const getAvailableUsers = (): AuthUser[] => {
  const state = readAppState();
  if (!state) {
    return [...STATIC_AUTH_USERS];
  }

  return getAvailableUsersFromState(state);
};

export const loginWithDummyCredentials = (role: LoginRole, email: string, password: string): SessionUser | null => {
  const matchedUser = getAvailableUsers().find(
    (user) =>
      user.role === role &&
      user.email === email.trim().toLowerCase() &&
      user.password === password
  );

  if (!matchedUser) {
    return null;
  }

  const sessionUser: SessionUser = {
    id: matchedUser.id,
    name: matchedUser.name,
    email: matchedUser.email,
    role: matchedUser.role,
    businessId: matchedUser.businessId,
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
  }

  return sessionUser;
};

export const getStoredUser = (): SessionUser | null => {
  if (typeof window === 'undefined') return null;

  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<SessionUser>;

    const matchedUser = getAvailableUsers().find(
      (user) =>
        user.id === parsed.id &&
        user.email === parsed.email &&
        user.role === parsed.role &&
        user.businessId === parsed.businessId
    );

    if (!matchedUser) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }

    return {
      id: matchedUser.id,
      name: matchedUser.name,
      email: matchedUser.email,
      role: matchedUser.role,
      businessId: matchedUser.businessId,
    };
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
};

export const logoutUser = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_KEY);
  }
};
