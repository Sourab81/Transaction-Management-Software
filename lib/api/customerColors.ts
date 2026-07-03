'use client';

import { AppApiError, requestAppApi } from './client';
import {
  mapCustomerColorResponse,
  mapCustomerColorsResponse,
} from '../mappers/customer-color-mapper';

export type CustomerColorStatus = 'Active' | 'Inactive';

export interface CustomerColor {
  id: string;
  name: string;
  hexCode: string;
  remark?: string | null;
  status: CustomerColorStatus;
  addedByName?: string | null;
  addedDate: string;
  updatedDate?: string;
}

export type CustomerColorPayload = Pick<CustomerColor, 'name' | 'hexCode' | 'status'> & {
  remark?: string | null;
};

const normalizeHexCode = (hexCode: string) => {
  const value = hexCode.trim();
  return value.startsWith('#') ? value.toUpperCase() : `#${value}`.toUpperCase();
};

const normalizeErrorMessage = (error: unknown, fallbackMessage: string) => {
  if (error instanceof AppApiError) return error.message || fallbackMessage;
  return error instanceof Error ? error.message : fallbackMessage;
};

export const getCustomerColors = async () => (
  mapCustomerColorsResponse(await requestAppApi('/api/customer-colors'))
);

export const saveCustomerColor = async (payload: CustomerColorPayload, id?: string) => {
  const normalizedPayload = {
    name: payload.name.trim(),
    hexCode: normalizeHexCode(payload.hexCode),
    remark: payload.remark?.trim() || null,
    status: payload.status,
  };

  try {
    const response = await requestAppApi(
      id ? `/api/customer-colors/${encodeURIComponent(id)}` : '/api/customer-colors',
      {
        method: id ? 'PUT' : 'POST',
        body: normalizedPayload,
      },
    );

    return {
      success: true,
      message: id ? 'Color updated successfully.' : 'Color saved successfully.',
      color: mapCustomerColorResponse(response),
    };
  } catch (error) {
    return {
      success: false,
      message: normalizeErrorMessage(error, 'Unable to save color.'),
      color: null,
    };
  }
};

export const getActiveCustomerColors = async () => (
  (await getCustomerColors()).filter((color) => color.status === 'Active')
);
