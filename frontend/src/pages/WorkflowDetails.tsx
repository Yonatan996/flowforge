import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Play,
  Edit3,
  Copy,
  Check,
  Globe,
  Calendar,
  Clock,
  ExternalLink,
  Activity,
  AlertCircle,
} from 'lucide-react';
import { workflowsApi } from '../api/workflows';
import { executionsApi } from '../api/executions';
import { StatusBadge } from '../components/common/StatusBadge';
import { TestRunModal } from '../components/builder/TestRunModal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const WorkflowDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [isTestRunOpen, setIsTestRunOpen] = useState(false);

  const { data: workflow, isLoading: loadingWorkflow } = useQuery({
    queryKey: ['workflow', id],
    queryFn: () => workflowsApi.get(id!),
  });

  const { data: executions = [], isLoading: loadingExecutions } = useQuery({
    queryKey: ['workflow-executions', id],
    queryFn: () => executionsApi.list({ workflow_id: id }),
    refetchInterval: 5000,
  });

  const activateMutation = useMutation({
    mutationFn: workflowsApi.activate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow', id] });
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: workflowsApi.deactivate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow', id] });
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });

  const handleCopyUrl = () => {
    if (workflow?.webhook_url) {
      navigator.clipboard.writeText(workflow.webhook_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loadingWorkflow) {
    return <LoadingSpinner message="Loading workflow details..." />;
  }

  if (!workflow) {
    return (
      <div className="p-8 text-center text-slate-400">
        Workflow not found.{' '}
        <Link to="/workflows" className="text-emerald-400 underline">
          Back to workflows
        </Link>
      </div>
    );
  }

  const steps = workflow.definition_json?.steps || [];

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/workflows"
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-100">{workflow.name}</h1>
              <StatusBadge status={workflow.status} />
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                v{workflow.version}
              </span>
            </div>
            {workflow.description && (
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">{workflow.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {workflow.status === 'active' ? (
            <button
              type="button"
              onClick={() => deactivateMutation.mutate(workflow.id)}
              className="px-3 py-2 text-xs font-medium text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg transition-colors"
            >
              Deactivate
            </button>
          ) : (
            <button
              type="button"
              onClick={() => activateMutation.mutate(workflow.id)}
              className="px-3 py-2 text-xs font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg transition-colors"
            >
              Activate
            </button>
          )}

          <Link
            to={`/workflows/${workflow.id}/edit`}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg transition-colors shadow-sm"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Pipeline</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsTestRunOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Run Now</span>
          </button>
        </div>
      </div>

      {/* Webhook Endpoint Banner (If applicable) */}
      {workflow.trigger_type === 'webhook' && (
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-sky-400" />
              <span>Incoming Webhook URL</span>
            </span>
            <span className="text-[11px] text-slate-500 font-mono">POST JSON payload to trigger run</span>
          </div>
          {workflow.webhook_url ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={workflow.webhook_url}
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-emerald-400 select-all"
              />
              <button
                type="button"
                onClick={handleCopyUrl}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          ) : (
            <p className="text-xs text-amber-400/90 font-mono">
              Activate workflow to generate an accessible webhook URL.
            </p>
          )}
        </div>
      )}

      {/* Configuration Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
          <span className="text-xs font-medium text-slate-400">Trigger Type</span>
          <div className="text-base font-semibold text-slate-100 capitalize mt-1">
            {workflow.trigger_type}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {workflow.trigger_type === 'webhook'
              ? 'Triggered via HTTP POST webhook'
              : workflow.trigger_type === 'scheduled'
              ? 'Triggered on cron schedule in UTC'
              : 'Triggered manually via dashboard/API'}
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
          <span className="text-xs font-medium text-slate-400">Steps Configured</span>
          <div className="text-base font-semibold text-slate-100 mt-1">
            {steps.length} {steps.length === 1 ? 'Action' : 'Actions'}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {steps.map((s) => s.type).join(' → ') || 'No steps configured'}
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
          <span className="text-xs font-medium text-slate-400">Created / Updated</span>
          <div className="text-sm font-medium text-slate-200 mt-1 font-mono">
            {new Date(workflow.updated_at).toLocaleDateString()}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Last modified {new Date(workflow.updated_at).toLocaleTimeString()}
          </p>
        </div>
      </div>

      {/* Execution History Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-slate-200">Execution History</h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">{executions.length} runs recorded</span>
        </div>

        {executions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No executions have run for this workflow yet. Click "Run Now" to test it.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-mono">
                <tr>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Execution ID</th>
                  <th className="px-6 py-3">Trigger Source</th>
                  <th className="px-6 py-3">Duration</th>
                  <th className="px-6 py-3">Started At</th>
                  <th className="px-6 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
                {executions.map((ex) => (
                  <tr key={ex.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-3.5">
                      <StatusBadge status={ex.status} size="sm" />
                    </td>
                    <td className="px-6 py-3.5 text-slate-300">#{ex.id.slice(0, 8)}</td>
                    <td className="px-6 py-3.5 uppercase text-slate-400">{ex.trigger_source}</td>
                    <td className="px-6 py-3.5 text-slate-400">
                      {ex.duration_ms ? `${Math.round(ex.duration_ms)}ms` : '-'}
                    </td>
                    <td className="px-6 py-3.5 text-slate-400">
                      {ex.created_at ? new Date(ex.created_at).toLocaleString() : '-'}
                    </td>
                    <td className="px-6 py-3.5 text-right font-sans">
                      <Link
                        to={`/executions/${ex.id}`}
                        className="text-emerald-400 hover:text-emerald-300 font-medium hover:underline flex items-center gap-1 justify-end"
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
        )}
      </div>

      {/* Test Run Modal */}
      <TestRunModal
        isOpen={isTestRunOpen}
        workflowId={workflow.id}
        workflowName={workflow.name}
        onClose={() => setIsTestRunOpen(false)}
      />
    </div>
  );
};
