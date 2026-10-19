import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-forge-border bg-forge-surface/50 shadow-sm transition-colors">
      <div className="p-3.5 rounded-xl bg-forge-surface-secondary border border-forge-border text-forge-text-secondary mb-4 shadow-sm">
        <Icon className="w-6 h-6 text-forge-accent" />
      </div>
      <h3 className="text-base font-semibold text-forge-text">{title}</h3>
      <p className="mt-1 text-sm text-forge-text-secondary max-w-sm leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-forge-accent hover:bg-forge-accent-hover rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
