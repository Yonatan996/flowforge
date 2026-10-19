import React, { useState, useEffect } from 'react';
import { X, Play, Loader2, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import { executionsApi } from '../../api/executions';
import { Execution } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { JsonViewer } from '../common/JsonViewer';

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
    if (isOpen) {
      setExecution(null);
      setError(null);
      setExecuting(false);
    }
  }, [isOpen]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-850">
          <div>
            <h3 className="text-base font-semibold text-slate-100">Test Execute Workflow</h3>
            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-md">{workflowName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!execution ? (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Input Test Payload (JSON)
              </label>
              <textarea
                rows={6}
                value={payloadStr}
                onChange={(e) => setPayloadStr(e.target.value)}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
              />
              <p className="mt-1.5 text-[11px] text-slate-500">
                This payload will be passed to the execution context as <code className="text-slate-300">input</code>.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/80 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400 font-mono">Execution #{execution.id.slice(0, 8)}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Duration: {execution.duration_ms ? `${Math.round(execution.duration_ms)}ms` : 'calculating...'}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={execution.status} />
                  <a
                    href={`/executions/${execution.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                  >
                    <span>Inspect</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Steps timeline */}
              {execution.steps && execution.steps.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-300">Execution Steps</h4>
                  <div className="space-y-1.5">
                    {execution.steps.map((st) => (
                      <div
                        key={st.id}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-slate-800/80 bg-slate-950/40 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-400">{st.step_order + 1}.</span>
                          <span className="font-medium text-slate-200">{st.step_key}</span>
                          <span className="text-[10px] text-slate-500 uppercase">({st.step_type})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {st.duration_ms !== undefined && (
                            <span className="text-slate-500 font-mono text-[11px]">{Math.round(st.duration_ms)}ms</span>
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
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                  <span className="font-semibold text-rose-400">Error: </span>
                  {execution.error_summary}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-850">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 border border-slate-700 rounded-lg transition-colors"
          >
            {execution ? 'Close' : 'Cancel'}
          </button>
          {!execution ? (
            <button
              type="button"
              disabled={executing}
              onClick={handleStartRun}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg transition-colors shadow-sm"
            >
              {executing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              <span>Execute Now</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setExecution(null)}
              className="px-4 py-2 text-sm font-medium text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 bg-emerald-500/10 rounded-lg transition-colors"
            >
              Run Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
