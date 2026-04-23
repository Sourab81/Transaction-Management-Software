import { requestAppApi } from './app-client';

export const getTransactionsResponse = () => requestAppApi('/api/transactions');
