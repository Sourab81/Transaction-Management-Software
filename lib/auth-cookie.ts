export const AUTH_TOKEN_COOKIE_NAME = 'enest-auth-token';
export const AUTH_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 12;

export const getAuthTokenServerCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: AUTH_TOKEN_MAX_AGE_SECONDS,
});
