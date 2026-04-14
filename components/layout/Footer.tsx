import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="border-top bg-white px-4 py-3 mt-auto">
      <div className="container-fluid" style={{maxWidth: '1400px'}}>
        <div className="d-flex flex-column flex-sm-row align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-2 small text-muted">
            <span>© 2024 eNest Platform</span>
            <span className="text-muted">•</span>
            <span>Service Center Management</span>
          </div>
          <div className="d-flex align-items-center gap-3 small text-muted">
            <span>v1.0.0</span>
            <span className="text-muted">•</span>
            <span>Last updated: {new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;