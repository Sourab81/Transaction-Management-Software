import React from 'react';

interface SectionHeroProps {
  eyebrow: string;
  title: string;
  description: string;
  action?: {
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
  };
}

const SectionHero: React.FC<SectionHeroProps> = ({ eyebrow, title, description, action }) => (
  <section className="panel section-hero">
    <div className="section-hero__content">
      <div className="panel-header mb-0">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="panel-title">{title}</h2>
          <p className="panel-copy">{description}</p>
        </div>
        {action ? (
          <div className="section-hero__actions mt-0">
            <button type="button" className="btn-app btn-app-primary" onClick={action.onClick}>
              {action.icon}
              {action.label}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  </section>
);

export default SectionHero;