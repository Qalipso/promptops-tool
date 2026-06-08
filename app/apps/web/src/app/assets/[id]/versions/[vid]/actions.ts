'use server';

import type { RenderResult } from '@/lib/api';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const API_URL = process.env.PROMPTOPS_API_URL ?? 'http://127.0.0.1:3013';
const TOKEN = process.env.PROMPTOPS_API_TOKEN ?? '';

async function apiPost(path: string, body?: unknown) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : null,
  });
  if (!res.ok) {
    const text = await res.text();
    let message = text;
    try {
      const json = JSON.parse(text) as { error?: { message?: string }; message?: string };
      message = json.error?.message ?? json.message ?? text;
    } catch {
      // use raw text
    }
    throw new Error(message);
  }
  return res.json();
}

export async function promoteAction(
  assetId: string,
  versionId: string,
  _prev: { error?: string } | null,
): Promise<{ error?: string }> {
  try {
    await apiPost(`/api/v0/assets/${assetId}/versions/${versionId}/promote`);
    revalidatePath(`/assets/${assetId}`);
    revalidatePath(`/assets/${assetId}/versions/${versionId}`);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Promote failed' };
  }
  redirect(`/assets/${encodeURIComponent(assetId)}`);
}

export async function rollbackAction(
  assetId: string,
  justification: string,
): Promise<{ error?: string }> {
  try {
    await apiPost(`/api/v0/assets/${assetId}/rollback`, { justification });
    revalidatePath(`/assets/${assetId}`);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Rollback failed' };
  }
  redirect(`/assets/${encodeURIComponent(assetId)}`);
}

export async function renderPreviewAction(
  assetId: string,
  versionId: string,
  _prev: { error?: string; result?: RenderResult } | null,
  formData: FormData,
): Promise<{ error?: string; result?: RenderResult }> {
  const manualInputsJson = (formData.get('manual_inputs_json') as string | null) ?? '{}';

  let inputs: Record<string, unknown>;
  try {
    inputs = JSON.parse(manualInputsJson) as Record<string, unknown>;
  } catch {
    return { error: 'Malformed manual inputs JSON' };
  }

  try {
    const json = await apiPost(`/api/v0/assets/${assetId}/versions/${versionId}/render`, {
      inputs,
      save: false,
    });
    return { result: (json as { data: RenderResult }).data };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Render failed' };
  }
}
