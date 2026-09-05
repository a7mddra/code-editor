import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  fileName: string;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  fileName,
  onSave,
  onDiscard,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-dialog">
        <div className="modal-header">
          <div className="modal-icon">!</div>
          <div className="modal-title">Unsaved Changes</div>
        </div>
        <div className="modal-body">
          Do you want to save the changes you made to "{fileName}"?
          Your changes will be lost if you close without saving.
        </div>
        <div className="modal-footer">
          <button className="btn-dialog btn-dialog-save" onClick={onSave}>
            Save
          </button>
          <button className="btn-dialog btn-dialog-discard" onClick={onDiscard}>
            Don't Save
          </button>
          <button className="btn-dialog btn-dialog-cancel" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
