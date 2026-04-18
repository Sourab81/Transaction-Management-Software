'use client';

import SectionHero from '../SectionHero';
import ExpensesTable from '../../tables/ExpensesTable';
import { FaPlusCircle } from 'react-icons/fa';
import { getModuleUi } from '../../../lib/module-ui';
import EmptyState from '../../ui/state/EmptyState';
import type { DashboardTabContext } from './types';

interface ExpenseTabProps {
  ctx: DashboardTabContext;
}

export default function ExpenseTab({ ctx }: ExpenseTabProps) {
  const {
    renderSummaryCards,
    expenseSummary,
    expenses,
    handleQuickAction,
    handleEditExpense,
    handleDeleteRecord,
    canManageModule,
    canDeleteModule,
  } = ctx;
  const expenseUi = getModuleUi('expense');
  const addExpenseAction = canManageModule('expense')
    ? {
        label: 'Add Expense',
        onClick: () => handleQuickAction('add-expense'),
      }
    : undefined;

  return (
    <div className="row g-4">
      <div className="col-12">
        <SectionHero
          eyebrow="Expense"
          title="Keep expense reporting in one place"
          description="Track expense entries, categories, and status from the business workspace."
          action={canManageModule('expense') ? {
            label: 'Add Expense',
            icon: <FaPlusCircle />,
            onClick: () => handleQuickAction('add-expense'),
          } : undefined}
        />
      </div>

      {renderSummaryCards(expenseSummary)}

      <div className="col-12">
        {expenses.length === 0 ? (
          <EmptyState
            eyebrow={expenseUi?.label}
            title={expenseUi?.emptyTitle || 'No expense entries yet'}
            description={expenseUi?.emptyDescription || 'Expense records will appear here after they are added to the ledger.'}
            action={addExpenseAction}
          />
        ) : (
          <ExpensesTable
            expenses={expenses}
            onEdit={canManageModule('expense') ? handleEditExpense : undefined}
            onDelete={canDeleteModule('expense') ? (id: string) => handleDeleteRecord('DELETE_EXPENSE', id) : undefined}
          />
        )}
      </div>
    </div>
  );
}
