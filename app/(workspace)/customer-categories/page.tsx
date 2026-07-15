import WorkspaceModulePage from '../../../components/dashboard/WorkspaceModulePage';
import CustomerCategoryTab from '../../../components/dashboard/active-tab/CustomerCategoryTab';

export default function CustomerCategoriesPage() {
  return <WorkspaceModulePage activeTab="customer-categories" ContentComponent={CustomerCategoryTab} />;
}
