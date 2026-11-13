import { NextRequest, NextResponse } from 'next/server';
import {
  getActiveDiscoveryJob,
  startDiscoveryJob,
  stopDiscoveryJob,
} from '@/lib/open-marketing/discoveryManager';

export const dynamic = 'force-dynamic';

export async function GET() {
  const job = getActiveDiscoveryJob();
  return NextResponse.json(job);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    if (body.action === 'stop') {
      const job = await stopDiscoveryJob();
      return NextResponse.json({
        success: true,
        message: 'Stop signal sent to discovery worker.',
        job,
      });
    }

    // Validate browserMode if supplied
    let browserMode: 'headless' | 'headed' = 'headless';
    if (body.browserMode !== undefined && body.browserMode !== null && body.browserMode !== '') {
      const mode = String(body.browserMode).toLowerCase().trim();
      if (mode !== 'headless' && mode !== 'headed') {
        return NextResponse.json(
          { error: 'Invalid browserMode. Allowed values: "headless" or "headed".' },
          { status: 400 }
        );
      }
      browserMode = mode;
    }

    const job = await startDiscoveryJob({
      category: body.category,
      area: body.area,
      city: body.city,
      browserMode,
    });

    return NextResponse.json({
      success: true,
      message: `Discovery initiated in ${browserMode} mode for "${job.category}" in "${job.area}".`,
      job,
    });
  } catch (error: any) {
    const isConflict = error.message?.includes('already running');
    return NextResponse.json(
      { error: error.message || 'Discovery operation failed' },
      { status: isConflict ? 409 : 400 }
    );
  }
}
