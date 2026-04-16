'use client';

export type BusinessSubscriptionPlanId = 'trial-1-week' | 'month-1' | 'month-6' | 'year-1' | 'year-3' | 'year-10';
export type BusinessSubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled';
export type BusinessStatusReason = 'manual' | 'subscription-expired' | 'subscription-cancelled';

export interface BusinessSubscriptionPlan {
  id: BusinessSubscriptionPlanId;
  label: string;
  durationLabel: string;
  description: string;
  isTrial?: boolean;
  duration: {
    unit: 'days' | 'months' | 'years';
    value: number;
  };
}

export interface BusinessSubscription {
  planId: BusinessSubscriptionPlanId;
  startDate: string;
  endDate: string;
  status: BusinessSubscriptionStatus;
  cancelledAt?: string;
  updatedAt: string;
}

export interface BusinessSubscriptionSnapshot extends BusinessSubscription {
  plan: BusinessSubscriptionPlan;
  daysRemaining: number;
  isAccessible: boolean;
}

export interface BusinessAccessState {
  status: 'Active' | 'Inactive';
  reason?: BusinessStatusReason;
  subscription: BusinessSubscriptionSnapshot;
  isSubscriptionLocked: boolean;
  allowBusinessOwnerLogin: boolean;
  allowEmployeeLogin: boolean;
}

interface BusinessSubscriptionSubject {
  status?: 'Active' | 'Inactive';
  statusReason?: BusinessStatusReason;
  joinedDate?: string;
  subscription?: Partial<BusinessSubscription> | null;
}

const today = () => new Date().toISOString().split('T')[0];
const nowIso = () => new Date().toISOString();

export const businessSubscriptionPlans: BusinessSubscriptionPlan[] = [
  {
    id: 'trial-1-week',
    label: '1 Week Trial',
    durationLabel: '7 days',
    description: 'A short trial plan for first-time business users.',
    isTrial: true,
    duration: { unit: 'days', value: 7 },
  },
  {
    id: 'month-1',
    label: '1 Month',
    durationLabel: '1 month',
    description: 'A compact monthly plan for light usage.',
    duration: { unit: 'months', value: 1 },
  },
  {
    id: 'month-6',
    label: '6 Months',
    durationLabel: '6 months',
    description: 'A longer medium-term plan for stable business operations.',
    duration: { unit: 'months', value: 6 },
  },
  {
    id: 'year-1',
    label: '1 Year',
    durationLabel: '1 year',
    description: 'A standard annual subscription for uninterrupted workflows.',
    duration: { unit: 'years', value: 1 },
  },
  {
    id: 'year-3',
    label: '3 Years',
    durationLabel: '3 years',
    description: 'A long-term plan for established business teams.',
    duration: { unit: 'years', value: 3 },
  },
  {
    id: 'year-10',
    label: '10 Years',
    durationLabel: '10 years',
    description: 'An extended plan for businesses that want a very long runway.',
    duration: { unit: 'years', value: 10 },
  },
];

const getFallbackPlan = () => businessSubscriptionPlans[0];

export const getBusinessSubscriptionPlan = (planId?: BusinessSubscriptionPlanId | null) =>
  businessSubscriptionPlans.find((plan) => plan.id === planId) ?? getFallbackPlan();

