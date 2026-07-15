'use client';

import { DirectBackendError, directBackendGet, directBackendFetch } from './direct-backend';
import {
  mapCustomerCategoryResponse,
  mapCustomerCategoriesResponse,
} from '../mappers/customer-category-mapper';

export type CustomerCategoryStatus = 'Active' | 'Inactive';

export interface CustomerCategory {
  id: string;
  name: string;
  status: CustomerCategoryStatus;
  addedByName?: string | null;
  addedDate: string;
  updatedDate?: string;
}

export type CustomerCategoryPayload = Pick<CustomerCategory, 'name' | 'status'>;

const normalizeErrorMessage = (error: unknown, fallbackMessage: string) => {
  if (error instanceof DirectBackendError) return error.message || fallbackMessage;
  return error instanceof Error ? error.message : fallbackMessage;
};

export const getCustomerCategories = async () => (
  mapCustomerCategoriesResponse(await directBackendGet('customer-categories'))
);

export const saveCustomerCategory = async (payload: CustomerCategoryPayload, id?: string) => {
  const normalizedPayload = {
    name: payload.name.trim(),
    status: payload.status === 'Inactive' ? 0 : 1,
  };

  try {
    const response = await directBackendFetch(
      id ? `customer-categories/${encodeURIComponent(id)}` : 'customer-categories',
      {
        method: id ? 'PUT' : 'POST',
        body: normalizedPayload,
      },
    );

    return {
      success: true,
      message: id ? 'Category updated successfully.' : 'Category saved successfully.',
      category: mapCustomerCategoryResponse(response),
    };
  } catch (error) {
    return {
      success: false,
      message: normalizeErrorMessage(error, 'Unable to save category.'),
      category: null,
    };
  }
};

export const getActiveCustomerCategories = async () => (
  (await getCustomerCategories()).filter((category) => category.status === 'Active')
);
