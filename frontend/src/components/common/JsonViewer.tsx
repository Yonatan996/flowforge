import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface JsonViewerProps {
  data: any;
  title?: string;
  maxHeight?: string;
  initiallyExpanded?: boolean;
}

export const JsonViewer: React.FC<JsonViewerProps> = ({
  data,
  title,
  maxHeight = 'max-h-80',
  initiallyExpanded = true,
}) => {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(initiallyExpanded);

  const formatted = React.useMemo(() => {
    if (data === undefined) return 'undefined';
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }, [data]);

  const handleCopy = () => {
    navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/90 overflow-hidden font-mono text-xs">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-850/80 border-b border-slate-800 text-slate-400">
        <span className="font-semibold tracking-wide text-slate-300">{title || 'JSON Payload'}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
            title="Copy JSON"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>
      <div className={`p-3 overflow-auto ${maxHeight} text-slate-300 leading-relaxed whitespace-pre`}>
        {formatted}
      </div>
    </div>
  );
};
