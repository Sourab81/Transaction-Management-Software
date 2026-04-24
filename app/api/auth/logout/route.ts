import { cookies } from 'next/headers';
import { AUTH_TOKEN_COOKIE_NAME, getAuthTokenServerCookieOptions } from '../../../../lib/auth-cookie';
import {
  AUTH_SESSION_USER_COOKIE_NAME,
  getSessionUserServerCookieOptions,
} from '../../../../lib/session-user-cookie';
import {
  WORKSPACE_PREFETCH_COOKIE_NAME,
  getWorkspacePrefetchServerCookieOptions,
} from '../../../../lib/workspace-prefetch-cookie';

export const dynamic = 'force-dynamic';

// TODO(server-actions): keep this route for backward compatibility until the
// workspace shell moves logout to a dedicated Server Action.

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_TOKEN_COOKIE_NAME, '', {
    ...getAuthTokenServerCookieOptions(),
    maxAge: 0,
  });
  cookieStore.set(AUTH_SESSION_USER_COOKIE_NAME, '', {
    ...getSessionUserServerCookieOptions(),
    maxAge: 0,
  });
  cookieStore.set(WORKSPACE_PREFETCH_COOKIE_NAME, '', {
    ...getWorkspacePrefetchServerCookieOptions(),
    maxAge: 0,
  });

  return Response.json({ status: true });
}
