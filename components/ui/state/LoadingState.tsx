import React from 'react';

interface LoadingStateProps {
  eyebrow?: string;
  title?: string;
  description?: string;
  className?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({
  eyebrow = 'Loading',
  title = 'Preparing your workspace',
  description = 'Please wait while the latest records and permissions are loaded.',
  className = '',
}) => (
  <section className={`panel state-card state-card--centered state-card--loading ${className}`.trim()}>
    <div className="loading-spinner" aria-hidden="true" />
    <div className="state-card__content">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="state-card__title">{title}</h1>
      <p className="state-card__description">{description}</p>
    </div>
  </section>
);

export default LoadingState;
