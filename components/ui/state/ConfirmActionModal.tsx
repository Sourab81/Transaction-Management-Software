import React from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';
import ActionModal from '../ActionModal';
import Button from '../Button';

interface ConfirmActionModalProps {
  title: string;
  description: string;
  eyebrow?: string;
  promptTitle?: string;
  promptDescription?: string;
  confirmLabel: string;
  cancelLabel?: string;
  confirmVariant?: 'primary' | 'danger';
  tone?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}

const ConfirmActionModal: React.FC<ConfirmActionModalProps> = ({
  title,
  description,
  eyebrow,
  promptTitle,
  promptDescription,
  confirmLabel,
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
  tone = 'default',
  onConfirm,
  onCancel,
  children,
}) => (
  <ActionModal
    title={title}
    eyebrow={eyebrow}
    description={description}
    tone={tone}
    onClose={onCancel}
  >
    {promptTitle || promptDescription ? (
      <div className="confirm-action__intro">
        <div className={`confirm-action__icon ${tone === 'danger' ? 'is-danger' : ''}`} aria-hidden="true">
          <FaExclamationTriangle />
        </div>
        <div className="confirm-action__content">
          {promptTitle ? <h3 className="h5 fw-semibold mb-2">{promptTitle}</h3> : null}
          {promptDescription ? <p className="confirm-action__copy">{promptDescription}</p> : null}
        </div>
      </div>
    ) : null}
    {children}
    <div className="modal-actions">
      <Button type="button" variant="secondary" onClick={onCancel}>
        {cancelLabel}
      </Button>
      <Button type="button" variant={confirmVariant} onClick={onConfirm}>
        {confirmLabel}
      </Button>
    </div>
  </ActionModal>
);

export default ConfirmActionModal;
