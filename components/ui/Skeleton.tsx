import React from 'react';

interface SkeletonBlockProps {
  className?: string;
  width?: string;
  height?: string;
  rounded?: boolean;
}

export const SkeletonBlock: React.FC<SkeletonBlockProps> = ({
  className = '',
  width,
  height,
  rounded = true,
}) => (
  <span
    className={`placeholder ${rounded ? 'rounded' : ''} ${className}`.trim()}
    aria-hidden="true"
    style={{
      width,
      height,
    }}
  />
);

interface SkeletonCardProps {
  className?: string;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ className = '' }) => (
  <div className={`metric-card skeleton-card placeholder-glow ${className}`.trim()} aria-hidden="true">
    <div className="metric-card__top">
      <div className="skeleton-card__body">
        <SkeletonBlock width="7rem" height="0.75rem" />
        <SkeletonBlock width="5.5rem" height="2rem" className="mt-3" />
      </div>
      <SkeletonBlock width="3.4rem" height="3.4rem" className="skeleton-card__icon" />
    </div>
    <SkeletonBlock width="70%" height="0.85rem" className="mt-4" />
  </div>
);

interface SkeletonTableProps {
  columns: number;
  rows?: number;
}

const cellWidths = ['72%', '46%', '58%', '38%', '64%', '50%', '42%', '56%'];

export const SkeletonTable: React.FC<SkeletonTableProps> = ({
  columns,
  rows = 5,
}) => (
  <>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <tr key={`skeleton-row-${rowIndex}`} className="data-table__skeleton-row placeholder-glow" aria-hidden="true">
        {Array.from({ length: columns }).map((__, columnIndex) => (
          <td key={`skeleton-cell-${rowIndex}-${columnIndex}`}>
            <SkeletonBlock
              width={cellWidths[(rowIndex + columnIndex) % cellWidths.length]}
              height="0.9rem"
            />
          </td>
        ))}
      </tr>
    ))}
  </>
);

interface SkeletonFormFieldProps {
  className?: string;
}

export const SkeletonFormField: React.FC<SkeletonFormFieldProps> = ({ className = '' }) => (
  <div className={`app-field placeholder-glow ${className}`.trim()} aria-hidden="true">
    <SkeletonBlock width="5rem" height="0.75rem" className="mb-2" />
    <SkeletonBlock width="100%" height="2.75rem" />
  </div>
);
