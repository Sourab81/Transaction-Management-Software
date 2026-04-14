import React from 'react';
import { FaBell, FaUser, FaBars, FaSearch } from 'react-icons/fa';
import CounterDropdown from '../ui/CounterDropdown';

interface Counter {
  id: string;
  name: string;
  code: string;
  openingBalance: number;
  currentBalance: number;
}

interface HeaderProps {
  activeTab: string;
  counters: Counter[];
  selectedCounterId: string;
  onCounterChange: (counterId: string) => void;
  onSearch: (query: string) => void;
  isSidebarOpen: boolean;
  onSidebarToggle: () => void;
}

const pageHeadings: Record<string, string> = {
  dashboard: 'Dashboard',
  services: 'Service Catalog',
  customers: 'Customer Hub',
  transactions: 'Transactions',
  history: 'History & Events',
  reports: 'Reports Center',
  additions: 'Configuration Options',
};

const Header: React.FC<HeaderProps> = ({ activeTab, counters, selectedCounterId, onCounterChange, onSearch, isSidebarOpen, onSidebarToggle }) => {
  const heading = pageHeadings[activeTab] || pageHeadings.dashboard;
  return (
    <header className="bg-white border-bottom" style={{ zIndex: 40, position: 'sticky', top: 0 }}>
      <div className="container-fluid" style={{ maxWidth: '1400px' }}>
        <div className="d-flex align-items-center justify-content-between py-3 px-2">
          {/* Left Section - Logo and Mobile Menu */}
          <div className="d-flex align-items-center gap-3">
            <button
              className="btn btn-link text-dark p-1 d-md-none"
              aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
              onClick={onSidebarToggle}
              style={{ border: 'none', background: 'none' }}
            >
              <FaBars size={18} />
            </button>
            <div className="d-flex align-items-center gap-2">
              <div className="bg-primary text-white rounded-2 d-flex align-items-center justify-content-center fw-bold" style={{ width: '32px', height: '32px', fontSize: '14px' }}>
                E
              </div>
              <div className="d-none d-sm-block">
                <h6 className="mb-0 fw-semibold text-dark">{heading}</h6>
              </div>
            </div>
          </div>

          {/* Center Section - Search */}
          <div className="flex-grow-1 mx-4" style={{ maxWidth: '500px' }}>
            <div className="position-relative">
              <FaSearch className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" size={14} />
              <input
                type="text"
                className="form-control border-0 bg-light"
                placeholder="Search..."
                style={{
                  paddingLeft: '40px',
                  borderRadius: '8px',
                  height: '40px',
                  fontSize: '14px'
                }}
                onChange={(e) => onSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Right Section - Actions */}
          <div className="d-flex align-items-center gap-3">
            <div className="d-flex" style={{ minWidth: '180px' }}>
              <CounterDropdown
                counters={counters}
                selectedCounterId={selectedCounterId}
                onChange={onCounterChange}
              />
            </div>

            <button
              className="btn btn-link text-dark p-2 position-relative"
              style={{ border: 'none', background: 'none' }}
              aria-label="Notifications"
            >
              <FaBell size={18} />
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '10px', padding: '2px 6px' }}>
                3
              </span>
            </button>

            <div className="d-flex align-items-center gap-2">
              <div className="bg-secondary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{ width: '32px', height: '32px', fontSize: '14px' }}>
                <FaUser size={14} />
              </div>
              <div className="d-none d-lg-block">
                <div className="small fw-medium text-dark">Operator</div>
                <div className="small text-muted">malviyasourabh81@gmail.com</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;