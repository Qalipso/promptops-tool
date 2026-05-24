import { api, type Version } from '@/lib/api';
import { notFound } from 'next/navigation';
import { EditAssetForm } from './EditAssetForm';

function StateBadge({ state }: { state: Version['state'] }) {
  const colors: Record<Version['state'], string> = {
    draft: 'bg-blue-900 text-blue-300',
    active: 'bg-emerald-900 text-emerald-300',
    previous: 'bg-gray-800 text-gray-400',
    archived: 'bg-gray-900 text-gray-600',
  };
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[state]}`}>{state}</span>;
}


export default async function AssetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const assetId = decodeURIComponent(id);

  const [asset, versions, stats] = await Promise.all([
    api.asset(assetId).catch(() => null),
    api.versions(assetId).catch(() => [] as Version[]),
    api.stats(assetId).catch(() => null),
  ]);

  if (!asset) notFound();

  const sortedVersions = [...versions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const activeVersion = versions.find((v) => v.state === 'active');
  const draftVersion = versions.find((v) => v.state === 'draft');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
          <a href="/">assets</a>
          <span>/</span>
          <span className="text-gray-300">{asset.id}</span>
        </div>

        <EditAssetForm asset={asset} />

        <div className="grid grid-cols-2 gap-x-8 gap-y-1 mt-3 text-xs max-w-sm">
          <span className="text-gray-500">owner</span>
          <span className="text-gray-300">{asset.owner}</span>
          <span className="text-gray-500">versions</span>
          <span className="text-gray-300">{stats?.version_count ?? versions.length}</span>
          {asset.tags.length > 0 && (
            <>
              <span className="text-gray-500">tags</span>
              <span className="text-gray-300">{asset.tags.join(', ')}</span>
            </>
          )}
          <span className="text-gray-500">created</span>
          <span className="text-gray-300">{new Date(asset.created_at).toLocaleDateString()}</span>
          {stats?.last_rendered_at && (
            <>
              <span className="text-gray-500">last rendered</span>
              <span className="text-gray-300">{new Date(stats.last_rendered_at).toLocaleDateString()}</span>
            </>
          )}
        </div>

        <div className="flex gap-4 mt-4 text-xs">
          <a href={`/assets/${encodeURIComponent(assetId)}/audit`} className="text-gray-500 hover:text-gray-300">
            audit log
          </a>
          <a href={`/assets/${encodeURIComponent(assetId)}/versions/new`} className="text-gray-500 hover:text-gray-300">
            + new version
          </a>
        </div>
      </div>

      {/* Active prompt preview */}
      {activeVersion && (
        <section className="bg-gray-900 border border-emerald-800/40 rounded-lg px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-emerald-400 text-xs font-medium">Active prompt — v{activeVersion.version}</span>
            <a href={`/assets/${encodeURIComponent(assetId)}/versions/${activeVersion.id}`} className="text-xs text-gray-500 hover:text-gray-300">
              view full
            </a>
          </div>
          {activeVersion.body.system && (
            <div className="mb-2">
              <p className="text-gray-600 text-xs mb-1">system</p>
              <p className="text-gray-400 text-xs line-clamp-3 font-mono whitespace-pre-wrap">{activeVersion.body.system}</p>
            </div>
          )}
          <div>
            {activeVersion.body.system && <p className="text-gray-600 text-xs mb-1">user</p>}
            <p className="text-gray-400 text-xs line-clamp-4 font-mono whitespace-pre-wrap">{activeVersion.body.user}</p>
          </div>
        </section>
      )}

      {/* Draft notice */}
      {draftVersion && (
        <div className="bg-blue-950 border border-blue-800 rounded-lg px-4 py-2 flex items-center justify-between">
          <span className="text-blue-300 text-xs">Draft v{draftVersion.version} pending — not yet promoted</span>
          <a href={`/assets/${encodeURIComponent(assetId)}/versions/${draftVersion.id}`} className="text-xs text-blue-400 hover:text-blue-300">
            review
          </a>
        </div>
      )}

      {/* Versions */}
      <section>
        <h2 className="text-sm font-semibold text-gray-300 mb-3">
          Versions <span className="text-gray-600 font-normal">({versions.length})</span>
        </h2>
        {sortedVersions.length === 0 ? (
          <p className="text-gray-600 text-xs">No versions yet.</p>
        ) : (
          <div className="space-y-2">
            {sortedVersions.map((v) => (
              <a
                key={v.id}
                href={`/assets/${encodeURIComponent(assetId)}/versions/${v.id}`}
                className="block bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 hover:border-gray-600 transition-colors no-underline"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-white font-medium">v{v.version}</span>
                    {v.changelog && (
                      <p className="text-gray-400 text-xs mt-0.5 truncate max-w-lg">{v.changelog}</p>
                    )}
                    <p className="text-gray-600 text-xs mt-0.5">
                      by {v.author} · {new Date(v.created_at).toLocaleDateString()}
                      {v.promoted_at && ` · promoted ${new Date(v.promoted_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-600 text-xs font-mono">{v.etag}</span>
                    <StateBadge state={v.state} />
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
