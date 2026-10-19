import React, { useState } from 'react';
import { Webhook, Calendar, Play, Copy, Check } from 'lucide-react';
import { TriggerDefinition } from '../../types';

interface TriggerConfigCardProps {
  trigger: TriggerDefinition;
  webhookUrl?: string;
  status: string;
  onChange: (trigger: TriggerDefinition) => void;
}

export const TriggerConfigCard: React.FC<TriggerConfigCardProps> = ({
  trigger,
  webhookUrl,
  status,
  onChange,
}) => {
  const [copied, setCopied] = useState(false);

  const handleTypeChange = (newType: 'webhook' | 'scheduled' | 'manual') => {
    let defaultConfig = {};
    if (newType === 'webhook') {
      defaultConfig = { idempotency_header: 'Idempotency-Key', required_fields: [] };
    } else if (newType === 'scheduled') {
      defaultConfig = { cron_expression: '*/15 * * * *' };
    } else {
      defaultConfig = { sample_payload: { test: true } };
    }
    onChange({
      type: newType,
      config: defaultConfig,
    });
  };

  const handleCopyUrl = () => {
    if (webhookUrl) {
      navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">Workflow Trigger</h3>
          <p className="text-xs text-slate-400 mt-0.5">Determine how and when this automated workflow begins execution.</p>
        </div>
        <div className="flex rounded-lg border border-slate-800 bg-slate-950 p-1">
          {[
            { id: 'webhook', label: 'Webhook', icon: Webhook },
            { id: 'scheduled', label: 'Scheduled', icon: Calendar },
            { id: 'manual', label: 'Manual', icon: Play },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = trigger.type === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTypeChange(item.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  isSelected
                    ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-700/60'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Trigger Specific View */}
      {trigger.type === 'webhook' && (
        <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Webhook Endpoint URL</label>
            {webhookUrl ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={webhookUrl}
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-emerald-400 select-all"
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
                Webhook URL will be activated when this workflow is saved & activated.
              </p>
            )}
          </div>
          <div className="text-[11px] text-slate-400 leading-relaxed space-y-1">
            <p>• Accepts JSON payloads up to 1 MB with standard HTTP POST.</p>
            <p>• Include header <code className="text-slate-200 bg-slate-900 px-1 py-0.5 rounded">Idempotency-Key</code> for at-most-once deduplication.</p>
          </div>
        </div>
      )}

      {trigger.type === 'scheduled' && (
        <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Cron Expression (UTC)
              </label>
              <input
                type="text"
                value={trigger.config?.cron_expression || '*/15 * * * *'}
                onChange={(e) =>
                  onChange({
                    ...trigger,
                    config: { ...trigger.config, cron_expression: e.target.value },
                  })
                }
                placeholder="*/15 * * * *"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Or Interval (Seconds)
              </label>
              <input
                type="number"
                min={10}
                value={trigger.config?.interval_seconds || ''}
                onChange={(e) =>
                  onChange({
                    ...trigger,
                    config: {
                      ...trigger.config,
                      interval_seconds: e.target.value ? Number(e.target.value) : undefined,
                    },
                  })
                }
                placeholder="e.g. 60"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            Schedules execute in UTC and are dispatched via the distributed background queue.
          </p>
        </div>
      )}

      {trigger.type === 'manual' && (
        <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800/80">
          <p className="text-xs text-slate-300">
            Manual triggers execute on demand via the dashboard or API, accepting an optional JSON test payload.
          </p>
        </div>
      )}
    </div>
  );
};
