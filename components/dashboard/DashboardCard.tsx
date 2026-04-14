import React from 'react';
import { FaArrowUp, FaArrowDown } from 'react-icons/fa';

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'blue' | 'green' | 'purple' | 'orange';
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, value, icon, trend, color = 'blue' }) => {
  const colorClasses = {
    blue: {
      bg: 'bg-primary-subtle',
      border: 'border-primary-subtle',
      icon: 'text-primary',
      trend: 'text-primary',
    },
    green: {
      bg: 'bg-success-subtle',
      border: 'border-success-subtle',
      icon: 'text-success',
      trend: 'text-success',
    },
    purple: {
      bg: 'bg-info-subtle',
      border: 'border-info-subtle',
      icon: 'text-info',
      trend: 'text-info',
    },
    orange: {
      bg: 'bg-warning-subtle',
      border: 'border-warning-subtle',
      icon: 'text-warning',
      trend: 'text-warning',
    },
  };

  const colors = colorClasses[color];

  return (
    <div className={`card border-0 shadow-sm h-100 ${colors.bg} ${colors.border}`} style={{borderRadius: '1.5rem'}}>
      <div className="card-body p-4">
        <div className="d-flex align-items-center justify-content-between">
          <div className="flex-fill">
            <p className="text-muted small mb-1 fw-medium">{title}</p>
            <p className="h3 mb-2 fw-bold text-dark">{value}</p>
            {trend && (
              <div className="d-flex align-items-center gap-1">
                <span className={`d-inline-flex align-items-center gap-1 small fw-medium ${colors.trend}`}>
                  {trend.isPositive ? <FaArrowUp className="fs-6" /> : <FaArrowDown className="fs-6" />}
                  {trend.isPositive ? '+' : ''}{trend.value}%
                </span>
                <span className="text-muted small">vs last month</span>
              </div>
            )}
          </div>
          {icon && (
            <div className={`d-flex align-items-center justify-content-center rounded-3 bg-white ${colors.icon} fs-4 shadow-sm`} style={{width: '3rem', height: '3rem'}}>
              {icon}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardCard;