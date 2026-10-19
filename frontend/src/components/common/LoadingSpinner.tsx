import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner: React.FC<{ message?: string; className?: string }> = ({
  message = 'Loading...',
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 gap-3 text-slate-400 ${className}`}>
      <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
      <span className="text-xs font-medium uppercase tracking-wider">{message}</span>
    </div>
  );
};
