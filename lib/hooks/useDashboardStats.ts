'use client';

import { directBackendGet } from '../api/direct-backend';
import { useApiResource } from './useApiResource';

export interface StatCards {
  todayServices: number;
  totalServices: number;
  todayCustomers: number;
  totalCustomers: number;
  activeUsers: number;
  totalUsers: number;
  todaySms: number;
  totalSms: string;
}

export interface AmountsPie {
  advance: number;
  due: number;
  bank: number;
  counter: number;
}

export interface TopService {
  name: string;
  monthCount: number;
  weekCount: number;
}

export interface TopUser {
  name: string;
  totalServiceCharge: number;
}

export interface DashboardStats {
  statCards: StatCards;
  amountsPie: AmountsPie;
  topServices: TopService[];
  topUsers: TopUser[];
}

const mapDashboardStats = (payload: unknown): DashboardStats | null => {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Record<string, unknown>;
  const data = (p['data'] as Record<string, unknown>) ?? {};
  const cards = (data['stat_cards'] as Record<string, unknown>) ?? {};
  const pie = (data['amounts_pie'] as Record<string, unknown>) ?? {};
  const services = (data['top_services'] as unknown[]) ?? [];
  const users = (data['top_users'] as unknown[]) ?? [];

  return {
    statCards: {
      todayServices:  Number(cards['today_services']  ?? 0),
      totalServices:  Number(cards['total_services']  ?? 0),
      todayCustomers: Number(cards['today_customers'] ?? 0),
      totalCustomers: Number(cards['total_customers'] ?? 0),
      activeUsers:    Number(cards['active_users']    ?? 0),
      totalUsers:     Number(cards['total_users']     ?? 0),
      todaySms:       Number(cards['today_sms']       ?? 0),
      totalSms:       String(cards['total_sms']       ?? '0/0'),
    },
    amountsPie: {
      advance: Number(pie['advance'] ?? 0),
      due:     Number(pie['due']     ?? 0),
      bank:    Number(pie['bank']    ?? 0),
      counter: Number(pie['counter'] ?? 0),
    },
    topServices: services.map((s: unknown) => {
      const r = s as Record<string, unknown>;
      return {
        name:       String(r['name']        ?? ''),
        monthCount: Number(r['month_count'] ?? 0),
        weekCount:  Number(r['week_count']  ?? 0),
      };
    }),
    topUsers: users.map((u: unknown) => {
      const r = u as Record<string, unknown>;
      return {
        name:               String(r['name']                 ?? ''),
        totalServiceCharge: Number(r['total_service_charge'] ?? 0),
      };
    }),
  };
};

export function useDashboardStats(enabled: boolean) {
  const { data, isLoading, error, reload } = useApiResource({
    enabled,
    request: () => directBackendGet('userapi/dashboardStats'),
    mapResponse: mapDashboardStats,
  });

  return { stats: data, isLoading, error, reload };
}