const parseDate = (value?: string) => {
  const resolvedValue = value || today();
  const parsed = new Date(`${resolvedValue}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date(`${today()}T00:00:00`) : parsed;
};

const formatDate = (value: Date) => value.toISOString().split('T')[0];

export const calculateBusinessSubscriptionEndDate = (
  planId: BusinessSubscriptionPlanId,
  startDate = today(),
) => {
  const plan = getBusinessSubscriptionPlan(planId);
  const endDate = parseDate(startDate);

  if (plan.duration.unit === 'days') {
    endDate.setDate(endDate.getDate() + plan.duration.value);
  } else if (plan.duration.unit === 'months') {
    endDate.setMonth(endDate.getMonth() + plan.duration.value);
  } else {
    endDate.setFullYear(endDate.getFullYear() + plan.duration.value);
  }

  endDate.setDate(endDate.getDate() - 1);
  return formatDate(endDate);
};

export const createBusinessSubscription = (
  planId: BusinessSubscriptionPlanId,
  startDate = today(),
): BusinessSubscription => {
  const plan = getBusinessSubscriptionPlan(planId);

  return {
    planId: plan.id,
    startDate,
    endDate: calculateBusinessSubscriptionEndDate(plan.id, startDate),
    status: plan.isTrial ? 'trial' : 'active',
    updatedAt: nowIso(),
  };
};

const buildSubscriptionSnapshot = (
  subject?: BusinessSubscriptionSubject | null,
  referenceDate = today(),
): BusinessSubscriptionSnapshot => {
  const source = subject?.subscription;
  const plan = getBusinessSubscriptionPlan(source?.planId as BusinessSubscriptionPlanId | undefined);
  const startDate = source
    ? source.startDate || subject?.joinedDate || today()
    : today();
  const endDate = source?.endDate || calculateBusinessSubscriptionEndDate(plan.id, startDate);
  const cancelledAt = source?.cancelledAt?.trim() || undefined;
  const isCancelled = Boolean(cancelledAt) || source?.status === 'cancelled';
  const isExpired = !isCancelled && parseDate(referenceDate).getTime() > parseDate(endDate).getTime();
  const status: BusinessSubscriptionStatus = isCancelled
    ? 'cancelled'
    : isExpired
      ? 'expired'
      : plan.isTrial
        ? 'trial'
        : 'active';
  const daysRemaining = status === 'cancelled' || status === 'expired'
    ? 0
    : Math.max(
        0,
        Math.floor((parseDate(endDate).getTime() - parseDate(referenceDate).getTime()) / (1000 * 60 * 60 * 24)) + 1,
      );

  return {
    planId: plan.id,
    plan,
    startDate,
    endDate,
    status,
    cancelledAt,
    updatedAt: source?.updatedAt || nowIso(),
    daysRemaining,
    isAccessible: status === 'trial' || status === 'active',
  };
};

export const toStoredBusinessSubscription = (
  subscription: BusinessSubscriptionSnapshot | BusinessSubscription,
): BusinessSubscription => ({
  planId: subscription.planId,
  startDate: subscription.startDate,
  endDate: subscription.endDate,
  status: subscription.status,
  cancelledAt: subscription.cancelledAt,
  updatedAt: subscription.updatedAt,
});

export const getBusinessSubscriptionSnapshot = (
  subject?: BusinessSubscriptionSubject | null,
  referenceDate = today(),
) => buildSubscriptionSnapshot(subject, referenceDate);

export const getBusinessAccessState = (
  subject?: BusinessSubscriptionSubject | null,
  referenceDate = today(),
): BusinessAccessState => {
  const subscription = buildSubscriptionSnapshot(subject, referenceDate);
  const isManualInactive = subject?.status === 'Inactive'
    && subject?.statusReason !== 'subscription-expired'
    && subject?.statusReason !== 'subscription-cancelled';

  if (isManualInactive) {
    return {
      status: 'Inactive',
      reason: 'manual',
      subscription,
      isSubscriptionLocked: false,
      allowBusinessOwnerLogin: false,
      allowEmployeeLogin: false,
    };
  }

  if (subscription.status === 'expired') {
    return {
      status: 'Inactive',
      reason: 'subscription-expired',
      subscription,
      isSubscriptionLocked: true,
      allowBusinessOwnerLogin: true,
      allowEmployeeLogin: false,
    };
  }

  if (subscription.status === 'cancelled') {
    return {
      status: 'Inactive',
      reason: 'subscription-cancelled',
      subscription,
      isSubscriptionLocked: true,
      allowBusinessOwnerLogin: true,
      allowEmployeeLogin: false,
    };
  }

  return {
    status: 'Active',
    reason: undefined,
    subscription,
    isSubscriptionLocked: false,
    allowBusinessOwnerLogin: true,
    allowEmployeeLogin: true,
  };
};
