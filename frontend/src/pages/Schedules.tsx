import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Calendar, RefreshCw, Clock, ExternalLink, ArrowRight } from 'lucide-react';
import { schedulesApi } from '../api/schedules';
import { StatusBadge } from '../components/common/StatusBadge';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const Schedules: React.FC = () => {
  const {
    data: schedules = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['schedules'],
    queryFn: schedulesApi.list,
    refetchInterval: 10000,
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-forge-text">
            Scheduled Jobs
          </h1>
          <p className="text-xs md:text-sm text-forge-text-secondary mt-1">
            Active timers, cron schedules, and periodic automated dispatches
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-forge-text-secondary hover:text-forge-text bg-forge-surface border border-forge-border rounded-lg hover:bg-forge-surface-hover transition-colors shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin text-forge-accent' : ''}`} />
            <span>Refresh</span>
          </button>
          <Link
            to="/workflows/new"
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-white bg-forge-accent hover:bg-forge-accent-hover rounded-lg shadow-xs transition-colors"
          >
            <span>Create Workflow</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner message="Loading scheduled jobs..." />
      ) : schedules.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No scheduled workflows configured"
          description="Workflows configured with a Scheduled trigger (cron expression or periodic interval) will appear here for operational monitoring."
          actionLabel="Create Scheduled Workflow"
          onAction={() => {
            window.location.href = '/workflows/new';
          }}
        />
      ) : (
        <div className="rounded-xl border border-forge-border bg-forge-surface overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-forge-surface-secondary/70 border-b border-forge-border text-forge-text-secondary uppercase tracking-wider font-mono">
                <tr>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Workflow</th>
                  <th className="px-6 py-3.5">Schedule Cadence</th>
                  <th className="px-6 py-3.5">Next Run (UTC)</th>
                  <th className="px-6 py-3.5">Last Run (UTC)</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-forge-border text-forge-text font-mono">
                {schedules.map((job) => (
                  <tr key={job.id} className="hover:bg-forge-surface-hover/50 transition-colors">
                    <td className="px-6 py-4">
                      <StatusBadge status={job.enabled ? 'active' : 'inactive'} size="sm" />
                    </td>
                    <td className="px-6 py-4 font-sans font-medium text-forge-text">
                      <Link
                        to={`/workflows/${job.workflow_id}`}
                        className="hover:text-forge-accent transition-colors flex items-center gap-1.5"
                      >
                        <span>{job.workflow_name}</span>
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-forge-text-secondary">
                      {job.cron_expression ? (
                        <div className="flex items-center gap-1.5 font-mono text-xs">
                          <Clock className="w-3.5 h-3.5 text-forge-accent" />
                          <span className="px-1.5 py-0.5 rounded bg-forge-surface-secondary border border-forge-border text-forge-text">
                            {job.cron_expression}
                          </span>
                        </div>
                      ) : job.interval_seconds ? (
                        <span>Every {job.interval_seconds}s</span>
                      ) : (
                        <span className="text-forge-text-muted">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-forge-text-secondary">
                      {job.next_run_at ? new Date(job.next_run_at).toLocaleString() : 'Not scheduled'}
                    </td>
                    <td className="px-6 py-4 text-forge-text-secondary">
                      {job.last_run_at ? new Date(job.last_run_at).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 text-right font-sans">
                      <Link
                        to={`/workflows/${job.workflow_id}`}
                        className="text-forge-accent hover:text-forge-accent-hover font-medium inline-flex items-center gap-1"
                      >
                        <span>View</span>
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
