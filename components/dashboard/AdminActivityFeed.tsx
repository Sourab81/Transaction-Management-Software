'use client';

import { useEffect, useState } from 'react';
import { getAdminActivityLogs } from '../../lib/api/activity-logs';
import { mapActivityLogResponse, type ActivityLogRow } from '../../lib/mappers/activity-log-mapper';
import { formatDateTime } from '../../src/utils/dateFormatter';

interface AdminActivityFeedProps {
  onViewAll?: () => void;
}

const operationColor: Record<string, string> = {
  CREATE: 'text-success',
  UPDATE: 'text-primary',
  DELETE: 'text-danger',
  LOGIN: 'text-info',
  LOGOUT: 'text-secondary',
};

export default function AdminActivityFeed({ onViewAll }: AdminActivityFeedProps) {
  const [rows, setRows] = useState<ActivityLogRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const payload = await getAdminActivityLogs({ limit: 10 });
        if (cancelled) return;
        const mapped = mapActivityLogResponse(payload);
        setRows(mapped.data.slice(0, 10));
      } catch {
        if (cancelled) return;
        setRows([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  if (isLoading) {
    return (
      <div className="p-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="placeholder-glow mb-2">
            <span className="placeholder col-12" style={{ height: 20 }} />
          </div>
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-4 text-muted">
        <p className="mb-0 small">No recent activity.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="list-group list-group-flush">
        {rows.map((row) => (
          <div key={row.id} className="list-group-item px-0 py-2 border-0 d-flex align-items-start gap-2">
            <span className={`fw-semibold small ${operationColor[row.operation] || ''}`} style={{ minWidth: 60 }}>
              {row.operation}
            </span>
            <div className="flex-grow-1 min-w-0">
              <span className="small text-muted">{row.userName}</span>
              {row.remark && <span className="small text-muted ms-1">— {row.remark}</span>}
            </div>
            <small className="text-muted text-nowrap">{row.addedDate ? formatDateTime(row.addedDate) : ''}</small>
          </div>
        ))}
      </div>
      {onViewAll && (
        <div className="text-end mt-2">
          <button type="button" className="btn btn-sm btn-link text-decoration-none" onClick={onViewAll}>
            View All Activity →
          </button>
        </div>
      )}
    </div>
  );
}
