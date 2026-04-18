import React from 'react';
import SummaryCard, { type SummaryCardProps } from './SummaryCard';

interface SummaryGridProps {
  cards: SummaryCardProps[];
}

const SummaryGrid: React.FC<SummaryGridProps> = ({ cards }) => (
  <div className="row g-4 mb-4 summary-grid">
    {cards.map((item) => (
      <div key={item.title} className="col-12 col-md-6 col-xl-3">
        <SummaryCard {...item} />
      </div>
    ))}
  </div>
);

export default SummaryGrid;
