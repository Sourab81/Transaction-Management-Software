import React from 'react';
import { FaTachometerAlt, FaCog, FaUsers, FaExchangeAlt, FaHistory, FaChartBar, FaPlusSquare } from 'react-icons/fa';
import { FaUniversity } from 'react-icons/fa';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  onClose?: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen, onClose }) => {
  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <FaTachometerAlt /> },
    
    { id: 'services', label: 'Services', icon: <FaCog /> },
    { id: 'customers', label: 'Customers', icon: <FaUsers /> },
    { id: 'accounts', label: 'Accounts', icon: <FaUniversity /> },
    { id: 'transactions', label: 'Transactions', icon: <FaExchangeAlt /> },
    { id: 'history', label: 'History', icon: <FaHistory /> },
    { id: 'reports', label: 'Reports', icon: <FaChartBar /> },
    { id: 'additions', label: 'Additions', icon: <FaPlusSquare /> },
  ];

  return (
    <aside
      className={`sidebar-light shadow-sm sidebar-mobile ${isOpen ? 'sidebar-open' : 'sidebar-closed'}`}
      style={{ width: '14rem', minHeight: '100vh', flexShrink: 0, backgroundColor: 'rgba(255, 255, 255, 0.98)' }}
    >
      <nav className="mt-4 px-3" style={{ position: 'sticky', top: 0 }}>
        <div className="mb-4 d-flex align-items-center gap-3 px-3 py-3 ">
          <div className="bg-primary text-white rounded-3 d-flex align-items-center justify-content-center fw-bold" style={{ width: '2.5rem', height: '2.5rem' }}>e</div>
          <div>
            <p className="small fw-semibold mb-0">eNest</p>
            <p className="small text-muted mb-0">Operator panel</p>
          </div>
        </div>
        <ul className="list-unstyled">
          {menuItems.map((item) => (
            <li key={item.id} className="mb-2">
              <button
                onClick={() => {
                  setActiveTab(item.id);
                  if (onClose) onClose();
                }}
                className={`sidebar-item d-flex align-items-center gap-3 small fw-medium ${
                  activeTab === item.id ? 'sidebar-item-active' : ''
                }`}
              >
                <span className="me-2 fs-5">{item.icon}</span>
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;