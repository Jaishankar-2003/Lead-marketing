import { chromium, Browser, BrowserContext, Page } from '@playwright/test';
import { PrismaClient, JobStatus, CrmStatus } from '@prisma/client';
import { GMap } from '../../pom/gmap_pom';
import { normalizeDomain, normalizePhone, categorizeLead } from '../lib/normalization';
import path from 'path';

const prisma = new PrismaClient();

async function logJob(jobId: string, level: 'info' | 'warn' | 'error' | 'success', message: string) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);

  try {
    const job = await prisma.discoveryJob.findUnique({
      where: { id: jobId },
      select: { logs: true },
    });
    const currentLogs = Array.isArray(job?.logs) ? (job.logs as any[]) : [];
    const updatedLogs = [
      ...currentLogs,
      { timestamp: new Date().toISOString(), level, text: message },
    ].slice(-100); // Keep last 100 log lines

    await prisma.discoveryJob.update({
      where: { id: jobId },
      data: { logs: updatedLogs },
    });
  } catch (err) {
    // Ignore logging errors
  }
}

async function shouldHalt(jobId: string): Promise<'PAUSE' | 'STOP' | null> {
  const job = await prisma.discoveryJob.findUnique({
    where: { id: jobId },
    select: { status: true },
  });

  if (job?.status === JobStatus.PAUSING) return 'PAUSE';
  if (job?.status === JobStatus.STOPPING) return 'STOP';
  if (job?.status === JobStatus.PAUSED) return 'PAUSE';
  if (job?.status === JobStatus.STOPPED) return 'STOP';

  return null;
}

