import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { JobStatus } from '@prisma/client';

class AutomationManager {
  private activeWorkers = new Map<string, ChildProcess>();

  async getActiveJob(): Promise<any | null> {
    return prisma.discoveryJob.findFirst({
      where: {
        status: {
          in: [JobStatus.RUNNING, JobStatus.PAUSING, JobStatus.STOPPING],
        },
      },
      include: {
        checkpoints: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async startJob(location: string, keywords: string[], maxResults?: number): Promise<any> {
    if (!keywords || keywords.length === 0) {
      throw new Error('At least one keyword must be selected');
    }

    // Check if an active job is already running
    const active = await this.getActiveJob();
    if (active) {
      throw new Error(`An automation job is already running (Job ID: ${active.id}, Status: ${active.status}). Pause or stop it first.`);
    }

    // Create the job record in PostgreSQL with initial keyword checkpoints
    const job = await prisma.discoveryJob.create({
      data: {
        location: location.trim(),
        selectedKeywords: keywords,
        maxResults: maxResults && maxResults > 0 ? maxResults : null,
        totalKeywords: keywords.length,
        completedKeywords: 0,
        status: JobStatus.PENDING,
        startedAt: new Date(),
        logs: [
          {
            timestamp: new Date().toISOString(),
            level: 'info',
            text: `Job initialized with ${keywords.length} keywords for "${location}".`,
          },
        ],
        checkpoints: {
          create: keywords.map((kw) => ({
            keyword: kw,
            status: 'pending',
          })),
        },
      },
    });

    this.spawnWorker(job.id);
    return job;
  }

  async pauseJob(jobId: string): Promise<any> {
    const job = await prisma.discoveryJob.findUnique({ where: { id: jobId } });
    if (!job) throw new Error('Job not found');

    if (job.status !== JobStatus.RUNNING && job.status !== JobStatus.PENDING) {
      throw new Error(`Cannot pause job in status "${job.status}". Must be RUNNING or PENDING.`);
    }

    // Mark as PAUSING so the worker will cleanly save checkpoints and pause
    const updated = await prisma.discoveryJob.update({
      where: { id: jobId },
      data: { status: JobStatus.PAUSING },
    });

    return updated;
  }

  async resumeJob(jobId: string): Promise<any> {
    const job = await prisma.discoveryJob.findUnique({ where: { id: jobId } });
    if (!job) throw new Error('Job not found');

    if (job.status !== JobStatus.PAUSED && job.status !== JobStatus.FAILED) {
      throw new Error(`Cannot resume job in status "${job.status}". Must be PAUSED or FAILED.`);
    }

    const active = await this.getActiveJob();
    if (active && active.id !== jobId) {
      throw new Error(`Another job (${active.id}) is already running.`);
    }

    await prisma.discoveryJob.update({
      where: { id: jobId },
      data: {
        status: JobStatus.RUNNING,
        errorMessage: null,
      },
    });

    this.spawnWorker(jobId);
    return { success: true, message: 'Job resumed from last safe checkpoint.' };
  }

  async stopJob(jobId: string): Promise<any> {
    const job = await prisma.discoveryJob.findUnique({ where: { id: jobId } });
    if (!job) throw new Error('Job not found');

    if (
      job.status !== JobStatus.RUNNING &&
      job.status !== JobStatus.PAUSING &&
      job.status !== JobStatus.PENDING &&
      job.status !== JobStatus.STOPPING
    ) {
      // Already stopped, completed or failed
      return { success: true, message: `Job is already in status ${job.status}`, job };
    }

    // Set status to STOPPING
    await prisma.discoveryJob.update({
      where: { id: jobId },
      data: { status: JobStatus.STOPPING },
    });

    const child = this.activeWorkers.get(jobId);
    let signalSent = false;

    if (child && !child.killed) {
      try {
        child.kill('SIGTERM');
        signalSent = true;
      } catch (err) {
        console.error('Failed to send SIGTERM to worker child:', err);
      }
    }

    // Fallback: check workerPid from DB if in-memory child is not found (e.g. server restart)
    if (!signalSent && job.workerPid) {
      try {
        process.kill(job.workerPid, 0); // Check if process is still running
        process.kill(job.workerPid, 'SIGTERM');
        signalSent = true;
      } catch {
        // Process is already dead
      }
    }

    // Wait for the worker process to exit cleanly (max 2 seconds, then SIGKILL)
    if (child && !child.killed) {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(() => {
          try {
            if (!child.killed) child.kill('SIGKILL');
          } catch {}
          resolve();
        }, 1500);

        child.once('exit', () => {
          clearTimeout(timer);
          resolve();
        });
      });
    }

    // Ensure status is marked as STOPPED in the database so the UI returns to IDLE
    const stoppedJob = await prisma.discoveryJob.update({
      where: { id: jobId },
      data: {
        status: JobStatus.STOPPED,
        workerPid: null,
        completedAt: new Date(),
      },
    });

    this.activeWorkers.delete(jobId);

    return { success: true, message: 'Automation stopped successfully. All collected leads preserved.', job: stoppedJob };
  }

  async retryJob(jobId: string): Promise<any> {
    const job = await prisma.discoveryJob.findUnique({
      where: { id: jobId },
      include: { checkpoints: true },
    });
    if (!job) throw new Error('Job not found');

    // Reset failed checkpoints to pending
    await prisma.jobCheckpoint.updateMany({
      where: {
        jobId,
        status: 'failed',
      },
      data: { status: 'pending' },
    });

    await prisma.discoveryJob.update({
      where: { id: jobId },
      data: {
        status: JobStatus.RUNNING,
        errorMessage: null,
      },
    });

    this.spawnWorker(jobId);
    return { success: true, message: 'Retry initiated.' };
  }

  private spawnWorker(jobId: string) {
    const runnerScript = path.join(process.cwd(), 'src', 'automation', 'runner.ts');
    const child = spawn('npx', ['tsx', runnerScript, jobId], {
      cwd: process.cwd(),
      env: { ...process.env, FORCE_COLOR: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    });

    this.activeWorkers.set(jobId, child);

    child.stdout?.on('data', (data) => {
      process.stdout.write(`[Worker ${jobId}]: ${data}`);
    });

    child.stderr?.on('data', (data) => {
      process.stderr.write(`[Worker ${jobId} Error]: ${data}`);
    });

    child.on('exit', async (code, signal) => {
      console.log(`[Worker ${jobId}] exited with code ${code}, signal ${signal}`);
      this.activeWorkers.delete(jobId);

      // Guard: Ensure database status is finalized if worker exited while STOPPING or RUNNING
      try {
        const currentJob = await prisma.discoveryJob.findUnique({
          where: { id: jobId },
          select: { status: true },
        });

        if (currentJob?.status === JobStatus.STOPPING || (signal === 'SIGTERM' && currentJob?.status === JobStatus.RUNNING)) {
          await prisma.discoveryJob.update({
            where: { id: jobId },
            data: {
              status: JobStatus.STOPPED,
              workerPid: null,
              completedAt: new Date(),
            },
          });
        }
      } catch (err) {
        console.error(`Failed to update job ${jobId} status on exit:`, err);
      }
    });
  }
}

export const automationManager = new AutomationManager();
