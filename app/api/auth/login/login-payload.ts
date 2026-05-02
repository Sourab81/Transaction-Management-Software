const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readTrimmedStringValue = (source: Record<string, unknown> | null, keys: string[]) => {
  if (!source) {
    return null;
  }

  for (const key of keys) {
    const value = source[key];

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
};

const readRawStringValue = (source: Record<string, unknown> | null, keys: string[]) => {
  if (!source) {
    return null;
  }

  for (const key of keys) {
    const value = source[key];

    if (typeof value === 'string') {
      return value;
    }
  }

  return null;
};

export const readLoginPayload = async (request: Request) => {
  const contentType = request.headers.get('content-type')?.toLowerCase() || '';

  if (contentType.includes('application/json')) {
    const payload = await request.json().catch(() => null);
    const record = isRecord(payload) ? payload : null;

    return {
      username: readTrimmedStringValue(record, ['username', 'email']),
      password: readRawStringValue(record, ['password']),
    };
  }

  const formData = await request.formData().catch(() => null);
  const username = formData?.get('username') || formData?.get('email');
  const password = formData?.get('password');

  return {
    username: typeof username === 'string' && username.trim() ? username.trim() : null,
    password: typeof password === 'string' ? password : null,
  };
};
