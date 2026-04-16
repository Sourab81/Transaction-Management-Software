import React from 'react';
import { FaArrowDown, FaArrowUp } from 'react-icons/fa';

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, value, icon, trend, color = 'blue' }) => {
  return (
    <div className={`metric-card metric-card--${color}`}>
      <div className="metric-card__top">
        <div>
          <p className="metric-card__label">{title}</p>
          <p className="metric-card__value">{value}</p>
        </div>
        {icon && <div className="metric-card__icon">{icon}</div>}
      </div>

      {trend ? (
        <div className="metric-card__trend">
          <strong className={trend.isPositive ? 'text-success' : 'text-danger'}>
            {trend.isPositive ? <FaArrowUp size={11} /> : <FaArrowDown size={11} />}
            <span className="ms-1">{trend.isPositive ? '+' : ''}{trend.value}%</span>
          </strong>
          <span>vs last month</span>
        </div>
      ) : null}
    </div>
  );
};

export default DashboardCard;
