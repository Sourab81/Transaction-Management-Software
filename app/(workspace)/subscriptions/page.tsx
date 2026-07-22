"use client";

import WorkspaceModulePage from '../../../components/dashboard/WorkspaceModulePage';
import SubscriptionsTab from '../../../components/dashboard/active-tab/SubscriptionsTab';

export default function SubscriptionsPage() {
  return <WorkspaceModulePage activeTab="subscriptions" ContentComponent={SubscriptionsTab} />;
}