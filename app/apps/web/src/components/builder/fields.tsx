'use client';

import { useState } from 'react';

export const INPUT_CLS =
  'w-full rounded-md border border-border bg-surface text-text text-sm px-3 py-2 placeholder:text-muted/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus:border-accent/50';
export const LABEL_CLS = 'block text-xs font-medium text-muted mb-1.5';

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className={LABEL_CLS}>{label}</label>
      <input
        className={INPUT_CLS}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && <p className="text-gray-600 text-xs mt-1">{hint}</p>}
    </div>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  hint?: string;
}) {
  return (
    <div>
      <label className={LABEL_CLS}>{label}</label>
      <textarea
        className={`${INPUT_CLS} font-mono leading-relaxed`}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && <p className="text-gray-600 text-xs mt-1">{hint}</p>}
    </div>
  );
}

/** Editable list of plain strings (chips with add/remove). */
export function StringListEditor({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  items: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...items, v]);
    setDraft('');
  };
  return (
    <div>
      <label className={LABEL_CLS}>{label}</label>
      <div className="flex gap-2 mb-2">
        <input
          className={INPUT_CLS}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <button
          type="button"
          onClick={add}
          className="px-3 py-2 bg-surface-2 border border-border hover:bg-border/40 text-text text-xs rounded-md shrink-0 transition-colors"
        >
          Add
        </button>
      </div>
      {items.length > 0 && (
        <ul className="space-y-1.5">
          {items.map((it, i) => (
            <li
              key={`${it}-${i}`}
              className="flex items-center justify-between bg-surface-2 border border-border rounded-md px-3 py-1.5 text-xs text-text"
            >
              <span>{it}</span>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                className="text-muted hover:text-danger transition-colors"
              >
                remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
