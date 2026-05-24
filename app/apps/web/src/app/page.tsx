import { api, type Asset } from '@/lib/api';

function LifecycleBadge({ lc }: { lc: Asset['lifecycle'] }) {
  const colors: Record<Asset['lifecycle'], string> = {
    active: 'bg-emerald-900 text-emerald-300',
    unregistered: 'bg-gray-800 text-gray-400',
    deprecated: 'bg-yellow-900 text-yellow-300',
    sunset: 'bg-red-900 text-red-300',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[lc]}`}>{lc}</span>
  );
}

export default async function Dashboard() {
  let assets: Asset[] = [];
  let error: string | null = null;

  try {
    assets = await api.assets();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load assets';
  }

  const activeCount = assets.filter((a) => a.lifecycle === 'active').length;
  const deprecatedCount = assets.filter((a) => a.lifecycle === 'deprecated').length;
  const totalVersions = assets.reduce((s, a) => s + (a.stats?.version_count ?? 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-white">Assets</h1>
        <span className="text-gray-500 text-xs">{assets.length} total</span>
      </div>

      {assets.length > 0 && (
        <div className="flex gap-5 mb-6 text-xs border-b border-gray-800 pb-4">
          <span className="text-emerald-400">{activeCount} active</span>
          {deprecatedCount > 0 && <span className="text-yellow-400">{deprecatedCount} deprecated</span>}
          <span className="text-gray-500">{totalVersions} versions</span>
        </div>
      )}

      {error && (
        <div className="bg-red-950 border border-red-800 text-red-300 px-4 py-3 rounded mb-4 text-xs">
          {error}
        </div>
      )}

      {assets.length === 0 && !error && (
        <p className="text-gray-500 text-xs">No assets yet. Create one via the API.</p>
      )}

      <div className="space-y-2">
        {assets.map((asset) => (
          <a
            key={asset.id}
            href={`/assets/${encodeURIComponent(asset.id)}`}
            className="block bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 hover:border-gray-600 transition-colors no-underline group"
          >
            <div className="flex items-center justify-between">
              <span className="text-white group-hover:text-indigo-300 transition-colors font-medium">
                {asset.id}
              </span>
              <LifecycleBadge lc={asset.lifecycle} />
            </div>

            {asset.description && (
              <p className="text-gray-400 text-xs mt-1 truncate">{asset.description}</p>
            )}

            <div className="flex flex-wrap gap-4 mt-2 text-gray-600 text-xs">
              <span>owner: {asset.owner}</span>
              <span>{asset.stats?.version_count ?? 0} versions</span>
              {asset.tags.length > 0 && <span>{asset.tags.join(', ')}</span>}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
