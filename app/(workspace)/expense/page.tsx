'use client';

import WorkspaceModulePage from '../../../components/dashboard/WorkspaceModulePage';
import ExpenseTab from '../../../components/dashboard/active-tab/ExpenseTab';

export default function ExpensePage() {
  return <WorkspaceModulePage activeTab="expense" ContentComponent={ExpenseTab} />;
}
