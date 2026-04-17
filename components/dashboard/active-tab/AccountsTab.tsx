'use client';

import SectionHero from '../SectionHero';
import AccountsTable from '../../tables/AccountsTable';
import { FaPlusCircle } from 'react-icons/fa';

interface AccountsTabProps {
  ctx: any;
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
        <AccountsTable
          accounts={accounts}
          onEdit={canEditAccountRecords ? handleEditAccount : undefined}
          onDelete={canDeleteAccountRecords ? (id: string) => handleDeleteRecord('DELETE_ACCOUNT', id) : undefined}
        />
      </div>
    </div>
  );
}