async function runWorker(jobId: string) {
  if (!jobId) {
    console.error('No jobId provided to worker.');
    process.exit(1);
  }

  const job = await prisma.discoveryJob.findUnique({
    where: { id: jobId },
    include: { checkpoints: true },
  });

  if (!job) {
    console.error(`DiscoveryJob ${jobId} not found.`);
    process.exit(1);
  }

  // Update status to RUNNING and store worker PID
  await prisma.discoveryJob.update({
    where: { id: jobId },
    data: {
      status: JobStatus.RUNNING,
      workerPid: process.pid,
      startedAt: job.startedAt || new Date(),
      errorMessage: null,
    },
  });

  await logJob(jobId, 'info', `Automation worker started with PID ${process.pid}`);
  await logJob(jobId, 'info', `Target Location: "${job.location}" with ${job.totalKeywords} keywords.`);

  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;
  let detailPage: Page | null = null;

  let isInterrupted = false;
  let interruptType: 'PAUSE' | 'STOP' | null = null;

  // Signal handlers
  const onSignal = async (sig: string) => {
    console.log(`Received signal ${sig}. Halting worker and persisting status...`);
    isInterrupted = true;
    interruptType = 'STOP';
    try {
      await prisma.discoveryJob.update({
        where: { id: jobId },
        data: {
          status: JobStatus.STOPPED,
          workerPid: null,
          completedAt: new Date(),
        },
      });
      await logJob(jobId, 'warn', 'Automation STOPPED. Checkpoint and leads preserved.');
    } catch (err) {
      console.error('Error saving STOPPED status on signal:', err);
    }
    if (browser) await browser.close().catch(() => {});
    await prisma.$disconnect().catch(() => {});
    process.exit(0);
  };
  process.on('SIGINT', () => onSignal('SIGINT'));
  process.on('SIGTERM', () => onSignal('SIGTERM'));

  try {
    // Initialize or inspect checkpoints
    const existingCheckpoints = new Map(job.checkpoints.map((cp) => [cp.keyword, cp]));

    for (const kw of job.selectedKeywords) {
      if (!existingCheckpoints.has(kw)) {
        const cp = await prisma.jobCheckpoint.create({
          data: {
            jobId,
            keyword: kw,
            status: 'pending',
          },
        });
        existingCheckpoints.set(kw, cp);
      }
    }

    // Launch Playwright Chromium
    await logJob(jobId, 'info', 'Launching Playwright Chromium browser session...');
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    });

    page = await context.newPage();
    detailPage = await context.newPage();

    const gmap = new GMap(page);

    // Process keywords
    for (let kIndex = 0; kIndex < job.selectedKeywords.length; kIndex++) {
      const keyword = job.selectedKeywords[kIndex];
      const checkpoint = existingCheckpoints.get(keyword);

      // Skip already completed checkpoints (resumption / recovery)
      if (checkpoint?.status === 'completed') {
        await logJob(jobId, 'info', `Skipping completed checkpoint: "${keyword}"`);
        continue;
      }

      // Check halt command before starting keyword
      const haltCheck: 'PAUSE' | 'STOP' | null = (await shouldHalt(jobId)) || interruptType;
      if (haltCheck) {
        interruptType = haltCheck;
        break;
      }

      await prisma.discoveryJob.update({
        where: { id: jobId },
        data: { currentKeyword: keyword },
      });

      await prisma.jobCheckpoint.update({
        where: { id: checkpoint!.id },
        data: { status: 'in_progress' },
      });

      const searchTerm = `${keyword} in ${job.location}`;
      await logJob(jobId, 'info', `[${kIndex + 1}/${job.selectedKeywords.length}] Searching: "${searchTerm}"`);

      let placeUrls: string[] = [];
      try {
        const feed = await gmap.searchPlaces(searchTerm);
        // Scroll feed to discover listings (unlimited by default, or bounded if maxResults specified)
        const limit = job.maxResults && job.maxResults > 0 ? job.maxResults : undefined;
        placeUrls = await gmap.scrollFeed(feed, limit);
        await logJob(jobId, 'info', `Found ${placeUrls.length} business listings for "${keyword}"`);
      } catch (err: any) {
        await logJob(jobId, 'warn', `Feed search warning for "${searchTerm}": ${err.message}`);
      }

      // Process discovered place URLs
      let kwDiscovered = 0;
      let kwSaved = 0;
      let kwDuplicates = 0;

      for (let pIndex = 0; pIndex < placeUrls.length; pIndex++) {
        // Check halt command before processing each business
        const perPlaceHalt: 'PAUSE' | 'STOP' | null = (await shouldHalt(jobId)) || interruptType;
        if (perPlaceHalt) {
          interruptType = perPlaceHalt;
          isInterrupted = true;
          break;
        }

        const url = placeUrls[pIndex];
        kwDiscovered++;

        try {
          const bizData = await gmap.extractBusinessDetails(detailPage, url);

          if (!bizData.name || !bizData.name.trim()) {
            continue;
          }

          const normDomain = normalizeDomain(bizData.website);
          const normPhone = normalizePhone(bizData.phone);

          // Deduplication check
          const duplicateConditions: any[] = [];
          if (normDomain) duplicateConditions.push({ normalizedDomain: normDomain });
          if (normPhone) duplicateConditions.push({ normalizedPhone: normPhone });

          let isDuplicate = false;
          if (duplicateConditions.length > 0) {
            const existing = await prisma.lead.findFirst({
              where: { OR: duplicateConditions },
              select: { id: true, businessName: true },
            });
            if (existing) {
              isDuplicate = true;
              kwDuplicates++;
              await logJob(
                jobId,
                'info',
                `Duplicate skipped: "${bizData.name}" matches existing lead "${existing.businessName}"`
              );
            }
          }

          if (!isDuplicate) {
            const { serviceProspect, prospectReason } = categorizeLead({
              category: bizData.category,
              businessName: bizData.name,
              website: bizData.website,
            });

            const newLead = await prisma.lead.create({
              data: {
                businessName: bizData.name.trim(),
                category: bizData.category ? bizData.category.trim() : null,
                website: bizData.website ? bizData.website.trim() : null,
                phone: bizData.phone ? bizData.phone.trim() : null,
                address: bizData.address ? bizData.address.trim() : null,
                city: job.location,
                state: 'Tamil Nadu',
                source: 'google_maps',
                sourceUrl: bizData.googleMapsUrl || url,
                rating: bizData.rating || null,
                latitude: bizData.latitude || null,
                longitude: bizData.longitude || null,
                normalizedDomain: normDomain,
                normalizedPhone: normPhone,
                crmStatus: CrmStatus.NEW,
                serviceProspect,
                prospectReason,
                jobId,
                activities: {
                  create: {
                    type: 'STATUS_CHANGE',
                    content: `Discovered and ingested via automated Playwright search: "${keyword}"`,
                  },
                },
              },
            });

            kwSaved++;
            await logJob(
              jobId,
              'success',
              `Saved [${kwSaved}]: "${newLead.businessName}" (${newLead.serviceProspect}) | Phone: ${newLead.phone || 'N/A'}`
            );
          }

          // Atomic checkpoint update
          await prisma.jobCheckpoint.update({
            where: { id: checkpoint!.id },
            data: {
              processedCount: pIndex + 1,
              lastProcessedUrl: url,
            },
          });

          // Update real-time job counters
          await prisma.discoveryJob.update({
            where: { id: jobId },
            data: {
              totalDiscovered: { increment: 1 },
              newLeadsSaved: isDuplicate ? undefined : { increment: 1 },
              duplicatesSkipped: isDuplicate ? { increment: 1 } : undefined,
            },
          });

          // Polite cooldown between business visits
          await new Promise((r) => setTimeout(r, 2000));
        } catch (err: any) {
          await logJob(jobId, 'warn', `Skipped listing on error: ${err.message}`);
          await prisma.discoveryJob.update({
            where: { id: jobId },
            data: { failedRecords: { increment: 1 } },
          });
        }
      }

      if (isInterrupted) {
        break;
      }

      // Mark keyword checkpoint completed
      await prisma.jobCheckpoint.update({
        where: { id: checkpoint!.id },
        data: { status: 'completed' },
      });

      await prisma.discoveryJob.update({
        where: { id: jobId },
        data: {
          completedKeywords: { increment: 1 },
        },
      });

      await logJob(
        jobId,
        'info',
        `Finished keyword: "${keyword}". (Saved: ${kwSaved}, Duplicates: ${kwDuplicates})`
      );
    }

    // Handle final status based on interrupts
    if (interruptType === 'PAUSE') {
      await prisma.discoveryJob.update({
        where: { id: jobId },
        data: {
          status: JobStatus.PAUSED,
          workerPid: null,
        },
      });
      await logJob(jobId, 'warn', 'Automation PAUSED. Checkpoints safely stored in PostgreSQL.');
    } else if (interruptType === 'STOP') {
      await prisma.discoveryJob.update({
        where: { id: jobId },
        data: {
          status: JobStatus.STOPPED,
          workerPid: null,
          completedAt: new Date(),
        },
      });
      await logJob(jobId, 'warn', 'Automation STOPPED. All collected leads preserved.');
    } else {
      await prisma.discoveryJob.update({
        where: { id: jobId },
        data: {
          status: JobStatus.COMPLETED,
          workerPid: null,
          completedAt: new Date(),
          currentKeyword: null,
        },
      });
      await logJob(jobId, 'success', 'Automation job COMPLETED successfully.');
    }
  } catch (err: any) {
    console.error('Fatal worker error:', err);
    await logJob(jobId, 'error', `Fatal automation error: ${err.message}`);
    await prisma.discoveryJob.update({
      where: { id: jobId },
      data: {
        status: JobStatus.FAILED,
        errorMessage: err.message,
        workerPid: null,
      },
    });
  } finally {
    if (detailPage && !detailPage.isClosed()) await detailPage.close().catch(() => {});
    if (page && !page.isClosed()) await page.close().catch(() => {});
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    await prisma.$disconnect();
    process.exit(0);
  }
}

// Entrypoint
const targetJobId = process.argv[2];
runWorker(targetJobId);
