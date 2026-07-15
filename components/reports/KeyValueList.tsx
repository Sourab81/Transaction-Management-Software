'use client';

import { Fragment } from 'react';

interface KeyValueListProps {
  data: unknown;
  label?: string;
  depth?: number;
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed === '' || trimmed === '0000-00-00' || trimmed === '0000-00-00 00:00:00') return '—';
    return val;
  }
  return '';
}

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

export default function KeyValueList({ data, label, depth = 0 }: KeyValueListProps) {
  const indent = depth * 16;

  if (data === null || data === undefined) {
    return (
      <div style={{ paddingLeft: indent }} className="small">
        {label && <span className="fw-semibold me-1">{label}:</span>}
        <span className="text-muted">—</span>
      </div>
    );
  }

  if (typeof data === 'boolean') {
    return (
      <div style={{ paddingLeft: indent }} className="small">
        {label && <span className="fw-semibold me-1">{label}:</span>}
        <span style={{ color: data ? '#1a7f37' : '#cf222e' }}>{data ? '✔ Yes' : '✘ No'}</span>
      </div>
    );
  }

  if (typeof data === 'number') {
    return (
      <div style={{ paddingLeft: indent }} className="small">
        {label && <span className="fw-semibold me-1">{label}:</span>}
        <span style={{ color: '#8250df' }}>{data}</span>
      </div>
    );
  }

  if (typeof data === 'string') {
    const display = formatValue(data);
    return (
      <div style={{ paddingLeft: indent }} className="small">
        {label && <span className="fw-semibold me-1">{label}:</span>}
        <span>{display}</span>
      </div>
    );
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return (
        <div style={{ paddingLeft: indent }} className="small">
          {label && <span className="fw-semibold me-1">{label}:</span>}
          <span className="text-muted">(empty)</span>
        </div>
      );
    }
    return (
      <div style={{ paddingLeft: indent }}>
        {label && <div className="small fw-semibold mb-1">{label}:</div>}
        {data.map((item, idx) => (
          <div key={idx} style={{ paddingLeft: 16 }}>
            <span className="small text-muted">[{idx}]</span>
            {isPlainObject(item) || Array.isArray(item) ? (
              <KeyValueList data={item} depth={0} />
            ) : (
              <span className="small"> {formatValue(item) || JSON.stringify(item)}</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (isPlainObject(data)) {
    const entries = Object.entries(data);
    if (entries.length === 0) {
      return (
        <div style={{ paddingLeft: indent }} className="small">
          {label && <span className="fw-semibold me-1">{label}:</span>}
          <span className="text-muted">(empty)</span>
        </div>
      );
    }
    return (
      <div style={{ paddingLeft: indent }}>
        {label && <div className="small fw-semibold mb-1">{label}:</div>}
        {entries.map(([key, value]) => (
          <Fragment key={key}>
            {isPlainObject(value) || Array.isArray(value) ? (
              <KeyValueList data={value} label={key} depth={0} />
            ) : (
              <KeyValueList data={value} label={key} depth={0} />
            )}
          </Fragment>
        ))}
      </div>
    );
  }

  return (
    <div style={{ paddingLeft: indent }} className="small">
      {label && <span className="fw-semibold me-1">{label}:</span>}
      <span>{String(data)}</span>
    </div>
  );
}
