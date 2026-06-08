import { Badge, Button, Card, EmptyState, stateTone } from '@/components/ui';
import { type Asset, api } from '@/lib/api';

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
      <div className="flex items-baseline justify-between mb-4">
        <h1 className="text-xl font-semibold text-text">Assets</h1>
        <span className="text-muted text-xs">{assets.length} total</span>
      </div>

      {assets.length > 0 && (
        <div className="flex gap-5 mb-6 text-xs border-b border-border pb-4">
          <span className="text-success font-medium">{activeCount} active</span>
          {deprecatedCount > 0 && (
            <span className="text-warning">{deprecatedCount} deprecated</span>
          )}
          <span className="text-muted">{totalVersions} versions</span>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-danger/30 bg-danger/10 text-danger px-4 py-3 mb-4 text-xs">
          {error}
        </div>
      )}

      {assets.length === 0 && !error && (
        <EmptyState
          title="No assets yet"
          desc="Create a prompt asset, or build an agent end-to-end in the wizard."
          action={
            <div className="flex gap-2">
              <a href="/assets/new">
                <Button variant="secondary" size="sm">
                  New asset
                </Button>
              </a>
              <a href="/builder/new">
                <Button size="sm">Open builder</Button>
              </a>
            </div>
          }
        />
      )}

      <div className="grid gap-3">
        {assets.map((asset) => (
          <a
            key={asset.id}
            href={`/assets/${encodeURIComponent(asset.id)}`}
            className="no-underline group"
          >
            <Card hover className="px-4 py-3.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-text group-hover:text-accent transition-colors font-medium font-mono text-sm">
                  {asset.id}
                </span>
                <Badge tone={stateTone(asset.lifecycle)}>{asset.lifecycle}</Badge>
              </div>

              {asset.description && (
                <p className="text-muted text-xs mt-1.5 truncate">{asset.description}</p>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 text-muted/80 text-xs">
                <span>{asset.owner}</span>
                <span>{asset.stats?.version_count ?? 0} versions</span>
                {asset.tags.length > 0 && (
                  <span className="flex gap-1.5">
                    {asset.tags.map((t) => (
                      <span key={t} className="text-accent/70">
                        #{t}
                      </span>
                    ))}
                  </span>
                )}
              </div>
            </Card>
          </a>
        ))}
      </div>
    </div>
  );
}
