import { prisma } from '@/lib/prisma';
import { getEmailProvider } from '@/outreach/email-provider';
import { createUnsubscribeToken, sanitizeErrorMessage } from '@/lib/outreach-security';
import { plainTextToHtml, renderProfessionalHtmlEmail, stripHtml } from '@/lib/outreach-utils';

type ControlSignal = 'NONE' | 'PAUSE' | 'STOP';

interface CampaignControlState {
  running: boolean;
  signal: ControlSignal;
}

const globalForCampaigns = globalThis as unknown as {
  activeCampaignControls?: Map<string, CampaignControlState>;
};

function getControlsMap(): Map<string, CampaignControlState> {
  if (!globalForCampaigns.activeCampaignControls) {
    globalForCampaigns.activeCampaignControls = new Map();
  }
  return globalForCampaigns.activeCampaignControls;
}

async function interruptibleSleep(ms: number, campaignId: string): Promise<ControlSignal> {
  const step = 200;
  let elapsed = 0;
  const controls = getControlsMap();

  while (elapsed < ms) {
    const state = controls.get(campaignId);
    if (state && state.signal !== 'NONE') {
      return state.signal;
    }
    const wait = Math.min(step, ms - elapsed);
    await new Promise((resolve) => setTimeout(resolve, wait));
    elapsed += wait;
  }

  const state = controls.get(campaignId);
  return state?.signal || 'NONE';
}

export async function recomputeCampaignCounts(campaignId: string) {
  const grouped = await prisma.outreachRecipient.groupBy({
    by: ['status'],
    where: { campaignId },
    _count: { _all: true },
  });

  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  let pendingCount = 0;
  let totalRecipients = 0;

  for (const row of grouped) {
    const count = row._count._all;
    totalRecipients += count;
    if (row.status === 'SENT' || row.status === 'CONFIRMED_SENT') {
      sentCount += count;
    } else if (row.status === 'FAILED') {
      failedCount += count;
    } else if (row.status === 'SKIPPED') {
      skippedCount += count;
    } else {
      pendingCount += count;
    }
  }

  await prisma.outreachCampaign.update({
    where: { id: campaignId },
    data: {
      totalRecipients,
      sentCount,
      failedCount,
      skippedCount,
      pendingCount,
    },
  });

  return { totalRecipients, sentCount, failedCount, skippedCount, pendingCount };
}

