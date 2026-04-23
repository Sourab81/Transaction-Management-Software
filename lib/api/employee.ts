import { requestAppApi } from './app-client';

export const getEmployeesResponse = () => requestAppApi('/api/employees');
