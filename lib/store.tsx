'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

interface Transaction {
  id: string;
  customerId: string;
  customerName: string;
  service: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  date: string;
}

interface Counter {
  id: string;
  name: string;
  code: string;
  openingBalance: number;
  currentBalance: number;
  status: 'Active' | 'Inactive';
}

interface AppState {
  customers: Customer[];
  transactions: Transaction[];
  notifications: Notification[];
  counters: Counter[];
}

interface Notification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
  timestamp: string;
}

type AppAction =
  | { type: 'ADD_TRANSACTION'; payload: Omit<Transaction, 'id' | 'date'> }
  | { type: 'ADD_CUSTOMER'; payload: Omit<Customer, 'id'> }
  | { type: 'ADD_NOTIFICATION'; payload: Omit<Notification, 'id' | 'timestamp'> }
  | { type: 'DISMISS_NOTIFICATION'; payload: string };

const initialState: AppState = {
  customers: [
    { id: '1', name: 'John Doe', phone: '1234567890', email: 'john@example.com' },
    { id: '2', name: 'Jane Smith', phone: '0987654321', email: 'jane@example.com' },
  ],
  transactions: [
    {
      id: '1',
      customerId: '1',
      customerName: 'John Doe',
      service: 'Mobile Recharge',
      amount: 50,
      status: 'completed',
      date: '2024-01-15',
    },
    {
      id: '2',
      customerId: '2',
      customerName: 'Jane Smith',
      service: 'Bill Payment',
      amount: 100,
      status: 'pending',
      date: '2024-01-15',
    },
  ],
  notifications: [
    {
      id: '1',
      type: 'warning',
      message: '2 transactions are pending approval',
      timestamp: '2 minutes ago',
    },
    {
      id: '2',
      type: 'info',
      message: 'Daily report generated successfully',
      timestamp: '1 hour ago',
    },
  ],
  counters: [
    {
      id: 'counter-1',
      name: 'SOFTWARE DEPARTMENT',
      code: 'C1',
      openingBalance: 10000,
      currentBalance: 10000,
      status: 'Active',
    },
    {
      id: 'counter-2',
      name: 'RETAIL COUNTER',
      code: 'C2',
      openingBalance: 4500,
      currentBalance: 4200,
      status: 'Active',
    },
  ],
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ADD_TRANSACTION':
      const newTransaction: Transaction = {
        ...action.payload,
        id: Date.now().toString(),
        date: new Date().toISOString().split('T')[0],
      };
      return {
        ...state,
        transactions: [newTransaction, ...state.transactions],
      };
    case 'ADD_CUSTOMER':
      const newCustomer: Customer = {
        ...action.payload,
        id: Date.now().toString(),
      };
      return {
        ...state,
        customers: [...state.customers, newCustomer],
      };
    case 'ADD_NOTIFICATION':
      const newNotification: Notification = {
        ...action.payload,
        id: Date.now().toString(),
        timestamp: 'Just now',
      };
      return {
        ...state,
        notifications: [newNotification, ...state.notifications],
      };
    case 'DISMISS_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload),
      };
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}