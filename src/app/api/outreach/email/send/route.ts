import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  isValidEmail,
  plainTextToHtml,
  renderProfessionalHtmlEmail,
  renderTemplate,
  stripHtml,
} from '@/lib/outreach-utils';
import {
  checkRateLimit,
  createUnsubscribeToken,
  sanitizeErrorMessage,
} from '@/lib/outreach-security';
import { getEmailProvider } from '@/outreach/email-provider';

export const dynamic = 'force-dynamic';

const globalForIdempotency = globalThis as unknown as {
  singleEmailIdempotency?: Map<string, { timestamp: number; response: unknown }>;
};

function getIdempotencyCache() {
  if (!globalForIdempotency.singleEmailIdempotency) {
    globalForIdempotency.singleEmailIdempotency = new Map();
  }
  return globalForIdempotency.singleEmailIdempotency;
}

export async function POST(request: NextRequest) {
  try {
    const rl = checkRateLimit('single-email-send', 30, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded for email sending. Please slow down.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const leadId = typeof body.leadId === 'string' ? body.leadId.trim() : '';
    const recipient = typeof body.to === 'string' ? body.to.trim() : '';
    const rawSubject = typeof body.subject === 'string' ? body.subject.trim() : '';
    const rawBody = typeof body.body === 'string' ? body.body.trim() : '';
    const templateId = typeof body.templateId === 'string' && body.templateId.trim() ? body.templateId.trim() : null;
    const isHtml = Boolean(body.isHtml);
    const confirmed = body.confirmed === true;
    const idempotencyKey =
      typeof body.idempotencyKey === 'string' && body.idempotencyKey.trim()
        ? body.idempotencyKey.trim()
        : null;

    if (!confirmed) {
      return NextResponse.json(
        { success: false, error: 'Explicit confirmation (confirmed: true) is required before sending email.' },
        { status: 400 }
      );
    }

    if (!leadId || !recipient || !rawSubject || !rawBody) {
      return NextResponse.json(
        { success: false, error: 'leadId, to, subject, and body are required.' },
        { status: 400 }
      );
    }

    if (!isValidEmail(recipient)) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid recipient email address.' },
        { status: 400 }
      );
    }

    // Deduplicate retried identical requests
    if (idempotencyKey) {
      const cache = getIdempotencyCache();
      const cached = cache.get(idempotencyKey);
      if (cached && Date.now() - cached.timestamp < 5 * 60_000) {
        return NextResponse.json(cached.response);
      }
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found.' }, { status: 404 });
    }

    if (lead.doNotContact) {
      return NextResponse.json(
        {
          success: false,
          error: 'This lead is marked Do Not Contact / Unsubscribed. Clear Do Not Contact status before sending outreach.',
        },
        { status: 403 }
      );
    }

    const subject = renderTemplate(rawSubject, lead, { email: recipient });
    const renderedBody = renderTemplate(rawBody, lead, { email: recipient });

    const origin =
      process.env.APP_BASE_URL?.trim() ||
      request.headers.get('origin') ||
      `http://${request.headers.get('host') || 'localhost:3000'}`;
    const unsubToken = createUnsubscribeToken(lead.id, recipient);
    const unsubscribeUrl = `${origin.replace(/\/$/, '')}/unsubscribe?token=${encodeURIComponent(unsubToken)}`;

    let templateName: string | undefined;
    let templateCategory: string | undefined;
    if (templateId) {
      const tpl = await prisma.emailTemplate.findUnique({
        where: { id: templateId },
        select: { name: true, category: true },
      });
      if (tpl) {
        templateName = tpl.name;
        templateCategory = tpl.category;
      }
    }

    const compiled = renderProfessionalHtmlEmail({
      subject,
      bodyText: renderedBody,
      lead,
      recipientEmail: recipient,
      unsubscribeUrl,
      templateName,
      category: templateCategory,
    });

    const provider = getEmailProvider();
    const sendResult = await provider.sendEmail({
      to: recipient,
      subject,
      text: compiled.text,
      html: compiled.html,
      unsubscribeUrl,
    });

    if (sendResult.success) {
      const nextStatus =
        lead.crmStatus === 'NEW' || lead.crmStatus === 'RESEARCHED' ? 'CONTACTED' : lead.crmStatus;

      const updatedLead = await prisma.$transaction(async (tx) => {
        await tx.activityLog.create({
          data: {
            leadId: lead.id,
            type: 'EMAIL',
            channel: 'EMAIL',
            recipient,
            subject,
            templateId,
            status: 'SENT',
            content: `Sent email "${subject}" to ${recipient}`,
            metadata: {
              messageId: sendResult.messageId || null,
              provider: sendResult.provider,
              bodyPreview: compiled.text.slice(0, 280),
            },
          },
        });

        if (nextStatus !== lead.crmStatus) {
          await tx.activityLog.create({
            data: {
              leadId: lead.id,
              type: 'STATUS_CHANGE',
              channel: 'SYSTEM',
              status: 'COMPLETED',
              content: `CRM status automatically moved from ${lead.crmStatus} to ${nextStatus} after email sent.`,
            },
          });
        }

        return tx.lead.update({
          where: { id: lead.id },
          data: {
            lastContactedAt: new Date(),
            crmStatus: nextStatus,
          },
        });
      });

      const payload = {
        success: true,
        sent: true,
        messageId: sendResult.messageId,
        recipient,
        subject,
        lead: updatedLead,
      };
      if (idempotencyKey) {
        const cache = getIdempotencyCache();
        if (cache.size > 500) cache.clear();
        cache.set(idempotencyKey, { timestamp: Date.now(), response: payload });
      }
      return NextResponse.json(payload);
    }

    // Delivery did not succeed (SMTP unconfigured or failed): record FAILED without falsely promoting CRM stage
    const errText = sendResult.errorMessage || 'Email delivery failed';
    await prisma.activityLog.create({
      data: {
        leadId: lead.id,
        type: 'EMAIL',
        channel: 'EMAIL',
        recipient,
        subject,
        templateId,
        status: 'FAILED',
        errorDetails: sanitizeErrorMessage(errText),
        content: `Failed to send email "${subject}" to ${recipient}: ${sanitizeErrorMessage(errText)}`,
        metadata: {
          errorCode: sendResult.errorCode || 'UNKNOWN',
          unconfigured: Boolean(sendResult.unconfigured),
        },
      },
    });

    return NextResponse.json(
      {
        success: false,
        sent: false,
        unconfigured: Boolean(sendResult.unconfigured),
        errorCode: sendResult.errorCode,
        error: errText,
      },
      { status: sendResult.unconfigured ? 503 : 502 }
    );
  } catch (error) {
    console.error('POST /api/outreach/email/send error:', error);
    return NextResponse.json(
      { success: false, error: sanitizeErrorMessage(error) },
      { status: 500 }
    );
  }
}

