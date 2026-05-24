'use client';

import { useRef, useCallback } from 'react';

// Shared layout: must be identical between backdrop and textarea
const SHARED: React.CSSProperties = {
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
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
      '<mark style="background:rgba(99,102,241,0.25);color:#a5b4fc;border-radius:3px;padding:0 2px">{{$1}}</mark>',
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
    <div
      className="relative rounded-md border border-gray-700 focus-within:border-gray-500 transition-colors"
      style={{ backgroundColor: '#111827' }}
    >
      {/* Highlight backdrop — sits behind, shows coloured variables */}
      <div
        ref={backdropRef}
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none overflow-hidden rounded-md text-gray-200"
        style={SHARED}
        dangerouslySetInnerHTML={{ __html: escapeAndHighlight(value) + '\u200b' }}
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
        className="relative w-full rounded-md resize-y placeholder-gray-600 focus:outline-none"
        style={{
          ...SHARED,
          background: 'transparent',
          color: 'transparent',
          caretColor: '#e5e7eb',
          border: 'none',
          outline: 'none',
        }}
      />
    </div>
  );
}
