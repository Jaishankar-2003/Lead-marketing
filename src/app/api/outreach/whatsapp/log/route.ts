import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type ManualOutreachAction =
  | 'WHATSAPP_OPENED'
  | 'WHATSAPP_CONFIRMED_SENT'
  | 'CALL_COMPLETED';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const leadId = typeof body.leadId === 'string' ? body.leadId.trim() : '';
    const action = body.action as ManualOutreachAction;
    const recipient = typeof body.recipient === 'string' ? body.recipient.trim() : '';
    const messagePreview = typeof body.message === 'string' ? body.message.trim() : '';
    const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
    const campaignRecipientId =
      typeof body.campaignRecipientId === 'string' && body.campaignRecipientId.trim()
        ? body.campaignRecipientId.trim()
        : null;

    if (!leadId || !recipient || !action) {
      return NextResponse.json(
        { success: false, error: 'leadId, recipient, and action are required.' },
        { status: 400 }
      );
    }

    if (
      action !== 'WHATSAPP_OPENED' &&
      action !== 'WHATSAPP_CONFIRMED_SENT' &&
      action !== 'CALL_COMPLETED'
    ) {
      return NextResponse.json(
        { success: false, error: 'Invalid manual outreach action.' },
        { status: 400 }
      );
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found.' }, { status: 404 });
    }

    if (lead.doNotContact) {
      return NextResponse.json(
        {
          success: false,
          error: 'This lead is marked Do Not Contact. Outreach logging blocked.',
        },
        { status: 403 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      if (action === 'WHATSAPP_OPENED') {
        const log = await tx.activityLog.create({
          data: {
            leadId: lead.id,
            type: 'WHATSAPP',
            channel: 'WHATSAPP',
            recipient,
            status: 'OPENED',
            content: `Opened WhatsApp chat for ${recipient} (awaiting user send confirmation).`,
            metadata: {
              messagePreview: messagePreview.slice(0, 300),
            },
          },
        });

        if (campaignRecipientId) {
          await tx.outreachRecipient.updateMany({
            where: { id: campaignRecipientId, status: { in: ['PENDING', 'OPENED'] } },
            data: { status: 'OPENED' },
          });
        }

        return { lead, log, crmUpdated: false };
      }

      // Confirmed sent WhatsApp OR completed phone call -> updates lastContactedAt and promotes NEW/RESEARCHED -> CONTACTED
      const isCall = action === 'CALL_COMPLETED';
      const log = await tx.activityLog.create({
        data: {
          leadId: lead.id,
          type: isCall ? 'CALL' : 'WHATSAPP',
          channel: isCall ? 'PHONE' : 'WHATSAPP',
          recipient,
          status: isCall ? 'COMPLETED' : 'CONFIRMED_SENT',
          content: isCall
            ? `Completed phone call to ${recipient}${notes ? `: ${notes}` : ''}`
            : `Confirmed WhatsApp message sent to ${recipient}${notes ? ` (${notes})` : ''}`,
          metadata: messagePreview ? { messagePreview: messagePreview.slice(0, 300) } : undefined,
        },
      });

      const nextStatus =
        lead.crmStatus === 'NEW' || lead.crmStatus === 'RESEARCHED' ? 'CONTACTED' : lead.crmStatus;

      if (nextStatus !== lead.crmStatus) {
        await tx.activityLog.create({
          data: {
            leadId: lead.id,
            type: 'STATUS_CHANGE',
            channel: 'SYSTEM',
            status: 'COMPLETED',
            content: `CRM status automatically moved from ${lead.crmStatus} to ${nextStatus} after ${isCall ? 'phone call' : 'WhatsApp outreach'}.`,
          },
        });
      }

      const updatedLead = await tx.lead.update({
        where: { id: lead.id },
        data: {
          lastContactedAt: new Date(),
          crmStatus: nextStatus,
        },
      });

      if (campaignRecipientId && !isCall) {
        await tx.outreachRecipient.updateMany({
          where: { id: campaignRecipientId },
          data: { status: 'CONFIRMED_SENT', sentAt: new Date() },
        });
      }

      return { lead: updatedLead, log, crmUpdated: true };
    });

    return NextResponse.json({
      success: true,
      action,
      crmUpdated: result.crmUpdated,
      lead: result.lead,
      activity: result.log,
    });
  } catch (error) {
    console.error('POST /api/outreach/whatsapp/log error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to log outreach event' },
      { status: 500 }
    );
  }
}

