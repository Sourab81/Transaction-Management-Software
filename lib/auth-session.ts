import type {
  CustomerPermissions,
  UserRole,
} from './platform-structure';
import {
  type LoginApiResponseBody,
  loginWithAppApi,
} from './api/auth';
import {
  APP_STATE_STORAGE_KEY,
  getInitialAppState,
  type AppState,
  type Business,
  type Employee,
} from './store';
import { getBusinessAccessState } from './subscription';
import {
  INVALID_USER_TYPE_LOGIN_MESSAGE,
  type LoginAccountType,
  mapLoginResponseToSessionUser,
} from './mappers/session-user-mapper';
import { mapPermissionValue } from './mappers/permission-mapper';
import {
  getSessionUserClientCookie,
  setSessionUserClientCookie,
} from './session-user-cookie';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  businessId?: string;
  permissions?: CustomerPermissions;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  userType?: LoginAccountType;
  roleTemplateId?: string;
  legacyRoleId?: string;
  businessId?: string;
  departmentId?: string;
  counterId?: string;
  counterName?: string;
  permissions?: CustomerPermissions;
}

const SESSION_KEY = 'enest-auth-user';

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const isUserRole = (value: unknown): value is UserRole =>
  value === 'Admin' || value === 'Employee' || value === 'Customer';

const createSessionUserFromAuthUser = (user: AuthUser): SessionUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  businessId: user.businessId,
  permissions: user.permissions,
});

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
    .filter((business) => Boolean(business.id && business.name && business.email))
    .filter((business) => canBusinessOwnerSignIn(business))
    .map((business) => ({
      id: business.id,
      name: business.name,
      email: normalizeEmail(business.email),
      role: 'Customer' as const,
      businessId: business.id,
      permissions: business.permissions,
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
          const normalizedEmail = normalizeEmail(employee.email);
          if (!normalizedEmail || seenEmails.has(normalizedEmail)) return;

          seenEmails.add(normalizedEmail);
          employeeUsers.push({
            id: employee.id,
            name: employee.name,
            email: normalizedEmail,
            role: 'Employee',
            businessId: business.id,
            permissions: employee.permissions,
          });
        });
    });

  return employeeUsers;
};

const resolveLocalUserBySessionFields = (
  email: string,
  role: UserRole | null,
  businessId?: string,
) => {
  const matches = getAvailableUsers().filter((user) => user.email === email);

  if (matches.length === 0) {
    return null;
  }

  if (role && businessId) {
    const exactMatch = matches.find((user) => user.role === role && user.businessId === businessId);
    if (exactMatch) {
      return exactMatch;
    }
  }

  if (role) {
    const roleMatches = matches.filter((user) => user.role === role);
    if (roleMatches.length === 1) {
      return roleMatches[0];
    }
  }

  if (businessId) {
    const businessMatches = matches.filter((user) => user.businessId === businessId);
    if (businessMatches.length === 1) {
      return businessMatches[0];
    }
  }

  return matches.length === 1 ? matches[0] : null;
};

const resolveStoredSessionUser = (sessionUser: SessionUser): SessionUser | null => {
  const matchedUser = getAvailableUsers().find(
    (user) =>
      user.role === sessionUser.role &&
      user.email === sessionUser.email &&
      user.businessId === sessionUser.businessId,
  );

  if (matchedUser) {
    return {
      ...createSessionUserFromAuthUser(matchedUser),
      userType: sessionUser.userType,
      roleTemplateId: sessionUser.roleTemplateId,
      legacyRoleId: sessionUser.legacyRoleId,
      departmentId: sessionUser.departmentId,
      counterId: sessionUser.counterId,
      counterName: sessionUser.counterName,
      permissions: sessionUser.permissions || matchedUser.permissions,
    };
  }

  if (sessionUser.role !== 'Admin' && !sessionUser.businessId) {
    return null;
  }

  return sessionUser;
};

