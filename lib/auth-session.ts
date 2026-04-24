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
  ensureRequiredAppStateAccounts,
  getInitialAppState,
  type AppState,
  type Business,
  type Employee,
} from './store';
import { getBusinessAccessState } from './subscription';
import {
  mapLoginResponseToSessionUser,
} from './mappers/session-user-mapper';
import { mapPermissionValue } from './mappers/permission-mapper';
import {
  getSessionUserClientCookie,
  setSessionUserClientCookie,
} from './session-user-cookie';

export type LoginRole = 'Admin' | 'Employee' | 'Customer';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  businessId?: string;
  permissions?: CustomerPermissions;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  businessId?: string;
  departmentId?: string;
  counterId?: string;
  counterName?: string;
  permissions?: CustomerPermissions;
}

interface StoredAdminProfile {
  id: string;
  name: string;
  email: string;
  password: string;
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
const ADMIN_PROFILE_STORAGE_KEY = 'enest-admin-profile';
const TEMPORARY_LOGIN_ROLE_OVERRIDES: Record<string, UserRole> = {
  // TODO: Remove this frontend-only override after the backend returns role/business info for this login.
  'sagar@gmail.com': 'Customer',
};

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

const readStoredAdminProfile = (): StoredAdminProfile | null => {
  if (typeof window === 'undefined') return null;

  try {
    const rawProfile = localStorage.getItem(ADMIN_PROFILE_STORAGE_KEY);
    if (!rawProfile) return null;

    const parsedProfile = JSON.parse(rawProfile) as Partial<StoredAdminProfile>;
    if (!parsedProfile.id || !parsedProfile.name || !parsedProfile.email || !parsedProfile.password) {
      localStorage.removeItem(ADMIN_PROFILE_STORAGE_KEY);
      return null;
    }

    return {
      id: parsedProfile.id,
      name: parsedProfile.name,
      email: normalizeEmail(parsedProfile.email),
      password: parsedProfile.password,
    };
  } catch {
    localStorage.removeItem(ADMIN_PROFILE_STORAGE_KEY);
    return null;
  }
};

const getStaticAuthUsers = (): AuthUser[] => {
  const storedAdminProfile = readStoredAdminProfile();

  return STATIC_AUTH_USERS.map((user) => {
    if (!storedAdminProfile || user.role !== 'Admin' || user.id !== storedAdminProfile.id) {
      return user;
    }

    return {
      ...user,
      name: storedAdminProfile.name,
      email: storedAdminProfile.email,
      password: storedAdminProfile.password,
    };
  });
};

const getLocalAdminUsers = (): AuthUser[] => {
  const adminUsers = [...getStaticAuthUsers(), ...STATIC_AUTH_USERS].filter(
    (user) => user.role === 'Admin',
  );
  const seenCredentials = new Set<string>();

  return adminUsers.filter((user) => {
    const credentialKey = `${normalizeEmail(user.email)}:${user.password}`;

    if (seenCredentials.has(credentialKey)) {
      return false;
    }

    seenCredentials.add(credentialKey);
    return true;
  });
};

const readAppState = (): AppState | null => {
  if (typeof window === 'undefined') return null;

  try {
    const rawState = localStorage.getItem(APP_STATE_STORAGE_KEY);
    if (!rawState) return null;

    return ensureRequiredAppStateAccounts(JSON.parse(rawState) as AppState);
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
      email: normalizeEmail(business.email),
      password: business.password,
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
            password: employee.password || 'employee123',
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

const resolveTemporaryLoginOverrideUser = (email: string): AuthUser | null => {
  const forcedRole = TEMPORARY_LOGIN_ROLE_OVERRIDES[email];
  if (!forcedRole) {
    return null;
  }

  const matchingUsers = getAvailableUsers().filter((user) => user.email === email);
  if (matchingUsers.length === 0) {
    return null;
  }

  return matchingUsers.find((user) => user.role === forcedRole) || null;
};

const resolveSessionUserFromApiLogin = (
  normalizedEmail: string,
  body: LoginApiResponseBody | null,
): SessionUser => {
  const mappedSessionUser = mapLoginResponseToSessionUser(
    normalizedEmail,
    body,
    (sessionEmail, role, businessId) => resolveLocalUserBySessionFields(sessionEmail, role, businessId),
  );
  const temporaryOverrideUser = resolveTemporaryLoginOverrideUser(normalizedEmail);
  const sessionUser = temporaryOverrideUser
    ? {
        ...createSessionUserFromAuthUser(temporaryOverrideUser),
        departmentId: mappedSessionUser?.departmentId,
        counterId: mappedSessionUser?.counterId,
        counterName: mappedSessionUser?.counterName,
        permissions: mappedSessionUser?.permissions || temporaryOverrideUser.permissions,
      }
    : mappedSessionUser;

  if (!sessionUser) {
    throw new Error(
      'Login succeeded, but the backend response did not identify whether this account should open admin, business, or employee access.',
    );
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
  const authUsers = getStaticAuthUsers();
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
    return getAvailableUsersFromState(ensureRequiredAppStateAccounts(getInitialAppState()));
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

export const updateAdminCredentials = (updates: Partial<Pick<AuthUser, 'name' | 'email' | 'password'>>) => {
  if (typeof window === 'undefined') return;

  const currentAdminUser = getStaticAuthUsers().find((user) => user.role === 'Admin');
  if (!currentAdminUser) return;

  const nextProfile: StoredAdminProfile = {
    id: currentAdminUser.id,
    name: updates.name?.trim() || currentAdminUser.name,
    email: updates.email ? normalizeEmail(updates.email) : currentAdminUser.email,
    password: updates.password || currentAdminUser.password,
  };

  localStorage.setItem(ADMIN_PROFILE_STORAGE_KEY, JSON.stringify(nextProfile));
};

export const loginWithDummyCredentials = (role: LoginRole, email: string, password: string): SessionUser | null => {
  const normalizedEmail = normalizeEmail(email);
  const matchedUser = role === 'Admin'
    ? getLocalAdminUsers().find(
        (user) =>
          user.email === normalizedEmail &&
          user.password === password,
      )
    : getAvailableUsers().find(
        (user) =>
          user.role === role &&
          user.email === normalizedEmail &&
          user.password === password,
      );

  if (!matchedUser) {
    return null;
  }

  const sessionUser = createSessionUserFromAuthUser(matchedUser);
  updateStoredUser(sessionUser);

  return sessionUser;
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
