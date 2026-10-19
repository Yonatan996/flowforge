import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Activity, RefreshCw, ExternalLink } from 'lucide-react';
import { executionsApi } from '../api/executions';
import { StatusBadge } from '../components/common/StatusBadge';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const ExecutionsList: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('');

  const { data: executions = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['executions', statusFilter],
    queryFn: () => executionsApi.list({ status: statusFilter || undefined }),
    refetchInterval: 10000,
  });

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Execution History</h1>
          <p className="text-sm text-slate-400 mt-0.5">Live audit log of all automated workflow executions</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Statuses</option>
            <option value="SUCCEEDED">Succeeded</option>
            <option value="FAILED">Failed</option>
            <option value="RUNNING">Running</option>
            <option value="QUEUED">Queued</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <button
            type="button"
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner message="Loading execution logs..." />
      ) : executions.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No executions found"
          description={statusFilter ? 'No runs match the selected status filter' : 'Execute a workflow manually or send a webhook to see execution logs'}
        />
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-mono">
                <tr>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Execution ID</th>
                  <th className="px-6 py-3.5">Trigger Source</th>
                  <th className="px-6 py-3.5">Duration</th>
                  <th className="px-6 py-3.5">Executed At</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
                {executions.map((ex) => (
                  <tr key={ex.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <StatusBadge status={ex.status} size="sm" />
                    </td>
                    <td className="px-6 py-4 text-slate-200">
                      <span className="font-semibold">#{ex.id.slice(0, 8)}</span>
                      <span className="text-slate-500 text-[11px] ml-1">(v{ex.workflow_version})</span>
                    </td>
                    <td className="px-6 py-4 uppercase text-slate-400">{ex.trigger_source}</td>
                    <td className="px-6 py-4 text-slate-400">
                      {ex.duration_ms ? `${Math.round(ex.duration_ms)}ms` : '-'}
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {ex.created_at ? new Date(ex.created_at).toLocaleString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-right font-sans">
                      <Link
                        to={`/executions/${ex.id}`}
                        className="text-emerald-400 hover:text-emerald-300 font-medium hover:underline inline-flex items-center gap-1"
                      >
                        <span>Inspect</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
