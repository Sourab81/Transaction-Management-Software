import React from 'react';

const WelcomeHero: React.FC = () => {
  const currentTime = new Date();
  const hour = currentTime.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="glass-card position-relative overflow-hidden">
      <div className="card-body p-5">
        <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-4">
          <div>
            <h1 className="display-6 fw-bold mb-3" style={{ letterSpacing: '0.03em' }}>
              {greeting}, Operator! 👋
            </h1>
            <p className="lead text-muted mb-0">
              Welcome back to your eNest dashboard — here’s a quick overview of your center.
            </p>
          </div>
          <div className="bg-white bg-opacity-85 rounded-4 px-4 py-3 shadow-sm" style={{ backdropFilter: 'blur(10px)' }}>
            <p className="text-uppercase text-muted small mb-1" style={{ letterSpacing: '0.18em' }}>Today's Date</p>
            <p className="h6 fw-semibold mb-0 text-dark">
              {currentTime.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>
        <div className="position-absolute top-0 end-0 translate-middle bg-primary bg-opacity-20 rounded-circle" style={{ width: '8rem', height: '8rem', right: '-2rem', top: '1rem' }}></div>
        <div className="position-absolute bottom-0 start-0 translate-middle bg-info bg-opacity-20 rounded-circle" style={{ width: '7rem', height: '7rem', left: '-2rem', bottom: '-1rem' }}></div>
      </div>
    </div>
  );
};

export default WelcomeHero;