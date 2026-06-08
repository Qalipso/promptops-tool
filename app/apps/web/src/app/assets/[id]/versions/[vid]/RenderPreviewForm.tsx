'use client';

import type { RenderResult } from '@/lib/api';
import { useActionState, useState } from 'react';
import { renderPreviewAction } from './actions';

interface Props {
  assetId: string;
  versionId: string;
}

export function RenderPreviewForm({ assetId, versionId }: Props) {
  const bound = renderPreviewAction.bind(null, assetId, versionId);
  const [state, action, pending] = useActionState(bound, null);

  const [manualInputs, setManualInputs] = useState<{ key: string; value: string }[]>([
    { key: '', value: '' },
  ]);
  const [showRawInputs, setShowRawInputs] = useState(false);

  const result: RenderResult | null = state?.result ?? null;
  const error: string | null = state?.error ?? null;

  function addManualRow() {
    setManualInputs((prev) => [...prev, { key: '', value: '' }]);
  }

  function removeManualRow(i: number) {
    setManualInputs((prev) => prev.filter((_, idx) => idx !== i));
  }

  function setManualRow(i: number, field: 'key' | 'value', val: string) {
    setManualInputs((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)));
  }

  const manualInputsJson = JSON.stringify(
    Object.fromEntries(
      manualInputs.filter((r) => r.key.trim()).map((r) => [r.key.trim(), r.value]),
    ),
  );

  const INPUT_CLS =
    'bg-surface border border-border text-text text-xs rounded-md px-3 py-2 placeholder:text-muted/60 focus:outline-none focus:border-accent/50 transition-colors';

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold text-text">Render Preview</h2>
      <p className="text-muted text-xs">
        Template substitution only — no LLM call. PromptOps stores prompt versions. AI Eval scores
        model outputs.
      </p>

      <form action={action} className="space-y-4">
        {/* Manual inputs */}
        <div className="space-y-2">
          {manualInputs.map((row, i) => (
            <div key={i} className="flex gap-2">
              <input
                className={`${INPUT_CLS} flex-1`}
                placeholder="variable_name"
                value={row.key}
                onChange={(e) => setManualRow(i, 'key', e.target.value)}
              />
              <input
                className={`${INPUT_CLS} flex-[2]`}
                placeholder="value"
                value={row.value}
                onChange={(e) => setManualRow(i, 'value', e.target.value)}
              />
              <button
                type="button"
                onClick={() => removeManualRow(i)}
                className="text-muted hover:text-danger text-xs px-1"
              >
                x
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addManualRow}
            className="text-xs text-muted hover:text-text"
          >
            + Add variable
          </button>
          <input type="hidden" name="manual_inputs_json" value={manualInputsJson} />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 bg-accent hover:opacity-90 text-accent-fg shadow-sm disabled:opacity-50 text-xs rounded-md transition-colors"
        >
          {pending ? 'Rendering…' : 'Render Preview'}
        </button>
      </form>

      {error && (
        <div className="bg-danger/10 border border-danger/30 text-danger px-3 py-2 rounded-md text-xs">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4 border-t border-border pt-4">
          {/* Rendered prompts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {result.rendered_system !== null && (
              <div className="bg-surface-2 border border-border rounded-lg px-4 py-3">
                <p className="text-muted text-xs mb-2">System prompt rendered</p>
                <pre className="text-text text-xs font-mono whitespace-pre-wrap leading-relaxed">
                  {result.rendered_system || <span className="text-muted">(empty)</span>}
                </pre>
              </div>
            )}
            <div className="bg-surface-2 border border-border rounded-lg px-4 py-3">
              <p className="text-muted text-xs mb-2">User prompt rendered</p>
              <pre className="text-text text-xs font-mono whitespace-pre-wrap leading-relaxed">
                {result.rendered_user}
              </pre>
            </div>
          </div>

          {/* Raw inputs toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowRawInputs((v) => !v)}
              className="text-xs text-muted hover:text-text"
            >
              {showRawInputs ? 'v' : '>'} Raw inputs JSON
            </button>
            {showRawInputs && (
              <pre className="mt-2 text-text text-xs bg-surface-2 rounded-md p-3 overflow-x-auto font-mono">
                {JSON.stringify(result.inputs, null, 2)}
              </pre>
            )}
          </div>

          {/* Diagnostics */}
          {result.unresolved_variables.length > 0 && (
            <div className="bg-danger/10 border border-danger/30 rounded-md px-3 py-2">
              <p className="text-danger text-xs font-medium mb-1">Unresolved variables</p>
              <p className="text-danger text-xs">
                {result.unresolved_variables.map((v) => `{{${v}}}`).join(', ')} — not found in
                inputs
              </p>
            </div>
          )}

          {result.unused_inputs.length > 0 && (
            <div className="bg-surface border border-border rounded-md px-3 py-2">
              <p className="text-muted text-xs font-medium mb-1">Unused inputs</p>
              <p className="text-muted text-xs">
                {result.unused_inputs.join(', ')} — not referenced in template
              </p>
            </div>
          )}

          <p className="text-muted text-xs font-mono">hash: {result.rendered_hash.slice(0, 16)}…</p>
        </div>
      )}
    </section>
  );
}
