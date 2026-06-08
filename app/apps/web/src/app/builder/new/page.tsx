'use client';

import { DemoNotice } from '@/components/ui/DemoNotice';
import { IS_DEMO } from '@/lib/demo';
import { useActionState } from 'react';
import { createBuilderAssetAction } from '../actions';

const INPUT_CLS =
  'w-full rounded-md border border-border bg-surface text-text text-sm px-3 py-2 placeholder:text-muted/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus:border-accent/50';
const LABEL_CLS = 'block text-xs font-medium text-muted mb-1.5';

export default function NewBuilderPage() {
  const [state, action, pending] = useActionState(createBuilderAssetAction, null);

  if (IS_DEMO) return <DemoNotice feature="Agent builder" />;

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-muted text-xs mb-1">
          <a href="/">assets</a>
          <span>/</span>
          <span className="text-text">builder</span>
        </div>
        <h1 className="text-lg font-semibold text-text">New agent</h1>
        <p className="text-muted text-xs mt-1">
          The builder guides you from a business brief to a release-ready prompt: behavior, rules,
          tools, test cases, eval, and promotion.
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
            Agent ID <span className="text-danger">*</span>
          </label>
          <input
            id="id"
            name="id"
            required
            placeholder="team.agent.use-case"
            className={INPUT_CLS}
          />
          <p className="text-muted text-xs mt-1">Stable, dot-namespaced. Cannot be changed.</p>
        </div>
        <div>
          <label className={LABEL_CLS} htmlFor="owner">
            Owner
          </label>
          <input id="owner" name="owner" placeholder="team or user" className={INPUT_CLS} />
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={pending}
            className="px-4 py-2 bg-accent hover:opacity-90 text-accent-fg shadow-sm disabled:opacity-50 text-xs rounded-md transition-colors"
          >
            {pending ? 'Creating…' : 'Start building'}
          </button>
          <a href="/" className="text-xs text-muted hover:text-text">
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
