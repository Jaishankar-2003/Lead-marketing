import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyUnsubscribeToken } from '@/lib/outreach-security';

export const dynamic = 'force-dynamic';

async function handleUnsubscribe(token: string | null) {
  if (!token) {
    return NextResponse.json({ success: false, error: 'Missing unsubscribe token.' }, { status: 400 });
  }

  const verified = verifyUnsubscribeToken(token);
  if (!verified) {
    return NextResponse.json(
      { success: false, error: 'Invalid or tampered unsubscribe token.' },
      { status: 400 }
    );
  }

  const lead = await prisma.lead.findUnique({ where: { id: verified.leadId } });
  if (!lead) {
    return NextResponse.json({ success: false, error: 'Lead record not found.' }, { status: 404 });
  }

  if (!lead.doNotContact) {
    await prisma.$transaction(async (tx) => {
      await tx.lead.update({
        where: { id: lead.id },
        data: {
          doNotContact: true,
          unsubscribedAt: new Date(),
          optOutReason: `Unsubscribed via email link (${verified.email})`,
        },
      });
      await tx.activityLog.create({
        data: {
          leadId: lead.id,
          type: 'OPT_OUT',
          channel: 'EMAIL',
          recipient: verified.email,
          status: 'COMPLETED',
          content: `Recipient ${verified.email} unsubscribed via opt-out link.`,
        },
      });
    });
  }

  return NextResponse.json({
    success: true,
    unsubscribed: true,
    businessName: lead.businessName,
    email: verified.email,
  });
}

export async function GET(request: NextRequest) {
  try {
    const token = new URL(request.url).searchParams.get('token');
    return await handleUnsubscribe(token);
  } catch (error) {
    console.error('GET /api/outreach/unsubscribe error:', error);
    return NextResponse.json({ success: false, error: 'Unsubscribe failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let token = searchParams.get('token');
    if (!token) {
      try {
        const body = await request.json();
        if (typeof body?.token === 'string') token = body.token;
      } catch {
        // Ignore non-JSON bodies such as RFC 8058 One-Click POST form payloads
      }
    }
    return await handleUnsubscribe(token);
  } catch (error) {
    console.error('POST /api/outreach/unsubscribe error:', error);
    return NextResponse.json({ success: false, error: 'Unsubscribe failed' }, { status: 500 });
  }
}

