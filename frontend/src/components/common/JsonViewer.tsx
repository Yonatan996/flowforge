import React, { useState, useMemo } from 'react';
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
}) => {
  const [copied, setCopied] = useState(false);

  const formatted = useMemo(() => {
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
    <div className="rounded-lg border border-forge-border bg-forge-surface-secondary overflow-hidden font-mono text-xs shadow-sm">
      <div className="flex items-center justify-between px-3.5 py-2 bg-forge-surface border-b border-forge-border text-forge-text-secondary select-none">
        <span className="font-semibold tracking-wide text-forge-text font-sans text-xs">
          {title || 'JSON Payload'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? 'JSON Copied' : 'Copy JSON'}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-forge-text-secondary hover:text-forge-text hover:bg-forge-surface-hover transition-colors text-[11px]"
          title="Copy JSON"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-forge-success" />
              <span className="text-forge-success font-sans font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="font-sans">Copy</span>
            </>
          )}
        </button>
      </div>
      <pre
        tabIndex={0}
        className={`p-3.5 overflow-auto ${maxHeight} text-forge-text leading-relaxed font-mono whitespace-pre focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)]`}
      >
        <code>{formatted}</code>
      </pre>
    </div>
  );
};
