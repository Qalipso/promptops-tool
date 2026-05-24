import { notFound } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { DiffView } from './DiffView';
import { VersionPicker } from './VersionPicker';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ v1?: string; v2?: string }>;
}

export default async function DiffPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { v1: v1Id, v2: v2Id } = await searchParams;

  // Always fetch asset + all versions
  const [asset, versions] = await Promise.all([
    api.asset(id).catch(() => null),
    api.versions(id).catch(() => [] as Awaited<ReturnType<typeof api.versions>>),
  ]);

  if (!asset) notFound();

  const breadcrumb = (
    <nav className="text-xs text-zinc-500 mb-6 flex gap-1 items-center">
      <Link href="/" className="hover:text-zinc-300">assets</Link>
      <span>/</span>
      <Link href={`/assets/${id}`} className="hover:text-zinc-300">{id}</Link>
      <span>/</span>
      <span className="text-zinc-300">diff</span>
    </nav>
  );

  // No params — show version picker
  if (!v1Id || !v2Id) {
    return (
      <main className="max-w-4xl mx-auto px-6 py-10">
        {breadcrumb}
        <h1 className="text-xl font-semibold text-zinc-100 mb-6">Compare versions</h1>
        {versions.length < 1 ? (
          <p className="text-zinc-500 text-sm">No versions yet.</p>
        ) : (
          <VersionPicker assetId={id} versions={versions} />
        )}
      </main>
    );
  }

  // Fetch both versions in parallel
  const [v1, v2] = await Promise.all([
    api.version(id, v1Id).catch(() => null),
    api.version(id, v2Id).catch(() => null),
  ]);

  if (!v1 || !v2) {
    return (
      <main className="max-w-4xl mx-auto px-6 py-10">
        {breadcrumb}
        <div className="rounded border border-red-700/40 bg-red-900/20 px-5 py-4 text-red-300 text-sm mb-4">
          One or both versions not found.
        </div>
        <Link href={`/assets/${id}/diff`} className="text-indigo-400 hover:text-indigo-300 text-sm">
          Back to version picker
        </Link>
      </main>
    );
  }

  function pp(val: unknown) {
    return JSON.stringify(val, null, 2);
  }

  const v1Data = {
    id: v1.id,
    version: v1.version,
    systemPrompt: v1.body.system ?? '',
    userPrompt: v1.body.user,
    variableContract: pp(v1.variable_contract_snapshot),
    modelConfig: pp(v1.model_config_snapshot),
    changelog: v1.changelog ?? '',
  };

  const v2Data = {
    id: v2.id,
    version: v2.version,
    systemPrompt: v2.body.system ?? '',
    userPrompt: v2.body.user,
    variableContract: pp(v2.variable_contract_snapshot),
    modelConfig: pp(v2.model_config_snapshot),
    changelog: v2.changelog ?? '',
  };

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      {breadcrumb}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-zinc-100">
          Comparing{' '}
          <span className="font-mono text-indigo-400">v{v1.version}</span>
          {' '}→{' '}
          <span className="font-mono text-indigo-400">v{v2.version}</span>
        </h1>
        <Link
          href={`/assets/${id}/diff`}
          className="text-xs text-zinc-500 hover:text-zinc-300"
        >
          Change versions
        </Link>
      </div>

      {/* Version metadata strip */}
      <div className="grid grid-cols-2 gap-1 mb-8 text-xs font-mono text-zinc-500">
        <div className="bg-zinc-900 rounded-tl rounded-bl px-4 py-2 border border-zinc-800">
          <span className="text-zinc-300">{v1.version}</span>
          {' · '}
          <span className={stateCls(v1.state)}>{v1.state}</span>
          {' · '}etag {v1.etag}
        </div>
        <div className="bg-zinc-900 rounded-tr rounded-br px-4 py-2 border border-zinc-800">
          <span className="text-zinc-300">{v2.version}</span>
          {' · '}
          <span className={stateCls(v2.state)}>{v2.state}</span>
          {' · '}etag {v2.etag}
        </div>
      </div>

      <DiffView v1={v1Data} v2={v2Data} />
    </main>
  );
}

function stateCls(state: string) {
  const map: Record<string, string> = {
    active: 'text-green-400',
    draft: 'text-blue-400',
    previous: 'text-yellow-400',
    archived: 'text-zinc-600',
  };
  return map[state] ?? 'text-zinc-400';
}
