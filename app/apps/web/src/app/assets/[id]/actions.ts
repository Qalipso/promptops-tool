'use server';

import { api, type Asset } from '@/lib/api';
import { revalidatePath } from 'next/cache';

export async function updateAssetAction(
  assetId: string,
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const description = (formData.get('description') as string | null) ?? '';
  const tagsRaw = (formData.get('tags') as string | null) ?? '';
  const lifecycle = (formData.get('lifecycle') as Asset['lifecycle'] | null) ?? 'active';

  const tags = tagsRaw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  try {
    await api.updateAsset(assetId, { description, tags, lifecycle });
    revalidatePath(`/assets/${encodeURIComponent(assetId)}`);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Update failed' };
  }
}
