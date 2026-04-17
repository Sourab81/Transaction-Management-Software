'use client';

import SectionHero from '../SectionHero';
import ExpensesTable from '../../tables/ExpensesTable';
import { FaPlusCircle } from 'react-icons/fa';

interface ExpenseTabProps {
  ctx: any;
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
        <ExpensesTable
          expenses={expenses}
          onEdit={canManageModule('expense') ? handleEditExpense : undefined}
          onDelete={canDeleteModule('expense') ? (id: string) => handleDeleteRecord('DELETE_EXPENSE', id) : undefined}
        />
      </div>
    </div>
  );
}
