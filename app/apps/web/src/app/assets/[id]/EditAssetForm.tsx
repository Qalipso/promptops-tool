'use client';

import type { Asset } from '@/lib/api';
import { IS_DEMO } from '@/lib/demo';
import { useActionState, useState } from 'react';
import { updateAssetAction } from './actions';

const LIFECYCLES = ['unregistered', 'active', 'deprecated', 'sunset'] as const;

const LC_COLORS: Record<Asset['lifecycle'], string> = {
  active: 'bg-success/10 text-success',
  unregistered: 'bg-surface-2 text-muted',
  deprecated: 'bg-warning/10 text-warning',
  sunset: 'bg-danger/10 text-danger',
};

const INPUT_CLS =
  'w-full bg-surface border border-border text-text text-xs rounded-md px-3 py-2 placeholder:text-muted/60 focus:outline-none focus:border-accent/50 transition-colors';

interface Props {
  asset: Asset;
}

export function EditAssetForm({ asset }: Props) {
  const [editing, setEditing] = useState(false);

  const boundAction = updateAssetAction.bind(null, asset.id);
  const [state, action, pending] = useActionState(boundAction, null);

  if (!editing) {
    return (
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-text">{asset.id}</h1>
          <span
            className={`px-2 py-0.5 rounded-md text-xs font-medium ${LC_COLORS[asset.lifecycle]}`}
          >
            {asset.lifecycle}
          </span>
          {!IS_DEMO && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-xs text-muted hover:text-text transition-colors"
            >
              edit
            </button>
          )}
        </div>
        {asset.description && <p className="text-muted text-sm mt-1">{asset.description}</p>}
      </div>
    );
  }

  return (
    <form
      action={async (fd) => {
        await action(fd);
        setEditing(false);
      }}
      className="space-y-3"
    >
      {state?.error && (
        <div className="bg-danger/10 border border-danger/30 text-danger px-3 py-2 rounded-md text-xs">
          {state.error}
        </div>
      )}

      {/* Lifecycle */}
      <div>
        <label className="block text-xs text-muted mb-1">Lifecycle</label>
        <select
          name="lifecycle"
          defaultValue={asset.lifecycle}
          className="w-full bg-surface border border-border text-text text-xs rounded-md px-3 py-2 focus:outline-none focus:border-accent/50"
        >
          {LIFECYCLES.map((lc) => (
            <option key={lc} value={lc}>
              {lc}
            </option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs text-muted mb-1">Description</label>
        <input
          name="description"
          defaultValue={asset.description}
          placeholder="What this prompt does…"
          className={INPUT_CLS}
        />
      </div>

      {/* Tags */}
      <div>
        <label className="block text-xs text-muted mb-1">Tags</label>
        <input
          name="tags"
          defaultValue={asset.tags.join(', ')}
          placeholder="Comma-separated"
          className={INPUT_CLS}
        />
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="px-3 py-1.5 bg-accent hover:opacity-90 text-accent-fg shadow-sm disabled:opacity-50 text-xs rounded-md transition-colors"
        >
          {pending ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-xs text-muted hover:text-text"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
