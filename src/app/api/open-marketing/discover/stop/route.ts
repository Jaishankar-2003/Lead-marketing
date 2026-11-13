import { NextResponse } from 'next/server';
import { stopDiscoveryJob } from '@/lib/open-marketing/discoveryManager';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const job = await stopDiscoveryJob();
    return NextResponse.json({
      success: true,
      message: 'Stop signal dispatched to active discovery process.',
      job,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to stop discovery' }, { status: 500 });
  }
}
