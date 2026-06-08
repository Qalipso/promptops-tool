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
    let message = text;
    try {
      const json = JSON.parse(text) as { error?: { message?: string }; message?: string };
      message = json.error?.message ?? json.message ?? text;
    } catch {
      // use raw text
    }
    throw new Error(message);
  }
  return res.json() as Promise<{ data: unknown }>;
}

export async function createVersionAction(
  assetId: string,
  _prev: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const version = (formData.get('version') as string).trim();
  const system = (formData.get('system') as string).trim();
  const user = (formData.get('user') as string).trim();
  const changelog = (formData.get('changelog') as string).trim();
  const vcRaw = formData.get('variable_contract_snapshot') as string | null;

  if (!version) return { error: 'Version string is required' };
  if (!user) return { error: 'User prompt is required' };

  let variable_contract_snapshot: unknown[] = [];
  if (vcRaw) {
    try {
      variable_contract_snapshot = JSON.parse(vcRaw) as unknown[];
    } catch {
      // silently ignore malformed JSON — empty snapshot is safe
    }
  }

  let versionId: string;
  try {
    const res = await apiPost(`/api/v0/assets/${assetId}/versions`, {
      version,
      body: { system: system || null, user },
      variable_contract_snapshot,
      model_config_snapshot: {},
      output_contract_snapshot: {},
      changelog: changelog || undefined,
    });
    versionId = (res.data as { id: string }).id;
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Create failed' };
  }

  revalidatePath(`/assets/${assetId}`);
  redirect(`/assets/${encodeURIComponent(assetId)}/versions/${versionId}`);
}
