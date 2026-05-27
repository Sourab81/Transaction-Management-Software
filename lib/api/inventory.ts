import { AppApiError, requestAppApi, requestAppApiMutation } from './client';
import { isRecord, readJoinedMessage } from '../mappers/legacy-record';

export type InventoryItemType = 'service' | 'product';

export interface InventoryItem {
  id: number | string;
  name: string;
  type: InventoryItemType;
  quantity: number;
  remark?: string | null;
  counterId: number | string;
  userId?: number | string;
  status: number;
  addedDate?: string;
  updatedDate?: string;
}

export interface CreateInventoryPayload {
  name: string;
  type: InventoryItemType;
  quantity?: number;
  remark?: string | null;
  counterId: number | string;
}

export interface UpdateInventoryPayload {
  id: number | string;
  name?: string;
  type?: InventoryItemType;
  quantity?: number;
  remark?: string | null;
  counterId?: number | string | null;
  status?: 0 | 1;
}

export interface InventoryFilters {
  type?: InventoryItemType;
  counterId: number | string;
  status?: 0 | 1;
  search?: string;
}

export interface InventoryMutationResult {
  success: boolean;
  message: string;
  item?: unknown;
}

const appendInventoryFilters = (filters: InventoryFilters) => {
  const params = new URLSearchParams();

  if (!String(filters.counterId).trim()) {
    throw new AppApiError('Please select a department to view inventory.', 400, null);
  }

  if (filters.type) params.set('type', filters.type);
  if (typeof filters.counterId !== 'undefined' && filters.counterId !== null && String(filters.counterId).trim()) {
    params.set('counter_id', String(filters.counterId).trim());
  }
  if (typeof filters.status !== 'undefined') params.set('status', String(filters.status));
  if (filters.search?.trim()) params.set('search', filters.search.trim());

  const query = params.toString();
  return query ? `/api/inventory?${query}` : '/api/inventory';
};

const normalizeInventoryMutationResult = (
  payload: unknown,
  fallbackMessage: string,
): InventoryMutationResult => {
  if (!isRecord(payload)) {
    return {
      success: false,
      message: fallbackMessage,
    };
  }

  const message = readJoinedMessage(payload.message) || fallbackMessage;
  const success = payload.success === true || payload.status === true || payload.status === 1 || payload.status === '1';

  return {
    success,
    message,
    ...(payload.inventory ? { item: payload.inventory } : {}),
    ...(payload.item ? { item: payload.item } : {}),
    ...(payload.data ? { item: payload.data } : {}),
  };
};

const handleInventoryMutation = async (
  request: () => Promise<unknown>,
  fallbackMessage: string,
) => {
  try {
    return normalizeInventoryMutationResult(await request(), fallbackMessage);
  } catch (error) {
    if (error instanceof AppApiError) {
      return normalizeInventoryMutationResult(error.body, error.message || fallbackMessage);
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : fallbackMessage,
    };
  }
};

export const getInventory = (filters: InventoryFilters) =>
  requestAppApi(appendInventoryFilters(filters));

export const createInventory = (payload: CreateInventoryPayload) =>
  handleInventoryMutation(
    () => requestAppApiMutation('/api/inventory', {
      action: 'create',
      name: payload.name,
      type: payload.type,
      quantity: payload.quantity ?? 0,
      remark: payload.remark ?? null,
      counterId: payload.counterId,
    }),
    'Inventory item created successfully.',
  );

export const updateInventory = (payload: UpdateInventoryPayload) =>
  handleInventoryMutation(
    () => requestAppApiMutation('/api/inventory', {
      action: 'update',
      id: payload.id,
      ...(typeof payload.name !== 'undefined' ? { name: payload.name } : {}),
      ...(typeof payload.type !== 'undefined' ? { type: payload.type } : {}),
      ...(typeof payload.quantity !== 'undefined' ? { quantity: payload.quantity } : {}),
      ...(typeof payload.remark !== 'undefined' ? { remark: payload.remark } : {}),
      ...(typeof payload.counterId !== 'undefined' ? { counterId: payload.counterId } : {}),
      ...(typeof payload.status !== 'undefined' ? { status: payload.status } : {}),
    }),
    'Inventory item updated successfully.',
  );

export const deleteInventory = (id: number | string) =>
  handleInventoryMutation(
    () => requestAppApiMutation('/api/inventory', {
      action: 'delete',
      id,
    }),
    'Inventory item deleted successfully.',
  );
