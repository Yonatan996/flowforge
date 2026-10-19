import React from 'react';
import {
  ChevronUp,
  ChevronDown,
  Trash2,
  Edit3,
  Globe,
  Shuffle,
  GitBranch,
  ArrowDown,
} from 'lucide-react';
import { StepDefinition } from '../../types';

interface ActionCardProps {
  step: StepDefinition;
  index: number;
  totalSteps: number;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isSelected?: boolean;
  onSelect?: () => void;
}

export const ActionCard: React.FC<ActionCardProps> = ({
  step,
  index,
  totalSteps,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  isSelected = false,
  onSelect,
}) => {
  const getIcon = () => {
    switch (step.type) {
      case 'http_request':
        return <Globe className="w-4 h-4 text-forge-info" />;
      case 'json_transform':
        return <Shuffle className="w-4 h-4 text-forge-accent" />;
      case 'condition':
        return <GitBranch className="w-4 h-4 text-forge-warning" />;
      default:
        return null;
    }
  };

  const getTypeLabel = () => {
    switch (step.type) {
      case 'http_request':
        return 'HTTP Request';
      case 'json_transform':
        return 'JSON Transform';
      case 'condition':
        return 'Condition Branch';
      default:
        return step.type;
    }
  };

  const getSummary = () => {
    const cfg = step.config || {};
    if (step.type === 'http_request') {
      return (
        <span className="truncate flex items-center gap-1.5">
          <span className="font-semibold text-forge-info px-1 py-0.2 rounded bg-[var(--info-subtle)] text-[11px] font-mono">
            {cfg.method || 'GET'}
          </span>
          <span className="text-forge-text-secondary truncate font-mono text-[11px]">
            {cfg.url || 'No URL configured'}
          </span>
        </span>
      );
    }
    if (step.type === 'json_transform') {
      const op = cfg.operation || 'select_path';
      return (
        <span className="truncate flex items-center gap-1.5 font-mono text-[11px]">
          <span className="text-forge-accent capitalize font-medium">
            {op.replace('_', ' ')}:
          </span>
          <span className="text-forge-text-secondary truncate">
            {cfg.path || (cfg.template ? 'Template Object' : 'Configured')}
          </span>
        </span>
      );
    }
    if (step.type === 'condition') {
      return (
        <span className="truncate flex items-center gap-1.5 font-mono text-[11px]">
          <span className="text-forge-text">{cfg.left_operand || 'val'}</span>
          <span className="text-forge-warning font-semibold">{cfg.operator}</span>
          <span className="text-forge-text">{String(cfg.right_operand ?? '')}</span>
        </span>
      );
    }
    return null;
  };

  return (
    <div className="relative flex flex-col items-center">
      {/* Connector line to node above */}
      <div className="h-6 w-px bg-forge-border flex items-center justify-center">
        <ArrowDown className="w-3 h-3 text-forge-text-muted" />
      </div>

      {/* Node Card */}
      <div
        onClick={onSelect}
        className={`w-full group relative rounded-xl border bg-forge-surface transition-all duration-150 shadow-xs cursor-pointer ${
          isSelected
            ? 'border-forge-accent ring-2 ring-[var(--focus-ring)]'
            : 'border-forge-border hover:border-forge-accent/40'
        }`}
      >
        {/* Node Input Port */}
        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-forge-surface border-2 border-forge-border group-hover:border-forge-accent transition-colors" />

        <div className="flex items-center justify-between p-4">
          {/* Left: Step Index & Info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-forge-surface-secondary border border-forge-border text-xs font-mono font-medium text-forge-text-secondary">
              {index + 1}
            </div>
            <div className="flex items-center gap-2 p-1.5 rounded-lg bg-forge-surface-secondary border border-forge-border">
              {getIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-forge-text truncate">{step.name}</h4>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-forge-surface-secondary text-forge-text-secondary border border-forge-border">
                  {step.key}
                </span>
                {step.retry && step.retry.max_attempts > 1 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-forge-surface-secondary text-forge-text-muted border border-forge-border">
                    {step.retry.max_attempts}x retry
                  </span>
                )}
              </div>
              <div className="text-xs text-forge-text-secondary mt-1 flex items-center gap-2 font-mono truncate">
                <span className="px-1.5 py-0.5 rounded bg-forge-surface-secondary text-[10px] uppercase font-bold text-forge-text-muted">
                  {getTypeLabel()}
                </span>
                <span className="text-forge-text-muted">•</span>
                {getSummary()}
              </div>
            </div>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-1.5 ml-3 shrink-0">
            <div className="flex items-center border border-forge-border rounded-lg overflow-hidden bg-forge-surface-secondary">
              <button
                type="button"
                disabled={index === 0}
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveUp();
                }}
                className="p-1.5 text-forge-text-secondary hover:text-forge-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors hover:bg-forge-surface-hover"
                title="Move Step Up"
                aria-label="Move Step Up"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={index === totalSteps - 1}
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveDown();
                }}
                className="p-1.5 text-forge-text-secondary hover:text-forge-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors hover:bg-forge-surface-hover border-l border-forge-border"
                title="Move Step Down"
                aria-label="Move Step Down"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-1.5 text-forge-text-secondary hover:text-forge-accent rounded-lg hover:bg-forge-surface-secondary transition-colors border border-transparent hover:border-forge-border"
              title="Edit Step Configuration"
              aria-label="Edit Step Configuration"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1.5 text-forge-text-secondary hover:text-forge-danger rounded-lg hover:bg-[var(--danger-subtle)] transition-colors border border-transparent hover:border-[var(--danger)]/30"
              title="Delete Step"
              aria-label="Delete Step"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Node Output Port */}
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-forge-surface border-2 border-forge-border group-hover:border-forge-accent transition-colors" />
      </div>
    </div>
  );
};
