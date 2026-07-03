import React from 'react';

interface CustomerNameProps {
  name?: string | null;
  color?: string | null;
  className?: string;
  fallback?: string;
}

const CustomerName: React.FC<CustomerNameProps> = ({
  name,
  color,
  className = 'data-table__primary',
  fallback = '-',
}) => (
  <span className={className} style={color ? { color } : undefined}>
    {name || fallback}
  </span>
);

export default CustomerName;
