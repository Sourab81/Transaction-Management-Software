import React from 'react';

interface RemarkCellProps {
  value?: string | null;
  fallback?: string;
}

const RemarkCell: React.FC<RemarkCellProps> = ({ value, fallback = '-' }) => {
  const remark = typeof value === 'string' ? value.trim() : '';

  if (!remark) {
    return <span className="data-table__secondary">{fallback}</span>;
  }

  return (
    <span
  style={{
    display: "inline-block",
    width: "10rem",
    overflow: "hidden",
    textOverflow: "",
    wordWrap: "break-word",
  }}
>
  {remark}
</span>
    // <span className="remark-cell" title={remark}>
    //   {remark}
    // </span>
  );
};

export default RemarkCell;
