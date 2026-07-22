'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type PieLabelRenderProps,
} from 'recharts';
import { FaCog, FaSms, FaUsers } from 'react-icons/fa';
import type { DashboardStats } from '../../lib/hooks/useDashboardStats';
import SummaryCard from './SummaryCard';
import { SkeletonBlock, SkeletonCard } from '../ui/Skeleton';

interface DashboardStatsSectionProps {
  stats: DashboardStats | null;
  isLoading: boolean;
  role?: string;
}

const amountColors = {
  advance: '#22c55e',
  due: '#ef4444',
  bank: '#f97316',
  counter: '#06b6d4',
};

const formatCurrency = (value: number) => `₹${value.toLocaleString('en-IN')}`;

const renderPieLabel = (props: PieLabelRenderProps) => {
  const percent = Number(props.percent ?? 0);
  const value = Number(props.value ?? 0);
  if (percent <= 0.05) return '';
  return `${String(props.name ?? '')}: ${formatCurrency(value)}`;
};

const NoData = () => (
  <div className="d-flex align-items-center justify-content-center h-100 page-muted">
    No data
  </div>
);

const ChartSkeleton = () => (
  <div className="placeholder-glow d-flex flex-column gap-3 p-3" aria-hidden="true">
    <SkeletonBlock width="35%" height="1rem" />
    <SkeletonBlock width="100%" height="15rem" />
  </div>
);

export default function DashboardStatsSection({ stats, isLoading, role }: DashboardStatsSectionProps) {
  const statCards = stats?.statCards;
  const amountEntries = stats ? [
    { name: 'Advance', value: stats.amountsPie.advance, color: amountColors.advance },
    { name: 'Due', value: stats.amountsPie.due, color: amountColors.due },
    { name: 'Bank', value: stats.amountsPie.bank, color: amountColors.bank },
    { name: 'Counter', value: stats.amountsPie.counter, color: amountColors.counter },
  ] : [];
  const hasAmountData = amountEntries.some((item) => item.value !== 0);
  const topServices = stats?.topServices ?? [];
  const topUsers = stats?.topUsers ?? [];

  if (!stats && !isLoading) return null;
  return (
    
    <div className="dashboard-section-stack">
      <div className="dashboard-section-block">
        <div className="row g-4">
          {isLoading && !statCards ? (
            Array.from({ length: 8 }).map((_, index) => (
              <div key={`dashboard-stats-skeleton-${index}`} className="col-6 col-xl-3">
                <SkeletonCard />
              </div>
            ))
          ) : (
            <>
              <div className="col-6 col-xl-3">
                <SummaryCard icon={<FaCog />} title="Today Services" value={String(statCards?.todayServices ?? 0)} detail="Services created today" colorClass="bg-warning" />
              </div>
              <div className="col-6 col-xl-3">
                <SummaryCard icon={<FaCog />} title="Total Services" value={String(statCards?.totalServices ?? 0)} detail="All service records" colorClass="bg-warning" />
              </div>
              <div className="col-6 col-xl-3">
                <SummaryCard icon={<FaUsers />} title="Today Customers" value={String(statCards?.todayCustomers ?? 0)} detail="Customers added today" colorClass="bg-success" />
              </div>
              <div className="col-6 col-xl-3">
                <SummaryCard icon={<FaUsers />} title="Total Customers" value={String(statCards?.totalCustomers ?? 0)} detail="All customer records" colorClass="bg-success" />
              </div>
              {role !== 'Employee' && (
                <>
                  <div className="col-6 col-xl-3">
                    <SummaryCard icon={<FaUsers />} title="Active Users" value={String(statCards?.activeUsers ?? 0)} detail="Currently active users" colorClass="bg-warning" />
                  </div>
                  <div className="col-6 col-xl-3">
                    <SummaryCard icon={<FaUsers />} title="Total Users" value={String(statCards?.totalUsers ?? 0)} detail="All user accounts" colorClass="bg-warning" />
                  </div>
                  <div className="col-6 col-xl-3">
                    <SummaryCard icon={<FaSms />} title="Today SMS" value={String(statCards?.todaySms ?? 0)} detail="Messages sent today" colorClass="bg-success" />
                  </div>
                  <div className="col-6 col-xl-3">
                    <SummaryCard icon={<FaSms />} title="Total Send/Remaining SMS" value={statCards?.totalSms ?? '0'} detail="SMS usage balance" colorClass="bg-success" />
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <div className="dashboard-section-block">
        <div className="row g-4">
          {role === 'Employee' ? (
            <div className="col-12 col-xl-6">
              <section className="panel p-4 h-100">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">User Ranking</p>
                    <h2 className="panel-title">Top 5 Users</h2>
                  </div>
                </div>
                <div style={{ height: 300 }}>
                  {isLoading && !stats ? (
                    <ChartSkeleton />
                  ) : topUsers.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={topUsers}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tickLine={false} />
                        <YAxis tickFormatter={(value) => formatCurrency(Number(value))} />
                        <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Service Charge']} />
                        <Legend />
                        <Bar dataKey="totalServiceCharge" name="Service Charge" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <NoData />
                  )}
                </div>
              </section>
            </div>
          ) : (
            <div className="col-12 col-xl-6">
              <section className="panel p-4 h-100">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">Financial Snapshot</p>
                    <h2 className="panel-title">Amounts</h2>
                  </div>
                </div>
                <div style={{ height: 300 }}>
                  {isLoading && !stats ? (
                    <ChartSkeleton />
                  ) : hasAmountData ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={amountEntries} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label={renderPieLabel} labelLine>
                          {amountEntries.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <NoData />
                  )}
                </div>
              </section>
            </div>
          )}

          <div className="col-12 col-xl-6">
            <section className="panel p-4 h-100">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Service Ranking</p>
                  <h2 className="panel-title">Top 5 Services</h2>
                </div>
              </div>
              <div style={{ height: 300 }}>
                {isLoading && !stats ? (
                  <ChartSkeleton />
                ) : topServices.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topServices}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tickLine={false} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="monthCount" name="Month" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="weekCount" name="Week" fill="#d1d5db" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <NoData />
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      {role !== 'Employee' && (
        <div className="dashboard-section-block">
          <section className="panel p-4">
            <div className="panel-header">
              <div>
                <p className="eyebrow">User Ranking</p>
                <h2 className="panel-title">Top 5 Users</h2>
              </div>
            </div>
            <div style={{ height: 300 }}>
              {isLoading && !stats ? (
                <ChartSkeleton />
              ) : topUsers.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topUsers}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} />
                    <YAxis tickFormatter={(value) => formatCurrency(Number(value))} />
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Service Charge']} />
                    <Legend />
                    <Bar dataKey="totalServiceCharge" name="Service Charge" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <NoData />
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
