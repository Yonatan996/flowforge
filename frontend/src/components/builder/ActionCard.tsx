import React from 'react';
import { ChevronUp, ChevronDown, Trash2, Edit3, Globe, Shuffle, GitBranch } from 'lucide-react';
import { StepDefinition } from '../../types';

interface ActionCardProps {
  step: StepDefinition;
  index: number;
  totalSteps: number;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export const ActionCard: React.FC<ActionCardProps> = ({
  step,
  index,
  totalSteps,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}) => {
  const getIcon = () => {
    switch (step.type) {
      case 'http_request':
        return <Globe className="w-4 h-4 text-sky-400" />;
      case 'json_transform':
        return <Shuffle className="w-4 h-4 text-violet-400" />;
      case 'condition':
        return <GitBranch className="w-4 h-4 text-amber-400" />;
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
        <span className="truncate">
          <span className="font-semibold text-sky-300">{cfg.method || 'GET'}</span>{' '}
          <span className="text-slate-400">{cfg.url || 'No URL configured'}</span>
        </span>
      );
    }
    if (step.type === 'json_transform') {
      const op = cfg.operation || 'select_path';
      return (
        <span className="truncate">
          <span className="text-violet-300 capitalize">{op.replace('_', ' ')}:</span>{' '}
          <span className="text-slate-400">{cfg.path || (cfg.template ? 'Template Object' : 'Configured')}</span>
        </span>
      );
    }
    if (step.type === 'condition') {
      return (
        <span className="truncate">
          <span className="text-slate-300">{cfg.left_operand || 'val'}</span>{' '}
          <span className="text-amber-400 font-semibold">{cfg.operator}</span>{' '}
          <span className="text-slate-300">{String(cfg.right_operand ?? '')}</span>
        </span>
      );
    }
    return null;
  };

  return (
    <div className="group relative rounded-xl border border-slate-800 bg-slate-900/70 hover:border-slate-700 transition-all shadow-sm">
      <div className="flex items-center justify-between p-4">
        {/* Left: Step Index & Info */}
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono font-medium text-slate-300">
            {index + 1}
          </div>
          <div className="flex items-center gap-2 p-1.5 rounded-md bg-slate-850 border border-slate-800">
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-slate-100 truncate">{step.name}</h4>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700/50">
                {step.key}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-2 font-mono truncate">
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] uppercase font-bold text-slate-400">
                {getTypeLabel()}
              </span>
              <span className="text-slate-600">•</span>
              {getSummary()}
            </div>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-1.5 ml-4">
          <div className="flex items-center border border-slate-800 rounded-lg overflow-hidden bg-slate-850">
            <button
              type="button"
              disabled={index === 0}
              onClick={onMoveUp}
              className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors hover:bg-slate-800"
              title="Move Step Up"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={index === totalSteps - 1}
              onClick={onMoveDown}
              className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors hover:bg-slate-800 border-l border-slate-800"
              title="Move Step Down"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={onEdit}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700"
            title="Edit Step Configuration"
          >
            <Edit3 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors border border-transparent hover:border-rose-500/20"
            title="Delete Step"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
