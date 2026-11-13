import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { JobStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

function isPidAlive(pid: number | null | undefined): boolean {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  try {
    // Check for any currently active or running job
    let activeJob = await prisma.discoveryJob.findFirst({
      where: {
        status: {
          in: [
            JobStatus.RUNNING,
            JobStatus.PAUSING,
            JobStatus.PAUSED,
            JobStatus.PENDING,
            JobStatus.STOPPING,
          ],
        },
      },
      include: {
        checkpoints: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Auto-heal orphaned STOPPING or dead RUNNING jobs whose worker process has exited
    if (activeJob) {
      const pidRunning = isPidAlive(activeJob.workerPid);
      if (activeJob.status === JobStatus.STOPPING && !pidRunning) {
        await prisma.discoveryJob.update({
          where: { id: activeJob.id },
          data: {
            status: JobStatus.STOPPED,
            workerPid: null,
            completedAt: new Date(),
          },
        });
        activeJob = null;
      } else if (activeJob.status === JobStatus.RUNNING && activeJob.workerPid && !pidRunning) {
        await prisma.discoveryJob.update({
          where: { id: activeJob.id },
          data: {
            status: JobStatus.STOPPED,
            workerPid: null,
            completedAt: new Date(),
          },
        });
        activeJob = null;
      }
    }

    // Recent job history (last 20 jobs)
    const recentJobs = await prisma.discoveryJob.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        checkpoints: true,
      },
    });

    return NextResponse.json({
      success: true,
      activeJob: activeJob || null,
      recentJobs,
    });
  } catch (err: any) {
    console.error('Error fetching automation status:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
