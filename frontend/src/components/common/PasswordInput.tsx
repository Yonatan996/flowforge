import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  wrapperClassName?: string;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  wrapperClassName = '',
  className = '',
  id,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className={`relative flex items-center ${wrapperClassName}`}>
      <input
        {...props}
        id={id}
        type={showPassword ? 'text' : 'password'}
        className={`w-full px-3.5 py-2.5 pr-10 bg-forge-surface-secondary border border-forge-border rounded-lg text-sm text-forge-text placeholder:text-forge-text-muted focus:outline-none focus:border-forge-accent focus:ring-2 focus:ring-[var(--focus-ring)] transition-colors ${className}`}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShowPassword((prev) => !prev)}
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        title={showPassword ? 'Hide password' : 'Show password'}
        className="absolute right-2.5 p-1 text-forge-text-muted hover:text-forge-text rounded transition-colors focus:outline-none focus:text-forge-text"
      >
        {showPassword ? (
          <EyeOff className="w-4 h-4" />
        ) : (
          <Eye className="w-4 h-4" />
        )}
      </button>
    </div>
  );
};
