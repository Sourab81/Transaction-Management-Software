import React from 'react';
import { FaBell, FaTimes } from 'react-icons/fa';

interface Notification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
  timestamp: string;
}

interface NotificationCenterProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ notifications, onDismiss }) => {
  return (
    <section className="panel p-4 dashboard-balance-panel">
      <div className="panel-header mb-4">
        <div>
          <p className="eyebrow">Notifications</p>
          <h2 className="panel-title">Recent updates</h2>
        </div>
      </div>

      <div className="dashboard-balance-panel__body">
        {notifications.length === 0 ? (
          <div className="notification-empty">
            <FaBell size={24} />
            <p className="mb-0">No notifications right now.</p>
          </div>
        ) : (
          <div className="notification-list">
            {notifications.map((notification) => (
              <div key={notification.id} className="notification-item" data-type={notification.type}>
                <span className="notification-item__pill" />
                <div className="flex-grow-1">
                  <p className="notification-item__message">{notification.message}</p>
                  <p className="notification-item__meta">{notification.timestamp}</p>
                </div>
                <button
                  type="button"
                  className="btn-icon-sm"
                  aria-label="Dismiss notification"
                  onClick={() => onDismiss(notification.id)}
                >
                  <FaTimes size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default NotificationCenter;
