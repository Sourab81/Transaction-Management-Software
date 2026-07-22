"use client";

const API_BASE = '/api/subscriptions';

interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  [key: string]: T | boolean | string | undefined;
}

async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options.headers as Record<string, string> },
      ...options,
    });
    const data = await res.json();
    if (!res.ok || data.success === false) {
      return { success: false, message: data.message || `Request failed (${res.status})` };
    }
    return data;
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Network error' };
  }
}

export interface SubscriptionPlan {
  id: string;
  label: string;
  durationLabel: string;
  description: string;
  isTrial?: boolean;
  duration: { unit: 'days' | 'months' | 'years'; value: number };
  price?: number;
  currency?: string;
  features?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BusinessSubscription {
  id: string;
  planId: string;
  businessId: string;
  startDate: string;
  endDate: string;
  status: 'trial' | 'active' | 'expired' | 'cancelled';
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const getSubscriptionPlans = async (): Promise<{ success: boolean; message: string; plans?: SubscriptionPlan[] }> => {
  const data = await apiRequest<{ plans?: SubscriptionPlan[] }>(API_BASE, { method: 'GET' });
  return data as { success: boolean; message: string; plans?: SubscriptionPlan[] };
};

export const createSubscriptionPlan = async (input: Partial<SubscriptionPlan>): Promise<{ success: boolean; message: string; plan?: SubscriptionPlan }> => {
  const data = await apiRequest<{ plan?: SubscriptionPlan }>(`${API_BASE}/plans`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data as { success: boolean; message: string; plan?: SubscriptionPlan };
};

export const updateSubscriptionPlan = async (id: string, input: Partial<SubscriptionPlan>): Promise<{ success: boolean; message: string; plan?: SubscriptionPlan }> => {
  const data = await apiRequest<{ plan?: SubscriptionPlan }>(`${API_BASE}/plans/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return data as { success: boolean; message: string; plan?: SubscriptionPlan };
};

export const deleteSubscriptionPlan = async (id: string): Promise<{ success: boolean; message: string }> => {
  const data = await apiRequest(`${API_BASE}/plans/${encodeURIComponent(id)}`, { method: 'DELETE' });
  return data as { success: boolean; message: string };
};

export const getBusinessSubscription = async (businessId: string): Promise<{ success: boolean; message: string; subscription?: BusinessSubscription }> => {
  const data = await apiRequest<{ subscription?: BusinessSubscription }>(`${API_BASE}/business/${encodeURIComponent(businessId)}`, {
    method: 'GET',
  });
  return data as { success: boolean; message: string; subscription?: BusinessSubscription };
};

export const saveBusinessSubscription = async (businessId: string, input: Partial<BusinessSubscription>): Promise<{ success: boolean; message: string; subscription?: BusinessSubscription }> => {
  const data = await apiRequest<{ subscription?: BusinessSubscription }>(`${API_BASE}/business`, {
    method: 'POST',
    body: JSON.stringify({ businessId, ...input }),
  });
  return data as { success: boolean; message: string; subscription?: BusinessSubscription };
};

export const cancelBusinessSubscription = async (businessId: string): Promise<{ success: boolean; message: string; subscription?: BusinessSubscription }> => {
  const data = await apiRequest<{ subscription?: BusinessSubscription }>(`${API_BASE}/business/cancel`, {
    method: 'POST',
    body: JSON.stringify({ businessId }),
  });
  return data as { success: boolean; message: string; subscription?: BusinessSubscription };
};