'use client';

import { directBackendPostJson } from './direct-backend';

export interface UserDirectoryEntry {
  id: number;
  fullname: string;
  email_id: string;
  user_type: 'Business' | 'Employee';
  business_id?: number;
  permissions: Record<string, unknown>;
  employees?: UserDirectoryEntry[];
}

export interface GetUsersDirectoryResponse {
  status: boolean;
  message: string;
  data: UserDirectoryEntry[];
}

export interface UpdatePermissionsResponse {
  status: boolean;
  message: string;
  data: null;
}

export const getUsersDirectory = async (): Promise<GetUsersDirectoryResponse> => {
  const response = await directBackendPostJson<GetUsersDirectoryResponse>('getUsersDirectory', {});
  return response;
};

export const updateUserPermissions = async (
  userId: number,
  userType: string,
  permissions: Record<string, number>,
): Promise<UpdatePermissionsResponse> => {
  const response = await directBackendPostJson<UpdatePermissionsResponse>('updateUserPermissions', {
    user_id: userId,
    user_type: userType,
    permissions,
  });
  return response;
};
