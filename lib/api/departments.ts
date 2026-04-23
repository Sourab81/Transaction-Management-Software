import { requestAppApi } from './app-client';

export const getDepartmentsResponse = () => requestAppApi('/api/departments');
