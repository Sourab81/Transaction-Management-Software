import React from 'react';
import { FaPlusCircle, FaRedoAlt, FaChartBar, FaStar } from 'react-icons/fa';
import Button from '../ui/Button';

interface QuickActionsProps {
  onAction: (action: string) => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({ onAction }) => {
  const actions = [
    { id: 'new-transaction', label: 'New Transaction', icon: <FaPlusCircle />, color: 'bg-primary-subtle hover:bg-primary text-primary border-primary-subtle' },
    { id: 'repeat-customer', label: 'Repeat Customer', icon: <FaRedoAlt />, color: 'bg-success-subtle hover:bg-success text-success border-success-subtle' },
    { id: 'daily-report', label: 'Daily Report', icon: <FaChartBar />, color: 'bg-info-subtle hover:bg-info text-info border-info-subtle' },
    { id: 'favorites', label: 'Favorites', icon: <FaStar />, color: 'bg-warning-subtle hover:bg-warning text-warning border-warning-subtle' },
  ];

  return (
    <div className="card border-0 shadow-sm" style={{borderRadius: '1.5rem'}}>
      <div className="card-body p-4">
        <h3 className="h5 mb-4 fw-semibold text-dark">Quick Actions</h3>
        <div className="row g-3">
          {actions.map((action) => (
            <div key={action.id} className="col-6">
              <button
                onClick={() => onAction(action.id)}
                className={`btn border d-flex flex-column align-items-center justify-content-center p-3 w-100 h-100 transition-all ${action.color}`}
                style={{borderRadius: '1rem', minHeight: '5rem'}}
              >
                <span className="fs-4 mb-2">{action.icon}</span>
                <span className="small fw-medium">{action.label}</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuickActions;