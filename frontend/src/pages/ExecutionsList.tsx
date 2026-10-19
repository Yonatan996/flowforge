import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Activity, RefreshCw, ExternalLink, Search } from 'lucide-react';
import { executionsApi } from '../api/executions';
import { StatusBadge } from '../components/common/StatusBadge';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const ExecutionsList: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const {
    data: executions = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['executions', statusFilter],
    queryFn: () => executionsApi.list({ status: statusFilter || undefined }),
    refetchInterval: 10000,
  });

  const filteredExecutions = executions.filter((ex) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      ex.id.toLowerCase().includes(q) ||
      (ex.trigger_source && ex.trigger_source.toLowerCase().includes(q)) ||
      (ex.workflow_name && ex.workflow_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-forge-text">
            Execution Logs & Audit
          </h1>
          <p className="text-xs md:text-sm text-forge-text-secondary mt-0.5">
            Real-time audit trail and telemetry for automated workflow executions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-forge-text-secondary hover:text-forge-text bg-forge-surface border border-forge-border rounded-lg hover:bg-forge-surface-hover transition-colors shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin text-forge-accent' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-forge-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search executions by ID, workflow name, or trigger..."
            className="w-full pl-9 pr-4 py-2 bg-forge-surface border border-forge-border rounded-lg text-xs text-forge-text placeholder:text-forge-text-muted focus:outline-none focus:border-forge-accent focus:ring-2 focus:ring-[var(--focus-ring)] transition-colors"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 bg-forge-surface border border-forge-border rounded-lg text-xs text-forge-text-secondary focus:outline-none focus:border-forge-accent"
        >
          <option value="">All Statuses</option>
          <option value="SUCCEEDED">Succeeded</option>
          <option value="FAILED">Failed</option>
          <option value="RUNNING">Running</option>
          <option value="QUEUED">Queued</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {isLoading ? (
        <LoadingSpinner message="Loading execution logs..." />
      ) : filteredExecutions.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No executions found"
          description={
            statusFilter || search
              ? 'No execution runs match your search or status criteria.'
              : 'Execute a workflow manually or send an inbound webhook to view execution traces.'
          }
        />
      ) : (
        <div className="rounded-xl border border-forge-border bg-forge-surface overflow-hidden shadow-xs transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-forge-surface-secondary/70 border-b border-forge-border text-forge-text-secondary uppercase tracking-wider font-mono">
                <tr>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Execution ID</th>
                  <th className="px-6 py-3.5">Workflow</th>
                  <th className="px-6 py-3.5">Trigger Source</th>
                  <th className="px-6 py-3.5">Duration</th>
                  <th className="px-6 py-3.5">Executed At</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-forge-border text-forge-text font-mono">
                {filteredExecutions.map((ex) => (
                  <tr key={ex.id} className="hover:bg-forge-surface-hover/50 transition-colors">
                    <td className="px-6 py-4">
                      <StatusBadge status={ex.status} size="sm" />
                    </td>
                    <td className="px-6 py-4 text-forge-text">
                      <span className="font-semibold">#{ex.id.slice(0, 8)}</span>
                      <span className="text-forge-text-muted text-[11px] ml-1.5">(v{ex.workflow_version})</span>
                    </td>
                    <td className="px-6 py-4 font-sans font-medium text-forge-text truncate max-w-[160px]">
                      {ex.workflow_name ? (
                        <Link
                          to={`/workflows/${ex.workflow_id}`}
                          className="hover:text-forge-accent transition-colors"
                        >
                          {ex.workflow_name}
                        </Link>
                      ) : (
                        <span className="text-forge-text-secondary font-mono text-[11px]">{ex.workflow_id.slice(0, 8)}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 uppercase text-forge-text-secondary text-[11px]">
                      {ex.trigger_source}
                    </td>
                    <td className="px-6 py-4 text-forge-text-secondary">
                      {ex.duration_ms ? `${Math.round(ex.duration_ms)}ms` : '-'}
                    </td>
                    <td className="px-6 py-4 text-forge-text-secondary">
                      {ex.created_at ? new Date(ex.created_at).toLocaleString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-right font-sans">
                      <Link
                        to={`/executions/${ex.id}`}
                        className="text-forge-accent hover:text-forge-accent-hover font-medium inline-flex items-center gap-1"
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
