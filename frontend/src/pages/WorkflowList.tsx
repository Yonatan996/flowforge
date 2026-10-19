import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Copy,
  Trash2,
  Play,
  Workflow as WorkflowIcon,
  Globe,
  Calendar,
  AlertCircle,
  Edit3,
} from 'lucide-react';
import { workflowsApi } from '../api/workflows';
import { StatusBadge } from '../components/common/StatusBadge';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const WorkflowList: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [triggerFilter, setTriggerFilter] = useState('');
  const [deleteWorkflowId, setDeleteWorkflowId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ['workflows', search, statusFilter, triggerFilter],
    queryFn: () =>
      workflowsApi.list({
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        trigger_type: triggerFilter || undefined,
      }),
  });

  const activateMutation = useMutation({
    mutationFn: workflowsApi.activate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      setErrorMessage(null);
    },
    onError: (err: any) => setErrorMessage(err.message || 'Activation failed'),
  });

  const deactivateMutation = useMutation({
    mutationFn: workflowsApi.deactivate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      setErrorMessage(null);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: workflowsApi.duplicate,
    onSuccess: (newWf) => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      navigate(`/workflows/${newWf.id}/edit`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: workflowsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      setDeleteWorkflowId(null);
    },
  });

  const getTriggerIcon = (triggerType: string) => {
    switch (triggerType) {
      case 'webhook':
        return <Globe className="w-3.5 h-3.5 text-forge-info" />;
      case 'scheduled':
        return <Calendar className="w-3.5 h-3.5 text-forge-accent" />;
      default:
        return <Play className="w-3.5 h-3.5 text-forge-warning" />;
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-forge-text">
            Workflows
          </h1>
          <p className="text-xs md:text-sm text-forge-text-secondary mt-0.5">
            Manage, configure, and operate automation pipelines
          </p>
        </div>
        <Link
          to="/workflows/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-forge-accent hover:bg-forge-accent-hover rounded-lg shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Workflow</span>
        </Link>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-lg bg-[var(--danger-subtle)] border border-[var(--danger)]/30 text-xs text-[var(--danger)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-forge-text-muted hover:text-forge-text font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-forge-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search workflows by name or description..."
            className="w-full pl-9 pr-4 py-2 bg-forge-surface border border-forge-border rounded-lg text-xs text-forge-text placeholder:text-forge-text-muted focus:outline-none focus:border-forge-accent focus:ring-2 focus:ring-[var(--focus-ring)] transition-colors"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-forge-surface border border-forge-border rounded-lg text-xs text-forge-text-secondary focus:outline-none focus:border-forge-accent"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={triggerFilter}
            onChange={(e) => setTriggerFilter(e.target.value)}
            className="px-3 py-2 bg-forge-surface border border-forge-border rounded-lg text-xs text-forge-text-secondary focus:outline-none focus:border-forge-accent"
          >
            <option value="">All Triggers</option>
            <option value="webhook">Webhook</option>
            <option value="scheduled">Scheduled</option>
            <option value="manual">Manual</option>
          </select>
        </div>
      </div>

      {/* Table or Empty State */}
      {isLoading ? (
        <LoadingSpinner message="Loading workflows..." />
      ) : workflows.length === 0 ? (
        <EmptyState
          icon={WorkflowIcon}
          title="No workflows found"
          description={
            search || statusFilter || triggerFilter
              ? 'No workflows match the specified search or filter criteria.'
              : 'Create your first automated workflow with triggers and action steps.'
          }
          actionLabel={search || statusFilter || triggerFilter ? undefined : 'Create Workflow'}
          onAction={() => navigate('/workflows/new')}
        />
      ) : (
        <div className="rounded-xl border border-forge-border bg-forge-surface shadow-xs overflow-hidden transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-forge-surface-secondary/70 border-b border-forge-border text-forge-text-secondary uppercase tracking-wider font-mono">
                <tr>
                  <th className="px-6 py-3.5">Workflow Name</th>
                  <th className="px-6 py-3.5">Trigger</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Steps</th>
                  <th className="px-6 py-3.5">Last Run</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-forge-border text-forge-text font-mono">
                {workflows.map((wf) => {
                  const stepCount = wf.definition_json?.steps?.length || 0;
                  return (
                    <tr key={wf.id} className="hover:bg-forge-surface-hover/50 transition-colors">
                      <td className="px-6 py-4 font-sans">
                        <Link
                          to={`/workflows/${wf.id}`}
                          className="font-semibold text-forge-text hover:text-forge-accent transition-colors block text-sm"
                        >
                          {wf.name}
                        </Link>
                        {wf.description && (
                          <span className="text-xs text-forge-text-secondary line-clamp-1 mt-0.5 font-sans">
                            {wf.description}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-forge-surface-secondary border border-forge-border font-mono text-[11px] capitalize text-forge-text-secondary">
                          {getTriggerIcon(wf.trigger_type)}
                          <span>{wf.trigger_type}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={wf.status} size="sm" />
                      </td>
                      <td className="px-6 py-4 font-mono text-forge-text-secondary">
                        {stepCount} {stepCount === 1 ? 'step' : 'steps'}
                      </td>
                      <td className="px-6 py-4 font-mono text-forge-text-secondary">
                        {wf.last_execution_status ? (
                          <div className="flex items-center gap-2">
                            <StatusBadge status={wf.last_execution_status} size="sm" />
                            <span className="text-[11px] text-forge-text-muted">
                              {wf.last_execution_at ? new Date(wf.last_execution_at).toLocaleTimeString() : ''}
                            </span>
                          </div>
                        ) : (
                          <span className="text-forge-text-muted text-[11px]">Never run</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-sans">
                        <div className="flex items-center justify-end gap-1.5">
                          {wf.status === 'active' ? (
                            <button
                              type="button"
                              onClick={() => deactivateMutation.mutate(wf.id)}
                              className="px-2.5 py-1 text-xs font-medium text-[var(--warning)] hover:bg-[var(--warning-subtle)] rounded border border-[var(--warning)]/30 transition-colors"
                              title="Deactivate Workflow"
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => activateMutation.mutate(wf.id)}
                              className="px-2.5 py-1 text-xs font-medium text-forge-accent hover:bg-[var(--accent-subtle)] rounded border border-forge-accent/30 transition-colors"
                              title="Activate Workflow"
                            >
                              Activate
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => duplicateMutation.mutate(wf.id)}
                            className="p-1.5 text-forge-text-secondary hover:text-forge-text hover:bg-forge-surface-secondary rounded transition-colors"
                            title="Duplicate Workflow"
                            aria-label="Duplicate Workflow"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <Link
                            to={`/workflows/${wf.id}/edit`}
                            className="p-1.5 text-forge-text-secondary hover:text-forge-text hover:bg-forge-surface-secondary rounded transition-colors inline-flex items-center"
                            title="Edit Workflow"
                            aria-label="Edit Workflow"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </Link>

                          <button
                            type="button"
                            onClick={() => setDeleteWorkflowId(wf.id)}
                            className="p-1.5 text-forge-text-secondary hover:text-forge-danger hover:bg-[var(--danger-subtle)] rounded transition-colors"
                            title="Delete Workflow"
                            aria-label="Delete Workflow"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteWorkflowId}
        title="Delete Workflow"
        message="Are you sure you want to permanently delete this workflow? All associated execution logs will also be removed. This action cannot be undone."
        confirmLabel="Delete Permanently"
        isDestructive={true}
        onConfirm={() => deleteWorkflowId && deleteMutation.mutate(deleteWorkflowId)}
        onCancel={() => setDeleteWorkflowId(null)}
      />
    </div>
  );
};
