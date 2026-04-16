import React from 'react';
import { FaChartBar, FaPlusCircle, FaRedoAlt, FaStar } from 'react-icons/fa';

interface QuickActionsProps {
  onAction: (action: string) => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({ onAction }) => {
  const actions = [
    {
      id: 'new-transaction',
      label: 'New Transaction',
      copy: 'Start a fresh service workflow in one click.',
      icon: <FaPlusCircle />,
      tone: 'primary',
    },
    {
      id: 'repeat-customer',
      label: 'Repeat Customer',
      copy: 'Load the latest customer transaction back into the workflow for review.',
      icon: <FaRedoAlt />,
      tone: 'success',
    },
    {
      id: 'daily-report',
      label: 'Daily Closing',
      copy: 'Generate today\'s closing snapshot with totals, pending dues, and net amount.',
      icon: <FaChartBar />,
      tone: 'info',
    },
    {
      id: 'favorites',
      label: 'Favorites',
      copy: 'Jump to the services your team uses most often.',
      icon: <FaStar />,
      tone: 'warning',
    },
  ] as const;

  return (
    <section className="panel p-4 dashboard-balance-panel">
      <div className="panel-header mb-4">
        <div>
          <p className="eyebrow">Quick Actions</p>
          <h2 className="panel-title">High-frequency shortcuts</h2>
        </div>
      </div>

      <div className="dashboard-balance-panel__body">
        <div className="quick-action-grid">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              className="quick-action-button"
              data-tone={action.tone}
              onClick={() => onAction(action.id)}
            >
              <span className="quick-action__icon">{action.icon}</span>
              <div>
                <p className="quick-action__label">{action.label}</p>
                <p className="quick-action__copy">{action.copy}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default QuickActions;
