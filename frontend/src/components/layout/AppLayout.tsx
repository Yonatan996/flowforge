import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Workflow,
  Activity,
  Calendar,
  Settings,
  LogOut,
  Zap,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ThemeToggle } from '../common/ThemeToggle';

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { to: '/workflows', label: 'Workflows', icon: Workflow },
    { to: '/executions', label: 'Executions', icon: Activity },
    { to: '/schedules', label: 'Schedules', icon: Calendar },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  // Derive current section for breadcrumb
  const currentNav = navItems.find((item) => location.pathname.startsWith(item.to));
  const currentTitle = currentNav ? currentNav.label : 'FlowForge';

  return (
    <div className="flex h-screen bg-forge-bg text-forge-text overflow-hidden font-sans">
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar (Desktop + Mobile Drawer) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-forge-border bg-forge-sidebar select-none transition-all duration-200 ease-in-out md:static md:translate-x-0 ${
          mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'
        } ${collapsed ? 'md:w-16' : 'md:w-60'}`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-forge-border">
          <Link
            to="/dashboard"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2.5 min-w-0 group"
          >
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-forge-accent text-white shadow-xs shrink-0 group-hover:scale-105 transition-transform">
              <Zap className="w-3.5 h-3.5 fill-white" />
            </div>
            {(!collapsed || mobileOpen) && (
              <div className="truncate">
                <span className="font-bold tracking-tight text-forge-text text-sm block">
                  FlowForge
                </span>
              </div>
            )}
          </Link>

          {/* Close button on mobile */}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="p-1 rounded-md text-forge-text-muted hover:text-forge-text md:hidden"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-forge-accent/10 text-forge-accent font-semibold border border-forge-accent/20 shadow-xs'
                      : 'text-forge-text-secondary hover:text-forge-text hover:bg-forge-surface-hover border border-transparent'
                  } ${collapsed && !mobileOpen ? 'justify-center px-2' : ''}`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                {(!collapsed || mobileOpen) && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Collapse toggle (desktop only) */}
        <div className="hidden md:flex items-center justify-end px-3 py-2 border-t border-forge-border">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-1.5 rounded-md text-forge-text-muted hover:text-forge-text hover:bg-forge-surface-hover transition-colors"
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* User Info & Footer */}
        <div className="p-2 border-t border-forge-border bg-forge-surface-secondary/40">
          <div className="flex items-center justify-between p-2 rounded-lg bg-forge-surface border border-forge-border shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-6 h-6 rounded-full bg-forge-accent/15 border border-forge-accent/30 text-forge-accent flex items-center justify-center text-[11px] font-semibold shrink-0">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              {(!collapsed || mobileOpen) && (
                <div className="truncate min-w-0">
                  <span className="block text-[11px] font-medium text-forge-text truncate">
                    {user?.email}
                  </span>
                  <span className="flex items-center gap-1 text-[9px] text-forge-success font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-forge-success inline-block"></span>
                    Operational
                  </span>
                </div>
              )}
            </div>
            {(!collapsed || mobileOpen) && (
              <button
                type="button"
                onClick={handleLogout}
                className="p-1.5 text-forge-text-muted hover:text-forge-danger hover:bg-[var(--danger-subtle)] rounded-md transition-colors"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-14 border-b border-forge-border bg-forge-surface px-4 md:px-6 flex items-center justify-between shrink-0 transition-colors">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="p-1.5 rounded-lg border border-forge-border text-forge-text-secondary hover:text-forge-text hover:bg-forge-surface-hover md:hidden transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs font-mono text-forge-text-muted">
              <span className="text-forge-text font-sans font-medium text-sm">{currentTitle}</span>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-forge-surface-secondary border border-forge-border text-[11px] font-mono text-forge-text-secondary">
              <Shield className="w-3 h-3 text-forge-accent" />
              <span>Tenant Isolated</span>
            </div>

            {/* Theme Toggle Button */}
            <ThemeToggle />
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto bg-forge-bg transition-colors">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
