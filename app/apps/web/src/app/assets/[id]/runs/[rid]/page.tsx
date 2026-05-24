import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { redirect } from 'next/navigation';

export default async function RunDetailRemovedPage({
  params,
}: {
  params: Promise<{ id: string; rid: string }>;
}) {
  const { id } = await params;
  const assetId = decodeURIComponent(id);

  const asset = await api.asset(assetId).catch(() => null);
  if (!asset) notFound();

  redirect(`/assets/${encodeURIComponent(assetId)}/runs`);
}
