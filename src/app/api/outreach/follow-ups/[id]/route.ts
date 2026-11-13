import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const existing = await prisma.followUp.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Follow-up not found' }, { status: 404 });
    }

    const body = await request.json();
    const updateData: {
      status?: string;
      dueAt?: Date;
      notes?: string | null;
      completedAt?: Date | null;
    } = {};

    if (typeof body.status === 'string') {
      const normalizedStatus = body.status.trim().toUpperCase();
      if (!['PENDING', 'COMPLETED', 'CANCELLED'].includes(normalizedStatus)) {
        return NextResponse.json({ success: false, error: 'Invalid follow-up status' }, { status: 400 });
      }
      updateData.status = normalizedStatus;
      updateData.completedAt = normalizedStatus === 'COMPLETED' ? new Date() : null;
    }

    if (body.dueAt) {
      const parsed = new Date(body.dueAt);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ success: false, error: 'Invalid dueAt date' }, { status: 400 });
      }
      updateData.dueAt = parsed;
    }

    if (body.notes !== undefined) {
      updateData.notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.followUp.update({
        where: { id: existing.id },
        data: updateData,
      });

      const earliestPending = await tx.followUp.findFirst({
        where: { leadId: existing.leadId, status: 'PENDING' },
        orderBy: { dueAt: 'asc' },
      });

      await tx.lead.update({
        where: { id: existing.leadId },
        data: {
          nextFollowUpAt: earliestPending?.dueAt ?? null,
        },
      });

      if (updateData.status === 'COMPLETED') {
        await tx.activityLog.create({
          data: {
            leadId: existing.leadId,
            type: 'FOLLOW_UP',
            channel: 'FOLLOW_UP',
            status: 'COMPLETED',
            content: `Completed follow-up${row.notes ? `: ${row.notes}` : ''}`,
          },
        });
      }

      return row;
    });

    return NextResponse.json({ success: true, followUp: updated });
  } catch (error) {
    console.error('PATCH /api/outreach/follow-ups/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update follow-up' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const existing = await prisma.followUp.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Follow-up not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.followUp.delete({ where: { id: existing.id } });
      const earliestPending = await tx.followUp.findFirst({
        where: { leadId: existing.leadId, status: 'PENDING' },
        orderBy: { dueAt: 'asc' },
      });
      await tx.lead.update({
        where: { id: existing.leadId },
        data: {
          nextFollowUpAt: earliestPending?.dueAt ?? null,
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/outreach/follow-ups/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete follow-up' },
      { status: 500 }
    );
  }
}

