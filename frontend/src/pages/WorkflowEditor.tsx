import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Save,
  CheckCircle2,
  Play,
  Plus,
  ArrowLeft,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Globe,
} from 'lucide-react';
import { workflowsApi } from '../api/workflows';
import { StepDefinition, WorkflowDefinition, TriggerDefinition } from '../types';
import { ActionCard } from '../components/builder/ActionCard';
import { StepConfigModal } from '../components/builder/StepConfigModal';
import { TriggerConfigCard } from '../components/builder/TriggerConfigCard';
import { TestRunModal } from '../components/builder/TestRunModal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const WorkflowEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [trigger, setTrigger] = useState<TriggerDefinition>({
    type: 'manual',
    config: {},
  });
  const [steps, setSteps] = useState<StepDefinition[]>([]);
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [isAddingStep, setIsAddingStep] = useState(false);
  const [isTestRunOpen, setIsTestRunOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationSuccess, setValidationSuccess] = useState<string | null>(null);

  // Load existing workflow if editing
  const { data: existingWorkflow, isLoading: loadingWorkflow } = useQuery({
    queryKey: ['workflow', id],
    queryFn: () => workflowsApi.get(id!),
    enabled: !isNew,
  });

  useEffect(() => {
    if (existingWorkflow) {
      setName(existingWorkflow.name);
      setDescription(existingWorkflow.description || '');
      const def = existingWorkflow.definition_json || {};
      setTrigger(def.trigger || { type: existingWorkflow.trigger_type || 'manual', config: {} });
      setSteps(def.steps || []);
    } else if (isNew) {
      setName('Untitled Workflow');
      setDescription('');
      setTrigger({ type: 'webhook', config: {} });
      setSteps([
        {
          key: 'log_payload',
          name: 'Inspect Payload',
          type: 'json_transform',
          config: { operation: 'select_path', path: 'input' },
          retry: { max_attempts: 1, backoff_factor: 1 },
        },
      ]);
    }
  }, [existingWorkflow, isNew]);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async (activateAfterSave: boolean = false) => {
      const defJson: WorkflowDefinition = {
        trigger,
        steps,
      };

      if (isNew) {
        const created = await workflowsApi.create({
          name: name.trim() || 'Untitled Workflow',
          description: description.trim(),
          trigger_type: trigger.type,
          definition_json: defJson,
        });
        if (activateAfterSave) {
          await workflowsApi.activate(created.id);
        }
        return created;
      } else {
        const updated = await workflowsApi.update(id!, {
          name: name.trim(),
          description: description.trim(),
          trigger_type: trigger.type,
          definition_json: defJson,
        });
        if (activateAfterSave) {
          await workflowsApi.activate(updated.id);
        }
        return updated;
      }
    },
    onSuccess: (savedWf) => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      queryClient.invalidateQueries({ queryKey: ['workflow', savedWf.id] });
      setValidationErrors([]);
      if (isNew) {
        navigate(`/workflows/${savedWf.id}`);
      } else {
        setValidationSuccess('Workflow configuration saved successfully');
        setTimeout(() => setValidationSuccess(null), 3000);
      }
    },
    onError: (err: any) => {
      setValidationErrors([err.message || 'Failed to save workflow']);
    },
  });

  const handleValidate = async () => {
    setValidationErrors([]);
    setValidationSuccess(null);

    const errs: string[] = [];
    if (!name.trim()) errs.push('Workflow Name is required');
    if (steps.length === 0) errs.push('At least one action step is required');

    const keys = new Set<string>();
    steps.forEach((s, idx) => {
      if (!s.key) errs.push(`Step at position ${idx + 1} has no key`);
      else if (keys.has(s.key)) errs.push(`Duplicate step key: ${s.key}`);
      else keys.add(s.key);

      if (s.type === 'http_request' && !s.config?.url) {
        errs.push(`Step '${s.key}' is missing a target HTTP URL`);
      }
    });

    if (errs.length > 0) {
      setValidationErrors(errs);
      return;
    }

    setValidationSuccess('Workflow definition passed client-side validation rules.');
  };

  // Step manipulation handlers
  const handleSaveStep = (newStep: StepDefinition) => {
    if (editingStepIndex !== null) {
      const updated = [...steps];
      updated[editingStepIndex] = newStep;
      setSteps(updated);
      setEditingStepIndex(null);
    } else {
      setSteps([...steps, newStep]);
      setIsAddingStep(false);
    }
  };

  const handleDeleteStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const handleMoveStep = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= steps.length) return;
    const reordered = [...steps];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    setSteps(reordered);
  };

  if (loadingWorkflow) {
    return <LoadingSpinner message="Loading workflow configuration..." />;
  }

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto w-full">
      {/* Top Bar Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to={isNew ? '/workflows' : `/workflows/${id}`}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-100">
              {isNew ? 'Create New Workflow' : 'Workflow Builder'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {isNew ? 'Define steps and triggers for your automated flow' : `Editing version ${existingWorkflow?.version || 1}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isNew && (
            <button
              type="button"
              onClick={() => setIsTestRunOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors shadow-sm"
            >
              <Play className="w-3.5 h-3.5 text-emerald-400" />
              <span>Test Run</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleValidate}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors shadow-sm"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
            <span>Validate</span>
          </button>

          <button
            type="button"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate(false)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
            {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Save & Activate</span>
          </button>
        </div>
      </div>

      {/* Validation Feedback */}
      {validationErrors.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 space-y-1">
          <div className="flex items-center gap-2 font-semibold text-rose-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Validation Errors Detected:</span>
          </div>
          <ul className="list-disc list-inside pl-1 space-y-0.5">
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {validationSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{validationSuccess}</span>
        </div>
      )}

      {/* General Information Card */}
      <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/80 shadow-sm space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">
            Workflow Name <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Order Processing & Notification Flow"
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what triggers this workflow and what business action it performs..."
            className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      {/* Trigger Configuration Card */}
      <TriggerConfigCard
        trigger={trigger}
        webhookUrl={existingWorkflow?.webhook_url}
        status={existingWorkflow?.status || 'draft'}
        onChange={setTrigger}
      />

      {/* Action Pipeline Steps */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Action Steps Pipeline</h3>
            <p className="text-xs text-slate-400 mt-0.5">Executed sequentially in order from top to bottom</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingStepIndex(null);
              setIsAddingStep(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Action</span>
          </button>
        </div>

        {steps.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-dashed border-slate-800 bg-slate-900/40 text-xs text-slate-500">
            No action steps configured. Click <strong className="text-slate-300">"Add Action"</strong> above to add HTTP requests, JSON transformations, or conditions.
          </div>
        ) : (
          <div className="space-y-3">
            {steps.map((st, idx) => (
              <ActionCard
                key={st.key || idx}
                step={st}
                index={idx}
                totalSteps={steps.length}
                onEdit={() => setEditingStepIndex(idx)}
                onDelete={() => handleDeleteStep(idx)}
                onMoveUp={() => handleMoveStep(idx, idx - 1)}
                onMoveDown={() => handleMoveStep(idx, idx + 1)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Step Config Modal */}
      <StepConfigModal
        isOpen={isAddingStep || editingStepIndex !== null}
        step={editingStepIndex !== null ? steps[editingStepIndex] : null}
        existingKeys={steps.map((s) => s.key)}
        onSave={handleSaveStep}
        onClose={() => {
          setIsAddingStep(false);
          setEditingStepIndex(null);
        }}
      />

      {/* Test Run Modal */}
      {!isNew && (
        <TestRunModal
          isOpen={isTestRunOpen}
          workflowId={id!}
          workflowName={name}
          onClose={() => setIsTestRunOpen(false)}
        />
      )}
    </div>
  );
};
