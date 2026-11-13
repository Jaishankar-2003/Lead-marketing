import { NextResponse } from 'next/server';
import { getActiveDiscoveryJob } from '@/lib/open-marketing/discoveryManager';

export const dynamic = 'force-dynamic';

export async function GET() {
  const job = getActiveDiscoveryJob();
  return NextResponse.json(job);
}
