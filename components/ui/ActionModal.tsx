import React from 'react';
import { FaTimes } from 'react-icons/fa';

interface ActionModalProps {
  title: string;
  eyebrow?: string;
  description?: string;
  tone?: 'default' | 'danger';
  children: React.ReactNode;
  onClose: () => void;
}

const ActionModal: React.FC<ActionModalProps> = ({
  title,
  eyebrow,
  description,
  tone = 'default',
  children,
  onClose,
}) => {
  return (
    <div className="modal-backdrop-custom" role="presentation">
      <div className="modal-dialog-custom" role="dialog" aria-modal="true" aria-labelledby="action-modal-title">
        <div className={`modal-content border-0 shadow-lg action-modal-content action-modal-${tone}`}>
          <div className="modal-header action-modal-header">
            <div>
              {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
              <h2 id="action-modal-title" className="h4 mb-1 fw-semibold">{title}</h2>
              {description && <p className="page-muted mb-0">{description}</p>}
            </div>
            <button type="button" className="modal-close" aria-label="Close" onClick={onClose}>
              <FaTimes size={14} />
            </button>
          </div>
          <div className="modal-body action-modal-body">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActionModal;
