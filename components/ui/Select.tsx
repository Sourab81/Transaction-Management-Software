import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
  error?: string;
}

const Select: React.FC<SelectProps> = ({ label, options, error, className = '', ...props }) => {
  return (
    <div className="app-field">
      {label && (
        <label className="form-label">
          {label}
        </label>
      )}
      <select
        className={`form-select ${error ? 'is-invalid' : ''} ${className}`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <div className="form-hint text-danger">{error}</div>}
    </div>
  );
};

export default Select;
