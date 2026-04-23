import { requestAppApi } from './app-client';

export const getDashboardSummaryResponse = () => requestAppApi('/api/dashboard-summary');

