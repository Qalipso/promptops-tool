'use client';

import { DemoNotice } from '@/components/ui/DemoNotice';
import { IS_DEMO } from '@/lib/demo';
import { useActionState } from 'react';
import { createAssetAction } from './actions';

const INPUT_CLS =
  'w-full bg-surface border border-border text-text text-xs rounded-md px-3 py-2 placeholder:text-muted/60 focus:outline-none focus:border-accent/50';
const LABEL_CLS = 'block text-xs text-muted mb-1';

export default function NewAssetPage() {
  const [state, action, pending] = useActionState(createAssetAction, null);

  if (IS_DEMO) return <DemoNotice feature="Creating assets" />;

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-muted text-xs mb-1">
          <a href="/">assets</a>
          <span>/</span>
          <span className="text-text">new</span>
        </div>
        <h1 className="text-lg font-semibold text-text">Create asset</h1>
        <p className="text-muted text-xs mt-1">
          Assets are the durable identities for managed prompts. Use a stable, namespaced ID.
        </p>
      </div>

      {state?.error && (
        <div className="bg-danger/10 border border-danger/30 text-danger px-4 py-2 rounded-md text-xs mb-4">
          {state.error}
        </div>
      )}

      <form action={action} className="space-y-4">
        <div>
          <label className={LABEL_CLS} htmlFor="id">
            Asset ID <span className="text-danger">*</span>
          </label>
          <input
            id="id"
            name="id"
            required
            placeholder="team.product.use-case"
            className={INPUT_CLS}
          />
          <p className="text-muted text-xs mt-1">
            Stable, dot-namespaced identifier. Cannot be changed.
          </p>
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
          <input id="owner" name="owner" placeholder="team or user name" className={INPUT_CLS} />
        </div>

        <div>
          <label className={LABEL_CLS} htmlFor="tags">
            Tags
          </label>
          <input id="tags" name="tags" placeholder="email, marketing, demo" className={INPUT_CLS} />
          <p className="text-muted text-xs mt-1">Comma-separated.</p>
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
            className="px-4 py-2 bg-accent hover:opacity-90 text-accent-fg shadow-sm disabled:opacity-50 text-xs rounded-md transition-colors"
          >
            {pending ? 'Creating…' : 'Create asset'}
          </button>
          <a href="/" className="text-xs text-muted hover:text-text">
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
