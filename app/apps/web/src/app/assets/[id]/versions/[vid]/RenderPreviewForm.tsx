'use client';

import { useActionState, useState } from 'react';
import type { RenderResult } from '@/lib/api';
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
    Object.fromEntries(manualInputs.filter((r) => r.key.trim()).map((r) => [r.key.trim(), r.value])),
  );

  const INPUT_CLS =
    'bg-gray-900 border border-gray-700 text-gray-200 text-xs rounded px-3 py-2 placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors';

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold text-gray-300">Render Preview</h2>
      <p className="text-gray-600 text-xs">
        Template substitution only — no LLM call. PromptOps stores prompt versions. AI Eval scores model outputs.
      </p>

      <form action={action} className="space-y-4">
        {/* Manual inputs */}
        <div className="space-y-2">
          {manualInputs.map((row, i) => (
            <div key={i} className="flex gap-2">
              <input
                className={INPUT_CLS + ' flex-1'}
                placeholder="variable_name"
                value={row.key}
                onChange={(e) => setManualRow(i, 'key', e.target.value)}
              />
              <input
                className={INPUT_CLS + ' flex-[2]'}
                placeholder="value"
                value={row.value}
                onChange={(e) => setManualRow(i, 'value', e.target.value)}
              />
              <button
                type="button"
                onClick={() => removeManualRow(i)}
                className="text-gray-600 hover:text-red-400 text-xs px-1"
              >
                x
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addManualRow}
            className="text-xs text-gray-500 hover:text-gray-300"
          >
            + Add variable
          </button>
          <input type="hidden" name="manual_inputs_json" value={manualInputsJson} />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 bg-indigo-700 hover:bg-indigo-600 disabled:bg-gray-800 disabled:text-gray-600 text-white text-xs rounded transition-colors"
        >
          {pending ? 'Rendering…' : 'Render Preview'}
        </button>
      </form>

      {error && (
        <div className="bg-red-950 border border-red-800 text-red-300 px-3 py-2 rounded text-xs">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4 border-t border-gray-800 pt-4">
          {/* Rendered prompts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {result.rendered_system !== null && (
              <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
                <p className="text-gray-500 text-xs mb-2">System prompt rendered</p>
                <pre className="text-gray-300 text-xs font-mono whitespace-pre-wrap leading-relaxed">
                  {result.rendered_system || <span className="text-gray-600">(empty)</span>}
                </pre>
              </div>
            )}
            <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
              <p className="text-gray-500 text-xs mb-2">User prompt rendered</p>
              <pre className="text-gray-300 text-xs font-mono whitespace-pre-wrap leading-relaxed">
                {result.rendered_user}
              </pre>
            </div>
          </div>

          {/* Raw inputs toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowRawInputs((v) => !v)}
              className="text-xs text-gray-500 hover:text-gray-300"
            >
              {showRawInputs ? 'v' : '>'} Raw inputs JSON
            </button>
            {showRawInputs && (
              <pre className="mt-2 text-gray-400 text-xs bg-gray-950 rounded p-3 overflow-x-auto">
                {JSON.stringify(result.inputs, null, 2)}
              </pre>
            )}
          </div>

          {/* Diagnostics */}
          {result.unresolved_variables.length > 0 && (
            <div className="bg-red-950 border border-red-800 rounded px-3 py-2">
              <p className="text-red-300 text-xs font-medium mb-1">Unresolved variables</p>
              <p className="text-red-400 text-xs">
                {result.unresolved_variables.map((v) => `{{${v}}}`).join(', ')} — not found in inputs
              </p>
            </div>
          )}

          {result.unused_inputs.length > 0 && (
            <div className="bg-gray-900 border border-gray-700 rounded px-3 py-2">
              <p className="text-gray-400 text-xs font-medium mb-1">Unused inputs</p>
              <p className="text-gray-500 text-xs">
                {result.unused_inputs.join(', ')} — not referenced in template
              </p>
            </div>
          )}

          <p className="text-gray-600 text-xs font-mono">hash: {result.rendered_hash.slice(0, 16)}…</p>
        </div>
      )}
    </section>
  );
}
