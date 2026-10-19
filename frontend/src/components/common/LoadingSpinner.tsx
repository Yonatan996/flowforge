import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner: React.FC<{ message?: string; className?: string }> = ({
  message = 'Loading...',
  className = '',
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center p-8 gap-3 text-forge-text-muted ${className}`}
    >
      <Loader2 className="w-6 h-6 animate-spin text-forge-accent" />
      <span className="text-xs font-medium uppercase tracking-wider text-forge-text-secondary">
        {message}
      </span>
    </div>
  );
};
