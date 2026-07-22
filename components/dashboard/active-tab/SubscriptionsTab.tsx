"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { FaPlus, FaEdit, FaTrash, FaCheck, FaTimes, FaCalendarAlt } from 'react-icons/fa';
import type { DashboardTabContext } from './types';
import PlanForm from '../../forms/PlanForm';
import { businessSubscriptionPlans, getBusinessSubscriptionPlan, getBusinessAccessState } from '../../../lib/subscription';

interface SubscriptionsTabProps {
  ctx: DashboardTabContext;
}

type PlanFormMode = 'create' | 'edit';

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'trial': return 'Trial';
    case 'active': return 'Active';
    case 'expired': return 'Expired';
    case 'cancelled': return 'Cancelled';
    default: return status;
  }
};

const getStatusClass = (status: string) => {
  const base = 'status-chip';
  switch (status) {
    case 'trial': return `${base} ${base}--info`;
    case 'active': return `${base} ${base}--active`;
    case 'expired': return `${base} ${base}--failed`;
    case 'cancelled': return `${base} ${base}--inactive`;
    default: return base;
  }
};

export default function SubscriptionsTab({ ctx }: SubscriptionsTabProps) {
  const { businesses } = ctx;

  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planFormMode, setPlanFormMode] = useState<PlanFormMode>('create');
  const [editingPlan, setEditingPlan] = useState<typeof businessSubscriptionPlans[0] | null>(null);
  const [localPlans, setLocalPlans] = useState(businessSubscriptionPlans);

  const handleAddPlan = useCallback(() => {
    setEditingPlan(null);
    setPlanFormMode('create');
    setShowPlanForm(true);
  }, []);

  const handleEditPlan = useCallback((plan: typeof businessSubscriptionPlans[0]) => {
    setEditingPlan(plan);
    setPlanFormMode('edit');
    setShowPlanForm(true);
  }, []);

  const handleDeletePlan = useCallback((planId: string) => {
    if (!window.confirm('Are you sure you want to delete this plan?')) return;
    setLocalPlans((prev) => prev.filter((p) => p.id !== planId));
  }, []);

  const handlePlanFormSave = useCallback((planData: typeof businessSubscriptionPlans[0]) => {
    if (planFormMode === 'create') {
      setLocalPlans((prev) => [...prev, planData]);
    } else {
      setLocalPlans((prev) => prev.map((p) => p.id === planData.id ? { ...planData } : p));
    }
    setShowPlanForm(false);
  }, [planFormMode]);

  const planDistribution = useMemo(() => (
    localPlans.map((plan) => {
      const count = businesses.filter((b) => {
        const accessState = getBusinessAccessState(b);
        return accessState.subscription.planId === plan.id;
      }).length;
      return { ...plan, count };
    })
  ), [localPlans, businesses]);

  return (
    <div className="dashboard-page-stack">
      <div className="dashboard-section-block">
        <div className="panel p-4 p-lg-5">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Subscription Plans</p>
              <h2 className="panel-title">All subscription plans</h2>
              <p className="panel-copy">
                Define subscription plans available for business owners.
              </p>
            </div>
            <button type="button" className="btn-app btn-app-primary" onClick={handleAddPlan}>
              <FaPlus />
              Add Plan
            </button>
          </div>

          <div className="table-wrapper mt-4">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Plan ID</th>
                  <th>Label</th>
                  <th>Duration</th>
                  <th>Type</th>
                  <th>Businesses</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {planDistribution.map((plan) => (
                  <tr key={plan.id}>
                    <td><code>{plan.id}</code></td>
                    <td className="fw-semibold">{plan.label}</td>
                    <td>{plan.durationLabel}</td>
                    <td>
                      {plan.isTrial ? (
                        <span className="status-chip status-chip--active"><FaCheck /> Trial</span>
                      ) : (
                        <span className="status-chip status-chip--inactive"><FaTimes /> Paid</span>
                      )}
                    </td>
                    <td><span className="fw-semibold">{plan.count}</span> business{plan.count !== 1 ? 'es' : ''}</td>
                    <td>
                      <div className="table-actions">
                        <button type="button" className="btn-icon-sm btn-icon-sm--primary" onClick={() => handleEditPlan(plan)} title="Edit plan">
                          <FaEdit />
                        </button>
                        <button type="button" className="btn-icon-sm btn-icon-sm--danger" onClick={() => handleDeletePlan(plan.id)} title="Delete plan">
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {planDistribution.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-4">No subscription plans defined.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="dashboard-section-block">
        <div className="panel p-4 p-lg-5">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Business Subscriptions</p>
              <h2 className="panel-title">Active business subscriptions</h2>
              <p className="panel-copy">View which plan each business is on.</p>
            </div>
          </div>

          <div className="table-wrapper mt-4">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Business</th>
                  <th>Plan</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {businesses.map((b) => {
                  const accessState = getBusinessAccessState(b);
                  const plan = getBusinessSubscriptionPlan(accessState.subscription.planId);
                  return (
                    <tr key={b.id}>
                      <td className="fw-semibold">{b.name || b.email}</td>
                      <td>{plan?.label || 'Unknown'}</td>
                      <td>{accessState.subscription.startDate}</td>
                      <td>{accessState.subscription.endDate}</td>
                      <td><span className={getStatusClass(accessState.subscription.status)}>{getStatusLabel(accessState.subscription.status)}</span></td>
                    </tr>
                  );
                })}
                {businesses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center text-muted py-4">No businesses found.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showPlanForm ? (
        <PlanForm
          mode={planFormMode}
          initialValues={editingPlan}
          onSave={handlePlanFormSave}
          onClose={() => setShowPlanForm(false)}
        />
      ) : null}
    </div>
  );
}