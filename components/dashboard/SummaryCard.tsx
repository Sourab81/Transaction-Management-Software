import React from 'react';

export interface SummaryCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  detail: string;
  colorClass: string;
}

const summaryColorMap: Record<string, string> = {
  'bg-primary': 'blue',
  'bg-success': 'green',
  'bg-warning': 'orange',
  'bg-info': 'purple',
  'bg-danger': 'red',
};

const SummaryCard: React.FC<SummaryCardProps> = ({ icon, title, value, detail, colorClass }) => {
  const tone = summaryColorMap[colorClass] || 'blue';

  return (
    <div className={`metric-card summary-card--${tone}`}>
      <div className="metric-card__top">
        <div>
          <p className="metric-card__label">{title}</p>
          <p className="metric-card__value">{value}</p>
        </div>
        <div className="metric-card__icon">{icon}</div>
      </div>
      <p className="metric-card__detail">{detail}</p>
    </div>
  );
};

export default SummaryCard;
