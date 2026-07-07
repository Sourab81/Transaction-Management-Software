# httpOnly Cookie Migration Plan

## Goal
Replace localStorage token storage with httpOnly cookie + in-memory JS variable. All API calls continue using `directBackendFetch` (client-side `Authorization` header).

## Architecture

```
Login Screen
  → fetch POST /enest_api/api/login
  → response body contains JWT token
  → storeAuthToken(token) → in-memory JS variable
  → fetch POST /api/auth/set-cookie { token } → server sets httpOnly cookie
  → redirect to workspace

API Calls (directBackendFetch)
  → getStoredAuthToken() → returns in-memory variable value
  → Authorization: Bearer <token>
  → Backend validates via $this->authorization_token->validateToken()

Page Refresh
  → AuthProvider mounts → calls restoreAuthToken()
  → fetch GET /api/auth/restore-token
  → cookie auto-sends → server reads cookie → returns { token }
  → in-memory variable filled → API calls work

Logout
  → clearAuthToken() → clears in-memory variable
  → fetch POST /api/auth/clear-cookie → server clears httpOnly cookie
```

## Files to Create

### 1. `app/api/auth/set-cookie/route.ts`
```ts
import { NextResponse, type NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  let body: { token?: string };
  try {
    body = await request.json() as { token?: string };
  } catch {
    return NextResponse.json({ status: false, message: 'Invalid request body.' }, { status: 400 });
  }

  const token = body?.token?.trim();
  if (!token) {
    return NextResponse.json({ status: false, message: 'Token is required.' }, { status: 400 });
  }

  const response = NextResponse.json({ status: true, message: 'Cookie set.' });
  response.cookies.set('enest-auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 86400,
  });

  return response;
}
```

### 2. `app/api/auth/restore-token/route.ts`
```ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('enest-auth-token')?.value?.trim();

  if (!token) {
    return NextResponse.json({ token: null }, { status: 401 });
  }

  return NextResponse.json({ token });
}
```

### 3. `app/api/auth/clear-cookie/route.ts`
```ts
import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ status: true, message: 'Cookie cleared.' });
  response.cookies.set('enest-auth-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
```

### 4. `components/auth/AuthProvider.tsx`
```tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { restoreAuthToken, getStoredAuthToken } from '../../lib/api/direct-backend';
import { getStoredUser } from '../../lib/auth-session';

interface AuthContextValue {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: ReturnType<typeof getStoredUser>;
}

const AuthContext = createContext<AuthContextValue>({
  isLoading: true,
  isAuthenticated: false,
  user: null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const user = getStoredUser();

  useEffect(() => {
    restoreAuthToken().finally(() => setIsLoading(false));
  }, []);

  return (
    <AuthContext.Provider value={{ isLoading, isAuthenticated: !!getStoredAuthToken(), user }}>
      {children}
    </AuthContext.Provider>
  );
};
```

## Files to Modify

### 5. `lib/api/direct-backend.ts`
Replace `localStorage` with an in-memory module variable:
```ts
let storedToken: string | null = null;

export const storeAuthToken = (token: string): void => {
  storedToken = token;
};

export const getStoredAuthToken = (): string | null => {
  return storedToken;
};

export const clearAuthToken = (): void => {
  storedToken = null;
};

export const restoreAuthToken = async (): Promise<string | null> => {
  try {
    const res = await fetch('/api/auth/restore-token', { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.token && typeof data.token === 'string') {
      storedToken = data.token;
      return data.token;
    }
  } catch {
    // Restore failed — user not logged in
  }
  return null;
};
```
- Remove `AUTH_TOKEN_STORAGE_KEY = 'enest-auth-token'`
- Remove `'use client'` directive at line 1 (no longer uses `window`)
  - Actually keep `'use client'` — it's still used by the caller components
- Remove `typeof window === 'undefined'` guards from all three functions

