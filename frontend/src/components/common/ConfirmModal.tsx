import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-150"
    >
      <div className="w-full max-w-md rounded-xl border border-forge-border bg-forge-surface p-6 shadow-2xl transition-all">
        <div className="flex items-start gap-4">
          <div
            className={`p-2.5 rounded-lg border shrink-0 ${
              isDestructive
                ? 'bg-[var(--danger-subtle)] border-[var(--danger)]/30 text-[var(--danger)]'
                : 'bg-[var(--warning-subtle)] border-[var(--warning)]/30 text-[var(--warning)]'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 id="confirm-modal-title" className="text-base font-semibold text-forge-text">
              {title}
            </h3>
            <p className="mt-1.5 text-xs text-forge-text-secondary leading-relaxed">{message}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close dialog"
            className="p-1 rounded-md text-forge-text-muted hover:text-forge-text hover:bg-forge-surface-hover transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 text-xs font-medium text-forge-text-secondary hover:text-forge-text bg-forge-surface-secondary hover:bg-forge-surface-hover border border-forge-border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] text-white ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-500'
                : 'bg-forge-accent hover:bg-forge-accent-hover'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
