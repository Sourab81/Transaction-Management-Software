'use client';

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { FaChartLine, FaCheckCircle, FaExclamationTriangle, FaHourglassHalf, FaUsers } from 'react-icons/fa';
import type { Business } from '../../lib/store';
import AdminActivityFeed from './AdminActivityFeed';
import DashboardCard from './DashboardCard';

interface AdminDashboardContentProps {
  businesses: Business[];
  customerMetrics: {
    total: number;
    oneWeekInactive: number;
    oneMonthInactive: number;
    sixMonthsInactive: number;
  };
  isLoading: boolean;
  openModule: (moduleId: string) => void;
}

const PLAN_LABELS: Record<string, string> = {
  'trial-1-week': 'Trial',
  'month-1': '1 Month',
  'month-6': '6 Months',
  'year-1': '1 Year',
  'year-3': '3 Years',
  'year-5': '5 Years',
  'year-10': '10 Years',
};

const PLAN_COLORS = ['#22c55e', '#3b82f6', '#f97316', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b'];

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const EXPIRING_SOON_DAYS = 7;

export default function AdminDashboardContent({ businesses, customerMetrics, isLoading, openModule }: AdminDashboardContentProps) {
  const activeCount = businesses.filter((b) => b.status === 'Active').length;
  const inactiveCount = businesses.length - activeCount;

  const expiringSoon = useMemo(() => {
    const now = new Date();
    const deadline = new Date(now.getTime() + EXPIRING_SOON_DAYS * 24 * 60 * 60 * 1000);
    return businesses.filter((b) => {
      const endDate = b.subscription?.endDate;
      if (!endDate) return false;
      const d = new Date(endDate);
      return d >= now && d <= deadline;
    }).length;
  }, [businesses]);

  const planData = useMemo(() => {
    const counts: Record<string, number> = {};
    businesses.forEach((b) => {
      const planId = b.subscription?.planId || 'unknown';
      counts[planId] = (counts[planId] || 0) + 1;
    });
    return Object.entries(counts).map(([planId, value]) => ({
      name: PLAN_LABELS[planId] || planId,
      value,
      color: PLAN_COLORS[Object.keys(PLAN_LABELS).indexOf(planId)] || '#94a3b8',
    })).filter((d) => d.value > 0);
  }, [businesses]);

  const registrationData = useMemo(() => {
    const counts = new Array(12).fill(0);
    const now = new Date();
    const currentMonth = now.getMonth();
    businesses.forEach((b) => {
      if (!b.joinedDate) return;
      const d = new Date(b.joinedDate);
      if (isNaN(d.getTime())) return;
      const monthIndex = d.getMonth();
      counts[monthIndex]++;
    });
    const months = Array.from({ length: 12 }, (_, i) => {
      const idx = (currentMonth - 11 + i + 12) % 12;
      return { month: MONTH_NAMES[idx], count: counts[idx] };
    });
    return months;
  }, [businesses]);

  const activeSubscriptions = businesses.filter((b) => b.subscription && b.subscription.status !== 'expired' && b.subscription.status !== 'cancelled').length;

  return (
    <div className="row g-4">
      <div className="col-12">
        <section className="hero-panel glass-card">
          <div className="hero-panel__content">
            <div className="hero-panel__intro">
              <p className="eyebrow">Customer Insights</p>
              <h1 className="hero-panel__headline">Monitor your platform growth.</h1>
              <div className="section-hero__actions">
                <button type="button" className="btn-app btn-app-primary" onClick={() => openModule('customers')}>
                  Open Users
                </button>
                <button type="button" className="btn-app btn-app-secondary" onClick={() => openModule('reports')}>
                  Open Reports
                </button>
              </div>
            </div>

            <div className="hero-panel__meta">
              <div className="hero-stat hero-stat--blue">
                <span className="d-flex align-items-center gap-2 mb-1">
                  <FaUsers size={14} color="#3b82f6" />
                  <span className="hero-stat__label">Total Users</span>
                </span>
                <span className="hero-stat__value">{customerMetrics.total}</span>
                <span className="hero-stat__hint">Registered in the admin workspace</span>
              </div>
              <div className="hero-stat hero-stat--green">
                <span className="d-flex align-items-center gap-2 mb-1">
                  <FaCheckCircle size={14} color="#22c55e" />
                  <span className="hero-stat__label">Active Workspaces</span>
                </span>
                <span className="hero-stat__value">{activeCount}</span>
                <span className="hero-stat__hint">Users with active subscriptions</span>
              </div>
              <div className="hero-stat hero-stat--red">
                <span className="d-flex align-items-center gap-2 mb-1">
                  <FaExclamationTriangle size={14} color="#ef4444" />
                  <span className="hero-stat__label">Inactive Workspaces</span>
                </span>
                <span className="hero-stat__value">{inactiveCount}</span>
                <span className="hero-stat__hint">Users with inactive subscriptions</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="col-12 col-md-6 col-xl-3">
        <DashboardCard title="Total Users" value={customerMetrics.total} icon={<FaUsers />} color="blue" loading={isLoading} />
      </div>

      <div className="col-12 col-md-6 col-xl-3">
        <DashboardCard title="Active Subscriptions" value={activeSubscriptions} icon={<FaChartLine />} color="green" loading={isLoading} />
      </div>

      <div className="col-12 col-md-6 col-xl-3">
        <DashboardCard title="Expiring in 7 Days" value={expiringSoon} icon={<FaHourglassHalf />} color="orange" loading={isLoading} />
      </div>

      <div className="col-12 col-md-6 col-xl-3">
        <DashboardCard title="Inactive Users" value={inactiveCount} icon={<FaExclamationTriangle />} color="red" loading={isLoading} />
      </div>

      <div className="col-12 col-xl-6">
        <section className="panel p-4 h-100">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Registration Trend</p>
              <h2 className="panel-title">User Registrations by Month</h2>
            </div>
          </div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={registrationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="col-12 col-xl-6">
        <section className="panel p-4 h-100">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Plan Distribution</p>
              <h2 className="panel-title">Subscription Plans</h2>
            </div>
          </div>
          <div style={{ height: 260 }}>
            {planData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={planData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`} labelLine>
                    {planData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="d-flex align-items-center justify-content-center h-100 text-muted">
                <p className="mb-0">No subscription data available.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="col-12">
        <section className="panel p-4">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Activity Log</p>
              <h2 className="panel-title">Recent Admin Activity</h2>
            </div>
          </div>
          <AdminActivityFeed onViewAll={() => openModule('reports')} />
        </section>
      </div>

      <div className="col-12">
        <section className="panel p-4">
          <div className="d-flex flex-wrap gap-2">
            <button type="button" className="btn-app btn-app-primary" onClick={() => openModule('customers')}>
              Open Users
            </button>
            <button type="button" className="btn-app btn-app-secondary" onClick={() => openModule('reports')}>
              Open Reports
            </button>
            <button type="button" className="btn-app btn-app-secondary" onClick={() => openModule('subscriptions')}>
              Subscriptions
            </button>
            <button type="button" className="btn-app btn-app-secondary" onClick={() => openModule('role')}>
              Role Management
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
