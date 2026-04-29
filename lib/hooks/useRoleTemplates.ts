'use client';

import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { fetchRoleTemplates } from '../actions/role-template-actions';
import {
  isEditableRoleTemplate,
  mapRoleTemplatesResponse,
} from '../mappers/role-template-mapper';
import type { RoleTemplate } from '../types/role-template';

interface UseRoleTemplatesResult {
  roles: RoleTemplate[];
  isLoading: boolean;
  error: string;
  reload: () => void;
}

export const useRoleTemplates = (enabled = true): UseRoleTemplatesResult => {
  const [roles, setRoles] = useState<RoleTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const runRequest = useEffectEvent(fetchRoleTemplates);

  useEffect(() => {
    if (!enabled) {
      setRoles([]);
      setError('');
      setIsLoading(false);
      return;
    }

    let isCancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError('');

      try {
        const result = await runRequest();

        if (isCancelled) {
          return;
        }

        if (!result.ok) {
          setRoles([]);
          setError(result.error || 'Unable to load roles.');
          return;
        }

        setRoles(mapRoleTemplatesResponse(result.payload).filter(isEditableRoleTemplate));
      } catch (requestError) {
        if (isCancelled) {
          return;
        }

        setRoles([]);
        setError(requestError instanceof Error ? requestError.message : 'Unable to load roles.');
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      isCancelled = true;
    };
  }, [enabled, reloadToken]);

  return useMemo(() => ({
    roles,
    isLoading,
    error,
    reload: () => setReloadToken((current) => current + 1),
  }), [error, isLoading, roles]);
};
