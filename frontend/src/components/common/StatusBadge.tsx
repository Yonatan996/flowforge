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

  const badgeConfig: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode; label: string }> = {
    active: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/20',
      icon: <CheckCircle2 className={`${isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-emerald-400`} />,
      label: 'Active',
    },
    draft: {
      bg: 'bg-slate-800',
      text: 'text-slate-400',
      border: 'border-slate-700',
      icon: <Clock className={`${isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-slate-400`} />,
      label: 'Draft',
    },
    inactive: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/20',
      icon: <MinusCircle className={`${isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-amber-400`} />,
      label: 'Inactive',
    },
    succeeded: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/20',
      icon: <CheckCircle2 className={`${isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-emerald-400`} />,
      label: 'Succeeded',
    },
    failed: {
      bg: 'bg-rose-500/10',
      text: 'text-rose-400',
      border: 'border-rose-500/20',
      icon: <XCircle className={`${isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-rose-400`} />,
      label: 'Failed',
    },
    running: {
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      border: 'border-blue-500/20',
      icon: <PlayCircle className={`${isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-blue-400 animate-spin`} />,
      label: 'Running',
    },
    queued: {
      bg: 'bg-purple-500/10',
      text: 'text-purple-400',
      border: 'border-purple-500/20',
      icon: <Clock className={`${isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-purple-400`} />,
      label: 'Queued',
    },
    skipped: {
      bg: 'bg-slate-800/80',
      text: 'text-slate-500',
      border: 'border-slate-700/50',
      icon: <MinusCircle className={`${isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-slate-500`} />,
      label: 'Skipped',
    },
    pending: {
      bg: 'bg-slate-800/50',
      text: 'text-slate-500',
      border: 'border-slate-800',
      icon: <Clock className={`${isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-slate-500`} />,
      label: 'Pending',
    },
    cancelled: {
      bg: 'bg-zinc-800',
      text: 'text-zinc-400',
      border: 'border-zinc-700',
      icon: <AlertCircle className={`${isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-zinc-400`} />,
      label: 'Cancelled',
    },
  };

  const current = badgeConfig[normalized] || {
    bg: 'bg-slate-800',
    text: 'text-slate-300',
    border: 'border-slate-700',
    icon: null,
    label: status,
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${current.bg} ${current.text} ${current.border} ${
        isSm ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
      } ${className}`}
    >
      {current.icon}
      <span>{current.label}</span>
    </span>
  );
};
