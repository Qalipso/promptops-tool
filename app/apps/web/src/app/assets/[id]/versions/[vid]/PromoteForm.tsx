'use client';

import { useActionState } from 'react';
import { promoteAction } from './actions';

export function PromoteForm({ assetId, versionId }: { assetId: string; versionId: string }) {
  const bound = promoteAction.bind(null, assetId, versionId);
  const [state, action, pending] = useActionState(bound, null);

  return (
    <div>
      {state?.error && <p className="text-danger text-xs mb-2">{state.error}</p>}
      <form action={action}>
        <button
          type="submit"
          disabled={pending}
          className="px-3 py-1.5 bg-accent hover:opacity-90 text-accent-fg shadow-sm disabled:opacity-50 text-xs rounded-md transition-colors"
        >
          {pending ? 'Promoting…' : 'Promote to active'}
        </button>
      </form>
    </div>
  );
}
