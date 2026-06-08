'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const API_URL = process.env.PROMPTOPS_API_URL ?? 'http://127.0.0.1:3013';
const TOKEN = process.env.PROMPTOPS_API_TOKEN ?? '';

async function apiPost(path: string, body: unknown) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json();
}

export async function createAssetAction(
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const id = (formData.get('id') as string).trim();
  const description = (formData.get('description') as string).trim();
  const owner = (formData.get('owner') as string).trim();
  const tagsRaw = (formData.get('tags') as string).trim();
  const lifecycle = (formData.get('lifecycle') as string) || 'active';

  const tags = tagsRaw
    ? tagsRaw
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  if (!id) return { error: 'Asset ID is required' };

  try {
    await apiPost('/api/v0/assets', {
      id,
      description: description || undefined,
      owner: owner || undefined,
      tags,
      lifecycle,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Create failed' };
  }

  revalidatePath('/');
  redirect(`/assets/${encodeURIComponent(id)}`);
}
