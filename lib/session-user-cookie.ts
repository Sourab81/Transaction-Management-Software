import { mapPermissionValue } from './mappers/permission-mapper';
import type { SessionUser } from './auth-session';

export const AUTH_SESSION_USER_COOKIE_NAME = 'enest-session-user';
export const AUTH_SESSION_USER_MAX_AGE_SECONDS = 60 * 60 * 12;

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const isUserRole = (value: unknown): value is SessionUser['role'] =>
  value === 'Admin' || value === 'Employee' || value === 'Customer';

const buildCookieString = (value: string, maxAgeSeconds: number) => {
  const segments = [
    `${AUTH_SESSION_USER_COOKIE_NAME}=${value}`,
    'Path=/',
    `Max-Age=${maxAgeSeconds}`,
    'SameSite=Lax',
  ];

  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    segments.push('Secure');
  }

  return segments.join('; ');
};

export const getSessionUserServerCookieOptions = () => ({
  httpOnly: false,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: AUTH_SESSION_USER_MAX_AGE_SECONDS,
});

export const serializeSessionUserCookieValue = (sessionUser: SessionUser) =>
  encodeURIComponent(
    JSON.stringify({
      id: sessionUser.id,
      name: sessionUser.name,
      email: sessionUser.email,
      role: sessionUser.role,
      businessId: sessionUser.businessId,
      departmentId: sessionUser.departmentId,
      counterId: sessionUser.counterId,
      counterName: sessionUser.counterName,
      permissions: sessionUser.permissions,
    }),
  );

export const parseSessionUserCookieValue = (
  value: string | null | undefined,
): SessionUser | null => {
  if (!value?.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Partial<SessionUser>;

    if (!parsed.id || !parsed.name || !parsed.email || !isUserRole(parsed.role)) {
      return null;
    }

    return {
      id: String(parsed.id),
      name: String(parsed.name),
      email: normalizeEmail(String(parsed.email)),
      role: parsed.role,
      businessId:
        typeof parsed.businessId === 'string' && parsed.businessId.trim()
          ? parsed.businessId
          : undefined,
      departmentId:
        typeof parsed.departmentId === 'string' && parsed.departmentId.trim()
          ? parsed.departmentId
          : undefined,
      counterId:
        typeof parsed.counterId === 'string' && parsed.counterId.trim()
          ? parsed.counterId
          : undefined,
      counterName:
        typeof parsed.counterName === 'string' && parsed.counterName.trim()
          ? parsed.counterName
          : undefined,
      permissions: mapPermissionValue(parsed.permissions),
    };
  } catch {
    return null;
  }
};

export const getSessionUserClientCookie = (): SessionUser | null => {
  if (typeof document === 'undefined') {
    return null;
  }

  const cookiePrefix = `${AUTH_SESSION_USER_COOKIE_NAME}=`;
  const matchedCookie = document.cookie
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(cookiePrefix));

  if (!matchedCookie) {
    return null;
  }

  return parseSessionUserCookieValue(matchedCookie.slice(cookiePrefix.length));
};

export const setSessionUserClientCookie = (sessionUser: SessionUser | null) => {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = buildCookieString(
    sessionUser ? serializeSessionUserCookieValue(sessionUser) : '',
    sessionUser ? AUTH_SESSION_USER_MAX_AGE_SECONDS : 0,
  );
};
