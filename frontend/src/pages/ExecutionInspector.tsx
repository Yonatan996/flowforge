import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Layers,
  AlertCircle,
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
        return 1000; // Poll every second while running
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
    return <LoadingSpinner message="Inspecting execution..." />;
  }

  if (error || !execution) {
    return (
      <div className="p-8 text-center text-slate-400">
        Execution not found.{' '}
        <Link to="/executions" className="text-emerald-400 underline">
          Back to executions
        </Link>
      </div>
    );
  }

  const steps = execution.steps || [];

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to={execution.workflow_id ? `/workflows/${execution.workflow_id}` : '/executions'}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold tracking-tight text-slate-100 font-mono">
                Execution #{execution.id.slice(0, 8)}
              </h1>
              <StatusBadge status={execution.status} />
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
              <span>
                Workflow:{' '}
                <Link
                  to={`/workflows/${execution.workflow_id}`}
                  className="text-emerald-400 hover:text-emerald-300 font-medium hover:underline"
                >
                  {execution.workflow_name || 'Workflow'}
                </Link>
              </span>
              <span>•</span>
              <span className="font-mono">v{execution.workflow_version}</span>
              <span>•</span>
              <span className="uppercase text-slate-400">{execution.trigger_source}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {['FAILED', 'SUCCEEDED'].includes(execution.status) && (
            <button
              type="button"
              disabled={retryMutation.isPending}
              onClick={() => retryMutation.mutate()}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry Execution</span>
            </button>
          )}
        </div>
      </div>

      {/* Primary Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 font-mono text-xs">
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
          <span className="text-slate-500 block mb-1">Status</span>
          <StatusBadge status={execution.status} size="sm" />
        </div>
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
          <span className="text-slate-500 block mb-1">Duration</span>
          <span className="text-sm font-semibold text-slate-200">
            {execution.duration_ms ? `${Math.round(execution.duration_ms)} ms` : '-'}
          </span>
        </div>
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
          <span className="text-slate-500 block mb-1">Trigger Source</span>
          <span className="text-sm font-semibold text-slate-200 uppercase">
            {execution.trigger_source}
          </span>
        </div>
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
          <span className="text-slate-500 block mb-1">Started At</span>
          <span className="text-sm font-semibold text-slate-200">
            {execution.started_at ? new Date(execution.started_at).toLocaleTimeString() : '-'}
          </span>
        </div>
      </div>

      {/* Terminal Error Banner */}
      {execution.error_summary && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 space-y-1">
          <div className="flex items-center gap-2 font-semibold text-rose-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Execution Terminated with Error:</span>
          </div>
          <p className="font-mono pl-6 leading-relaxed text-rose-200">{execution.error_summary}</p>
        </div>
      )}

      {/* Input Payload Viewer */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
          Input Payload Snapshot
        </h3>
        <JsonViewer data={execution.input_payload || {}} title="Input Parameters" />
      </div>

      {/* Step by Step Timeline */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
            Pipeline Steps Timeline ({steps.length})
          </h3>
        </div>

        {steps.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 rounded-xl border border-slate-800 bg-slate-900/40">
            No step records logged yet for this execution.
          </div>
        ) : (
          <div className="space-y-3">
            {steps.map((st: ExecutionStep) => {
              const isExpanded = !!expandedSteps[st.step_key];
              return (
                <div
                  key={st.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-sm"
                >
                  {/* Step Header Accordion */}
                  <div
                    onClick={() => toggleStep(st.step_key)}
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-850/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-md bg-slate-800 border border-slate-700 text-xs font-mono flex items-center justify-center text-slate-300 font-semibold">
                        {st.step_order + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-100">{st.step_key}</span>
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                            {st.step_type}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5 flex items-center gap-2">
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
                      <button type="button" className="text-slate-500 hover:text-slate-300">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Step Expanded Details */}
                  {isExpanded && (
                    <div className="p-4 border-t border-slate-800 bg-slate-950/50 space-y-3">
                      {st.error_summary && (
                        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 font-mono">
                          <span className="font-semibold text-rose-400">Step Failure: </span>
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
