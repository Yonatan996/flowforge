import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { PasswordInput } from '../components/common/PasswordInput';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setEmail('demo@flowforge.dev');
    setPassword('DemoPassword123!');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-forge-bg font-sans transition-colors relative">
      {/* Theme Toggle Top Right */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md rounded-2xl border border-forge-border bg-forge-surface p-8 shadow-xl transition-all">
        {/* Logo & Heading */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-forge-accent shadow-md shadow-forge-accent/25 text-white mb-3">
            <Zap className="w-6 h-6 fill-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-forge-text">
            Welcome to FlowForge
          </h1>
          <p className="text-xs sm:text-sm text-forge-text-secondary mt-1">
            Sign in to manage and monitor developer automation pipelines
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-lg bg-[var(--danger-subtle)] border border-[var(--danger)]/30 text-[var(--danger)] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-forge-text mb-1.5">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full px-3.5 py-2.5 bg-forge-surface-secondary border border-forge-border rounded-lg text-sm text-forge-text placeholder:text-forge-text-muted focus:outline-none focus:border-forge-accent focus:ring-2 focus:ring-[var(--focus-ring)] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-forge-text mb-1.5">Password</label>
            <PasswordInput
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 bg-forge-accent hover:bg-forge-accent-hover text-white font-medium text-sm rounded-lg transition-colors shadow-xs disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span>Sign In</span>
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-forge-border text-center space-y-3">
          <p className="text-xs text-forge-text-secondary">
            Don't have an account?{' '}
            <Link to="/register" className="text-forge-accent hover:text-forge-accent-hover font-medium">
              Create an account
            </Link>
          </p>
          <button
            type="button"
            onClick={handleDemoLogin}
            className="text-xs text-forge-text-muted hover:text-forge-text underline font-mono"
          >
            Fill Demo Credentials
          </button>
        </div>
      </div>
    </div>
  );
};
