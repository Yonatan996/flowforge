import React, { useState, useEffect } from 'react';
import { X, Play, Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import { executionsApi } from '../../api/executions';
import { Execution } from '../../types';
import { StatusBadge } from '../common/StatusBadge';

interface TestRunModalProps {
  isOpen: boolean;
  workflowId: string;
  workflowName: string;
  onClose: () => void;
}

export const TestRunModal: React.FC<TestRunModalProps> = ({
  isOpen,
  workflowId,
  workflowName,
  onClose,
}) => {
  const [payloadStr, setPayloadStr] = useState('{\n  "test": true,\n  "data": "sample"\n}');
  const [executing, setExecuting] = useState(false);
  const [execution, setExecution] = useState<Execution | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Polling loop for active execution
  useEffect(() => {
    if (!execution || ['SUCCEEDED', 'FAILED', 'CANCELLED'].includes(execution.status)) {
      return;
    }

    const timer = setInterval(async () => {
      try {
        const updated = await executionsApi.get(execution.id);
        setExecution(updated);
      } catch (e: any) {
        console.error('Error polling execution status:', e);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [execution]);

  if (!isOpen) return null;

  const handleStartRun = async () => {
    setError(null);
    let parsed = {};
    try {
      parsed = payloadStr.trim() ? JSON.parse(payloadStr) : {};
    } catch {
      setError('Invalid JSON payload');
      return;
    }

    setExecuting(true);
    try {
      const res = await executionsApi.run(workflowId, parsed);
      setExecution(res);
    } catch (err: any) {
      setError(err.message || 'Failed to trigger execution');
    } finally {
      setExecuting(false);
    }
  };

  const handleReset = () => {
    setExecution(null);
    setError(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="test-run-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-150"
    >
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border border-forge-border bg-forge-surface shadow-2xl overflow-hidden transition-all">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-forge-border bg-forge-surface-secondary/50">
          <div>
            <h3 id="test-run-modal-title" className="text-base font-semibold text-forge-text">
              Test Execute Workflow
            </h3>
            <p className="text-xs text-forge-text-secondary mt-0.5 truncate max-w-md font-mono">
              {workflowName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-forge-text-muted hover:text-forge-text rounded-lg hover:bg-forge-surface-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-lg bg-[var(--danger-subtle)] border border-[var(--danger)]/30 text-[var(--danger)] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!execution ? (
            <div>
              <label className="block text-xs font-medium text-forge-text mb-1.5">
                Input Test Payload (JSON)
              </label>
              <textarea
                rows={6}
                value={payloadStr}
                onChange={(e) => setPayloadStr(e.target.value)}
                className="w-full p-3 bg-forge-surface-secondary border border-forge-border rounded-lg text-xs font-mono text-forge-text focus:outline-none focus:border-forge-accent focus:ring-2 focus:ring-[var(--focus-ring)] transition-colors"
              />
              <p className="mt-1.5 text-[11px] text-forge-text-muted">
                This payload will be passed to the execution context as <code className="text-forge-text font-mono">input</code>.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-forge-border bg-forge-surface-secondary/60 flex items-center justify-between">
                <div>
                  <div className="text-xs text-forge-text font-mono font-semibold">
                    Execution #{execution.id.slice(0, 8)}
                  </div>
                  <div className="text-xs text-forge-text-secondary mt-1 font-mono">
                    Duration: {execution.duration_ms ? `${Math.round(execution.duration_ms)}ms` : 'calculating...'}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={execution.status} />
                  <a
                    href={`/executions/${execution.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-forge-accent hover:text-forge-accent-hover font-medium"
                  >
                    <span>Inspect</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Steps timeline */}
              {execution.steps && execution.steps.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-forge-text">Execution Steps Timeline</h4>
                  <div className="space-y-1.5">
                    {execution.steps.map((st) => (
                      <div
                        key={st.id}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-forge-border bg-forge-surface text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-forge-text-muted">{st.step_order + 1}.</span>
                          <span className="font-medium text-forge-text">{st.step_key}</span>
                          <span className="text-[10px] text-forge-text-muted uppercase font-mono">({st.step_type})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {st.duration_ms !== undefined && (
                            <span className="text-forge-text-secondary font-mono text-[11px]">
                              {Math.round(st.duration_ms)}ms
                            </span>
                          )}
                          <StatusBadge status={st.status} size="sm" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Final Error if failed */}
              {execution.error_summary && (
                <div className="p-3.5 rounded-lg bg-[var(--danger-subtle)] border border-[var(--danger)]/30 text-xs text-[var(--danger)] font-mono">
                  <span className="font-semibold">Error: </span>
                  {execution.error_summary}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-forge-border bg-forge-surface-secondary/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-forge-text-secondary hover:text-forge-text bg-forge-surface border border-forge-border rounded-lg transition-colors shadow-2xs"
          >
            {execution ? 'Close' : 'Cancel'}
          </button>
          {!execution ? (
            <button
              type="button"
              disabled={executing}
              onClick={handleStartRun}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-forge-accent hover:bg-forge-accent-hover disabled:opacity-50 rounded-lg transition-colors shadow-xs"
            >
              {executing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              <span>Execute Now</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 text-xs font-medium text-forge-accent hover:text-forge-accent-hover border border-forge-accent/30 bg-[var(--accent-subtle)] rounded-lg transition-colors shadow-2xs"
            >
              Run Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
