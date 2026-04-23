import { requestAppApi } from './app-client';

export const getCustomersResponse = () => requestAppApi('/api/customers');
