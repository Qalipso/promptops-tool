import { NextResponse } from 'next/server';

const API_URL = process.env.PROMPTOPS_API_URL ?? 'http://localhost:3013';

export async function GET() {
  const res = await fetch(`${API_URL}/api/v0/openapi.json`, { next: { revalidate: 60 } });
  const data = await res.json();
  return NextResponse.json(data);
}
