import React, { useState } from 'react';
import { Webhook, Calendar, Play, Copy, Check, Info } from 'lucide-react';
import { TriggerDefinition } from '../../types';

interface TriggerConfigCardProps {
  trigger: TriggerDefinition;
  webhookUrl?: string;
  status?: string;
  onChange: (trigger: TriggerDefinition) => void;
}

export const TriggerConfigCard: React.FC<TriggerConfigCardProps> = ({
  trigger,
  webhookUrl,
  status: _status,
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
    <div className="relative rounded-xl border border-forge-border bg-forge-surface p-5 shadow-xs space-y-4 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[var(--accent-subtle)] border border-forge-accent/20 text-forge-accent shrink-0">
            {trigger.type === 'webhook' ? (
              <Webhook className="w-4 h-4" />
            ) : trigger.type === 'scheduled' ? (
              <Calendar className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-forge-text">Workflow Trigger</h3>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-forge-surface-secondary text-forge-accent font-semibold uppercase">
                {trigger.type}
              </span>
            </div>
            <p className="text-xs text-forge-text-secondary mt-0.5">
              Initiates workflow execution pipeline when invoked.
            </p>
          </div>
        </div>

        {/* Trigger Type Toggle */}
        <div className="flex rounded-lg border border-forge-border bg-forge-surface-secondary p-1">
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
                    ? 'bg-forge-surface text-forge-accent shadow-xs border border-forge-border font-semibold'
                    : 'text-forge-text-secondary hover:text-forge-text'
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
        <div className="p-4 rounded-lg bg-forge-surface-secondary/60 border border-forge-border space-y-3">
          <div>
            <label className="block text-xs font-medium text-forge-text mb-1">
              Webhook Endpoint URL
            </label>
            {webhookUrl ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={webhookUrl}
                  className="flex-1 px-3 py-2 bg-forge-surface border border-forge-border rounded-lg text-xs font-mono text-forge-accent select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="px-3 py-2 bg-forge-surface hover:bg-forge-surface-hover text-forge-text text-xs font-medium rounded-lg border border-forge-border flex items-center gap-1.5 transition-colors shadow-2xs"
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
                Webhook URL will be generated and secured upon saving this workflow.
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-forge-text-secondary font-mono pt-1">
            <Info className="w-3.5 h-3.5 text-forge-text-muted shrink-0" />
            <span>Accepts HTTP POST requests with JSON payload. Deduplicates with Idempotency-Key.</span>
          </div>
        </div>
      )}

      {trigger.type === 'scheduled' && (
        <div className="p-4 rounded-lg bg-forge-surface-secondary/60 border border-forge-border space-y-3">
          <div>
            <label className="block text-xs font-medium text-forge-text mb-1">
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
              placeholder="e.g. */15 * * * * or 0 9 * * 1-5"
              className="w-full px-3 py-2 bg-forge-surface border border-forge-border rounded-lg text-xs font-mono text-forge-text focus:outline-none focus:border-forge-accent"
            />
            <p className="text-[11px] text-forge-text-muted mt-1 font-mono">
              Standard 5-part UTC cron: minute hour day-of-month month day-of-week
            </p>
          </div>
        </div>
      )}

      {trigger.type === 'manual' && (
        <div className="p-4 rounded-lg bg-forge-surface-secondary/60 border border-forge-border space-y-2">
          <p className="text-xs text-forge-text-secondary leading-relaxed">
            Manual triggers allow on-demand execution via the FlowForge web interface or through direct API dispatch.
          </p>
          <div className="text-[11px] text-forge-text-muted font-mono flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" />
            <span>Executes with user-provided JSON payload in test run modal or API dispatch.</span>
          </div>
        </div>
      )}

      {/* Output Port at bottom of trigger node */}
      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-forge-surface border-2 border-forge-accent transition-colors" />
    </div>
  );
};
