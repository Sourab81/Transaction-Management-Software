import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="app-footer">
      <div className="app-footer__inner">
        <div className="small">
          <span>eNest Platform</span>
          <span className="mx-2">•</span>
          <span>Service Center Management</span>
        </div>
        <div className="small">
          <span>v1.0.0</span>
          <span className="mx-2">•</span>
          <span>Updated April 10, 2026</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
