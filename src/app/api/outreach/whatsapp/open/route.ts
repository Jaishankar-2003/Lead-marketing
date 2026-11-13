import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeWhatsAppPhone } from '@/lib/outreach-utils';
import { openPersistentWhatsAppChat } from '@/outreach/whatsapp-session';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const leadId = typeof body.leadId === 'string' ? body.leadId.trim() : '';
    const rawPhone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const campaignRecipientId =
      typeof body.campaignRecipientId === 'string' && body.campaignRecipientId.trim()
        ? body.campaignRecipientId.trim()
        : null;

    if (!leadId || !rawPhone) {
      return NextResponse.json(
        { success: false, error: 'leadId and phone number are required.' },
        { status: 400 }
      );
    }

    const normalizedDigits = normalizeWhatsAppPhone(rawPhone);
    if (!normalizedDigits) {
      return NextResponse.json(
        {
          success: false,
          error: 'Please enter a valid 10-digit Indian mobile or international phone number.',
        },
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
          error: 'This lead is marked Do Not Contact. Clear opt-out status before initiating outreach.',
        },
        { status: 403 }
      );
    }

    // Launch or reuse the dedicated persistent WhatsApp Web session
    const sessionResult = await openPersistentWhatsAppChat(normalizedDigits, message);

    // Record OPENED only — NEVER mark as sent or promote CRM stage merely for opening chat
    await prisma.$transaction(async (tx) => {
      await tx.activityLog.create({
        data: {
          leadId: lead.id,
          type: 'WHATSAPP',
          channel: 'WHATSAPP',
          recipient: `+${normalizedDigits}`,
          status: 'OPENED',
          content: `Opened WhatsApp chat for +${normalizedDigits} (${
            sessionResult.mode === 'persistent_browser'
              ? sessionResult.reusedSession
                ? 'persistent session reused'
                : 'persistent session launched'
              : 'browser tab fallback'
          }, awaiting user send confirmation).`,
          metadata: {
            messagePreview: message.slice(0, 300),
            sessionMode: sessionResult.mode,
            reusedSession: sessionResult.reusedSession,
          },
        },
      });

      if (campaignRecipientId) {
        await tx.outreachRecipient.updateMany({
          where: { id: campaignRecipientId, status: { in: ['PENDING', 'OPENED'] } },
          data: { status: 'OPENED' },
        });
      }
    });

    return NextResponse.json({
      success: true,
      mode: sessionResult.mode,
      targetUrl: sessionResult.targetUrl,
      normalizedPhone: normalizedDigits,
      reusedSession: sessionResult.reusedSession,
      needsQrAuth: sessionResult.needsQrAuth,
      statusMessage: sessionResult.statusMessage,
      fallbackReason: sessionResult.fallbackReason,
    });
  } catch (error) {
    console.error('POST /api/outreach/whatsapp/open error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to open WhatsApp Web session.' },
      { status: 500 }
    );
  }
}

