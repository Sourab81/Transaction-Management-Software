import type { ReactNode } from 'react';

interface DetailListProps {
  rows: Array<[string, ReactNode]>;
}

export default function DetailList({ rows }: DetailListProps) {
  return (
    <div className="detail-list">
      {rows.map(([label, value]) => (
        <div key={label} className="detail-row">
          <span className="detail-label">{label}</span>
          <span className="detail-value">{value}</span>
        </div>
      ))}
    </div>
  );
}
