'use client';

import { useActionState } from 'react';
import { createAssetAction } from './actions';

const INPUT_CLS =
  'w-full bg-gray-900 border border-gray-700 text-gray-200 text-xs rounded px-3 py-2 placeholder-gray-600 focus:outline-none focus:border-gray-500';
const LABEL_CLS = 'block text-xs text-gray-400 mb-1';

export default function NewAssetPage() {
  const [state, action, pending] = useActionState(createAssetAction, null);

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
          <a href="/">assets</a>
          <span>/</span>
          <span className="text-gray-300">new</span>
        </div>
        <h1 className="text-lg font-semibold text-white">Create asset</h1>
        <p className="text-gray-500 text-xs mt-1">
          Assets are the durable identities for managed prompts. Use a stable, namespaced ID.
        </p>
      </div>

      {state?.error && (
        <div className="bg-red-950 border border-red-800 text-red-300 px-4 py-2 rounded text-xs mb-4">
          {state.error}
        </div>
      )}

      <form action={action} className="space-y-4">
        <div>
          <label className={LABEL_CLS} htmlFor="id">
            Asset ID <span className="text-red-400">*</span>
          </label>
          <input
            id="id"
            name="id"
            required
            placeholder="team.product.use-case"
            className={INPUT_CLS}
          />
          <p className="text-gray-600 text-xs mt-1">Stable, dot-namespaced identifier. Cannot be changed.</p>
        </div>

        <div>
          <label className={LABEL_CLS} htmlFor="description">
            Description
          </label>
          <input
            id="description"
            name="description"
            placeholder="What this prompt does…"
            className={INPUT_CLS}
          />
        </div>

        <div>
          <label className={LABEL_CLS} htmlFor="owner">
            Owner
          </label>
          <input
            id="owner"
            name="owner"
            placeholder="team or user name"
            className={INPUT_CLS}
          />
        </div>

        <div>
          <label className={LABEL_CLS} htmlFor="tags">
            Tags
          </label>
          <input
            id="tags"
            name="tags"
            placeholder="email, marketing, demo"
            className={INPUT_CLS}
          />
          <p className="text-gray-600 text-xs mt-1">Comma-separated.</p>
        </div>

        <div>
          <label className={LABEL_CLS} htmlFor="lifecycle">
            Lifecycle
          </label>
          <select id="lifecycle" name="lifecycle" className={INPUT_CLS}>
            <option value="active">active</option>
            <option value="unregistered">unregistered</option>
            <option value="deprecated">deprecated</option>
            <option value="sunset">sunset</option>
          </select>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={pending}
            className="px-4 py-2 bg-indigo-700 hover:bg-indigo-600 disabled:bg-gray-800 text-white text-xs rounded transition-colors"
          >
            {pending ? 'Creating…' : 'Create asset'}
          </button>
          <a href="/" className="text-xs text-gray-500 hover:text-gray-300">
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
