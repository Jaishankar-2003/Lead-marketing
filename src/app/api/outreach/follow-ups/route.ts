import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statusParam = (searchParams.get('status') || 'ALL').toUpperCase();
    const leadId = searchParams.get('leadId')?.trim();
    const now = new Date();

    const where: any = {};
    if (leadId) where.leadId = leadId;

    if (statusParam === 'PENDING') {
      where.status = 'PENDING';
    } else if (statusParam === 'OVERDUE') {
      where.status = 'PENDING';
      where.dueAt = { lt: now };
    } else if (statusParam === 'COMPLETED') {
      where.status = 'COMPLETED';
    } else if (statusParam === 'CANCELLED') {
      where.status = 'CANCELLED';
    }

    const followUps = await prisma.followUp.findMany({
      where,
      include: {
        lead: {
          select: {
            id: true,
            businessName: true,
            city: true,
            category: true,
            email: true,
            enrichedEmail: true,
            phone: true,
            enrichedPhone: true,
            crmStatus: true,
            doNotContact: true,
          },
        },
      },
      orderBy: [{ status: 'asc' }, { dueAt: 'asc' }],
    });

    const [pendingCount, overdueCount, completedCount] = await Promise.all([
      prisma.followUp.count({ where: { status: 'PENDING', ...(leadId ? { leadId } : {}) } }),
      prisma.followUp.count({ where: { status: 'PENDING', dueAt: { lt: now }, ...(leadId ? { leadId } : {}) } }),
      prisma.followUp.count({ where: { status: 'COMPLETED', ...(leadId ? { leadId } : {}) } }),
    ]);

    return NextResponse.json({
      success: true,
      followUps: followUps.map((f) => ({
        ...f,
        isOverdue: f.status === 'PENDING' && f.dueAt < now,
      })),
      counts: {
        pending: pendingCount,
        overdue: overdueCount,
        completed: completedCount,
      },
    });
  } catch (error) {
    console.error('GET /api/outreach/follow-ups error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load follow-ups' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const leadId = typeof body.leadId === 'string' ? body.leadId.trim() : '';
    const dueAtRaw = body.dueAt;
    const notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null;

    if (!leadId || !dueAtRaw) {
      return NextResponse.json(
        { success: false, error: 'leadId and dueAt are required.' },
        { status: 400 }
      );
    }

    const dueAt = new Date(dueAtRaw);
    if (Number.isNaN(dueAt.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid dueAt date.' },
        { status: 400 }
      );
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found.' }, { status: 404 });
    }

    const created = await prisma.$transaction(async (tx) => {
      const followUp = await tx.followUp.create({
        data: {
          leadId: lead.id,
          dueAt,
          status: 'PENDING',
          notes,
        },
        include: {
          lead: {
            select: {
              id: true,
              businessName: true,
              city: true,
              crmStatus: true,
            },
          },
        },
      });

      // Keep Lead.nextFollowUpAt aligned to earliest pending follow-up
      const earliestPending = await tx.followUp.findFirst({
        where: { leadId: lead.id, status: 'PENDING' },
        orderBy: { dueAt: 'asc' },
      });

      await tx.lead.update({
        where: { id: lead.id },
        data: {
          nextFollowUpAt: earliestPending?.dueAt ?? dueAt,
        },
      });

      await tx.activityLog.create({
        data: {
          leadId: lead.id,
          type: 'FOLLOW_UP',
          channel: 'FOLLOW_UP',
          status: 'SCHEDULED',
          content: `Scheduled follow-up for ${dueAt.toLocaleDateString()}${notes ? `: ${notes}` : ''}`,
        },
      });

      return followUp;
    });

    return NextResponse.json({ success: true, followUp: created }, { status: 201 });
  } catch (error) {
    console.error('POST /api/outreach/follow-ups error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to schedule follow-up' },
      { status: 500 }
    );
  }
}

