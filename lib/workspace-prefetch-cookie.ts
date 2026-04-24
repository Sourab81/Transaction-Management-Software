import { mapCountersResponse } from './mappers/counter-mapper';
import { isRecord } from './mappers/legacy-record';
import type { Counter } from './store';

export const WORKSPACE_PREFETCH_COOKIE_NAME = 'enest-workspace-prefetch';
export const WORKSPACE_PREFETCH_MAX_AGE_SECONDS = 60;

export interface PrefetchedWorkspaceData {
  counters?: Counter[];
}

export const getWorkspacePrefetchServerCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: WORKSPACE_PREFETCH_MAX_AGE_SECONDS,
});

export const serializePrefetchedWorkspaceDataCookieValue = (
  value: PrefetchedWorkspaceData,
) =>
  encodeURIComponent(JSON.stringify({
    counters: value.counters ?? [],
  }));

export const parsePrefetchedWorkspaceDataCookieValue = (
  value: string | null | undefined,
): PrefetchedWorkspaceData | null => {
  if (!value?.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as unknown;

    if (!isRecord(parsed) || !Array.isArray(parsed.counters)) {
      return null;
    }

    return {
      counters: mapCountersResponse({ data: parsed.counters }),
    };
  } catch {
    return null;
  }
};
