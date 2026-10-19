import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Copy,
  Trash2,
  Play,
  CheckCircle2,
  MinusCircle,
  ExternalLink,
  Workflow as WorkflowIcon,
  Globe,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { workflowsApi } from '../api/workflows';
import { Workflow } from '../types';
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
        return <Globe className="w-3.5 h-3.5 text-sky-400" />;
      case 'scheduled':
        return <Calendar className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Play className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Workflows</h1>
          <p className="text-sm text-slate-400 mt-0.5">Manage, activate, and monitor automated pipelines</p>
        </div>
        <Link
          to="/workflows/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create Workflow</span>
        </Link>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button type="button" onClick={() => setErrorMessage(null)} className="text-slate-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search workflows by name or description..."
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={triggerFilter}
            onChange={(e) => setTriggerFilter(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
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
          description={search || statusFilter ? 'Try clearing your search filters' : 'Get started by building your first automated workflow'}
          actionLabel={search || statusFilter ? undefined : 'Create Workflow'}
          onAction={() => navigate('/workflows/new')}
        />
      ) : (
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-mono">
                <tr>
                  <th className="px-6 py-3.5">Workflow Name</th>
                  <th className="px-6 py-3.5">Trigger</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Steps</th>
                  <th className="px-6 py-3.5">Last Run</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {workflows.map((wf) => {
                  const stepCount = wf.definition_json?.steps?.length || 0;
                  return (
                    <tr key={wf.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <Link
                          to={`/workflows/${wf.id}`}
                          className="font-semibold text-slate-200 hover:text-emerald-400 transition-colors block text-sm"
                        >
                          {wf.name}
                        </Link>
                        {wf.description && (
                          <span className="text-xs text-slate-400 line-clamp-1 mt-0.5">{wf.description}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800/80 border border-slate-700/60 font-mono text-[11px] capitalize text-slate-300">
                          {getTriggerIcon(wf.trigger_type)}
                          <span>{wf.trigger_type}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={wf.status} size="sm" />
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-400">
                        {stepCount} {stepCount === 1 ? 'step' : 'steps'}
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-400">
                        {wf.last_execution_status ? (
                          <div className="flex items-center gap-2">
                            <StatusBadge status={wf.last_execution_status} size="sm" />
                            <span className="text-[11px] text-slate-500">
                              {wf.last_execution_at ? new Date(wf.last_execution_at).toLocaleTimeString() : ''}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Never run</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {wf.status === 'active' ? (
                            <button
                              type="button"
                              onClick={() => deactivateMutation.mutate(wf.id)}
                              className="px-2.5 py-1 text-xs font-medium text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded border border-amber-500/20 transition-colors"
                              title="Deactivate Workflow"
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => activateMutation.mutate(wf.id)}
                              className="px-2.5 py-1 text-xs font-medium text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded border border-emerald-500/20 transition-colors"
                              title="Activate Workflow"
                            >
                              Activate
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => duplicateMutation.mutate(wf.id)}
                            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors"
                            title="Duplicate Workflow"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <Link
                            to={`/workflows/${wf.id}/edit`}
                            className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded transition-colors"
                          >
                            Edit
                          </Link>

                          <button
                            type="button"
                            onClick={() => setDeleteWorkflowId(wf.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                            title="Delete Workflow"
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
        message="Are you sure you want to permanently delete this workflow? All associated execution logs will also be deleted. This action cannot be undone."
        confirmLabel="Delete Permanently"
        isDestructive={true}
        onConfirm={() => deleteWorkflowId && deleteMutation.mutate(deleteWorkflowId)}
        onCancel={() => setDeleteWorkflowId(null)}
      />
    </div>
  );
};
