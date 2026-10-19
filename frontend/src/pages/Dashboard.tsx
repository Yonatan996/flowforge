import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Workflow,
  CheckCircle2,
  XCircle,
  Activity,
  Plus,
  RefreshCw,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { dashboardApi } from '../api/dashboard';
import { workflowsApi } from '../api/workflows';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useTheme } from '../context/ThemeContext';

export const Dashboard: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const {
    data: summary,
    isLoading: loadingSummary,
    refetch: refetchSummary,
    isRefetching: refetchingSummary,
  } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: dashboardApi.getSummary,
    refetchInterval: 10000,
  });

  const {
    data: trends,
    isLoading: loadingTrends,
  } = useQuery({
    queryKey: ['dashboard-trends'],
    queryFn: () => dashboardApi.getTrends(7),
    refetchInterval: 10000,
  });

  const {
    data: workflows = [],
    isLoading: loadingWorkflows,
  } = useQuery({
    queryKey: ['workflows-recent'],
    queryFn: () => workflowsApi.list(),
    refetchInterval: 10000,
  });

  const isLoading = loadingSummary || loadingTrends || loadingWorkflows;

  // Chart theme colors
  const chartColors = {
    grid: isDark ? '#232731' : '#E1E5EC',
    text: isDark ? '#737C8C' : '#596273',
    tooltipBg: isDark ? '#191C23' : '#FFFFFF',
    tooltipBorder: isDark ? '#303541' : '#E1E5EC',
    tooltipText: isDark ? '#F3F4F6' : '#171923',
    succeeded: isDark ? '#4ADE80' : '#15803D',
    failed: isDark ? '#F87171' : '#B91C1C',
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-forge-text">
            Operational Overview
          </h1>
          <p className="text-xs md:text-sm text-forge-text-secondary mt-1">
            Real-time pipeline health, execution throughput, and activity monitoring
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => refetchSummary()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-forge-text-secondary hover:text-forge-text bg-forge-surface border border-forge-border rounded-lg hover:bg-forge-surface-hover transition-colors shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refetchingSummary ? 'animate-spin text-forge-accent' : ''}`} />
            <span>Refresh</span>
          </button>
          <Link
            to="/workflows/new"
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-white bg-forge-accent hover:bg-forge-accent-hover rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Workflow</span>
          </Link>
        </div>
      </div>

      {isLoading && !summary ? (
        <LoadingSpinner message="Aggregating operational metrics..." />
      ) : (
        <>
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Workflows */}
            <div className="p-5 rounded-xl border border-forge-border bg-forge-surface shadow-xs flex items-center justify-between transition-colors">
              <div>
                <span className="text-[11px] font-medium text-forge-text-muted uppercase tracking-wider font-mono">
                  Total Workflows
                </span>
                <div className="text-2xl font-bold text-forge-text mt-1">
                  {summary?.total_workflows ?? 0}
                </div>
                <div className="text-xs text-forge-success mt-1 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-forge-success"></span>
                  <span>{summary?.active_workflows ?? 0} active in production</span>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-forge-surface-secondary border border-forge-border text-forge-accent">
                <Workflow className="w-5 h-5" />
              </div>
            </div>

            {/* Total Executions */}
            <div className="p-5 rounded-xl border border-forge-border bg-forge-surface shadow-xs flex items-center justify-between transition-colors">
              <div>
                <span className="text-[11px] font-medium text-forge-text-muted uppercase tracking-wider font-mono">
                  Total Executions
                </span>
                <div className="text-2xl font-bold text-forge-text mt-1">
                  {summary?.total_executions ?? 0}
                </div>
                <div className="text-xs text-forge-text-secondary mt-1 font-mono">
                  Avg {summary?.avg_duration_ms ? `${Math.round(summary.avg_duration_ms)}ms` : '0ms'}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-forge-surface-secondary border border-forge-border text-forge-info">
                <Activity className="w-5 h-5" />
              </div>
            </div>

            {/* Success Rate */}
            <div className="p-5 rounded-xl border border-forge-border bg-forge-surface shadow-xs flex items-center justify-between transition-colors">
              <div>
                <span className="text-[11px] font-medium text-forge-text-muted uppercase tracking-wider font-mono">
                  Success Rate
                </span>
                <div className="text-2xl font-bold text-forge-text mt-1">
                  {summary?.success_rate_percent ?? 0}%
                </div>
                <div className="text-xs text-forge-success mt-1 font-mono">
                  {summary?.succeeded_executions ?? 0} succeeded runs
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-forge-surface-secondary border border-forge-border text-forge-success">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            {/* Failed Executions */}
            <div className="p-5 rounded-xl border border-forge-border bg-forge-surface shadow-xs flex items-center justify-between transition-colors">
              <div>
                <span className="text-[11px] font-medium text-forge-text-muted uppercase tracking-wider font-mono">
                  Failed Executions
                </span>
                <div className="text-2xl font-bold text-forge-text mt-1">
                  {summary?.failed_executions ?? 0}
                </div>
                <div className="text-xs text-forge-danger mt-1">
                  {summary?.failed_executions ? 'Requires investigation' : 'Zero failures detected'}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-forge-surface-secondary border border-forge-border text-forge-danger">
                <XCircle className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Execution Trends Chart */}
          <div className="p-6 rounded-xl border border-forge-border bg-forge-surface shadow-xs space-y-4 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-forge-text">Execution Volume & Health (Last 7 Days)</h2>
                <p className="text-xs text-forge-text-secondary mt-0.5">
                  Daily breakdown of succeeded versus failed execution runs
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono text-forge-text-secondary">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: chartColors.succeeded }}></span>
                  Succeeded
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: chartColors.failed }}></span>
                  Failed
                </span>
              </div>
            </div>
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                  <XAxis
                    dataKey="timestamp"
                    stroke={chartColors.text}
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: chartColors.grid }}
                  />
                  <YAxis
                    stroke={chartColors.text}
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: chartColors.grid }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: chartColors.tooltipBg,
                      borderColor: chartColors.tooltipBorder,
                      color: chartColors.tooltipText,
                      borderRadius: '8px',
                      fontSize: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }}
                    itemStyle={{ color: chartColors.tooltipText }}
                  />
                  <Legend wrapperStyle={{ display: 'none' }} />
                  <Bar dataKey="succeeded" fill={chartColors.succeeded} name="Succeeded" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  <Bar dataKey="failed" fill={chartColors.failed} name="Failed" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Two-Column Split: Recent Workflows & Recent Executions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Workflows (1 col) */}
            <div className="rounded-xl border border-forge-border bg-forge-surface shadow-xs overflow-hidden flex flex-col transition-colors">
              <div className="flex items-center justify-between px-5 py-4 border-b border-forge-border">
                <div>
                  <h2 className="text-sm font-semibold text-forge-text">Active Workflows</h2>
                  <p className="text-[11px] text-forge-text-secondary mt-0.5">Quick access to automations</p>
                </div>
                <Link
                  to="/workflows"
                  className="text-xs text-forge-accent hover:text-forge-accent-hover font-medium flex items-center gap-1"
                >
                  <span>All</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="divide-y divide-forge-border p-2 flex-1">
                {workflows.length === 0 ? (
                  <div className="p-6 text-center text-xs text-forge-text-muted">
                    No workflows created yet.
                  </div>
                ) : (
                  workflows.slice(0, 5).map((wf) => (
                    <Link
                      key={wf.id}
                      to={`/workflows/${wf.id}`}
                      className="p-3 rounded-lg hover:bg-forge-surface-hover/70 flex items-center justify-between gap-3 group transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-forge-text group-hover:text-forge-accent transition-colors truncate">
                            {wf.name}
                          </span>
                          <StatusBadge status={wf.status} size="sm" />
                        </div>
                        <div className="text-[11px] text-forge-text-secondary mt-1 flex items-center gap-2 font-mono">
                          <span className="capitalize">{wf.trigger_type}</span>
                          <span>•</span>
                          <span>v{wf.version}</span>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-forge-text-muted group-hover:text-forge-text transition-colors shrink-0" />
                    </Link>
                  ))
                )}
              </div>
            </div>

            {/* Recent Executions (2 cols) */}
            <div className="lg:col-span-2 rounded-xl border border-forge-border bg-forge-surface shadow-xs overflow-hidden flex flex-col transition-colors">
              <div className="flex items-center justify-between px-6 py-4 border-b border-forge-border">
                <div>
                  <h2 className="text-sm font-semibold text-forge-text">Recent Executions</h2>
                  <p className="text-[11px] text-forge-text-secondary mt-0.5">Audit log of latest triggered jobs</p>
                </div>
                <Link
                  to="/executions"
                  className="text-xs text-forge-accent hover:text-forge-accent-hover font-medium flex items-center gap-1"
                >
                  <span>View all executions</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {summary?.recent_activity && summary.recent_activity.length > 0 ? (
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-forge-surface-secondary/70 border-b border-forge-border text-forge-text-secondary uppercase tracking-wider font-mono">
                      <tr>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3">Workflow</th>
                        <th className="px-5 py-3">Trigger</th>
                        <th className="px-5 py-3">Duration</th>
                        <th className="px-5 py-3">Executed</th>
                        <th className="px-5 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-forge-border text-forge-text font-mono">
                      {summary.recent_activity.slice(0, 7).map((item) => (
                        <tr key={item.id} className="hover:bg-forge-surface-hover/50 transition-colors">
                          <td className="px-5 py-3.5">
                            <StatusBadge status={item.status} size="sm" />
                          </td>
                          <td className="px-5 py-3.5 font-sans font-medium text-forge-text truncate max-w-[180px]">
                            {item.workflow_name}
                          </td>
                          <td className="px-5 py-3.5 uppercase text-forge-text-secondary text-[11px]">
                            {item.trigger_source}
                          </td>
                          <td className="px-5 py-3.5 text-forge-text-secondary">
                            {item.duration_ms ? `${Math.round(item.duration_ms)}ms` : '-'}
                          </td>
                          <td className="px-5 py-3.5 text-forge-text-secondary">
                            {item.created_at ? new Date(item.created_at).toLocaleTimeString() : '-'}
                          </td>
                          <td className="px-5 py-3.5 text-right font-sans">
                            <Link
                              to={`/executions/${item.id}`}
                              className="text-forge-accent hover:text-forge-accent-hover font-medium inline-flex items-center gap-1"
                            >
                              <span>Inspect</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-forge-text-muted flex-1 flex items-center justify-center">
                  No recent executions recorded yet. Trigger a workflow to inspect activity.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
