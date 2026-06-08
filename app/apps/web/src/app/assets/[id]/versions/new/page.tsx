import { DemoNotice } from '@/components/ui/DemoNotice';
import { api } from '@/lib/api';
import { IS_DEMO } from '@/lib/demo';
import { notFound } from 'next/navigation';
import { NewVersionForm } from './NewVersionForm';

export default async function NewVersionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const assetId = decodeURIComponent(id);
  if (IS_DEMO) return <DemoNotice feature="Creating versions" />;

  const [asset, versions] = await Promise.all([
    api.asset(assetId).catch(() => null),
    api.versions(assetId).catch(() => []),
  ]);

  if (!asset) notFound();

  return (
    <NewVersionForm
      assetId={assetId}
      versions={versions}
      variableContract={asset.variable_contract ?? []}
    />
  );
}
