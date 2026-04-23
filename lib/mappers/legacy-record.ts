type UnknownRecord = Record<string, unknown>;

export type { UnknownRecord };

export const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const readUnknownValue = (source: UnknownRecord | null, keys: string[]) => {
  if (!source) {
    return null;
  }

  for (const key of keys) {
    if (key in source) {
      return source[key];
    }
  }

  return null;
};

export const readRecordValue = (source: UnknownRecord | null, keys: string[]) => {
  const value = readUnknownValue(source, keys);
  return isRecord(value) ? value : null;
};

export const readArrayValue = (source: UnknownRecord | null, keys: string[]) => {
  const value = readUnknownValue(source, keys);
  return Array.isArray(value) ? value : null;
};

export const readStringValue = (source: UnknownRecord | null, keys: string[]) => {
  const value = readUnknownValue(source, keys);

  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return null;
};

export const readNumberValue = (source: UnknownRecord | null, keys: string[]) => {
  const value = readUnknownValue(source, keys);

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsedValue = Number(value);
    if (Number.isFinite(parsedValue)) {
      return parsedValue;
    }
  }

  return null;
};

export const readBooleanLikeValue = (source: UnknownRecord | null, keys: string[]) => {
  const value = readUnknownValue(source, keys);

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (typeof value === 'string') {
    const normalizedValue = value.trim().toLowerCase();

    if (['1', 'true', 'yes', 'active', 'enabled'].includes(normalizedValue)) {
      return true;
    }

    if (['0', 'false', 'no', 'inactive', 'disabled', 'locked'].includes(normalizedValue)) {
      return false;
    }
  }

  return null;
};

export const normalizeEmailAddress = (value: string) => value.trim().toLowerCase();

export const normalizeActiveStatus = (value: string | null): 'Active' | 'Inactive' => {
  if (!value) {
    return 'Active';
  }

  return ['0', 'inactive', 'false', 'disabled', 'locked'].includes(value.trim().toLowerCase())
    ? 'Inactive'
    : 'Active';
};

export const extractCollectionItems = (
  payload: unknown,
  collectionKeys: string[] = ['data', 'items', 'rows', 'records', 'result'],
): unknown[] => {
  const queue: unknown[] = [payload];

  while (queue.length > 0) {
    const current = queue.shift();

    if (Array.isArray(current)) {
      return current;
    }

    if (!isRecord(current)) {
      continue;
    }

    const directArray = readArrayValue(current, collectionKeys);
    if (directArray) {
      return directArray;
    }

    Object.values(current).forEach((value) => {
      if (Array.isArray(value) || isRecord(value)) {
        queue.push(value);
      }
    });
  }

  return [];
};

export const extractFirstRecordWithKeys = (
  payload: unknown,
  requiredKeys: string[],
  nestedKeys: string[] = ['data', 'user', 'profile', 'account', 'details', 'employee', 'business', 'customer', 'workspace', 'summary'],
) => {
  const queue: unknown[] = [payload];

  while (queue.length > 0) {
    const current = queue.shift();

    if (Array.isArray(current)) {
      queue.push(...current);
      continue;
    }

    if (!isRecord(current)) {
      continue;
    }

    if (requiredKeys.some((key) => key in current)) {
      return current;
    }

    nestedKeys.forEach((key) => {
      if (key in current) {
        queue.push(current[key]);
      }
    });
  }

  return null;
};

export const parseJsonText = (rawBody: string) => {
  if (!rawBody.trim()) {
    return null;
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    return rawBody;
  }
};

export const readJoinedMessage = (value: unknown): string => {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => readJoinedMessage(entry))
      .filter(Boolean)
      .join(' ');
  }

  if (isRecord(value)) {
    return Object.values(value)
      .map((entry) => readJoinedMessage(entry))
      .filter(Boolean)
      .join(' ');
  }

  return '';
};