const resolveSessionUserFromApiLogin = (
  normalizedEmail: string,
  body: LoginApiResponseBody | null,
): SessionUser => {
  const sessionUser = mapLoginResponseToSessionUser(
    normalizedEmail,
    body,
    (sessionEmail, role, businessId) => resolveLocalUserBySessionFields(sessionEmail, role, businessId),
  );

  if (!sessionUser) {
    throw new Error(INVALID_USER_TYPE_LOGIN_MESSAGE);
  }

  return sessionUser;
};

export const clearServerAuthSession = async () => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      cache: 'no-store',
      keepalive: true,
    });
  } catch {
    // Ignore logout transport failures during local session cleanup.
  }
};

export const getAvailableUsersFromState = (state: AppState): AuthUser[] => {
  const authUsers: AuthUser[] = [];
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
    return getAvailableUsersFromState(getInitialAppState());
  }

  return getAvailableUsersFromState(state);
};

export const updateStoredUser = (sessionUser: SessionUser | null) => {
  if (typeof window === 'undefined') return;

  setSessionUserClientCookie(sessionUser);

  if (!sessionUser) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }

  localStorage.removeItem(SESSION_KEY);
};

export const getStoredAccessToken = () => {
  return null;
};

export const loginWithApiCredentials = async (
  email: string,
  password: string,
): Promise<SessionUser> => {
  const normalizedEmail = normalizeEmail(email);
  const { body } = await loginWithAppApi(normalizedEmail, password);
  const sessionUser = resolveSessionUserFromApiLogin(normalizedEmail, body);

  updateStoredUser(sessionUser);
  return sessionUser;
};

export const completeApiLogin = (
  email: string,
  body: LoginApiResponseBody | null,
): SessionUser => {
  const normalizedEmail = normalizeEmail(email);
  const sessionUser = resolveSessionUserFromApiLogin(normalizedEmail, body);

  updateStoredUser(sessionUser);

  return sessionUser;
};

export const getStoredUser = (): SessionUser | null => {
  if (typeof window === 'undefined') return null;

  const cookieUser = getSessionUserClientCookie();
  if (cookieUser) {
    const resolvedCookieUser = resolveStoredSessionUser(cookieUser);

    if (!resolvedCookieUser) {
      updateStoredUser(null);
      return null;
    }

    return resolvedCookieUser;
  }

  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<SessionUser>;

    if (!parsed.id || !parsed.name || !parsed.email || !isUserRole(parsed.role)) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }

    const resolvedUser = resolveStoredSessionUser({
      id: String(parsed.id),
      name: String(parsed.name),
      email: normalizeEmail(String(parsed.email)),
      role: parsed.role,
      userType:
        parsed.userType === 'Admin' || parsed.userType === 'Business' || parsed.userType === 'Employee'
          ? parsed.userType
          : undefined,
      roleTemplateId: typeof parsed.roleTemplateId === 'string' && parsed.roleTemplateId.trim()
        ? parsed.roleTemplateId
        : undefined,
      legacyRoleId: typeof parsed.legacyRoleId === 'string' && parsed.legacyRoleId.trim()
        ? parsed.legacyRoleId
        : undefined,
      businessId: typeof parsed.businessId === 'string' && parsed.businessId.trim()
        ? parsed.businessId
        : undefined,
      departmentId: typeof parsed.departmentId === 'string' && parsed.departmentId.trim()
        ? parsed.departmentId
        : undefined,
      counterId: typeof parsed.counterId === 'string' && parsed.counterId.trim()
        ? parsed.counterId
        : undefined,
      counterName: typeof parsed.counterName === 'string' && parsed.counterName.trim()
        ? parsed.counterName
        : undefined,
      permissions: mapPermissionValue(parsed.permissions),
    });

    if (!resolvedUser) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }

    updateStoredUser(resolvedUser);
    return resolvedUser;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
};

export const logoutUser = () => {
  updateStoredUser(null);
  void clearServerAuthSession();
};
