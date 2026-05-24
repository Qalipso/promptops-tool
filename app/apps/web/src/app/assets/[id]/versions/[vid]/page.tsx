import { api, type Version } from '@/lib/api';
import { notFound } from 'next/navigation';
import { rollbackAction } from './actions';
import { RenderPreviewForm } from './RenderPreviewForm';
import { PromoteForm } from './PromoteForm';

function StateBadge({ state }: { state: Version['state'] }) {
  const colors: Record<Version['state'], string> = {
    draft: 'bg-blue-900 text-blue-300',
    active: 'bg-emerald-900 text-emerald-300',
    previous: 'bg-gray-800 text-gray-400',
    archived: 'bg-gray-900 text-gray-600',
  };
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[state]}`}>{state}</span>;
}

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
        className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded px-2 py-1.5 w-48 placeholder-gray-600 focus:outline-none focus:border-gray-500"
      />
      <button
        type="submit"
        className="px-3 py-1.5 bg-red-900 hover:bg-red-800 text-red-200 text-xs rounded transition-colors"
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
  const icon = status === 'pass' ? 'v' : status === 'warn' ? '!' : 'x';
  const color =
    status === 'pass' ? 'text-green-400' : status === 'warn' ? 'text-yellow-500' : 'text-red-400';

  return (
    <div>
      <div className="flex items-center gap-2">
        <span className={`${color} text-xs`} style={{ width: 12 }}>{icon}</span>
        <span className="text-xs text-gray-300">{label}</span>
      </div>
      {detail && <p className="text-xs text-gray-600 ml-5 mt-0.5">{detail}</p>}
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
      `${process.env.PROMPTOPS_API_URL ?? 'http://localhost:3013'}/api/v0/assets/${assetId}/versions/${vid}/checklist`,
      {
        headers: { Authorization: `Bearer ${process.env.PROMPTOPS_API_TOKEN ?? ''}` },
        next: { revalidate: 10 },
      },
    )
      .then((r) => (r.ok ? (r.json() as Promise<{ data: { key: string; label: string; status: 'pass' | 'fail' | 'warn'; detail?: string }[] }>) : null))
      .then((r) => r?.data ?? [])
      .catch(() => []),
  ]);

  if (!asset || !version) notFound();

  const mc = version.model_config_snapshot as Record<string, unknown> | null;
  const vc = version.variable_contract_snapshot as unknown[] | null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
          <a href="/">assets</a>
          <span>/</span>
          <a href={`/assets/${encodeURIComponent(assetId)}`} className="hover:text-gray-300">{assetId}</a>
          <span>/</span>
          <span className="text-gray-300">v{version.version}</span>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-white">v{version.version}</h1>
          <StateBadge state={version.state} />
        </div>
        {version.changelog && (
          <p className="text-gray-400 text-sm mt-1">{version.changelog}</p>
        )}

        <div className="grid grid-cols-2 gap-x-8 gap-y-1 mt-3 text-xs max-w-sm">
          <span className="text-gray-500">author</span>
          <span className="text-gray-300">{version.author}</span>
          <span className="text-gray-500">created</span>
          <span className="text-gray-300">{new Date(version.created_at).toLocaleString()}</span>
          {version.promoted_at && (
            <>
              <span className="text-gray-500">promoted</span>
              <span className="text-gray-300">{new Date(version.promoted_at).toLocaleString()}</span>
            </>
          )}
          <span className="text-gray-500">etag</span>
          <span className="text-gray-300 font-mono">{version.etag}</span>
          <span className="text-gray-500">body hash</span>
          <span className="text-gray-300 font-mono truncate">{version.body_hash.slice(0, 16)}…</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-4">
          {version.state === 'draft' && (
            <PromoteForm assetId={assetId} versionId={version.id} />
          )}
          {version.state === 'active' && (
            <RollbackForm assetId={assetId} />
          )}
          <a
            href={`/assets/${encodeURIComponent(assetId)}/diff?v1=${version.id}`}
            className="text-xs text-gray-500 hover:text-gray-300"
          >
            compare versions
          </a>
        </div>
      </div>

      {/* Render Preview */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-4">
        <RenderPreviewForm assetId={assetId} versionId={version.id} />
      </div>

      {/* Artifact Readiness */}
      <section>
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Artifact Readiness</h2>
        <p className="text-gray-600 text-xs mb-3">
          Informational checklist — not a quality gate. Promotion is not blocked by readiness status.
        </p>
        {checklist.length === 0 ? (
          <p className="text-gray-600 text-xs">Readiness checklist unavailable.</p>
        ) : (
          <div className="space-y-2">
            {checklist.map((item) => (
              <ReadinessItem key={item.key} status={item.status} label={item.label} {...(item.detail !== undefined ? { detail: item.detail } : {})} />
            ))}
          </div>
        )}
      </section>

      {/* Linked Evaluation Evidence — deferred */}
      <section className="bg-gray-900 border border-gray-800 border-dashed rounded-lg px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-500 mb-1">Linked Evaluation Evidence</h2>
        <p className="text-gray-600 text-xs">
          No linked AI Eval evidence yet. Connect an AI Eval run to track output quality for this version.
        </p>
      </section>

      {/* Prompt body */}
      <section>
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Prompt body</h2>
        <div className="space-y-3">
          {version.body.system && (
            <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
              <p className="text-gray-500 text-xs mb-2">system</p>
              <pre className="text-gray-300 text-xs font-mono whitespace-pre-wrap leading-relaxed">
                {version.body.system}
              </pre>
            </div>
          )}
          <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
            {version.body.system && <p className="text-gray-500 text-xs mb-2">user</p>}
            <pre className="text-gray-300 text-xs font-mono whitespace-pre-wrap leading-relaxed">
              {version.body.user}
            </pre>
          </div>
        </div>
      </section>

      {/* Variable contract */}
      {vc && Array.isArray(vc) && vc.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Variables</h2>
          <div className="space-y-1">
            {vc.map((v, i) => {
              const variable = v as Record<string, unknown>;
              return (
                <div key={i} className="flex items-center gap-4 bg-gray-900 border border-gray-800 rounded px-4 py-2 text-xs">
                  <span className="text-white font-mono">{String(variable['name'] ?? '')}</span>
                  <span className="text-gray-500">{String(variable['type'] ?? 'string')}</span>
                  {variable['required'] === false && <span className="text-gray-600">optional</span>}
                  {!!variable['description'] && <span className="text-gray-400">{String(variable['description'])}</span>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Model config */}
      {mc && Object.keys(mc).length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Model config</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs max-w-xs">
              {Object.entries(mc).map(([k, v]) => (
                <div key={k} className="contents">
                  <span className="text-gray-500">{k}</span>
                  <span className="text-gray-300 font-mono">{JSON.stringify(v)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
