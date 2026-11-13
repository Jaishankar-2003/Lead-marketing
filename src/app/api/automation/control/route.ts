import { NextRequest, NextResponse } from 'next/server';
import { automationManager } from '@/automation/service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, location, keywords, jobId, maxResults } = body;

    switch (action) {
      case 'START': {
        if (!location || !keywords || !Array.isArray(keywords) || keywords.length === 0) {
          return NextResponse.json(
            { success: false, error: 'Location and at least one keyword are required.' },
            { status: 400 }
          );
        }
        const job = await automationManager.startJob(location, keywords, maxResults ? parseInt(maxResults, 10) : undefined);
        return NextResponse.json({ success: true, message: 'Automation started successfully', job });
      }

      case 'PAUSE': {
        const targetId = jobId || (await automationManager.getActiveJob())?.id;
        if (!targetId) {
          return NextResponse.json({ success: false, error: 'No active job found to pause' }, { status: 400 });
        }
        const job = await automationManager.pauseJob(targetId);
        return NextResponse.json({ success: true, message: 'Pausing automation...', job });
      }

      case 'RESUME': {
        const targetId = jobId || (await automationManager.getActiveJob())?.id;
        if (!targetId) {
          return NextResponse.json({ success: false, error: 'jobId is required' }, { status: 400 });
        }
        const result = await automationManager.resumeJob(targetId);
        return NextResponse.json({ success: true, message: 'Resuming automation from checkpoint...', result });
      }

      case 'STOP': {
        const targetId = jobId || (await automationManager.getActiveJob())?.id;
        if (!targetId) {
          // If no active job found, it is already stopped
          return NextResponse.json({ success: true, message: 'No running job. Worker is idle.' });
        }
        const result = await automationManager.stopJob(targetId);
        return NextResponse.json({ success: true, message: 'Automation stopped successfully', result });
      }

      case 'RETRY': {
        if (!jobId) {
          return NextResponse.json({ success: false, error: 'jobId is required' }, { status: 400 });
        }
        const result = await automationManager.retryJob(jobId);
        return NextResponse.json({ success: true, message: 'Retrying failed keywords...', result });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unsupported action "${action}". Valid: START, PAUSE, RESUME, STOP, RETRY.` },
          { status: 400 }
        );
    }
  } catch (err: any) {
    console.error('Error in /api/automation/control:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
