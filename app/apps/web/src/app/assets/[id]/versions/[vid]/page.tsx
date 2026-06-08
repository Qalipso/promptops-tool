import { Badge, Card, CodeBlock, stateTone } from '@/components/ui';
import { api } from '@/lib/api';
import { IS_DEMO } from '@/lib/demo';
import { notFound } from 'next/navigation';
import { PromoteForm } from './PromoteForm';
import { RenderPreviewForm } from './RenderPreviewForm';
import { rollbackAction } from './actions';

function RollbackForm({ assetId }: { assetId: string }) {
  return (
    <form
      action={async (formData: FormData) => {
        'use server';
        const justification = formData.get('justification') as string;
        await rollbackAction(assetId, justification || 'Manual rollback');
      }}
      className="flex items-center gap-2"
    >
      <input
        name="justification"
        placeholder="Rollback reason…"
        className="bg-surface border border-border text-text text-xs rounded-md px-2.5 py-1.5 w-48 placeholder:text-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      />
      <button
        type="submit"
        className="px-3 py-1.5 bg-danger/10 hover:bg-danger/20 text-danger text-xs rounded-md transition-colors font-medium"
      >
        Rollback
      </button>
    </form>
  );
}

function ReadinessItem({
  status,
  label,
  detail,
}: {
  status: 'pass' | 'fail' | 'warn';
  label: string;
  detail?: string;
}) {
  const icon = status === 'pass' ? '✓' : status === 'warn' ? '!' : '✕';
  const color =
    status === 'pass' ? 'text-success' : status === 'warn' ? 'text-warning' : 'text-danger';
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className={`${color} text-xs w-3`}>{icon}</span>
        <span className="text-xs text-text">{label}</span>
      </div>
      {detail && <p className="text-xs text-muted ml-5 mt-0.5">{detail}</p>}
    </div>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-muted/70">{label}</dt>
      <dd className={`text-xs text-text mt-0.5 ${mono ? 'font-mono truncate' : ''}`}>{value}</dd>
    </div>
  );
}

export default async function VersionPage({
  params,
}: {
  params: Promise<{ id: string; vid: string }>;
}) {
  const { id, vid } = await params;
  const assetId = decodeURIComponent(id);

  const [asset, version, checklist] = await Promise.all([
    api.asset(assetId).catch(() => null),
    api.version(assetId, vid).catch(() => null),
    fetch(
      `${process.env.PROMPTOPS_API_URL ?? 'http://127.0.0.1:3013'}/api/v0/assets/${assetId}/versions/${vid}/checklist`,
      {
        headers: { Authorization: `Bearer ${process.env.PROMPTOPS_API_TOKEN ?? ''}` },
        next: { revalidate: 10 },
      },
    )
      .then((r) =>
        r.ok
          ? (r.json() as Promise<{
              data: {
                key: string;
                label: string;
                status: 'pass' | 'fail' | 'warn';
                detail?: string;
              }[];
            }>)
          : null,
      )
      .then((r) => r?.data ?? [])
      .catch(() => []),
  ]);

  if (!asset || !version) notFound();

  const mc = version.model_config_snapshot as Record<string, unknown> | null;
  const vc = version.variable_contract_snapshot as unknown[] | null;
  const enc = encodeURIComponent(assetId);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-muted text-xs mb-2">
          <a href="/">assets</a>
          <span className="text-muted/50">/</span>
          <a href={`/assets/${enc}`} className="hover:text-text transition-colors font-mono">
            {assetId}
          </a>
          <span className="text-muted/50">/</span>
          <span className="text-text">v{version.version}</span>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-text font-mono">v{version.version}</h1>
          <Badge tone={stateTone(version.state)}>{version.state}</Badge>
        </div>
        {version.changelog && <p className="text-muted text-sm mt-1.5">{version.changelog}</p>}

        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5">
          <Meta label="Author" value={version.author} />
          <Meta label="Created" value={new Date(version.created_at).toLocaleString()} />
          {version.promoted_at && (
            <Meta label="Promoted" value={new Date(version.promoted_at).toLocaleString()} />
          )}
          <Meta label="ETag" value={version.etag} mono />
          <Meta label="Body hash" value={`${version.body_hash.slice(0, 16)}…`} mono />
        </dl>

        <div className="flex items-center gap-3 mt-5">
          {!IS_DEMO && version.state === 'draft' && (
            <PromoteForm assetId={assetId} versionId={version.id} />
          )}
          {!IS_DEMO && version.state === 'active' && <RollbackForm assetId={assetId} />}
          <a
            href={`/assets/${enc}/diff?v1=${version.id}`}
            className="text-xs text-muted hover:text-text transition-colors"
          >
            Compare versions
          </a>
        </div>
      </div>

      {/* Render Preview */}
      <Card className="p-4">
        <RenderPreviewForm assetId={assetId} versionId={version.id} />
      </Card>

      {/* Prompt body */}
      <section>
        <h2 className="text-sm font-semibold text-text mb-3">Prompt body</h2>
        <div className="space-y-3">
          {version.body.system && (
            <div>
              <p className="text-muted text-[11px] uppercase tracking-wide mb-1.5">system</p>
              <CodeBlock>{version.body.system}</CodeBlock>
            </div>
          )}
          <div>
            {version.body.system && (
              <p className="text-muted text-[11px] uppercase tracking-wide mb-1.5">user</p>
            )}
            <CodeBlock>{version.body.user}</CodeBlock>
          </div>
        </div>
      </section>

      {/* Variables */}
      {vc && Array.isArray(vc) && vc.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-text mb-3">Variables</h2>
          <div className="space-y-1.5">
            {vc.map((v, i) => {
              const variable = v as Record<string, unknown>;
              return (
                <div
                  key={i}
                  className="flex items-center gap-4 bg-surface border border-border rounded-md px-4 py-2 text-xs"
                >
                  <span className="text-text font-mono">{String(variable.name ?? '')}</span>
                  <span className="text-muted">{String(variable.type ?? 'string')}</span>
                  {variable.required === false && <span className="text-muted/70">optional</span>}
                  {!!variable.description && (
                    <span className="text-muted">{String(variable.description)}</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Model config */}
      {mc && Object.keys(mc).length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-text mb-3">Model config</h2>
          <Card className="px-4 py-3">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs max-w-xs">
              {Object.entries(mc).map(([k, v]) => (
                <div key={k} className="contents">
                  <span className="text-muted">{k}</span>
                  <span className="text-text font-mono">{JSON.stringify(v)}</span>
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}

      {/* Artifact Readiness */}
      <section>
        <h2 className="text-sm font-semibold text-text mb-1">Artifact Readiness</h2>
        <p className="text-muted text-xs mb-3">
          Informational checklist — not a quality gate. Promotion is not blocked by readiness
          status.
        </p>
        {checklist.length === 0 ? (
          <p className="text-muted text-xs">Readiness checklist unavailable.</p>
        ) : (
          <div className="space-y-2">
            {checklist.map((item) => (
              <ReadinessItem
                key={item.key}
                status={item.status}
                label={item.label}
                {...(item.detail !== undefined ? { detail: item.detail } : {})}
              />
            ))}
          </div>
        )}
      </section>

      {/* Linked Evaluation Evidence — deferred */}
      <section className="rounded-lg border border-dashed border-border bg-surface/50 px-4 py-3">
        <h2 className="text-sm font-semibold text-muted mb-1">Linked Evaluation Evidence</h2>
        <p className="text-muted text-xs">
          No linked AI Eval evidence yet. Connect an AI Eval run to track output quality for this
          version.
        </p>
      </section>
    </div>
  );
}
