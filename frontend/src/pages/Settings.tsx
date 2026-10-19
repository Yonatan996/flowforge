import React from 'react';
import { User, Shield, Terminal, LogOut, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Settings: React.FC = () => {
  const { user, logout } = useAuth();
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">Settings & Account</h1>
        <p className="text-sm text-slate-400 mt-0.5">Manage authentication, API configuration, and session security</p>
      </div>

      {/* Account Profile Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-200">User Profile</h2>
            <p className="text-xs text-slate-400">Authenticated user details and ownership isolation</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] text-slate-500 block uppercase font-mono">Email Address</span>
            <span className="text-sm font-medium text-slate-200">{user?.email}</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] text-slate-500 block uppercase font-mono">Account ID</span>
            <span className="text-xs font-mono text-slate-400 truncate block">{user?.id}</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] text-slate-500 block uppercase font-mono">Password Hash Implementation</span>
            <span className="text-xs font-mono text-emerald-400">Argon2id (RFC 9106)</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] text-slate-500 block uppercase font-mono">Tenant Isolation</span>
            <span className="text-xs font-mono text-emerald-400">Active (Server-Side Enforced)</span>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-600 border border-rose-500/20 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Session</span>
          </button>
        </div>
      </div>

      {/* API & Developer Configuration Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-200">API & Integration Endpoints</h2>
            <p className="text-xs text-slate-400">Interactive documentation and webhook receiver configuration</p>
          </div>
        </div>

        <div className="space-y-3 pt-2 text-xs font-mono">
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-slate-500 block text-[11px] uppercase font-sans">API Base URL</span>
              <span className="text-slate-200">{apiBase}</span>
            </div>
            <a
              href={`${apiBase}/docs`}
              target="_blank"
              rel="noreferrer"
              className="text-sky-400 hover:text-sky-300 font-sans font-medium flex items-center gap-1"
            >
              <span>Interactive Swagger Docs</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <span className="text-slate-500 block text-[11px] uppercase font-sans">Webhook Ingestion Pattern</span>
            <span className="text-emerald-400">POST {apiBase}/webhooks/{'{webhook_token}'}</span>
            <p className="text-slate-500 font-sans text-[11px] mt-1">
              Supports <code className="text-slate-300">Idempotency-Key</code> header for deduplication.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
