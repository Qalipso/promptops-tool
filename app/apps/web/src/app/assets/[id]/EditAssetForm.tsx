'use client';

import { useActionState, useState } from 'react';
import type { Asset } from '@/lib/api';
import { updateAssetAction } from './actions';

const LIFECYCLES = ['unregistered', 'active', 'deprecated', 'sunset'] as const;

const LC_COLORS: Record<Asset['lifecycle'], string> = {
  active: 'bg-emerald-900 text-emerald-300',
  unregistered: 'bg-gray-800 text-gray-400',
  deprecated: 'bg-yellow-900 text-yellow-300',
  sunset: 'bg-red-900 text-red-300',
};

const INPUT_CLS =
  'w-full bg-gray-900 border border-gray-700 text-gray-200 text-xs rounded-md px-3 py-2 placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors';

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
          <h1 className="text-lg font-semibold text-white">{asset.id}</h1>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${LC_COLORS[asset.lifecycle]}`}>
            {asset.lifecycle}
          </span>
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-gray-600 hover:text-gray-300 transition-colors"
          >
            edit
          </button>
        </div>
        {asset.description && (
          <p className="text-gray-400 text-sm mt-1">{asset.description}</p>
        )}
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
        <div className="bg-red-950 border border-red-800 text-red-300 px-3 py-2 rounded text-xs">
          {state.error}
        </div>
      )}

      {/* Lifecycle */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Lifecycle</label>
        <select
          name="lifecycle"
          defaultValue={asset.lifecycle}
          className="w-full bg-gray-900 border border-gray-700 text-gray-200 text-xs rounded-md px-3 py-2 focus:outline-none focus:border-gray-500"
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
        <label className="block text-xs text-gray-500 mb-1">Description</label>
        <input
          name="description"
          defaultValue={asset.description}
          placeholder="What this prompt does…"
          className={INPUT_CLS}
        />
      </div>

      {/* Tags */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Tags</label>
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
          className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 disabled:bg-gray-800 disabled:text-gray-600 text-white text-xs rounded transition-colors"
        >
          {pending ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-xs text-gray-500 hover:text-gray-300"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
