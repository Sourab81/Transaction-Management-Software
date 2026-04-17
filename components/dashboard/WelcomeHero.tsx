import React from 'react';
import { FaArrowRight, FaStar } from 'react-icons/fa';
import { getRoleLabel, type UserRole } from '../../lib/platform-structure';

interface WelcomeHeroProps {
  userName: string;
  role: UserRole;
  counterName: string;
  counterStatus: string;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
}

const WelcomeHero: React.FC<WelcomeHeroProps> = ({
  userName,
  role,
  counterName,
  counterStatus,
  onPrimaryAction,
  onSecondaryAction,
}) => {
  const currentTime = new Date();
  const hour = currentTime.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const roleLabel = getRoleLabel(role);

  return (
    <section className="hero-panel glass-card">
      <div className="hero-panel__content">
        <p className="eyebrow">{roleLabel} workspace</p>
        <h1 className="hero-panel__headline">{greeting}, {userName} !</h1>
        <div className="section-hero__actions">
          <button type="button" className="btn-app btn-app-primary" onClick={onPrimaryAction}>
            Start Transaction
            <FaArrowRight size={13} />
          </button>
          <button type="button" className="btn-app btn-app-secondary" onClick={onSecondaryAction}>
            <FaStar size={13} />
            Open Favorites
          </button>
        </div>

        <div className="hero-panel__meta">
          <div className="hero-stat">
            <span className="hero-stat__label">Current Counter</span>
            <span className="hero-stat__value">{counterName}</span>
            <span className="hero-stat__hint">Selected for new activity</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat__label">Status</span>
            <span className="hero-stat__value d-flex align-items-center gap-2">
              <span className="pulse-dot" />
              {counterStatus}
            </span>
            <span className="hero-stat__hint">Live and ready for service</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat__label">Today</span>
            <span className="hero-stat__value">
              {currentTime.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </span>
            <span className="hero-stat__hint">Plan the next wave of tasks</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WelcomeHero;
