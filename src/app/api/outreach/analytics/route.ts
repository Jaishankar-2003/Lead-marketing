import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const now = new Date();

    const [
      emailsSent,
      emailsFailed,
      whatsappOpened,
      whatsappConfirmedSent,
      callsCompleted,
      leadsContacted,
      contactedWonLeads,
      totalWonLeads,
      pendingFollowUps,
      overdueFollowUps,
      completedFollowUps,
      optedOutLeads,
      totalCampaigns,
      recentOutreachActivities,
    ] = await Promise.all([
      prisma.activityLog.count({ where: { type: 'EMAIL', status: 'SENT' } }),
      prisma.activityLog.count({ where: { type: 'EMAIL', status: 'FAILED' } }),
      prisma.activityLog.count({ where: { type: 'WHATSAPP', status: 'OPENED' } }),
      prisma.activityLog.count({ where: { type: 'WHATSAPP', status: 'CONFIRMED_SENT' } }),
      prisma.activityLog.count({ where: { type: 'CALL', status: 'COMPLETED' } }),
      prisma.lead.count({ where: { lastContactedAt: { not: null } } }),
      prisma.lead.count({ where: { lastContactedAt: { not: null }, crmStatus: 'WON' } }),
      prisma.lead.count({ where: { crmStatus: 'WON' } }),
      prisma.followUp.count({ where: { status: 'PENDING' } }),
      prisma.followUp.count({ where: { status: 'PENDING', dueAt: { lt: now } } }),
      prisma.followUp.count({ where: { status: 'COMPLETED' } }),
      prisma.lead.count({ where: { doNotContact: true } }),
      prisma.outreachCampaign.count(),
      prisma.activityLog.findMany({
        where: {
          type: { in: ['EMAIL', 'WHATSAPP', 'CALL', 'FOLLOW_UP', 'OPT_OUT'] },
        },
        include: {
          lead: {
            select: {
              id: true,
              businessName: true,
              city: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 15,
      }),
    ]);

    const conversionRate =
      leadsContacted > 0
        ? Math.round((contactedWonLeads / leadsContacted) * 1000) / 10
        : 0;

    return NextResponse.json({
      success: true,
      analytics: {
        emailsSent,
        emailsFailed,
        whatsappOpened,
        whatsappConfirmedSent,
        callsCompleted,
        leadsContacted,
        contactedWonLeads,
        totalWonLeads,
        conversionRate,
        pendingFollowUps,
        overdueFollowUps,
        completedFollowUps,
        optedOutLeads,
        totalCampaigns,
      },
      recentOutreachActivities,
    });
  } catch (error) {
    console.error('GET /api/outreach/analytics error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load outreach analytics' },
      { status: 500 }
    );
  }
}

