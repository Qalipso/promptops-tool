'use client';

import { useCallback, useRef } from 'react';

// Shared layout: must be identical between backdrop and textarea
const SHARED: React.CSSProperties = {
  fontFamily:
    'var(--font-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
  fontSize: '12px',
  lineHeight: '1.625',
  padding: '10px 12px',
  width: '100%',
  boxSizing: 'border-box',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  overflowWrap: 'break-word',
  letterSpacing: 'normal',
};

function escapeAndHighlight(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(
      /\{\{([a-z][a-z0-9_]*)\}\}/gi,
      '<mark style="background:rgb(var(--accent) / 0.22);color:rgb(var(--accent));border-radius:3px;padding:0 2px">{{$1}}</mark>',
    );
}

interface Props {
  name: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
}

export function HighlightedTextarea({
  name,
  value,
  onChange,
  placeholder,
  rows = 5,
  required,
}: Props) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const syncScroll = useCallback(() => {
    if (backdropRef.current && textareaRef.current) {
      backdropRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  return (
    <div className="relative rounded-md border border-border bg-surface focus-within:border-accent/50 transition-colors">
      {/* Highlight backdrop — sits behind, shows coloured variables */}
      <div
        ref={backdropRef}
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none overflow-hidden rounded-md text-text"
        style={SHARED}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: value HTML-escaped in escapeAndHighlight before injection
        dangerouslySetInnerHTML={{ __html: `${escapeAndHighlight(value)}\u200b` }}
      />

      {/* Editable layer — transparent text, caret visible */}
      <textarea
        ref={textareaRef}
        name={name}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
        rows={rows}
        placeholder={placeholder}
        spellCheck={false}
        className="relative w-full rounded-md resize-y placeholder:text-muted/60 focus:outline-none"
        style={{
          ...SHARED,
          background: 'transparent',
          color: 'transparent',
          caretColor: 'rgb(var(--text))',
          border: 'none',
          outline: 'none',
        }}
      />
    </div>
  );
}
