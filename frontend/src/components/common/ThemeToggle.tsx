import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className={`relative inline-flex items-center justify-center w-8 h-8 rounded-lg border border-forge-border bg-forge-surface hover:bg-forge-surface-hover text-forge-text-secondary hover:text-forge-text transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] ${className}`}
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 text-amber-400 transition-transform duration-150 rotate-0 hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 text-forge-accent transition-transform duration-150 rotate-0 hover:-rotate-12" />
      )}
    </button>
  );
};
