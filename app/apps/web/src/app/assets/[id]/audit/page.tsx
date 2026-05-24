import { api, type AuditEvent } from '@/lib/api';
import { notFound } from 'next/navigation';

const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  'asset.created': { label: 'asset created', color: 'text-emerald-400' },
  'asset.updated': { label: 'asset updated', color: 'text-blue-400' },
  'version.created': { label: 'version created', color: 'text-blue-400' },
  'version.promoted': { label: 'promoted', color: 'text-emerald-400' },
  'version.archived': { label: 'archived', color: 'text-gray-500' },
  'version.rolled_back': { label: 'rolled back', color: 'text-red-400' },
  'fixture.created': { label: 'fixture added', color: 'text-gray-400' },
  'fixture.updated': { label: 'fixture updated', color: 'text-gray-400' },
  'fixture.deleted': { label: 'fixture deleted', color: 'text-yellow-400' },
  'version.rendered': { label: 'render preview', color: 'text-blue-400' },
};

function EventRow({ event }: { event: AuditEvent }) {
  const meta = EVENT_LABELS[event.event_type] ?? { label: event.event_type, color: 'text-gray-400' };
  const ts = new Date(event.occurred_at);

  return (
    <div className="flex gap-4 py-2.5 border-b border-gray-800 last:border-0">
      <div className="w-32 shrink-0 text-gray-600 text-xs font-mono">
        <div>{ts.toLocaleDateString()}</div>
        <div>{ts.toLocaleTimeString()}</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <span className={`text-xs font-medium ${meta.color}`}>{meta.label}</span>
          <span className="text-gray-600 text-xs">by {event.actor}</span>
          {event.version_id && (
            <span className="text-gray-700 text-xs font-mono">{event.version_id.slice(0, 8)}…</span>
          )}
        </div>
        {Object.keys(event.payload).length > 0 && (
          <details className="mt-1">
            <summary className="text-gray-600 text-xs cursor-pointer hover:text-gray-400">
              payload
            </summary>
            <pre className="mt-1 text-gray-500 text-xs bg-gray-950 rounded p-2 overflow-x-auto">
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
        <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
          <a href="/">assets</a>
          <span>/</span>
          <a href={`/assets/${encodeURIComponent(assetId)}`} className="hover:text-gray-300">{assetId}</a>
          <span>/</span>
          <span className="text-gray-300">audit</span>
        </div>
        <h1 className="text-lg font-semibold text-white">Audit Log</h1>
        <p className="text-gray-500 text-xs mt-0.5">Last 90 days · {events.length} events</p>
      </div>

      {events.length === 0 ? (
        <p className="text-gray-600 text-xs">No audit events yet.</p>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-lg px-4">
          {events.map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
