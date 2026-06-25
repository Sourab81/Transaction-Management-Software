'use client';

import type { Service } from '../store';
import {
  createInventory,
  deleteInventory,
  getInventory,
  updateInventory,
  type CreateInventoryPayload,
  type InventoryItem,
  type InventoryItemType,
  type InventoryMutationResult,
  type UpdateInventoryPayload,
  type InventoryFilters,
} from '../api/inventory';
import {
  extractCollectionItems,
  isRecord,
  readNumberValue,
  readStringValue,
} from '../mappers/legacy-record';
import { useApiCollection } from './useApiCollection';

interface UseInventoryResult {
  inventory: InventoryItem[];
  services: Service[];
  loading: boolean;
  isLoading: boolean;
  error: string;
  hasLoaded: boolean;
  createInventory: (input: CreateInventoryPayload) => Promise<InventoryMutationResult>;
  updateInventory: (input: UpdateInventoryPayload) => Promise<InventoryMutationResult>;
  deleteInventory: (id: number | string) => Promise<InventoryMutationResult>;
  reload: () => void;
}

const readInventoryType = (entry: Record<string, unknown>): InventoryItemType => {
  const rawType = (readStringValue(entry, ['type', 'inventory_type', 'inventoryType']) || '').toLowerCase();
  return rawType === 'product' ? 'product' : 'service';
};

const readInventoryStatus = (entry: Record<string, unknown>) => {
  const rawStatus = entry.status ?? entry.is_active ?? entry.isActive;

  if (typeof rawStatus === 'number') {
    return rawStatus === 0 ? 0 : 1;
  }

  if (typeof rawStatus === 'string') {
    const normalizedStatus = rawStatus.trim().toLowerCase();
    return normalizedStatus === '0' || normalizedStatus === 'inactive' ? 0 : 1;
  }

  return 1;
};

const mapInventoryResponse = (payload: unknown): InventoryItem[] =>
  extractCollectionItems(payload, ['data', 'inventory', 'items', 'rows', 'records'])
    .reduce<InventoryItem[]>((items, entry) => {
      if (!isRecord(entry)) {
        return items;
      }

      const id = readStringValue(entry, ['id', 'inventory_id', 'inventoryId']);
      const name = readStringValue(entry, ['name', 'inventory_name', 'inventoryName']);

      if (!id || !name) {
        return items;
      }

      items.push({
        id,
        name,
        type: readInventoryType(entry),
        quantity: readNumberValue(entry, ['current_stock', 'currentStock', 'quantity', 'qty']) || 0,
        openingStock: readNumberValue(entry, ['opening_stock', 'openingStock', 'opening_quantity', 'openingQuantity']) ?? undefined,
        currentStock: readNumberValue(entry, ['current_stock', 'currentStock', 'quantity', 'qty']) ?? undefined,
        lowStockThreshold: readNumberValue(entry, ['low_stock_threshold', 'lowStockThreshold', 'minimum_stock', 'minimumStock']) ?? undefined,
        remark: readStringValue(entry, ['remark', 'description']) || null,
        counterId: readStringValue(entry, ['counter_id', 'counterId']) || '',
        userId: readStringValue(entry, ['user_id', 'userId']) || undefined,
        addedByName: readStringValue(entry, ['added_by_name', 'addedByName', 'added_by']) || null,
        status: readInventoryStatus(entry),
        addedDate: readStringValue(entry, ['added_date', 'addedDate', 'created_at', 'createdAt']) || undefined,
        updatedDate: readStringValue(entry, ['updated_date', 'updatedDate', 'updated_at', 'updatedAt']) || undefined,
      });

      return items;
    }, []);

const toTitleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const mapInventoryToService = (item: InventoryItem): Service => ({
  id: String(item.id),
  departmentId: item.counterId ? String(item.counterId) : undefined,
  departmentName: 'General',
  name: item.name,
  category: toTitleCase(item.type),
  price: 0,
  status: item.status === 0 ? 'Inactive' : 'Active',
  description: item.remark || '',
  type: item.type,
  quantity: item.quantity,
  openingStock: item.openingStock ?? item.quantity,
  currentStock: item.currentStock ?? item.quantity,
  lowStockThreshold: item.lowStockThreshold ?? 0,
  remark: item.remark ?? null,
  counterId: item.counterId ? String(item.counterId) : null,
  userId: item.userId ? String(item.userId) : undefined,
  addedByName: item.addedByName ?? null,
  addedDate: item.addedDate,
  updatedDate: item.updatedDate,
});

const mapServiceToInventory = (service: Service): InventoryItem => ({
  id: service.id,
  name: service.name,
  type: service.type || (service.category.toLowerCase() === 'product' ? 'product' : 'service'),
  quantity: service.quantity ?? 0,
  openingStock: service.openingStock ?? service.quantity ?? 0,
  currentStock: service.currentStock ?? service.quantity ?? 0,
  lowStockThreshold: service.lowStockThreshold ?? 0,
  remark: service.remark ?? service.description ?? null,
  counterId: service.counterId ?? service.departmentId ?? '',
  userId: service.userId,
  status: service.status === 'Inactive' ? 0 : 1,
  addedDate: service.addedDate,
  updatedDate: service.updatedDate,
});

export function useInventory(
  enabled: boolean,
  initialData?: Service[],
  filters?: InventoryFilters,
): UseInventoryResult {
  const counterId = filters?.counterId ? String(filters.counterId) : '';
  const requestKey = `${counterId}:${typeof filters?.status === 'undefined' ? '' : filters.status}`;
  const { data, isLoading, error, hasLoaded, reload } = useApiCollection({
    enabled: enabled && Boolean(counterId),
    initialData: initialData?.map(mapServiceToInventory),
    requestKey,
    request: () => getInventory({ ...filters, counterId }),
    mapResponse: mapInventoryResponse,
  });

  return {
    inventory: data,
    services: data.map(mapInventoryToService),
    loading: isLoading,
    isLoading,
    error,
    hasLoaded,
    createInventory,
    updateInventory,
    deleteInventory,
    reload,
  };
}
