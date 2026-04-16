import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}) => {
  const variantClasses = {
    primary: 'btn-app btn-app-primary',
    secondary: 'btn-app btn-app-secondary',
    ghost: 'btn-app btn-app-ghost',
    danger: 'btn-app btn-app-danger',
  };

  const sizeClasses = {
    sm: 'px-3 py-2',
    md: 'px-4 py-2',
    lg: 'px-4 py-3',
  };

  return (
    <button
      className={`${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
