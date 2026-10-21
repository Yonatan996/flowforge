import React, { useState } from 'react';
import {
  User,
  Terminal,
  LogOut,
  ExternalLink,
  Sun,
  Moon,
  Palette,
  Laptop,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { PasswordInput } from '../components/common/PasswordInput';
import { authApi } from '../api/auth';

export const Settings: React.FC = () => {
  const { user, logout } = useAuth();
  const { themeMode, resolvedTheme, setTheme } = useTheme();
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await authApi.changePassword(currentPassword, newPassword);
      setPasswordSuccess(res.message || 'Password successfully updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password. Please check your current password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-4xl mx-auto w-full">
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-forge-text">
          Settings & Preferences
        </h1>
        <p className="text-xs md:text-sm text-forge-text-secondary mt-0.5">
          Workspace visual appearance, tenant security, and developer API configuration
        </p>
      </div>

      {/* Visual Theme Preferences Card */}
      <div className="rounded-xl border border-forge-border bg-forge-surface p-6 shadow-xs space-y-4 transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[var(--accent-subtle)] border border-forge-accent/20 text-forge-accent">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-forge-text">Interface Theme</h2>
            <p className="text-xs text-forge-text-secondary">
              Customize FlowForge developer workspace styling mode
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${
              themeMode === 'dark'
                ? 'border-forge-accent bg-[var(--accent-subtle)] ring-1 ring-forge-accent shadow-xs'
                : 'border-forge-border bg-forge-surface-secondary hover:bg-forge-surface-hover hover:border-forge-border-subtle'
            }`}
          >
            <div className="p-2 rounded-lg bg-[#111318] border border-[#303541] text-amber-400">
              <Moon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-forge-text flex items-center gap-2">
                <span>Dark</span>
                {themeMode === 'dark' && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-forge-accent text-white font-semibold">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-forge-text-secondary mt-1">
                Deep charcoal surfaces and high-contrast syntax
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${
              themeMode === 'light'
                ? 'border-forge-accent bg-[var(--accent-subtle)] ring-1 ring-forge-accent shadow-xs'
                : 'border-forge-border bg-forge-surface-secondary hover:bg-forge-surface-hover hover:border-forge-border-subtle'
            }`}
          >
            <div className="p-2 rounded-lg bg-[#FFFFFF] border border-[#E1E5EC] text-forge-accent shadow-2xs">
              <Sun className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-forge-text flex items-center gap-2">
                <span>Light</span>
                {themeMode === 'light' && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-forge-accent text-white font-semibold">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-forge-text-secondary mt-1">
                Crisp daylight surfaces and neutral borders
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTheme('system')}
            className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${
              themeMode === 'system'
                ? 'border-forge-accent bg-[var(--accent-subtle)] ring-1 ring-forge-accent shadow-xs'
                : 'border-forge-border bg-forge-surface-secondary hover:bg-forge-surface-hover hover:border-forge-border-subtle'
            }`}
          >
            <div className="p-2 rounded-lg bg-forge-surface border border-forge-border text-forge-accent shadow-2xs">
              <Laptop className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-forge-text flex items-center gap-2">
                <span>System</span>
                {themeMode === 'system' && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-forge-accent text-white font-semibold">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-forge-text-secondary mt-1">
                Syncs with OS (currently {resolvedTheme})
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Security & Password Card */}
      <div className="rounded-xl border border-forge-border bg-forge-surface p-6 shadow-xs space-y-4 transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[var(--accent-subtle)] border border-forge-accent/20 text-forge-accent">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-forge-text">Security & Password</h2>
            <p className="text-xs text-forge-text-secondary">
              Update your account credentials and password authentication
            </p>
          </div>
        </div>

        {passwordError && (
          <div className="p-3.5 rounded-lg bg-[var(--danger-subtle)] border border-[var(--danger)]/30 text-[var(--danger)] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{passwordError}</span>
          </div>
        )}

        {passwordSuccess && (
          <div className="p-3.5 rounded-lg bg-[var(--success-subtle)] border border-[var(--success)]/30 text-[var(--success)] text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{passwordSuccess}</span>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-xl">
          <div>
            <label className="block text-xs font-medium text-forge-text mb-1.5">
              Current Password
            </label>
            <PasswordInput
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-forge-text mb-1.5">
                New Password
              </label>
              <PasswordInput
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-forge-text mb-1.5">
                Confirm New Password
              </label>
              <PasswordInput
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={passwordLoading}
              className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-forge-accent hover:bg-forge-accent-hover rounded-lg transition-colors shadow-2xs disabled:opacity-50"
            >
              {passwordLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Change Password</span>
            </button>
          </div>
        </form>
      </div>

      {/* Account Profile Card */}
      <div className="rounded-xl border border-forge-border bg-forge-surface p-6 shadow-xs space-y-4 transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[var(--accent-subtle)] border border-forge-accent/20 text-forge-accent">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-forge-text">User Profile & Isolation</h2>
            <p className="text-xs text-forge-text-secondary">
              Authenticated user details and tenant boundary enforcement
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <div className="p-3.5 rounded-lg bg-forge-surface-secondary border border-forge-border">
            <span className="text-[10px] text-forge-text-muted block uppercase font-mono">Email Address</span>
            <span className="text-sm font-medium text-forge-text">{user?.email}</span>
          </div>
          <div className="p-3.5 rounded-lg bg-forge-surface-secondary border border-forge-border">
            <span className="text-[10px] text-forge-text-muted block uppercase font-mono">Account ID</span>
            <span className="text-xs font-mono text-forge-text-secondary truncate block">{user?.id}</span>
          </div>
          <div className="p-3.5 rounded-lg bg-forge-surface-secondary border border-forge-border">
            <span className="text-[10px] text-forge-text-muted block uppercase font-mono">Password Hash Implementation</span>
            <span className="text-xs font-mono text-forge-success font-semibold">Argon2id (RFC 9106)</span>
          </div>
          <div className="p-3.5 rounded-lg bg-forge-surface-secondary border border-forge-border">
            <span className="text-[10px] text-forge-text-muted block uppercase font-mono">Tenant Isolation Boundary</span>
            <span className="text-xs font-mono text-forge-success font-semibold">Active (Server-Side Enforced)</span>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-forge-danger hover:text-white bg-[var(--danger-subtle)] hover:bg-rose-600 border border-[var(--danger)]/30 rounded-lg transition-colors shadow-2xs"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Session</span>
          </button>
        </div>
      </div>

      {/* API & Developer Configuration Card */}
      <div className="rounded-xl border border-forge-border bg-forge-surface p-6 shadow-xs space-y-4 transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[var(--info-subtle)] border border-[var(--info)]/20 text-forge-info">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-forge-text">API & Integration Endpoints</h2>
            <p className="text-xs text-forge-text-secondary">
              OpenAPI documentation and webhook receiver configuration
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-1 text-xs font-mono">
          <div className="p-3.5 rounded-lg bg-forge-surface-secondary border border-forge-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-forge-text-muted block text-[10px] uppercase font-sans">API Base URL</span>
              <span className="text-forge-text font-semibold">{apiBase}</span>
            </div>
            <a
              href={`${apiBase}/docs`}
              target="_blank"
              rel="noreferrer"
              className="text-forge-info hover:underline font-sans font-medium flex items-center gap-1 self-start sm:self-auto"
            >
              <span>Interactive Swagger Docs</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="p-3.5 rounded-lg bg-forge-surface-secondary border border-forge-border">
            <span className="text-forge-text-muted block text-[10px] uppercase font-sans">Webhook Ingestion Pattern</span>
            <span className="text-forge-accent font-semibold">POST {apiBase}/webhooks/{'{webhook_token}'}</span>
            <p className="text-forge-text-secondary font-sans text-[11px] mt-1.5">
              Supports <code className="text-forge-text px-1 py-0.5 rounded bg-forge-surface border border-forge-border">Idempotency-Key</code> header for deduplication.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
