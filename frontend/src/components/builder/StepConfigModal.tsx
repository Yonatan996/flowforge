import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, AlertCircle } from 'lucide-react';
import { StepDefinition, StepType } from '../../types';

interface StepConfigModalProps {
  isOpen: boolean;
  step: StepDefinition | null;
  existingKeys: string[];
  onSave: (step: StepDefinition) => void;
  onClose: () => void;
}

export const StepConfigModal: React.FC<StepConfigModalProps> = ({
  isOpen,
  step,
  existingKeys,
  onSave,
  onClose,
}) => {
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<StepType>('http_request');
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [backoffFactor, setBackoffFactor] = useState(2.0);

  // HTTP state
  const [httpMethod, setHttpMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('GET');
  const [httpUrl, setHttpUrl] = useState('');
  const [httpHeadersStr, setHttpHeadersStr] = useState('{}');
  const [httpBodyStr, setHttpBodyStr] = useState('');
  const [httpTimeout, setHttpTimeout] = useState(10.0);

  // Transform state
  const [transformOp, setTransformOp] = useState<'select_path' | 'rename_keys' | 'construct_object' | 'type_convert'>('select_path');
  const [transformPath, setTransformPath] = useState('');
  const [transformMappingsStr, setTransformMappingsStr] = useState('{}');
  const [transformTemplateStr, setTransformTemplateStr] = useState('{}');
  const [transformTargetType, setTransformTargetType] = useState<'string' | 'integer' | 'float' | 'boolean' | 'json'>('string');

  // Condition state
  const [condLeft, setCondLeft] = useState('');
  const [condOp, setCondOp] = useState<any>('equals');
  const [condRight, setCondRight] = useState('');

  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (step) {
      setKey(step.key);
      setName(step.name);
      setType(step.type);
      setMaxAttempts(step.retry?.max_attempts ?? 3);
      setBackoffFactor(step.retry?.backoff_factor ?? 2.0);

      const cfg = step.config || {};
      if (step.type === 'http_request') {
        setHttpMethod(cfg.method || 'GET');
        setHttpUrl(cfg.url || '');
        setHttpHeadersStr(JSON.stringify(cfg.headers || {}, null, 2));
        setHttpBodyStr(typeof cfg.body === 'object' ? JSON.stringify(cfg.body, null, 2) : String(cfg.body || ''));
        setHttpTimeout(cfg.timeout_seconds || 10.0);
      } else if (step.type === 'json_transform') {
        setTransformOp(cfg.operation || 'select_path');
        setTransformPath(cfg.path || '');
        setTransformMappingsStr(JSON.stringify(cfg.mappings || {}, null, 2));
        setTransformTemplateStr(JSON.stringify(cfg.template || {}, null, 2));
        setTransformTargetType(cfg.target_type || 'string');
      } else if (step.type === 'condition') {
        setCondLeft(cfg.left_operand || '');
        setCondOp(cfg.operator || 'equals');
        setCondRight(cfg.right_operand !== undefined ? String(cfg.right_operand) : '');
      }
    } else {
      // Default new step
      const randKey = `step_${Date.now().toString().slice(-4)}`;
      setKey(randKey);
      setName('New Action');
      setType('http_request');
      setHttpMethod('GET');
      setHttpUrl('');
      setHttpHeadersStr('{}');
      setHttpBodyStr('');
      setHttpTimeout(10.0);
      setMaxAttempts(3);
      setBackoffFactor(2.0);
    }
    setErrors([]);
  }, [step, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleValidateAndSave = () => {
    const errs: string[] = [];

    const cleanKey = key.trim();
    if (!cleanKey) {
      errs.push('Step Key identifier is required');
    } else if (!/^[a-zA-Z0-9_-]+$/.test(cleanKey)) {
      errs.push('Step Key can only contain letters, numbers, underscores, and dashes');
    } else if (!step && existingKeys.includes(cleanKey)) {
      errs.push(`Step Key '${cleanKey}' is already used in this workflow`);
    } else if (step && step.key !== cleanKey && existingKeys.includes(cleanKey)) {
      errs.push(`Step Key '${cleanKey}' is already used in this workflow`);
    }

    if (!name.trim()) errs.push('Action Name is required');

    let finalConfig: Record<string, any> = {};

    if (type === 'http_request') {
      if (!httpUrl.trim()) {
        errs.push('HTTP URL is required');
      } else {
        try {
          const parsed = new URL(httpUrl.trim());
          if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            errs.push('URL protocol must be http or https');
          }
        } catch {
          errs.push('Invalid URL format');
        }
      }

      let parsedHeaders = {};
      try {
        parsedHeaders = httpHeadersStr.trim() ? JSON.parse(httpHeadersStr) : {};
      } catch {
        errs.push('Headers must be valid JSON');
      }

      let parsedBody = undefined;
      if (['POST', 'PUT'].includes(httpMethod) && httpBodyStr.trim()) {
        try {
          parsedBody = JSON.parse(httpBodyStr);
        } catch {
          parsedBody = httpBodyStr.trim();
        }
      }

      finalConfig = {
        method: httpMethod,
        url: httpUrl.trim(),
        headers: parsedHeaders,
        body: parsedBody,
        timeout_seconds: Number(httpTimeout),
      };
    } else if (type === 'json_transform') {
      if (transformOp === 'select_path' && !transformPath.trim()) {
        errs.push("Path is required for 'select_path' operation");
      }
      let parsedMappings = undefined;
      if (transformOp === 'rename_keys') {
        try {
          parsedMappings = JSON.parse(transformMappingsStr);
        } catch {
          errs.push('Mappings must be a valid JSON dictionary');
        }
      }
      let parsedTemplate = undefined;
      if (transformOp === 'construct_object') {
        try {
          parsedTemplate = JSON.parse(transformTemplateStr);
        } catch {
          errs.push('Template must be a valid JSON object');
        }
      }
      if (transformOp === 'type_convert' && !transformPath.trim()) {
        errs.push("Path is required for 'type_convert'");
      }

      finalConfig = {
        operation: transformOp,
        path: transformPath.trim() || undefined,
        mappings: parsedMappings,
        template: parsedTemplate,
        target_type: transformOp === 'type_convert' ? transformTargetType : undefined,
      };
    } else if (type === 'condition') {
      if (!condLeft.trim()) {
        errs.push('Left operand path or value is required');
      }

      let parsedRight: any = condRight;
      if (condRight.trim().toLowerCase() === 'true') parsedRight = true;
      else if (condRight.trim().toLowerCase() === 'false') parsedRight = false;
      else if (!isNaN(Number(condRight)) && condRight.trim() !== '') parsedRight = Number(condRight);

      finalConfig = {
        left_operand: condLeft.trim(),
        operator: condOp,
        right_operand: parsedRight,
      };
    }

    if (errs.length > 0) {
      setErrors(errs);
      return;
    }

    onSave({
      key: cleanKey,
      name: name.trim(),
      type,
      config: finalConfig,
      retry: {
        max_attempts: maxAttempts,
        backoff_factor: backoffFactor,
      },
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="step-config-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-150"
    >
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border border-forge-border bg-forge-surface shadow-2xl overflow-hidden transition-all">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-forge-border bg-forge-surface-secondary/50">
          <div>
            <h3 id="step-config-modal-title" className="text-base font-semibold text-forge-text">
              {step ? 'Edit Action Configuration' : 'Add Workflow Action'}
            </h3>
            <p className="text-xs text-forge-text-secondary mt-0.5">
              Configure parameters, inputs, and retry logic for this pipeline step
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close action modal"
            className="p-1.5 text-forge-text-muted hover:text-forge-text rounded-lg hover:bg-forge-surface-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {errors.length > 0 && (
            <div className="p-3.5 rounded-lg bg-[var(--danger-subtle)] border border-[var(--danger)]/30 text-[var(--danger)] text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Please address the following validation issues:</span>
              </div>
              <ul className="list-disc list-inside pl-1 space-y-0.5 font-mono">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-forge-text mb-1">
                Action Name <span className="text-forge-danger">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Notify Payment Service"
                className="w-full px-3.5 py-2 bg-forge-surface-secondary border border-forge-border rounded-lg text-sm text-forge-text focus:outline-none focus:border-forge-accent focus:ring-2 focus:ring-[var(--focus-ring)] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-forge-text mb-1">
                Step Key Identifier <span className="text-forge-danger">*</span>
              </label>
              <input
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="e.g. notify_payment"
                className="w-full px-3.5 py-2 bg-forge-surface-secondary border border-forge-border rounded-lg text-sm font-mono text-forge-text focus:outline-none focus:border-forge-accent focus:ring-2 focus:ring-[var(--focus-ring)] transition-colors"
              />
            </div>
          </div>

          {/* Action Type Picker */}
          <div>
            <label className="block text-xs font-medium text-forge-text mb-1.5">Action Type</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                { id: 'http_request', label: 'HTTP Request', desc: 'Outbound REST API call' },
                { id: 'json_transform', label: 'JSON Transform', desc: 'Select, rename, or construct' },
                { id: 'condition', label: 'Condition Branch', desc: 'Branch or evaluate predicates' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setType(opt.id as StepType)}
                  className={`p-3 text-left rounded-lg border transition-all ${
                    type === opt.id
                      ? 'bg-[var(--accent-subtle)] border-forge-accent text-forge-accent ring-1 ring-forge-accent'
                      : 'bg-forge-surface-secondary border-forge-border hover:border-forge-border-subtle text-forge-text-secondary hover:text-forge-text'
                  }`}
                >
                  <div className="text-xs font-semibold">{opt.label}</div>
                  <div className="text-[11px] text-forge-text-muted mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Action-Specific Fields */}
          {type === 'http_request' && (
            <div className="space-y-4 pt-2 border-t border-forge-border">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-[var(--info-subtle)] border border-[var(--info)]/20 text-xs text-[var(--info)]">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  SSRF Protection Active: Outbound calls to localhost, RFC 1918 private subnets, and cloud metadata endpoints are strictly blocked by the server execution engine.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-medium text-forge-text mb-1">Method</label>
                  <select
                    value={httpMethod}
                    onChange={(e) => setHttpMethod(e.target.value as any)}
                    className="w-full px-3 py-2 bg-forge-surface-secondary border border-forge-border rounded-lg text-xs font-semibold text-forge-text focus:outline-none focus:border-forge-accent"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-medium text-forge-text mb-1">
                    Endpoint URL <span className="text-forge-danger">*</span>
                  </label>
                  <input
                    type="url"
                    value={httpUrl}
                    onChange={(e) => setHttpUrl(e.target.value)}
                    placeholder="https://api.example.com/v1/resource"
                    className="w-full px-3 py-2 bg-forge-surface-secondary border border-forge-border rounded-lg text-xs font-mono text-forge-text focus:outline-none focus:border-forge-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-forge-text mb-1">Headers (JSON)</label>
                <textarea
                  rows={2}
                  value={httpHeadersStr}
                  onChange={(e) => setHttpHeadersStr(e.target.value)}
                  className="w-full p-2.5 bg-forge-surface-secondary border border-forge-border rounded-lg text-xs font-mono text-forge-text focus:outline-none focus:border-forge-accent"
                />
              </div>

              {['POST', 'PUT'].includes(httpMethod) && (
                <div>
                  <label className="block text-xs font-medium text-forge-text mb-1">Request Body (JSON)</label>
                  <textarea
                    rows={3}
                    value={httpBodyStr}
                    onChange={(e) => setHttpBodyStr(e.target.value)}
                    placeholder='{"key": "value"}'
                    className="w-full p-2.5 bg-forge-surface-secondary border border-forge-border rounded-lg text-xs font-mono text-forge-text focus:outline-none focus:border-forge-accent"
                  />
                </div>
              )}
            </div>
          )}

          {type === 'json_transform' && (
            <div className="space-y-4 pt-2 border-t border-forge-border">
              <div>
                <label className="block text-xs font-medium text-forge-text mb-1">Operation</label>
                <select
                  value={transformOp}
                  onChange={(e) => setTransformOp(e.target.value as any)}
                  className="w-full px-3 py-2 bg-forge-surface-secondary border border-forge-border rounded-lg text-xs text-forge-text focus:outline-none focus:border-forge-accent"
                >
                  <option value="select_path">Select Path (Extract Value via Dot Notation)</option>
                  <option value="rename_keys">Rename Keys (Remap Key Names)</option>
                  <option value="construct_object">Construct Object (Template Builder)</option>
                  <option value="type_convert">Type Conversion (Cast Type)</option>
                </select>
              </div>

              {transformOp === 'select_path' && (
                <div>
                  <label className="block text-xs font-medium text-forge-text mb-1">
                    Path Expression <span className="text-forge-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={transformPath}
                    onChange={(e) => setTransformPath(e.target.value)}
                    placeholder="e.g. input.order.amount or steps.prev_step.output.id"
                    className="w-full px-3 py-2 bg-forge-surface-secondary border border-forge-border rounded-lg text-xs font-mono text-forge-text focus:outline-none focus:border-forge-accent"
                  />
                </div>
              )}

              {transformOp === 'rename_keys' && (
                <div>
                  <label className="block text-xs font-medium text-forge-text mb-1">Mappings (JSON)</label>
                  <textarea
                    rows={3}
                    value={transformMappingsStr}
                    onChange={(e) => setTransformMappingsStr(e.target.value)}
                    placeholder='{"old_key": "new_key"}'
                    className="w-full p-2.5 bg-forge-surface-secondary border border-forge-border rounded-lg text-xs font-mono text-forge-text focus:outline-none focus:border-forge-accent"
                  />
                </div>
              )}

              {transformOp === 'construct_object' && (
                <div>
                  <label className="block text-xs font-medium text-forge-text mb-1">Template (JSON)</label>
                  <textarea
                    rows={4}
                    value={transformTemplateStr}
                    onChange={(e) => setTransformTemplateStr(e.target.value)}
                    placeholder='{"order_id": "$input.id", "status": "processed"}'
                    className="w-full p-2.5 bg-forge-surface-secondary border border-forge-border rounded-lg text-xs font-mono text-forge-text focus:outline-none focus:border-forge-accent"
                  />
                  <p className="mt-1 text-[11px] text-forge-text-muted">Values starting with $ are dynamically resolved from context.</p>
                </div>
              )}

              {transformOp === 'type_convert' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-forge-text mb-1">Source Path</label>
                    <input
                      type="text"
                      value={transformPath}
                      onChange={(e) => setTransformPath(e.target.value)}
                      placeholder="input.count"
                      className="w-full px-3 py-2 bg-forge-surface-secondary border border-forge-border rounded-lg text-xs font-mono text-forge-text focus:outline-none focus:border-forge-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-forge-text mb-1">Target Type</label>
                    <select
                      value={transformTargetType}
                      onChange={(e) => setTransformTargetType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-forge-surface-secondary border border-forge-border rounded-lg text-xs text-forge-text focus:outline-none focus:border-forge-accent"
                    >
                      <option value="string">String</option>
                      <option value="integer">Integer</option>
                      <option value="float">Float</option>
                      <option value="boolean">Boolean</option>
                      <option value="json">JSON Object</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {type === 'condition' && (
            <div className="space-y-4 pt-2 border-t border-forge-border">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-forge-text mb-1">Left Operand (Path)</label>
                  <input
                    type="text"
                    value={condLeft}
                    onChange={(e) => setCondLeft(e.target.value)}
                    placeholder="steps.step1.output.status"
                    className="w-full px-3 py-2 bg-forge-surface-secondary border border-forge-border rounded-lg text-xs font-mono text-forge-text focus:outline-none focus:border-forge-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-forge-text mb-1">Operator</label>
                  <select
                    value={condOp}
                    onChange={(e) => setCondOp(e.target.value as any)}
                    className="w-full px-3 py-2 bg-forge-surface-secondary border border-forge-border rounded-lg text-xs text-forge-text focus:outline-none focus:border-forge-accent"
                  >
                    <option value="equals">== Equals</option>
                    <option value="not_equals">!= Not Equals</option>
                    <option value="greater_than">&gt; Greater Than</option>
                    <option value="less_than">&lt; Less Than</option>
                    <option value="contains">Contains (in array/string)</option>
                    <option value="exists">Exists (is not null)</option>
                    <option value="not_exists">Does Not Exist (is null)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-forge-text mb-1">Right Operand</label>
                  <input
                    type="text"
                    value={condRight}
                    disabled={['exists', 'not_exists'].includes(condOp)}
                    onChange={(e) => setCondRight(e.target.value)}
                    placeholder="200 or 'paid'"
                    className="w-full px-3 py-2 bg-forge-surface-secondary border border-forge-border rounded-lg text-xs font-mono text-forge-text focus:outline-none focus:border-forge-accent disabled:opacity-40"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Retry Settings */}
          <div className="pt-2 border-t border-forge-border">
            <h4 className="text-xs font-semibold text-forge-text mb-2">Retry Policy</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-forge-text-secondary mb-1">Max Retry Attempts</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-forge-surface-secondary border border-forge-border rounded-lg text-xs font-mono text-forge-text focus:outline-none focus:border-forge-accent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-forge-text-secondary mb-1">Backoff Factor</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  step={0.5}
                  value={backoffFactor}
                  onChange={(e) => setBackoffFactor(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-forge-surface-secondary border border-forge-border rounded-lg text-xs font-mono text-forge-text focus:outline-none focus:border-forge-accent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-forge-border bg-forge-surface-secondary/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-forge-text-secondary hover:text-forge-text bg-forge-surface border border-forge-border rounded-lg transition-colors shadow-2xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleValidateAndSave}
            className="px-4 py-2 text-xs font-medium text-white bg-forge-accent hover:bg-forge-accent-hover rounded-lg transition-colors shadow-xs"
          >
            Save Action
          </button>
        </div>
      </div>
    </div>
  );
};
