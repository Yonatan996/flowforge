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
  Search,
  Globe,
  Shuffle,
  GitBranch,
  Calendar,
  Webhook,
  Sliders,
  Sparkles,
  Info,
} from 'lucide-react';
import { workflowsApi } from '../api/workflows';
import { StepDefinition, WorkflowDefinition, TriggerDefinition, StepType } from '../types';
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
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [isAddingStep, setIsAddingStep] = useState(false);
  const [isTestRunOpen, setIsTestRunOpen] = useState(false);
  const [paletteSearch, setPaletteSearch] = useState('');
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
    if (steps.length === 0) errs.push('At least one action step is required in the pipeline');

    const keys = new Set<string>();
    steps.forEach((s, idx) => {
      if (!s.key) errs.push(`Step at position ${idx + 1} has no key identifier`);
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

    setValidationSuccess('Workflow definition passed all validation rules successfully.');
  };

  const handleSaveStep = (newStep: StepDefinition) => {
    if (editingStepIndex !== null) {
      const updated = [...steps];
      updated[editingStepIndex] = newStep;
      setSteps(updated);
      setEditingStepIndex(null);
    } else {
      setSteps([...steps, newStep]);
      setIsAddingStep(false);
      setSelectedStepIndex(steps.length);
    }
  };

  const handleDeleteStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
    if (selectedStepIndex === index) {
      setSelectedStepIndex(null);
    } else if (selectedStepIndex !== null && selectedStepIndex > index) {
      setSelectedStepIndex(selectedStepIndex - 1);
    }
  };

  const handleMoveStep = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= steps.length) return;
    const reordered = [...steps];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    setSteps(reordered);
    setSelectedStepIndex(toIndex);
  };

  const handleAddFromPalette = (actionType: StepType) => {
    const nextNum = steps.length + 1;
    let newStep: StepDefinition;
    if (actionType === 'http_request') {
      newStep = {
        key: `http_req_${nextNum}`,
        name: `API Call ${nextNum}`,
        type: 'http_request',
        config: { method: 'GET', url: 'https://api.example.com/data' },
        retry: { max_attempts: 3, backoff_factor: 2.0 },
      };
    } else if (actionType === 'json_transform') {
      newStep = {
        key: `transform_${nextNum}`,
        name: `Transform Data ${nextNum}`,
        type: 'json_transform',
        config: { operation: 'select_path', path: 'input' },
        retry: { max_attempts: 1, backoff_factor: 1.0 },
      };
    } else {
      newStep = {
        key: `condition_${nextNum}`,
        name: `Evaluate Gate ${nextNum}`,
        type: 'condition',
        config: { left_operand: 'input.status', operator: 'equals', right_operand: 'active' },
        retry: { max_attempts: 1, backoff_factor: 1.0 },
      };
    }
    setSteps([...steps, newStep]);
    setSelectedStepIndex(steps.length);
  };

  if (loadingWorkflow) {
    return <LoadingSpinner message="Loading workflow configuration..." />;
  }

  const selectedStep = selectedStepIndex !== null ? steps[selectedStepIndex] : null;

  interface PaletteItem {
    id: string;
    name: string;
    desc: string;
    icon: React.ComponentType<{ className?: string }>;
    action: () => void;
    active?: boolean;
  }

  const nodeLibrary: { category: string; items: PaletteItem[] }[] = [
    {
      category: 'Triggers',
      items: [
        {
          id: 'webhook',
          name: 'Webhook Ingestion',
          desc: 'HTTP POST endpoint with token & idempotency',
          icon: Webhook,
          action: () => setTrigger({ type: 'webhook', config: {} }),
          active: trigger.type === 'webhook',
        },
        {
          id: 'scheduled',
          name: 'Cron Scheduler',
          desc: 'Periodic automated timer dispatch in UTC',
          icon: Calendar,
          action: () => setTrigger({ type: 'scheduled', config: { cron_expression: '*/15 * * * *' } }),
          active: trigger.type === 'scheduled',
        },
        {
          id: 'manual',
          name: 'Manual Dispatch',
          desc: 'Triggered on-demand via console or API',
          icon: Play,
          action: () => setTrigger({ type: 'manual', config: {} }),
          active: trigger.type === 'manual',
        },
      ],
    },
    {
      category: 'Action Steps',
      items: [
        {
          id: 'http_request',
          name: 'HTTP Request',
          desc: 'Outbound REST call with SSRF sandbox',
          icon: Globe,
          action: () => handleAddFromPalette('http_request'),
        },
        {
          id: 'json_transform',
          name: 'JSON Transform',
          desc: 'Path extraction, remapping & templates',
          icon: Shuffle,
          action: () => handleAddFromPalette('json_transform'),
        },
        {
          id: 'condition',
          name: 'Condition Branch',
          desc: 'Predicate evaluation & flow gating',
          icon: GitBranch,
          action: () => handleAddFromPalette('condition'),
        },
      ],
    },
  ];

  return (
    <div className="flex flex-col h-full bg-forge-bg text-forge-text overflow-hidden">
      {/* Top Editor Toolbar */}
      <div className="h-14 border-b border-forge-border bg-forge-surface px-4 md:px-6 flex items-center justify-between gap-4 shrink-0 shadow-xs transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to={isNew ? '/workflows' : `/workflows/${id}`}
            className="p-1.5 rounded-lg border border-forge-border text-forge-text-secondary hover:text-forge-text hover:bg-forge-surface-hover transition-colors shrink-0"
            title="Back to Workflows"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2 min-w-0">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Workflow Name"
              className="font-bold text-sm md:text-base text-forge-text bg-transparent border-b border-transparent hover:border-forge-border focus:border-forge-accent focus:outline-none px-1 py-0.5 rounded transition-colors truncate max-w-xs md:max-w-md"
            />
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-forge-surface-secondary text-forge-text-secondary border border-forge-border shrink-0">
              {isNew ? 'NEW' : `v${existingWorkflow?.version || 1}`}
            </span>
          </div>
        </div>

        {/* Toolbar Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {!isNew && (
            <button
              type="button"
              onClick={() => setIsTestRunOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-forge-text-secondary hover:text-forge-text bg-forge-surface border border-forge-border rounded-lg hover:bg-forge-surface-hover transition-colors shadow-2xs"
            >
              <Play className="w-3.5 h-3.5 text-forge-accent" />
              <span>Test Run</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleValidate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-forge-text-secondary hover:text-forge-text bg-forge-surface border border-forge-border rounded-lg hover:bg-forge-surface-hover transition-colors shadow-2xs"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-forge-info" />
            <span className="hidden sm:inline">Validate</span>
          </button>

          <button
            type="button"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate(false)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-forge-text bg-forge-surface-secondary hover:bg-forge-surface-hover border border-forge-border rounded-lg transition-colors shadow-2xs disabled:opacity-50"
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-forge-accent hover:bg-forge-accent-hover rounded-lg shadow-xs transition-colors disabled:opacity-50"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Save & Activate</span>
            <span className="md:hidden">Activate</span>
          </button>
        </div>
      </div>

      {/* Main 3-Panel Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Left Panel: Node Palette (hidden on small screens, collapsible) */}
        <aside className="w-full lg:w-72 border-r border-forge-border bg-forge-sidebar p-4 flex flex-col shrink-0 overflow-y-auto hidden md:flex">
          <div className="mb-4">
            <h2 className="text-xs font-bold text-forge-text uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-forge-accent" />
              <span>Node Palette</span>
            </h2>
            <p className="text-[11px] text-forge-text-secondary mt-0.5">
              Click to configure triggers or append pipeline actions
            </p>
            <div className="mt-3 relative">
              <Search className="w-3.5 h-3.5 text-forge-text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={paletteSearch}
                onChange={(e) => setPaletteSearch(e.target.value)}
                placeholder="Search nodes..."
                className="w-full pl-8 pr-3 py-1.5 bg-forge-surface border border-forge-border rounded-lg text-xs text-forge-text focus:outline-none focus:border-forge-accent transition-colors"
              />
            </div>
          </div>

          <div className="space-y-5 flex-1">
            {nodeLibrary.map((group) => {
              const filteredItems = group.items.filter((item) =>
                item.name.toLowerCase().includes(paletteSearch.toLowerCase()) ||
                item.desc.toLowerCase().includes(paletteSearch.toLowerCase())
              );
              if (filteredItems.length === 0) return null;

              return (
                <div key={group.category} className="space-y-2">
                  <span className="text-[10px] font-mono font-semibold uppercase text-forge-text-muted tracking-wider block">
                    {group.category}
                  </span>
                  <div className="space-y-1.5">
                    {filteredItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={item.action}
                          className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-start gap-2.5 group ${
                            item.active
                              ? 'bg-[var(--accent-subtle)] border-forge-accent shadow-2xs'
                              : 'bg-forge-surface border-forge-border hover:border-forge-accent/40 hover:bg-forge-surface-hover'
                          }`}
                        >
                          <div className="p-1.5 rounded-md bg-forge-surface-secondary border border-forge-border text-forge-accent group-hover:scale-105 transition-transform mt-0.5 shrink-0">
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-forge-text group-hover:text-forge-accent transition-colors truncate">
                                {item.name}
                              </span>
                              {item.active && (
                                <span className="text-[9px] font-mono text-forge-accent font-semibold px-1 rounded bg-[var(--accent-subtle)]">
                                  ACTIVE
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-forge-text-secondary mt-0.5 leading-snug">
                              {item.desc}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Center: Canvas Area */}
        <div className="flex-1 bg-canvas-grid bg-forge-bg overflow-y-auto p-4 md:p-8 flex flex-col items-center">
          <div className="w-full max-w-2xl space-y-6">
            {/* Feedback Alerts */}
            {validationErrors.length > 0 && (
              <div className="p-4 rounded-xl bg-[var(--danger-subtle)] border border-[var(--danger)]/30 text-xs text-[var(--danger)] space-y-1 shadow-xs">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Validation Errors Detected:</span>
                </div>
                <ul className="list-disc list-inside pl-1 space-y-0.5 font-mono">
                  {validationErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {validationSuccess && (
              <div className="p-3.5 rounded-xl bg-[var(--success-subtle)] border border-[var(--success)]/30 text-xs text-[var(--success)] flex items-center gap-2 shadow-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{validationSuccess}</span>
              </div>
            )}

            {/* Workflow Canvas Pipeline */}
            <div className="space-y-4">
              {/* Trigger Node */}
              <TriggerConfigCard
                trigger={trigger}
                webhookUrl={existingWorkflow?.webhook_url}
                status={existingWorkflow?.status || 'draft'}
                onChange={setTrigger}
              />

              {/* Action Pipeline Steps */}
              {steps.length === 0 ? (
                <div className="relative flex flex-col items-center">
                  <div className="h-6 w-px bg-forge-border" />
                  <div className="w-full p-8 text-center rounded-xl border border-dashed border-forge-border bg-forge-surface/50 text-xs text-forge-text-muted space-y-2">
                    <p>No action steps configured in the pipeline yet.</p>
                    <p className="text-[11px] text-forge-text-secondary">
                      Select an action from the palette on the left, or click below to add your first step.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingStepIndex(null);
                        setIsAddingStep(true);
                      }}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-forge-accent hover:bg-forge-accent-hover rounded-lg transition-colors shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add First Action</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-0">
                  {steps.map((st, idx) => (
                    <ActionCard
                      key={st.key || idx}
                      step={st}
                      index={idx}
                      totalSteps={steps.length}
                      isSelected={selectedStepIndex === idx}
                      onSelect={() => setSelectedStepIndex(idx)}
                      onEdit={() => setEditingStepIndex(idx)}
                      onDelete={() => handleDeleteStep(idx)}
                      onMoveUp={() => handleMoveStep(idx, idx - 1)}
                      onMoveDown={() => handleMoveStep(idx, idx + 1)}
                    />
                  ))}
                </div>
              )}

              {/* Add Action Button at end of pipeline */}
              <div className="flex flex-col items-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingStepIndex(null);
                    setIsAddingStep(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-forge-text hover:text-forge-accent bg-forge-surface hover:bg-forge-surface-hover border border-forge-border rounded-xl shadow-xs transition-all duration-150 group"
                >
                  <Plus className="w-4 h-4 text-forge-accent group-hover:scale-110 transition-transform" />
                  <span>Add Action Step</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Node & Workflow Inspector */}
        <aside className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-forge-border bg-forge-sidebar p-4 flex flex-col shrink-0 overflow-y-auto">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-bold text-forge-text uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-forge-accent" />
              <span>Inspector</span>
            </h2>
            {selectedStepIndex !== null && (
              <button
                type="button"
                onClick={() => setSelectedStepIndex(null)}
                className="text-[11px] text-forge-text-muted hover:text-forge-text"
              >
                Workflow Props
              </button>
            )}
          </div>

          {selectedStep ? (
            /* Selected Node Inspector */
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg border border-forge-border bg-forge-surface space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-forge-text-muted">Selected Step</span>
                  <span className="text-xs font-mono font-bold text-forge-accent">#{selectedStepIndex! + 1}</span>
                </div>
                <h3 className="text-sm font-bold text-forge-text">{selectedStep.name}</h3>
                <div className="text-xs font-mono text-forge-text-secondary bg-forge-surface-secondary px-2 py-1 rounded border border-forge-border">
                  Key: {selectedStep.key}
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-forge-border bg-forge-surface space-y-3">
                <span className="text-xs font-semibold text-forge-text block">Step Attributes</span>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between text-forge-text-secondary">
                    <span>Type:</span>
                    <span className="text-forge-text uppercase">{selectedStep.type}</span>
                  </div>
                  {selectedStep.type === 'http_request' && (
                    <>
                      <div className="flex items-center justify-between text-forge-text-secondary">
                        <span>Method:</span>
                        <span className="text-forge-info font-bold">{selectedStep.config?.method || 'GET'}</span>
                      </div>
                      <div className="text-forge-text-secondary truncate">
                        <span>URL: </span>
                        <span className="text-forge-text">{selectedStep.config?.url}</span>
                      </div>
                    </>
                  )}
                  {selectedStep.type === 'json_transform' && (
                    <div className="flex items-center justify-between text-forge-text-secondary">
                      <span>Operation:</span>
                      <span className="text-forge-accent">{selectedStep.config?.operation}</span>
                    </div>
                  )}
                  {selectedStep.type === 'condition' && (
                    <div className="flex items-center justify-between text-forge-text-secondary">
                      <span>Operator:</span>
                      <span className="text-forge-warning">{selectedStep.config?.operator}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-forge-text-secondary">
                    <span>Retries:</span>
                    <span className="text-forge-text">{selectedStep.retry?.max_attempts ?? 1}x</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingStepIndex(selectedStepIndex)}
                    className="w-full py-2 px-3 text-xs font-medium text-white bg-forge-accent hover:bg-forge-accent-hover rounded-lg transition-colors shadow-2xs text-center"
                  >
                    Edit Configuration
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteStep(selectedStepIndex!)}
                    className="w-full py-2 px-3 text-xs font-medium text-forge-danger hover:bg-[var(--danger-subtle)] border border-[var(--danger)]/30 rounded-lg transition-colors text-center"
                  >
                    Delete Step
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Workflow Overview Properties */
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg border border-forge-border bg-forge-surface space-y-3">
                <span className="text-xs font-semibold text-forge-text block">Workflow Details</span>
                <div>
                  <label className="block text-[11px] font-medium text-forge-text-secondary mb-1">
                    Workflow Description
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe purpose and behavior..."
                    className="w-full p-2.5 bg-forge-surface-secondary border border-forge-border rounded-lg text-xs text-forge-text focus:outline-none focus:border-forge-accent transition-colors"
                  />
                </div>
                <div className="space-y-1.5 text-[11px] font-mono text-forge-text-secondary pt-1 border-t border-forge-border">
                  <div className="flex justify-between">
                    <span>Steps Count:</span>
                    <span className="text-forge-text font-bold">{steps.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Trigger:</span>
                    <span className="text-forge-accent uppercase font-bold">{trigger.type}</span>
                  </div>
                  {!isNew && (
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className="text-forge-success uppercase font-bold">
                        {existingWorkflow?.status || 'draft'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-lg border border-forge-border bg-forge-surface/60 text-xs text-forge-text-secondary space-y-1.5">
                <div className="flex items-center gap-1.5 font-medium text-forge-text">
                  <Info className="w-3.5 h-3.5 text-forge-accent" />
                  <span>Editor Navigation</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Click any action node on the canvas to inspect its parameters, reorder execution sequence, or edit step settings.
                </p>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Modals */}
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
