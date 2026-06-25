'use client';

import { useMemo } from 'react';
import SectionHero from '../SectionHero';
import ServicesTable from '../../tables/ServicesTable';
import DataTable from '../../tables/DataTable';
import { FaPlusCircle } from 'react-icons/fa';
import { getModuleUi } from '../../../lib/module-ui';
import { formatDateTime } from '../../../src/utils/dateFormatter';
import EmptyState from '../../ui/state/EmptyState';
import ErrorState from '../../ui/state/ErrorState';
import type { DashboardTabContext } from './types';

interface InventoryHistoryRow {
  id: string;
  product: string;
  transactionId: string;
  qty: number;
  previousStock: number;
  newStock: number;
  date: string;
}

interface ServicesTabProps {
  ctx: DashboardTabContext;
}

export default function ServicesTab({ ctx }: ServicesTabProps) {
  const {
    selectedCounter,
    visibleServices,
    canAddServiceRecords,
    canManageModule,
    canDeleteModule,
    isServicesLoading,
    servicesError,
    handleQuickAction,
    handleEditService,
    handleDeleteRecord,
    renderSummaryCards,
    serviceSummary,
    filteredTransactionRecords,
  } = ctx;
  const servicesUi = getModuleUi('services');
  const addServiceAction = canAddServiceRecords && selectedCounter
    ? {
        label: 'Add Inventory',
        onClick: () => handleQuickAction('add-service'),
      }
    : undefined;
  const inventoryHistoryRows = useMemo<InventoryHistoryRow[]>(() => {
    const serviceById = new Map(visibleServices.map((service) => [service.id, service]));
    const deductionsByInventory = new Map<string, Array<{
      transactionId: string;
      qty: number;
      date: string;
      product: string;
    }>>();

    filteredTransactionRecords.forEach((transaction) => {
      const rows = transaction.rows && transaction.rows.length > 0
        ? transaction.rows
        : transaction.inventoryItemId
          ? [{
              inventoryId: transaction.inventoryItemId,
              inventoryName: transaction.serviceProduct,
              noOfTransaction: transaction.noOfTransaction ?? transaction.numberOfTransactions ?? 1,
            }]
          : [];

      rows.forEach((row) => {
        const inventoryId = row.inventoryId;
        const service = serviceById.get(inventoryId);
        if (!service || service.type !== 'product') return;

        const entries = deductionsByInventory.get(inventoryId) || [];
        entries.push({
          transactionId: transaction.invoiceId || transaction.transactionNumber || transaction.id,
          qty: row.noOfTransaction,
          date: transaction.date || transaction.createdAt || transaction.addedDate || '',
          product: row.inventoryName || service.name,
        });
        deductionsByInventory.set(inventoryId, entries);
      });
    });

    return Array.from(deductionsByInventory.entries()).flatMap(([inventoryId, entries]) => {
      const service = serviceById.get(inventoryId);
      const sortedEntries = [...entries].sort((left, right) => left.date.localeCompare(right.date));
      let runningStock = service?.openingStock
        ?? ((service?.currentStock ?? service?.quantity ?? 0) + sortedEntries.reduce((total, entry) => total + entry.qty, 0));

      return sortedEntries.map((entry, index) => {
        const previousStock = runningStock;
        const newStock = previousStock - entry.qty;
        runningStock = newStock;

        return {
          id: `${inventoryId}-${entry.transactionId}-${index}`,
          product: entry.product,
          transactionId: entry.transactionId,
          qty: entry.qty,
          previousStock,
          newStock,
          date: entry.date,
        };
      });
    }).sort((left, right) => right.date.localeCompare(left.date));
  }, [filteredTransactionRecords, visibleServices]);

  return (
    <div className="row g-4">
      <div className="col-12">
        <SectionHero
          eyebrow="Inventory"
          title="Manage your inventory"
          description={
            selectedCounter
              ? `Track services, products, quantity, and status for ${selectedCounter.name}.`
              : 'Track services, products, quantity, and status with the latest metrics.'
          }
          action={canAddServiceRecords && selectedCounter ? {
            label: 'Add Inventory',
            icon: <FaPlusCircle />,
            onClick: () => handleQuickAction('add-service'),
          } : undefined}
        />
      </div>

      <div className="col-12">
        {!selectedCounter ? (
          <EmptyState
            eyebrow={servicesUi?.label}
            title="Select a department"
            description="Please select a department to view inventory."
          />
        ) : !isServicesLoading && servicesError && visibleServices.length === 0 ? (
          <ErrorState
            eyebrow="Inventory Unavailable"
            title="Unable to load inventory"
            description={servicesError}
          />
        ) : visibleServices.length === 0 && !isServicesLoading ? (
          <EmptyState
            eyebrow={servicesUi?.label}
            title={servicesUi?.emptyTitle || 'No inventory items available yet'}
            description={servicesUi?.emptyDescription || 'Add an inventory item to make it available in the transaction workflow.'}
            action={addServiceAction}
          />
        ) : (
          <ServicesTable
            services={visibleServices}
            onEdit={canManageModule('services') ? handleEditService : undefined}
            onDelete={canDeleteModule('services') ? (id: string) => handleDeleteRecord('DELETE_SERVICE', id) : undefined}
          />
        )}
      </div>

      <div className="col-12">
        <DataTable
          rows={inventoryHistoryRows}
          getRowKey={(row) => row.id}
          eyebrow="Inventory History"
          title="Inventory History"
          copy="Stock movement based on transaction rows."
          emptyLabel="No inventory history found."
          columns={[
            { key: 'product', header: 'Product', render: (row) => <span className="data-table__primary">{row.product}</span> },
            { key: 'transactionId', header: 'Transaction ID', render: (row) => row.transactionId },
            { key: 'qty', header: 'Qty', render: (row) => row.qty },
            { key: 'previousStock', header: 'Previous Stock', render: (row) => row.previousStock },
            { key: 'newStock', header: 'New Stock', render: (row) => row.newStock },
            { key: 'date', header: 'Date', render: (row) => formatDateTime(row.date, '-') },
          ]}
        />
      </div>

      {renderSummaryCards(serviceSummary)}
    </div>
  );
}
