import React from 'react';
import SummaryCard, { type SummaryCardProps } from './SummaryCard';
import { SkeletonCard } from '../ui/Skeleton';

interface SummaryGridProps {
  cards: SummaryCardProps[];
  loading?: boolean;
  skeletonCount?: number;
}

const SummaryGrid: React.FC<SummaryGridProps> = ({
  cards,
  loading = false,
  skeletonCount,
}) => {
  const visibleSkeletonCount = skeletonCount ?? (cards.length > 0 ? cards.length : 4);

  return (
    <div className="row g-4 mb-4 summary-grid">
      {loading
        ? Array.from({ length: visibleSkeletonCount }).map((_, index) => (
          <div key={`summary-skeleton-${index}`} className="col-12 col-md-6 col-xl-3">
            <SkeletonCard />
          </div>
        ))
        : cards.map((item) => (
          <div key={item.title} className="col-12 col-md-6 col-xl-3">
            <SummaryCard {...item} />
          </div>
        ))}
    </div>
  );
};

export default SummaryGrid;
