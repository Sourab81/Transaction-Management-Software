import { requestAppApi } from './app-client';

export const getReportsResponse = () => requestAppApi('/api/reports');

