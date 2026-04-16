import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="app-field">
      {label && (
        <label className="form-label">
          {label}
        </label>
      )}
      <input
        className={`form-control ${error ? 'is-invalid' : ''} ${className}`}
        {...props}
      />
      {error && <div className="form-hint text-danger">{error}</div>}
    </div>
  );
};

export default Input;
