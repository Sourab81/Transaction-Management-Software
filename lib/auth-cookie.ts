export const AUTH_TOKEN_COOKIE_NAME = 'enest-auth-token';
export const AUTH_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 12;

export const getAuthTokenServerCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: AUTH_TOKEN_MAX_AGE_SECONDS,
});

const buildCookieString = (value: string, maxAgeSeconds: number) => {
  const segments = [
    `${AUTH_TOKEN_COOKIE_NAME}=${encodeURIComponent(value)}`,
    'Path=/',
    `Max-Age=${maxAgeSeconds}`,
    'SameSite=Lax',
  ];

  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    segments.push('Secure');
  }

  return segments.join('; ');
};

export const setAuthTokenCookie = (token: string) => {
  if (typeof document === 'undefined') return;

  document.cookie = buildCookieString(token, AUTH_TOKEN_MAX_AGE_SECONDS);
};

export const clearAuthTokenCookie = () => {
  if (typeof document === 'undefined') return;

  document.cookie = buildCookieString('', 0);
};

export const readAuthTokenCookie = () => {
  if (typeof document === 'undefined') return null;

  const cookiePrefix = `${AUTH_TOKEN_COOKIE_NAME}=`;
  const matchedCookie = document.cookie
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(cookiePrefix));

  if (!matchedCookie) {
    return null;
  }

  const value = matchedCookie.slice(cookiePrefix.length);
  return value ? decodeURIComponent(value) : null;
};
