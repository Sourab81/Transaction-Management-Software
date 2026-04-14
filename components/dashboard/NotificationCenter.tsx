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
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-success-subtle border-success-subtle text-success';
      case 'warning':
        return 'bg-warning-subtle border-warning-subtle text-warning';
      case 'error':
        return 'bg-danger-subtle border-danger-subtle text-danger';
      default:
        return 'bg-info-subtle border-info-subtle text-info';
    }
  };

  return (
    <div className="card border-0 shadow-sm" style={{borderRadius: '1.5rem'}}>
      <div className="card-header bg-transparent border-bottom">
        <h3 className="h5 mb-0 fw-semibold text-dark">Notifications</h3>
      </div>
      <div className="card-body p-0" style={{maxHeight: '16rem', overflowY: 'auto'}}>
        {notifications.length === 0 ? (
          <div className="text-center p-5 text-muted">
            <div className="fs-1 mb-3"><FaBell /></div>
            <p className="small mb-0">No notifications</p>
          </div>
        ) : (
          <div className="list-group list-group-flush">
            {notifications.map((notification) => (
              <div key={notification.id} className={`list-group-item border-0 ${getTypeColor(notification.type)}`}>
                <div className="d-flex align-items-start justify-content-between">
                  <div className="flex-fill">
                    <p className="small fw-medium mb-1">{notification.message}</p>
                    <p className="small text-muted mb-0 opacity-75">{notification.timestamp}</p>
                  </div>
                  <button
                    onClick={() => onDismiss(notification.id)}
                    className="btn btn-sm btn-outline-secondary border-0 ms-3 p-1"
                  >
                    <FaTimes className="fs-6" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;