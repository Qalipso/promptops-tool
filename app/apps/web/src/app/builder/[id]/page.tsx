import { BuilderWizard } from '@/components/builder/BuilderWizard';
import { DemoNotice } from '@/components/ui/DemoNotice';
import { IS_DEMO } from '@/lib/demo';
import { type BuilderSpec, emptySpec } from '@promptops/builder';

const API_URL = process.env.PROMPTOPS_API_URL ?? 'http://127.0.0.1:3013';
const TOKEN = process.env.PROMPTOPS_API_TOKEN ?? '';

async function getSpec(id: string): Promise<BuilderSpec> {
  try {
    const res = await fetch(`${API_URL}/api/v0/assets/${encodeURIComponent(id)}/builder-spec`, {
      headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {},
      cache: 'no-store',
    });
    if (!res.ok) return emptySpec();
    const json = (await res.json()) as { success: boolean; data: BuilderSpec | null };
    return json.data ?? emptySpec();
  } catch {
    // API unreachable → start from an empty spec instead of crashing the page.
    return emptySpec();
  }
}

export default async function BuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const assetId = decodeURIComponent(id);
  if (IS_DEMO) return <DemoNotice feature="Agent builder" />;
  const spec = await getSpec(assetId);

  return (
    <div>
      <div className="flex items-center gap-2 text-muted text-xs mb-1">
        <a href="/">assets</a>
        <span>/</span>
        <a href={`/assets/${encodeURIComponent(assetId)}`}>{assetId}</a>
        <span>/</span>
        <span className="text-text">builder</span>
      </div>
      <h1 className="text-lg font-semibold text-text mb-6">Agent builder</h1>
      <BuilderWizard assetId={assetId} initialSpec={spec} />
    </div>
  );
}
