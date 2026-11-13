import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  extractLeadEmails,
  extractLeadPhones,
  renderTemplate,
} from '@/lib/outreach-utils';
import { getEmailProvider } from '@/outreach/email-provider';
import { startOrResumeEmailCampaign } from '@/outreach/campaign-runner';
import { checkRateLimit } from '@/lib/outreach-security';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const campaigns = await prisma.outreachCampaign.findMany({
      include: {
        template: {
          select: { id: true, name: true, category: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ success: true, campaigns });
  } catch (error) {
    console.error('GET /api/outreach/campaigns error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load campaigns' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const rl = checkRateLimit('create-campaign', 10, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many campaign requests. Please wait briefly.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const channel = body.channel === 'WHATSAPP' ? 'WHATSAPP' : 'EMAIL';
    const name =
      typeof body.name === 'string' && body.name.trim()
        ? body.name.trim()
        : `${channel === 'EMAIL' ? 'Bulk Email' : 'WhatsApp Queue'} ${new Date().toLocaleDateString()}`;
    const templateId =
      typeof body.templateId === 'string' && body.templateId.trim() ? body.templateId.trim() : null;
    const subjectTemplate = typeof body.subject === 'string' ? body.subject.trim() : '';
    const bodyTemplate = typeof body.body === 'string' ? body.body.trim() : '';
    const isHtml = Boolean(body.isHtml);
    const confirmed = body.confirmed === true;
    const batchSize = Math.max(1, Math.min(50, Number(body.batchSize) || 10));
    const delayMs = Math.max(250, Math.min(60000, Number(body.delayMs) || 2500));

    const leadIds = Array.isArray(body.leadIds)
      ? body.leadIds.filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0)
      : [];
    const excludedSet = new Set<string>(
      Array.isArray(body.excludedLeadIds)
        ? body.excludedLeadIds.filter((id: unknown): id is string => typeof id === 'string')
        : []
    );

    if (!confirmed) {
      return NextResponse.json(
        { success: false, error: 'Explicit user confirmation is required before launching bulk outreach.' },
        { status: 400 }
      );
    }

    if (leadIds.length === 0 || !bodyTemplate) {
      return NextResponse.json(
        { success: false, error: 'Selected leads and message body are required.' },
        { status: 400 }
      );
    }

    if (channel === 'EMAIL' && !subjectTemplate) {
      return NextResponse.json(
        { success: false, error: 'Email subject is required for bulk email campaigns.' },
        { status: 400 }
      );
    }

    if (channel === 'EMAIL') {
      const smtpStatus = getEmailProvider().getConfigStatus();
      if (!smtpStatus.configured) {
        return NextResponse.json(
          {
            success: false,
            unconfigured: true,
            error: `Gmail SMTP is not configured (missing ${smtpStatus.missingVars.join(', ')}). Configure SMTP settings before starting bulk email delivery.`,
          },
          { status: 503 }
        );
      }
    }

    const leads = await prisma.lead.findMany({
      where: { id: { in: leadIds } },
      orderBy: { createdAt: 'desc' },
    });

    const recipientInputs: Array<{
      leadId: string;
      channel: string;
      recipient: string;
      renderedSubject: string | null;
      renderedBody: string;
      status: string;
      idempotencyKey: string;
    }> = [];

    const seenAddresses = new Set<string>();
    const nonce = Date.now().toString(36);

    for (const lead of leads) {
      if (excludedSet.has(lead.id) || lead.doNotContact) continue;

      if (channel === 'EMAIL') {
        const { valid } = extractLeadEmails(lead);
        if (valid.length === 0) continue;
        const email = valid[0];
        if (seenAddresses.has(email)) continue;
        seenAddresses.add(email);

        recipientInputs.push({
          leadId: lead.id,
          channel: 'EMAIL',
          recipient: email,
          renderedSubject: renderTemplate(subjectTemplate, lead, { email }),
          renderedBody: renderTemplate(bodyTemplate, lead, { email }),
          status: 'PENDING',
          idempotencyKey: `email:${nonce}:${lead.id}:${email}`,
        });
      } else {
        const { whatsappPhones } = extractLeadPhones(lead);
        if (whatsappPhones.length === 0) continue;
        const phone = whatsappPhones[0];
        if (seenAddresses.has(phone.normalized)) continue;
        seenAddresses.add(phone.normalized);

        recipientInputs.push({
          leadId: lead.id,
          channel: 'WHATSAPP',
          recipient: phone.normalized,
          renderedSubject: null,
          renderedBody: renderTemplate(bodyTemplate, lead, { phone: phone.raw }),
          status: 'PENDING',
          idempotencyKey: `wa:${nonce}:${lead.id}:${phone.normalized}`,
        });
      }
    }

    if (recipientInputs.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No valid, non-duplicate, non-opted-out recipients remain after audit.',
        },
        { status: 400 }
      );
    }

    const campaign = await prisma.outreachCampaign.create({
      data: {
        name,
        channel,
        templateId,
        subject: channel === 'EMAIL' ? subjectTemplate : null,
        body: bodyTemplate,
        isHtml: channel === 'EMAIL' ? isHtml : false,
        status: 'RUNNING',
        batchSize,
        delayMs,
        totalRecipients: recipientInputs.length,
        pendingCount: recipientInputs.length,
        startedAt: new Date(),
        recipients: {
          create: recipientInputs.map((r) => ({
            leadId: r.leadId,
            channel: r.channel,
            recipient: r.recipient,
            renderedSubject: r.renderedSubject,
            renderedBody: r.renderedBody,
            status: r.status,
            idempotencyKey: r.idempotencyKey,
          })),
        },
      },
      include: {
        recipients: {
          include: {
            lead: {
              select: {
                id: true,
                businessName: true,
                city: true,
                category: true,
                phone: true,
                enrichedPhone: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (channel === 'EMAIL') {
      const origin =
        process.env.APP_BASE_URL?.trim() ||
        request.headers.get('origin') ||
        `http://${request.headers.get('host') || 'localhost:3000'}`;
      await startOrResumeEmailCampaign(campaign.id, origin);
    }

    return NextResponse.json({ success: true, campaign }, { status: 201 });
  } catch (error) {
    console.error('POST /api/outreach/campaigns error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create outreach campaign' },
      { status: 500 }
    );
  }
}

