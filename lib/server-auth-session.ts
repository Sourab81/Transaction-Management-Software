import 'server-only';

import { cookies } from 'next/headers';
import {
  AUTH_SESSION_USER_COOKIE_NAME,
  parseSessionUserCookieValue,
} from './session-user-cookie';

export const getServerSessionUser = async () => {
  const cookieStore = await cookies();
  return parseSessionUserCookieValue(
    cookieStore.get(AUTH_SESSION_USER_COOKIE_NAME)?.value,
  );
};
