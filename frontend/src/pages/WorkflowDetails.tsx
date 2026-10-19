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
  ExternalLink,
  Activity,
  Layers,
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

  const { data: executions = [] } = useQuery({
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
      <div className="p-8 text-center text-forge-text-muted">
        Workflow not found.{' '}
        <Link to="/workflows" className="text-forge-accent underline">
          Back to workflows
        </Link>
      </div>
    );
  }

  const steps = workflow.definition_json?.steps || [];

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/workflows"
            className="p-2 rounded-lg bg-forge-surface border border-forge-border text-forge-text-secondary hover:text-forge-text hover:bg-forge-surface-hover transition-colors shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-forge-text">
                {workflow.name}
              </h1>
              <StatusBadge status={workflow.status} />
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-forge-surface-secondary text-forge-text-secondary border border-forge-border">
                v{workflow.version}
              </span>
            </div>
            {workflow.description && (
              <p className="text-xs text-forge-text-secondary mt-1 max-w-2xl">{workflow.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {workflow.status === 'active' ? (
            <button
              type="button"
              onClick={() => deactivateMutation.mutate(workflow.id)}
              className="px-3 py-2 text-xs font-medium text-[var(--warning)] hover:bg-[var(--warning-subtle)] border border-[var(--warning)]/30 rounded-lg transition-colors"
            >
              Deactivate
            </button>
          ) : (
            <button
              type="button"
              onClick={() => activateMutation.mutate(workflow.id)}
              className="px-3 py-2 text-xs font-medium text-forge-accent hover:bg-[var(--accent-subtle)] border border-forge-accent/30 rounded-lg transition-colors"
            >
              Activate
            </button>
          )}

          <Link
            to={`/workflows/${workflow.id}/edit`}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-forge-text bg-forge-surface-secondary hover:bg-forge-surface-hover border border-forge-border rounded-lg transition-colors shadow-2xs"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Pipeline</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsTestRunOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-forge-accent hover:bg-forge-accent-hover rounded-lg shadow-xs transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Run Now</span>
          </button>
        </div>
      </div>

      {/* Webhook Endpoint Banner (If applicable) */}
      {workflow.trigger_type === 'webhook' && (
        <div className="p-4 rounded-xl border border-forge-border bg-forge-surface space-y-2 shadow-xs transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-forge-text flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-forge-info" />
              <span>Incoming Webhook URL</span>
            </span>
            <span className="text-[11px] text-forge-text-muted font-mono">POST JSON payload to trigger run</span>
          </div>
          {workflow.webhook_url ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={workflow.webhook_url}
                className="flex-1 px-3 py-2 bg-forge-surface-secondary border border-forge-border rounded-lg text-xs font-mono text-forge-accent select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyUrl}
                className="px-3 py-2 bg-forge-surface-secondary hover:bg-forge-surface-hover text-forge-text text-xs font-medium rounded-lg border border-forge-border flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-forge-success" />
                    <span className="text-forge-success">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <p className="text-xs text-forge-warning font-mono p-2 rounded bg-[var(--warning-subtle)] border border-[var(--warning)]/20">
              Activate workflow to generate an accessible webhook URL.
            </p>
          )}
        </div>
      )}

      {/* Configuration Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-forge-border bg-forge-surface shadow-xs transition-colors">
          <span className="text-xs font-medium text-forge-text-muted font-mono uppercase">Trigger Type</span>
          <div className="text-base font-semibold text-forge-text capitalize mt-1">
            {workflow.trigger_type}
          </div>
          <p className="text-xs text-forge-text-secondary mt-1">
            {workflow.trigger_type === 'webhook'
              ? 'Triggered via HTTP POST webhook'
              : workflow.trigger_type === 'scheduled'
              ? 'Triggered on cron schedule in UTC'
              : 'Triggered manually via console or API'}
          </p>
        </div>

        <div className="p-4 rounded-xl border border-forge-border bg-forge-surface shadow-xs transition-colors">
          <span className="text-xs font-medium text-forge-text-muted font-mono uppercase">Steps Configured</span>
          <div className="text-base font-semibold text-forge-text mt-1">
            {steps.length} {steps.length === 1 ? 'Action' : 'Actions'}
          </div>
          <p className="text-xs text-forge-text-secondary mt-1 font-mono">
            {steps.map((s) => s.type).join(' → ') || 'No steps configured'}
          </p>
        </div>

        <div className="p-4 rounded-xl border border-forge-border bg-forge-surface shadow-xs transition-colors">
          <span className="text-xs font-medium text-forge-text-muted font-mono uppercase">Created / Updated</span>
          <div className="text-sm font-medium text-forge-text mt-1 font-mono">
            {new Date(workflow.updated_at).toLocaleDateString()}
          </div>
          <p className="text-xs text-forge-text-secondary mt-1">
            Last modified {new Date(workflow.updated_at).toLocaleTimeString()}
          </p>
        </div>
      </div>

      {/* Sequential Steps Pipeline Visualizer */}
      {steps.length > 0 && (
        <div className="rounded-xl border border-forge-border bg-forge-surface p-5 shadow-xs transition-colors space-y-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-forge-accent" />
            <h2 className="text-sm font-semibold text-forge-text">Pipeline Flow Sequence</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
            {steps.map((st, idx) => (
              <div
                key={st.key || idx}
                className="p-3 rounded-lg border border-forge-border bg-forge-surface-secondary flex items-start gap-2.5"
              >
                <span className="flex items-center justify-center w-5 h-5 rounded-md bg-forge-surface text-[11px] font-mono font-semibold text-forge-text-secondary shrink-0">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-forge-text truncate">{st.name}</div>
                  <div className="text-[11px] font-mono text-forge-text-secondary mt-0.5">{st.key}</div>
                  <div className="text-[10px] uppercase font-mono text-forge-accent mt-1">{st.type}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Execution History Table */}
      <div className="rounded-xl border border-forge-border bg-forge-surface overflow-hidden shadow-xs transition-colors">
        <div className="flex items-center justify-between px-6 py-4 border-b border-forge-border">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-forge-accent" />
            <h2 className="text-sm font-semibold text-forge-text">Execution History</h2>
          </div>
          <span className="text-xs text-forge-text-secondary font-mono">{executions.length} runs recorded</span>
        </div>

        {executions.length === 0 ? (
          <div className="p-8 text-center text-xs text-forge-text-muted">
            No executions have run for this workflow yet. Click "Run Now" to test it.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-forge-surface-secondary/70 border-b border-forge-border text-forge-text-secondary uppercase tracking-wider font-mono">
                <tr>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Execution ID</th>
                  <th className="px-6 py-3">Trigger Source</th>
                  <th className="px-6 py-3">Duration</th>
                  <th className="px-6 py-3">Started At</th>
                  <th className="px-6 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-forge-border text-forge-text font-mono">
                {executions.map((ex) => (
                  <tr key={ex.id} className="hover:bg-forge-surface-hover/50 transition-colors">
                    <td className="px-6 py-3.5">
                      <StatusBadge status={ex.status} size="sm" />
                    </td>
                    <td className="px-6 py-3.5 text-forge-text">#{ex.id.slice(0, 8)}</td>
                    <td className="px-6 py-3.5 uppercase text-forge-text-secondary">{ex.trigger_source}</td>
                    <td className="px-6 py-3.5 text-forge-text-secondary">
                      {ex.duration_ms ? `${Math.round(ex.duration_ms)}ms` : '-'}
                    </td>
                    <td className="px-6 py-3.5 text-forge-text-secondary">
                      {ex.created_at ? new Date(ex.created_at).toLocaleString() : '-'}
                    </td>
                    <td className="px-6 py-3.5 text-right font-sans">
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
