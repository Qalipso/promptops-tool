'use client';

import { useActionState } from 'react';
import { promoteAction } from './actions';

export function PromoteForm({ assetId, versionId }: { assetId: string; versionId: string }) {
  const bound = promoteAction.bind(null, assetId, versionId);
  const [state, action, pending] = useActionState(bound, null);

  return (
    <div>
      {state?.error && (
        <p className="text-red-400 text-xs mb-2">{state.error}</p>
      )}
      <form action={action}>
        <button
          type="submit"
          disabled={pending}
          className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:bg-gray-800 disabled:text-gray-600 text-emerald-100 text-xs rounded transition-colors"
        >
          {pending ? 'Promoting…' : 'Promote to active'}
        </button>
      </form>
    </div>
  );
}
