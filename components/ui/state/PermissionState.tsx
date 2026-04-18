import React from 'react';
import { FaLock } from 'react-icons/fa';
import Button from '../Button';

interface PermissionStateProps {
  eyebrow?: string;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'ghost';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'ghost';
  };
  children?: React.ReactNode;
  className?: string;
}

const PermissionState: React.FC<PermissionStateProps> = ({
  eyebrow = 'Access Restricted',
  title,
  description,
  action,
  secondaryAction,
  children,
  className = '',
}) => (
  <section className={`panel state-card state-card--centered state-card--warning ${className}`.trim()}>
    <div className="state-card__icon" aria-hidden="true">
      <FaLock />
    </div>
    <div className="state-card__content">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="state-card__title">{title}</h2>
      <p className="state-card__description">{description}</p>
    </div>
    {children}
    {action || secondaryAction ? (
      <div className="state-card__actions justify-content-center">
        {secondaryAction ? (
          <Button
            type="button"
            variant={secondaryAction.variant ?? 'secondary'}
            onClick={secondaryAction.onClick}
          >
            {secondaryAction.label}
          </Button>
        ) : null}
        {action ? (
          <Button
            type="button"
            variant={action.variant ?? 'primary'}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        ) : null}
      </div>
    ) : null}
  </section>
);

export default PermissionState;
