import { type AuditEvent, api } from '@/lib/api';
import { notFound } from 'next/navigation';

const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  'asset.created': { label: 'asset created', color: 'text-success' },
  'asset.updated': { label: 'asset updated', color: 'text-accent' },
  'version.created': { label: 'version created', color: 'text-accent' },
  'version.promoted': { label: 'promoted', color: 'text-success' },
  'version.archived': { label: 'archived', color: 'text-muted' },
  'version.rolled_back': { label: 'rolled back', color: 'text-danger' },
  'fixture.created': { label: 'fixture added', color: 'text-muted' },
  'fixture.updated': { label: 'fixture updated', color: 'text-muted' },
  'fixture.deleted': { label: 'fixture deleted', color: 'text-warning' },
  'version.rendered': { label: 'render preview', color: 'text-accent' },
};

function EventRow({ event }: { event: AuditEvent }) {
  const meta = EVENT_LABELS[event.event_type] ?? { label: event.event_type, color: 'text-muted' };
  const ts = new Date(event.occurred_at);

  return (
    <div className="flex gap-4 py-2.5 border-b border-border last:border-0">
      <div className="w-32 shrink-0 text-muted text-xs font-mono">
        <div>{ts.toLocaleDateString()}</div>
        <div>{ts.toLocaleTimeString()}</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <span className={`text-xs font-medium ${meta.color}`}>{meta.label}</span>
          <span className="text-muted text-xs">by {event.actor}</span>
          {event.version_id && (
            <span className="text-muted text-xs font-mono">{event.version_id.slice(0, 8)}…</span>
          )}
        </div>
        {Object.keys(event.payload).length > 0 && (
          <details className="mt-1">
            <summary className="text-muted text-xs cursor-pointer hover:text-text">payload</summary>
            <pre className="mt-1 text-muted text-xs bg-surface-2 rounded-md p-2 overflow-x-auto font-mono">
              {JSON.stringify(event.payload, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

export default async function AuditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const assetId = decodeURIComponent(id);

  const [asset, events] = await Promise.all([
    api.asset(assetId).catch(() => null),
    api.auditEvents(assetId).catch(() => [] as AuditEvent[]),
  ]);

  if (!asset) notFound();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-muted text-xs mb-1">
          <a href="/">assets</a>
          <span>/</span>
          <a href={`/assets/${encodeURIComponent(assetId)}`} className="hover:text-text">
            {assetId}
          </a>
          <span>/</span>
          <span className="text-text">audit</span>
        </div>
        <h1 className="text-lg font-semibold text-text">Audit Log</h1>
        <p className="text-muted text-xs mt-0.5">Last 90 days · {events.length} events</p>
      </div>

      {events.length === 0 ? (
        <p className="text-muted text-xs">No audit events yet.</p>
      ) : (
        <div className="bg-surface border border-border rounded-lg px-4">
          {events.map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
