'use client';

import type { Version } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface VersionPickerProps {
  assetId: string;
  versions: Version[];
  initialV1?: string;
  initialV2?: string;
}

export function VersionPicker({ assetId, versions, initialV1, initialV2 }: VersionPickerProps) {
  const router = useRouter();

  const sorted = [...versions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const defaultV1 = initialV1 ?? sorted[0]?.id ?? '';
  const defaultV2 =
    initialV2 ?? (sorted.find((v) => v.state === 'active') ?? sorted[1] ?? sorted[0])?.id ?? '';

  const [v1, setV1] = useState(defaultV1);
  const [v2, setV2] = useState(defaultV2);

  function compare() {
    if (!v1 || !v2) return;
    router.push(`/assets/${assetId}/diff?v1=${v1}&v2=${v2}`);
  }

  function label(v: Version) {
    return `v${v.version} [${v.state}]`;
  }

  return (
    <div className="flex flex-col gap-4 max-w-xl">
      <p className="text-sm text-muted">Select two versions to compare side-by-side.</p>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-muted mb-1">Base (left)</label>
          <select
            value={v1}
            onChange={(e) => setV1(e.target.value)}
            className="w-full bg-surface-2 border border-border text-text text-sm rounded-md px-3 py-2 focus:outline-none focus:border-accent/50"
          >
            {sorted.map((v) => (
              <option key={v.id} value={v.id}>
                {label(v)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-muted mb-1">Compare (right)</label>
          <select
            value={v2}
            onChange={(e) => setV2(e.target.value)}
            className="w-full bg-surface-2 border border-border text-text text-sm rounded-md px-3 py-2 focus:outline-none focus:border-accent/50"
          >
            {sorted.map((v) => (
              <option key={v.id} value={v.id}>
                {label(v)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={compare}
        disabled={!v1 || !v2}
        className="self-start bg-accent hover:opacity-90 text-accent-fg shadow-sm disabled:opacity-40 text-sm font-medium px-4 py-2 rounded-md transition-colors"
      >
        Compare
      </button>
    </div>
  );
}
