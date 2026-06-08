import { Badge, Card, CodeBlock, stateTone } from '@/components/ui';
import { type Version, api } from '@/lib/api';
import { IS_DEMO } from '@/lib/demo';
import { notFound } from 'next/navigation';
import { EditAssetForm } from './EditAssetForm';

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-muted/70">{label}</dt>
      <dd className="text-sm text-text mt-0.5">{value}</dd>
    </div>
  );
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
  const enc = encodeURIComponent(assetId);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-muted text-xs mb-2">
          <a href="/">assets</a>
          <span className="text-muted/50">/</span>
          <span className="text-text font-mono">{asset.id}</span>
        </div>

        <EditAssetForm asset={asset} />

        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
          <Meta label="Owner" value={asset.owner} />
          <Meta label="Versions" value={String(stats?.version_count ?? versions.length)} />
          <Meta label="Created" value={new Date(asset.created_at).toLocaleDateString()} />
          <Meta
            label="Last rendered"
            value={
              stats?.last_rendered_at ? new Date(stats.last_rendered_at).toLocaleDateString() : '—'
            }
          />
        </dl>

        {asset.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {asset.tags.map((t) => (
              <span
                key={t}
                className="text-xs text-accent/80 bg-accent-soft rounded-full px-2 py-0.5"
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-4 mt-5 text-xs">
          <a href={`/assets/${enc}/audit`} className="text-muted hover:text-text transition-colors">
            Audit log
          </a>
          {!IS_DEMO && (
            <a
              href={`/assets/${enc}/versions/new`}
              className="text-accent hover:opacity-80 transition-opacity"
            >
              + New version
            </a>
          )}
          {versions.length >= 2 && (
            <a
              href={`/assets/${enc}/diff`}
              className="text-muted hover:text-text transition-colors"
            >
              Compare versions
            </a>
          )}
        </div>
      </div>

      {/* Active prompt preview */}
      {activeVersion && (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface-2/50">
            <span className="text-success text-xs font-medium">
              Active · v{activeVersion.version}
            </span>
            <a
              href={`/assets/${enc}/versions/${activeVersion.id}`}
              className="text-xs text-muted hover:text-text transition-colors"
            >
              View full →
            </a>
          </div>
          <div className="p-4 space-y-3">
            {activeVersion.body.system && (
              <div>
                <p className="text-muted text-[11px] uppercase tracking-wide mb-1">system</p>
                <CodeBlock className="line-clamp-3">{activeVersion.body.system}</CodeBlock>
              </div>
            )}
            <div>
              <p className="text-muted text-[11px] uppercase tracking-wide mb-1">user</p>
              <CodeBlock className="line-clamp-4">{activeVersion.body.user}</CodeBlock>
            </div>
          </div>
        </Card>
      )}

      {/* Draft notice */}
      {draftVersion && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-2.5 flex items-center justify-between">
          <span className="text-warning text-xs">
            Draft v{draftVersion.version} pending — not yet promoted
          </span>
          <a
            href={`/assets/${enc}/versions/${draftVersion.id}`}
            className="text-xs text-warning hover:opacity-80 transition-opacity font-medium"
          >
            Review →
          </a>
        </div>
      )}

      {/* Versions */}
      <section>
        <h2 className="text-sm font-semibold text-text mb-3">
          Versions <span className="text-muted font-normal">({versions.length})</span>
        </h2>
        {sortedVersions.length === 0 ? (
          <p className="text-muted text-xs">No versions yet.</p>
        ) : (
          <div className="space-y-2">
            {sortedVersions.map((v) => (
              <a
                key={v.id}
                href={`/assets/${enc}/versions/${v.id}`}
                className="no-underline group block"
              >
                <Card hover className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-text font-medium font-mono group-hover:text-accent transition-colors">
                        v{v.version}
                      </span>
                      {v.changelog && (
                        <p className="text-muted text-xs mt-0.5 truncate max-w-lg">{v.changelog}</p>
                      )}
                      <p className="text-muted/70 text-xs mt-0.5">
                        by {v.author} · {new Date(v.created_at).toLocaleDateString()}
                        {v.promoted_at &&
                          ` · promoted ${new Date(v.promoted_at).toLocaleDateString()}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-muted/60 text-xs font-mono hidden sm:inline">
                        {v.etag}
                      </span>
                      <Badge tone={stateTone(v.state)}>{v.state}</Badge>
                    </div>
                  </div>
                </Card>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