### 6. `app/layout.tsx`
Add `AuthProvider` wrapping `AppProvider`:
```tsx
import { AuthProvider } from '../components/auth/AuthProvider';

// Inside body:
<AuthProvider>
  <AppProvider>
    {children}
  </AppProvider>
</AuthProvider>
```

### 7. `lib/auth-session.ts`
Make `completeApiLogin` async and add cookie-setting call:
```ts
export const completeApiLogin = async (
  email: string,
  body: LoginApiResponseBody | null,
): Promise<SessionUser> => {
  const normalizedEmail = normalizeEmail(email);
  const sessionUser = resolveSessionUserFromApiLogin(normalizedEmail, body);

  const accessToken = extractAccessToken(body);
  if (accessToken) {
    storeAuthToken(accessToken);
    try {
      await fetch('/api/auth/set-cookie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: accessToken }),
        cache: 'no-store',
      });
    } catch {
      // Non-critical — in-memory token still works for this session
    }
  }

  updateStoredUser(sessionUser);
  return sessionUser;
};
```

### 8. `components/auth/LoginScreen.tsx`
Change `completeApiLogin` call to `await`:
```ts
// Line 89 — change:
// const user = completeApiLogin(normalizedEmail, body);
const user = await completeApiLogin(normalizedEmail, body);
```

### 9. `lib/auth-session.ts` — `logoutUser`
Add server-side cookie clear:
```ts
export const logoutUser = () => {
  // ... existing cleanup ...
  clearAuthToken();
  updateStoredUser(null);
  void clearServerAuthSession();
  // Clear httpOnly cookie on server
  try {
    fetch('/api/auth/clear-cookie', { method: 'POST', cache: 'no-store', keepalive: true });
  } catch {
    // Ignore
  }
};
```

### 10. `lib/api/balanceTransfers.ts`
Replace `requestAppApi`/`requestAppApiMutation` with `directBackendGet`/`directBackendPost`:
- Change import: `import { DirectBackendError, directBackendGet, directBackendPost } from './direct-backend'`
- `getBalanceTransfers` → `directBackendGet('balanceTransfers?' + query)`
- `createBalanceTransfer` → `directBackendPost('balanceTransfer', { ... })`
- Handle `DirectBackendError` instead of `AppApiError`
- Remove `import { requestAppApi, requestAppApiMutation, AppApiError } from './client'`

## Files to Delete

### 11. Delete obsolete files
| File | Reason |
|---|---|
| `app/login/actions.ts` | Dead server action — zero imports |
| `app/login/login-form-values.ts` | Only used by dead action |
| `components/auth/LoginRoutePage.tsx` | Dead wrapper — zero imports |
| `app/api/balance-transfers/route.ts` | Proxy no longer needed |
| `app/api/balance-transfers/[id]/route.ts` | Proxy no longer needed |
| `lib/api/backendFetch.ts` | No longer used |
| `lib/api/client.ts` | No longer used |

## Execution Order (sequential, each step depends on previous)

1. Create `app/api/auth/set-cookie/route.ts`
2. Create `app/api/auth/restore-token/route.ts`
3. Create `app/api/auth/clear-cookie/route.ts`
4. Modify `lib/api/direct-backend.ts` — in-memory storage + `restoreAuthToken`
5. Create `components/auth/AuthProvider.tsx`
6. Modify `app/layout.tsx` — wrap with AuthProvider
7. Modify `lib/auth-session.ts` — async completeApiLogin + cookie set
8. Modify `components/auth/LoginScreen.tsx` — await completeApiLogin
9. Modify `lib/auth-session.ts` — logoutUser clears server cookie
10. Migrate `lib/api/balanceTransfers.ts` to directBackendFetch
11. Delete obsolete files

## Testing
- Login → verify token is stored in httpOnly cookie (browser dev tools → Application → Cookies)
- Navigate to a page → verify API calls succeed with `Authorization` header
- Refresh page → verify token is restored from cookie (network tab: `/api/auth/restore-token` called)
- Logout → verify cookie is cleared
- Open incognito → verify redirect to login (no cookie)
