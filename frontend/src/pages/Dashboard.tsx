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
  Clock,
  ArrowRight,
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
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const Dashboard: React.FC = () => {
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

  const isLoading = loadingSummary || loadingTrends;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Automation Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">Overview of workflow health, execution throughput, and activity</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => refetchSummary()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refetchingSummary ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Refresh</span>
          </button>
          <Link
            to="/workflows/new"
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Workflow</span>
          </Link>
        </div>
      </div>

      {isLoading && !summary ? (
        <LoadingSpinner message="Loading dashboard metrics..." />
      ) : (
        <>
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Workflows */}
            <div className="p-5 rounded-xl border border-slate-800/80 bg-slate-900/60 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Workflows</span>
                <div className="text-2xl font-bold text-slate-100 mt-1">{summary?.total_workflows ?? 0}</div>
                <div className="text-xs text-emerald-400 mt-1 font-medium">
                  {summary?.active_workflows ?? 0} active in production
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-400">
                <Workflow className="w-5 h-5 text-emerald-400" />
              </div>
            </div>

            {/* Total Executions */}
            <div className="p-5 rounded-xl border border-slate-800/80 bg-slate-900/60 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Executions Run</span>
                <div className="text-2xl font-bold text-slate-100 mt-1">{summary?.total_executions ?? 0}</div>
                <div className="text-xs text-slate-400 mt-1 font-mono">
                  Avg {summary?.avg_duration_ms ? `${Math.round(summary.avg_duration_ms)}ms` : '0ms'}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-400">
                <Activity className="w-5 h-5 text-sky-400" />
              </div>
            </div>

            {/* Success Rate */}
            <div className="p-5 rounded-xl border border-slate-800/80 bg-slate-900/60 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Success Rate</span>
                <div className="text-2xl font-bold text-slate-100 mt-1">{summary?.success_rate_percent ?? 0}%</div>
                <div className="text-xs text-emerald-400 mt-1">
                  {summary?.succeeded_executions ?? 0} succeeded runs
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-400">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
            </div>

            {/* Failed Executions */}
            <div className="p-5 rounded-xl border border-slate-800/80 bg-slate-900/60 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Failed Executions</span>
                <div className="text-2xl font-bold text-slate-100 mt-1">{summary?.failed_executions ?? 0}</div>
                <div className="text-xs text-rose-400 mt-1">Needs review or retry</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-400">
                <XCircle className="w-5 h-5 text-rose-400" />
              </div>
            </div>
          </div>

          {/* Execution Trends Chart */}
          <div className="p-6 rounded-xl border border-slate-800/80 bg-slate-900/60 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-200">Execution Trends (Last 7 Days)</h2>
                <p className="text-xs text-slate-400">Daily distribution of succeeded vs failed automated jobs</p>
              </div>
            </div>
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="timestamp" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                    itemStyle={{ color: '#f8fafc' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="succeeded" fill="#10b981" name="Succeeded" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="failed" fill="#f43f5e" name="Failed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Executions Table */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80">
              <h2 className="text-sm font-semibold text-slate-200">Recent Executions</h2>
              <Link to="/executions" className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1">
                <span>View all executions</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {summary?.recent_activity && summary.recent_activity.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-mono">
                    <tr>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Workflow</th>
                      <th className="px-6 py-3">Trigger</th>
                      <th className="px-6 py-3">Duration</th>
                      <th className="px-6 py-3">Executed At</th>
                      <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
                    {summary.recent_activity.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-3.5">
                          <StatusBadge status={item.status} size="sm" />
                        </td>
                        <td className="px-6 py-3.5 font-sans font-medium text-slate-200">
                          {item.workflow_name}
                        </td>
                        <td className="px-6 py-3.5 uppercase text-slate-400">{item.trigger_source}</td>
                        <td className="px-6 py-3.5 text-slate-400">
                          {item.duration_ms ? `${Math.round(item.duration_ms)}ms` : '-'}
                        </td>
                        <td className="px-6 py-3.5 text-slate-400">
                          {item.created_at ? new Date(item.created_at).toLocaleString() : '-'}
                        </td>
                        <td className="px-6 py-3.5 text-right font-sans">
                          <Link
                            to={`/executions/${item.id}`}
                            className="text-emerald-400 hover:text-emerald-300 font-medium hover:underline"
                          >
                            Inspect
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500">
                No recent executions recorded yet. Create or trigger a workflow to see activity.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
