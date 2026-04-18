'use client';

import SectionHero from '../SectionHero';
import AccountsTable from '../../tables/AccountsTable';
import { FaPlusCircle } from 'react-icons/fa';
import { getModuleUi } from '../../../lib/module-ui';
import EmptyState from '../../ui/state/EmptyState';
import type { DashboardTabContext } from './types';

interface AccountsTabProps {
  ctx: DashboardTabContext;
}

export default function AccountsTab({ ctx }: AccountsTabProps) {
  const {
    renderSummaryCards,
    accountSummary,
    accounts,
    canAddAccountRecords,
    canEditAccountRecords,
    canDeleteAccountRecords,
    handleQuickAction,
    handleEditAccount,
    handleDeleteRecord,
  } = ctx;
  const accountsUi = getModuleUi('accounts');
  const addAccountAction = canAddAccountRecords
    ? {
        label: 'Add Account',
        onClick: () => handleQuickAction('add-account'),
      }
    : undefined;

  return (
    <div className="row g-4">
      <div className="col-12">
        <SectionHero
          eyebrow="Account"
          title="Manage bank account records"
          description="Review account holders, bank details, IFSC codes, balances, and status from one table."
          action={canAddAccountRecords ? {
            label: 'Add Account',
            icon: <FaPlusCircle />,
            onClick: () => handleQuickAction('add-account'),
          } : undefined}
        />
      </div>

      {renderSummaryCards(accountSummary)}

      <div className="col-12">
        {accounts.length === 0 ? (
          <EmptyState
            eyebrow={accountsUi?.label}
            title={accountsUi?.emptyTitle || 'No accounts available yet'}
            description={accountsUi?.emptyDescription || 'Add a payment account to connect departments and track balances.'}
            action={addAccountAction}
          />
        ) : (
          <AccountsTable
            accounts={accounts}
            onEdit={canEditAccountRecords ? handleEditAccount : undefined}
            onDelete={canDeleteAccountRecords ? (id: string) => handleDeleteRecord('DELETE_ACCOUNT', id) : undefined}
          />
        )}
      </div>
    </div>
  );
}
