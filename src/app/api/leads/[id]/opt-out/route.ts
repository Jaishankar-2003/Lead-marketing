import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const doNotContact = Boolean(body.doNotContact);
    const reason = typeof body.reason === 'string' && body.reason.trim() ? body.reason.trim() : null;

    const lead = await prisma.lead.findUnique({ where: { id: params.id } });
    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedLead = await tx.lead.update({
        where: { id: lead.id },
        data: {
          doNotContact,
          unsubscribedAt: doNotContact ? new Date() : null,
          optOutReason: doNotContact ? reason || 'Marked Do Not Contact manually' : null,
        },
      });

      await tx.activityLog.create({
        data: {
          leadId: lead.id,
          type: 'OPT_OUT',
          channel: 'SYSTEM',
          status: 'COMPLETED',
          content: doNotContact
            ? `Lead marked Do Not Contact${reason ? `: ${reason}` : '.'}`
            : 'Do Not Contact flag cleared; lead re-enabled for outreach.',
        },
      });

      return updatedLead;
    });

    return NextResponse.json({ success: true, lead: updated });
  } catch (error) {
    console.error('POST /api/leads/[id]/opt-out error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update opt-out preference' },
      { status: 500 }
    );
  }
}

