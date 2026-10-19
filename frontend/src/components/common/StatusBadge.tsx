import React from 'react';
import { CheckCircle2, Clock, XCircle, AlertCircle, PlayCircle, MinusCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '', size = 'md' }) => {
  const normalized = status ? status.toLowerCase() : 'unknown';
  const isSm = size === 'sm';
  const iconClass = isSm ? 'w-3 h-3' : 'w-3.5 h-3.5';

  const badgeConfig: Record<
    string,
    { bg: string; text: string; border: string; icon: React.ReactNode; label: string }
  > = {
    active: {
      bg: 'bg-[var(--success-subtle)]',
      text: 'text-[var(--success)]',
      border: 'border-[var(--success)]/30',
      icon: <CheckCircle2 className={`${iconClass} text-[var(--success)]`} />,
      label: 'Active',
    },
    draft: {
      bg: 'bg-forge-surface-secondary',
      text: 'text-forge-text-secondary',
      border: 'border-forge-border',
      icon: <Clock className={`${iconClass} text-forge-text-muted`} />,
      label: 'Draft',
    },
    inactive: {
      bg: 'bg-[var(--warning-subtle)]',
      text: 'text-[var(--warning)]',
      border: 'border-[var(--warning)]/30',
      icon: <MinusCircle className={`${iconClass} text-[var(--warning)]`} />,
      label: 'Inactive',
    },
    succeeded: {
      bg: 'bg-[var(--success-subtle)]',
      text: 'text-[var(--success)]',
      border: 'border-[var(--success)]/30',
      icon: <CheckCircle2 className={`${iconClass} text-[var(--success)]`} />,
      label: 'Succeeded',
    },
    failed: {
      bg: 'bg-[var(--danger-subtle)]',
      text: 'text-[var(--danger)]',
      border: 'border-[var(--danger)]/30',
      icon: <XCircle className={`${iconClass} text-[var(--danger)]`} />,
      label: 'Failed',
    },
    running: {
      bg: 'bg-[var(--info-subtle)]',
      text: 'text-[var(--info)]',
      border: 'border-[var(--info)]/30',
      icon: <PlayCircle className={`${iconClass} text-[var(--info)] animate-spin`} />,
      label: 'Running',
    },
    queued: {
      bg: 'bg-[var(--accent-subtle)]',
      text: 'text-[var(--accent)]',
      border: 'border-[var(--accent)]/30',
      icon: <Clock className={`${iconClass} text-[var(--accent)]`} />,
      label: 'Queued',
    },
    skipped: {
      bg: 'bg-forge-surface-secondary',
      text: 'text-forge-text-muted',
      border: 'border-forge-border',
      icon: <MinusCircle className={`${iconClass} text-forge-text-muted`} />,
      label: 'Skipped',
    },
    pending: {
      bg: 'bg-forge-surface-secondary',
      text: 'text-forge-text-muted',
      border: 'border-forge-border',
      icon: <Clock className={`${iconClass} text-forge-text-muted`} />,
      label: 'Pending',
    },
    cancelled: {
      bg: 'bg-forge-surface-secondary',
      text: 'text-forge-text-secondary',
      border: 'border-forge-border',
      icon: <AlertCircle className={`${iconClass} text-forge-text-muted`} />,
      label: 'Cancelled',
    },
  };

  const current = badgeConfig[normalized] || {
    bg: 'bg-forge-surface-secondary',
    text: 'text-forge-text-secondary',
    border: 'border-forge-border',
    icon: null,
    label: status,
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${current.bg} ${current.text} ${current.border} ${
        isSm ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      } transition-colors duration-150 ${className}`}
    >
      {current.icon}
      <span>{current.label}</span>
    </span>
  );
};