async function executeEmailCampaignLoop(campaignId: string, baseOrigin: string) {
  const controls = getControlsMap();
  const state: CampaignControlState = { running: true, signal: 'NONE' };
  controls.set(campaignId, state);

  try {
    const campaign = await prisma.outreachCampaign.findUnique({
      where: { id: campaignId },
      include: { template: true },
    });
    if (!campaign) return;

    const provider = getEmailProvider();
    const cfgStatus = provider.getConfigStatus();
    if (!cfgStatus.configured) {
      await prisma.outreachCampaign.update({
        where: { id: campaignId },
        data: {
          status: 'PAUSED',
          errorMessage: `SMTP is not configured (missing ${cfgStatus.missingVars.join(', ')}). Configure Gmail SMTP credentials in .env and click Resume.`,
        },
      });
      return;
    }

    const delayMs = Math.max(250, Math.min(60000, campaign.delayMs || 2500));
    const batchSize = Math.max(1, Math.min(50, campaign.batchSize || 10));
    let processedInCurrentBatch = 0;

    while (true) {
      // Check in-memory signal first
      if (state.signal === 'PAUSE') {
        await prisma.outreachCampaign.update({
          where: { id: campaignId },
          data: { status: 'PAUSED' },
        });
        break;
      }
      if (state.signal === 'STOP') {
        await prisma.outreachRecipient.updateMany({
          where: { campaignId, status: { in: ['PENDING', 'SENDING'] } },
          data: { status: 'SKIPPED', errorDetails: 'Campaign stopped by user' },
        });
        await recomputeCampaignCounts(campaignId);
        await prisma.outreachCampaign.update({
          where: { id: campaignId },
          data: { status: 'STOPPED', completedAt: new Date() },
        });
        break;
      }

      // Check DB campaign state too in case another request updated it
      const freshCampaign = await prisma.outreachCampaign.findUnique({
        where: { id: campaignId },
        select: { status: true },
      });
      if (!freshCampaign || freshCampaign.status === 'PAUSED' || freshCampaign.status === 'STOPPED') {
        break;
      }

      const nextRecipient = await prisma.outreachRecipient.findFirst({
        where: { campaignId, status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        include: {
          lead: {
            select: {
              id: true,
              businessName: true,
              crmStatus: true,
              doNotContact: true,
            },
          },
        },
      });

      if (!nextRecipient) {
        await recomputeCampaignCounts(campaignId);
        await prisma.outreachCampaign.update({
          where: { id: campaignId },
          data: { status: 'COMPLETED', completedAt: new Date(), errorMessage: null },
        });
        break;
      }

      // Re-verify opt-out right before sending
      if (nextRecipient.lead.doNotContact) {
        await prisma.outreachRecipient.update({
          where: { id: nextRecipient.id },
          data: {
            status: 'SKIPPED',
            errorDetails: 'Lead opted out (Do Not Contact) prior to send.',
          },
        });
        await recomputeCampaignCounts(campaignId);
        continue;
      }

      // Mark as SENDING atomically to prevent duplicate workers from picking up the same row
      const lock = await prisma.outreachRecipient.updateMany({
        where: { id: nextRecipient.id, status: 'PENDING' },
        data: { status: 'SENDING', attempts: { increment: 1 } },
      });
      if (lock.count === 0) {
        continue;
      }

      const subject = nextRecipient.renderedSubject || campaign.subject || 'Hello from Jai Shankar';
      const bodyTextRaw = nextRecipient.renderedBody;
      const unsubToken = createUnsubscribeToken(nextRecipient.leadId, nextRecipient.recipient);
      const unsubscribeUrl = `${baseOrigin.replace(/\/$/, '')}/unsubscribe?token=${encodeURIComponent(unsubToken)}`;

      const compiled = renderProfessionalHtmlEmail({
        subject,
        bodyText: bodyTextRaw,
        lead: nextRecipient.lead,
        recipientEmail: nextRecipient.recipient,
        unsubscribeUrl,
        templateName: campaign.template?.name,
        category: campaign.template?.category,
      });

      let result = await provider.sendEmail({
        to: nextRecipient.recipient,
        subject,
        text: compiled.text,
        html: compiled.html,
        unsubscribeUrl,
      });

      // Safe single retry on temporary network/4xx transient error
      if (!result.success && result.isTemporary && !result.isQuotaError && !result.isAuthError) {
        await interruptibleSleep(1500, campaignId);
        result = await provider.sendEmail({
          to: nextRecipient.recipient,
          subject,
          text: compiled.text,
          html: compiled.html,
          unsubscribeUrl,
        });
      }

      if (result.success) {
        await prisma.$transaction(async (tx) => {
          await tx.outreachRecipient.update({
            where: { id: nextRecipient.id },
            data: {
              status: 'SENT',
              sentAt: new Date(),
              errorDetails: null,
            },
          });

          await tx.activityLog.create({
            data: {
              leadId: nextRecipient.leadId,
              type: 'EMAIL',
              channel: 'EMAIL',
              recipient: nextRecipient.recipient,
              subject,
              templateId: campaign.templateId,
              status: 'SENT',
              content: `Sent campaign email "${subject}" (${campaign.name}) to ${nextRecipient.recipient}`,
              metadata: {
                campaignId: campaign.id,
                messageId: result.messageId || null,
              },
            },
          });

          const nextCrmStatus =
            nextRecipient.lead.crmStatus === 'NEW' || nextRecipient.lead.crmStatus === 'RESEARCHED'
              ? 'CONTACTED'
              : nextRecipient.lead.crmStatus;

          await tx.lead.update({
            where: { id: nextRecipient.leadId },
            data: {
              lastContactedAt: new Date(),
              crmStatus: nextCrmStatus,
            },
          });
        });
      } else {
        const sanitizedErr = sanitizeErrorMessage(result.errorMessage || 'Failed to send email');

        // Pause campaign cleanly on auth or quota exhaustion rather than failing every remaining lead
        if (result.isAuthError || result.isQuotaError || result.unconfigured) {
          await prisma.outreachRecipient.update({
            where: { id: nextRecipient.id },
            data: {
              status: 'PENDING',
              errorDetails: sanitizedErr,
            },
          });
          await recomputeCampaignCounts(campaignId);
          await prisma.outreachCampaign.update({
            where: { id: campaignId },
            data: {
              status: 'PAUSED',
              errorMessage: sanitizedErr,
            },
          });
          break;
        }

        await prisma.$transaction(async (tx) => {
          await tx.outreachRecipient.update({
            where: { id: nextRecipient.id },
            data: {
              status: 'FAILED',
              errorDetails: sanitizedErr,
            },
          });

          await tx.activityLog.create({
            data: {
              leadId: nextRecipient.leadId,
              type: 'EMAIL',
              channel: 'EMAIL',
              recipient: nextRecipient.recipient,
              subject,
              templateId: campaign.templateId,
              status: 'FAILED',
              errorDetails: sanitizedErr,
              content: `Campaign email "${subject}" (${campaign.name}) failed for ${nextRecipient.recipient}: ${sanitizedErr}`,
              metadata: { campaignId: campaign.id },
            },
          });
        });
      }

      await recomputeCampaignCounts(campaignId);
      processedInCurrentBatch += 1;

      // Throttle interval between individual emails + extra batch breather when finishing a batch
      const waitTime = processedInCurrentBatch >= batchSize ? Math.max(delayMs, 3000) : delayMs;
      if (processedInCurrentBatch >= batchSize) {
        processedInCurrentBatch = 0;
      }

      const signal = await interruptibleSleep(waitTime, campaignId);
      if (signal === 'PAUSE' || signal === 'STOP') {
        continue; // top of loop handles final DB transition cleanly
      }
    }
  } catch (error) {
    console.error(`Campaign runner error (${campaignId}):`, error);
    await prisma.outreachCampaign
      .update({
        where: { id: campaignId },
        data: {
          status: 'FAILED',
          errorMessage: sanitizeErrorMessage(error),
        },
      })
      .catch(() => {});
  } finally {
    controls.delete(campaignId);
  }
}

export async function startOrResumeEmailCampaign(campaignId: string, baseOrigin = 'http://localhost:3000') {
  const controls = getControlsMap();
  const existing = controls.get(campaignId);
  if (existing?.running) {
    existing.signal = 'NONE';
    return;
  }

  // Recover any stale SENDING rows from an interrupted process back to PENDING before resuming
  await prisma.outreachRecipient.updateMany({
    where: { campaignId, status: 'SENDING' },
    data: { status: 'PENDING' },
  });

  await prisma.outreachCampaign.update({
    where: { id: campaignId },
    data: {
      status: 'RUNNING',
      errorMessage: null,
      startedAt: new Date(),
    },
  });

  void executeEmailCampaignLoop(campaignId, baseOrigin);
}

export async function pauseEmailCampaign(campaignId: string) {
  const controls = getControlsMap();
  const existing = controls.get(campaignId);
  if (existing) {
    existing.signal = 'PAUSE';
  }
  await prisma.outreachCampaign.update({
    where: { id: campaignId },
    data: { status: 'PAUSED' },
  });
}

export async function stopEmailCampaign(campaignId: string) {
  const controls = getControlsMap();
  const existing = controls.get(campaignId);
  if (existing) {
    existing.signal = 'STOP';
  } else {
    // Not currently running in memory (e.g., paused or stale): finalize immediately
    await prisma.outreachRecipient.updateMany({
      where: { campaignId, status: { in: ['PENDING', 'SENDING'] } },
      data: { status: 'SKIPPED', errorDetails: 'Campaign stopped by user' },
    });
    await recomputeCampaignCounts(campaignId);
    await prisma.outreachCampaign.update({
      where: { id: campaignId },
      data: { status: 'STOPPED', completedAt: new Date() },
    });
  }
}

