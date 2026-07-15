'use client';

import { directBackendPost } from './direct-backend';

export interface DailyReportSavePayload {
  reportDate: string;
  serviceCharges: string;
  entityActivity: string;
  expenseInfo: string;
  netDetails: string;
}

export interface DailyReportRecord {
  id: string;
  report_date: string;
  service_charges: string | null;
  entity_activity: string | null;
  expense_info: string | null;
  net_details: string | null;
}

export const saveDailyReport = (payload: DailyReportSavePayload) =>
  directBackendPost('saveDailyReport', {
    report_date: payload.reportDate,
    service_charges: payload.serviceCharges,
    entity_activity: payload.entityActivity,
    expense_info: payload.expenseInfo,
    net_details: payload.netDetails,
  });

export const getDailyReport = (reportDate: string) =>
  directBackendPost('getDailyReport', { report_date: reportDate });
