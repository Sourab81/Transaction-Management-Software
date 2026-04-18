import React from 'react';
import { FaInbox } from 'react-icons/fa';
import Button from '../Button';

interface EmptyStateProps {
  eyebrow?: string;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'ghost';
  };
  children?: React.ReactNode;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  eyebrow = 'Nothing Here',
  title,
  description,
  action,
  children,
  className = '',
}) => (
  <section className={`panel state-card state-card--centered ${className}`.trim()}>
    <div className="state-card__icon" aria-hidden="true">
      <FaInbox />
    </div>
    <div className="state-card__content">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="state-card__title">{title}</h2>
      <p className="state-card__description">{description}</p>
    </div>
    {children}
    {action ? (
      <div className="state-card__actions justify-content-center">
        <Button
          type="button"
          variant={action.variant ?? 'primary'}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      </div>
    ) : null}
  </section>
);

export default EmptyState;
