import React from "react";
import "./index.css";

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Delete",
  cancelText = "Cancel"
}) => {
  if (!isOpen) return null;

  return (
    <div className="logs-modal-overlay">
      <div className="logs-modal-content">
        <h3 className="logs-modal-title">{title}</h3>
        <p className="logs-modal-message">{message}</p>
        <div className="logs-modal-actions">
          <button className="logs-btn" onClick={onCancel}>
            {cancelText}
          </button>
          <button className="logs-btn danger" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
