import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  ArrowLeft,
  RotateCcw,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  Loader2,
  Terminal,
} from 'lucide-react';
import { executionsApi } from '../api/executions';
import { Execution, ExecutionStep } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { JsonViewer } from '../components/common/JsonViewer';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const ExecutionInspector: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});

  const { data: execution, isLoading, error } = useQuery({
    queryKey: ['execution', id],
    queryFn: () => executionsApi.get(id!),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && ['QUEUED', 'RUNNING'].includes(data.status)) {
        return 1000; // Poll every second while actively running
      }
      return false;
    },
  });

  const retryMutation = useMutation({
    mutationFn: () => executionsApi.retry(id!),
    onSuccess: (newExec: Execution) => {
      navigate(`/executions/${newExec.id}`);
    },
  });

  const toggleStep = (stepKey: string) => {
    setExpandedSteps((prev) => ({
      ...prev,
      [stepKey]: !prev[stepKey],
    }));
  };

  if (isLoading) {
    return <LoadingSpinner message="Inspecting execution telemetry..." />;
  }

  if (error || !execution) {
    return (
      <div className="p-8 text-center text-forge-text-muted">
        Execution record not found.{' '}
        <Link to="/executions" className="text-forge-accent underline">
          Back to executions
        </Link>
      </div>
    );
  }

  const steps = execution.steps || [];

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to={execution.workflow_id ? `/workflows/${execution.workflow_id}` : '/executions'}
            className="p-2 rounded-lg bg-forge-surface border border-forge-border text-forge-text-secondary hover:text-forge-text hover:bg-forge-surface-hover transition-colors shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-forge-text font-mono">
                Execution #{execution.id.slice(0, 8)}
              </h1>
              <StatusBadge status={execution.status} />
            </div>
            <div className="flex items-center gap-2.5 text-xs text-forge-text-secondary mt-1 font-mono">
              <span>
                Workflow:{' '}
                <Link
                  to={`/workflows/${execution.workflow_id}`}
                  className="text-forge-accent hover:text-forge-accent-hover font-medium underline-offset-2 hover:underline"
                >
                  {execution.workflow_name || 'Workflow'}
                </Link>
              </span>
              <span>•</span>
              <span>v{execution.workflow_version}</span>
              <span>•</span>
              <span className="uppercase text-forge-text-muted">{execution.trigger_source}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {['FAILED', 'SUCCEEDED'].includes(execution.status) && (
            <button
              type="button"
              disabled={retryMutation.isPending}
              onClick={() => retryMutation.mutate()}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-forge-text bg-forge-surface hover:bg-forge-surface-hover border border-forge-border rounded-lg transition-colors shadow-2xs disabled:opacity-50"
            >
              {retryMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RotateCcw className="w-3.5 h-3.5 text-forge-accent" />
              )}
              <span>{retryMutation.isPending ? 'Retrying...' : 'Retry Execution'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Primary Telemetry Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 font-mono text-xs">
        <div className="p-4 rounded-xl border border-forge-border bg-forge-surface shadow-xs transition-colors">
          <span className="text-forge-text-muted uppercase text-[10px] block mb-1">Status</span>
          <StatusBadge status={execution.status} size="sm" />
        </div>
        <div className="p-4 rounded-xl border border-forge-border bg-forge-surface shadow-xs transition-colors">
          <span className="text-forge-text-muted uppercase text-[10px] block mb-1">Duration</span>
          <span className="text-sm font-semibold text-forge-text">
            {execution.duration_ms ? `${Math.round(execution.duration_ms)} ms` : '-'}
          </span>
        </div>
        <div className="p-4 rounded-xl border border-forge-border bg-forge-surface shadow-xs transition-colors">
          <span className="text-forge-text-muted uppercase text-[10px] block mb-1">Trigger Source</span>
          <span className="text-sm font-semibold text-forge-text uppercase">
            {execution.trigger_source}
          </span>
        </div>
        <div className="p-4 rounded-xl border border-forge-border bg-forge-surface shadow-xs transition-colors">
          <span className="text-forge-text-muted uppercase text-[10px] block mb-1">Executed At</span>
          <span className="text-sm font-semibold text-forge-text truncate block">
            {execution.started_at ? new Date(execution.started_at).toLocaleTimeString() : '-'}
          </span>
        </div>
      </div>

      {/* Terminal Error Banner */}
      {execution.error_summary && (
        <div className="p-4 rounded-xl bg-[var(--danger-subtle)] border border-[var(--danger)]/30 text-xs text-[var(--danger)] space-y-1 shadow-xs">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Execution Failed with Runtime Error:</span>
          </div>
          <p className="font-mono pl-6 leading-relaxed text-forge-text font-medium">
            {execution.error_summary}
          </p>
        </div>
      )}

      {/* Input Payload Viewer */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-forge-text uppercase tracking-wider font-mono flex items-center gap-1.5">
          <Terminal className="w-3.5 h-3.5 text-forge-accent" />
          <span>Input Payload Snapshot</span>
        </h3>
        <JsonViewer data={execution.input_payload || {}} title="Input Parameters" />
      </div>

      {/* Step by Step Timeline */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-forge-text uppercase tracking-wider font-mono">
            Pipeline Steps Breakdown ({steps.length})
          </h3>
        </div>

        {steps.length === 0 ? (
          <div className="p-8 text-center text-xs text-forge-text-muted rounded-xl border border-dashed border-forge-border bg-forge-surface/50">
            No step execution records logged yet for this execution.
          </div>
        ) : (
          <div className="space-y-3">
            {steps.map((st: ExecutionStep) => {
              const isExpanded = !!expandedSteps[st.step_key];
              return (
                <div
                  key={st.id}
                  className="rounded-xl border border-forge-border bg-forge-surface overflow-hidden shadow-xs transition-colors"
                >
                  {/* Step Header Accordion */}
                  <div
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    onClick={() => toggleStep(st.step_key)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleStep(st.step_key);
                      }
                    }}
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-forge-surface-hover transition-colors select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-md bg-forge-surface-secondary border border-forge-border text-xs font-mono flex items-center justify-center text-forge-text font-semibold shrink-0">
                        {st.step_order + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-forge-text">{st.step_key}</span>
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-forge-surface-secondary text-forge-text-secondary border border-forge-border">
                            {st.step_type}
                          </span>
                        </div>
                        <div className="text-xs text-forge-text-secondary font-mono mt-0.5 flex items-center gap-2">
                          <span>Attempts: {st.attempt_count}</span>
                          {st.duration_ms !== undefined && (
                            <>
                              <span>•</span>
                              <span>{Math.round(st.duration_ms)}ms</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <StatusBadge status={st.status} size="sm" />
                      <div className="text-forge-text-muted hover:text-forge-text">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Step Expanded Details */}
                  {isExpanded && (
                    <div className="p-4 border-t border-forge-border bg-forge-surface-secondary/40 space-y-3">
                      {st.error_summary && (
                        <div className="p-3.5 rounded-lg bg-[var(--danger-subtle)] border border-[var(--danger)]/30 text-xs text-[var(--danger)] font-mono">
                          <span className="font-semibold">Step Failure: </span>
                          {st.error_summary}
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <JsonViewer data={st.input_summary || {}} title="Sanitized Input" />
                        <JsonViewer data={st.output_summary || {}} title="Sanitized Output" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
