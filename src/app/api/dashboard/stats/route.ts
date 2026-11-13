import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CrmStatus, ServiceProspect } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [
      totalLeads,
      newLeads,
      withWebsite,
      withoutWebsite,
      pcProspects,
      webDevProspects,
      bothProspects,
      withPhone,
      withEmail,
      recentLeads,
      recentJobs,
      statusGroups,
    ] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({ where: { crmStatus: CrmStatus.NEW } }),
      prisma.lead.count({ where: { website: { not: null }, NOT: { website: '' } } }),
      prisma.lead.count({ where: { OR: [{ website: null }, { website: '' }] } }),
      prisma.lead.count({
        where: {
          serviceProspect: { in: [ServiceProspect.PC_SUPPORT, ServiceProspect.BOTH] },
        },
      }),
      prisma.lead.count({
        where: {
          serviceProspect: { in: [ServiceProspect.WEBSITE_DEV, ServiceProspect.BOTH] },
        },
      }),
      prisma.lead.count({
        where: { serviceProspect: ServiceProspect.BOTH },
      }),
      prisma.lead.count({ where: { phone: { not: null }, NOT: { phone: '' } } }),
      prisma.lead.count({ where: { email: { not: null }, NOT: { email: '' } } }),
      prisma.lead.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.discoveryJob.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.lead.groupBy({
        by: ['crmStatus'],
        _count: { _all: true },
      }),
    ]);

    const pipelineCounts: Record<string, number> = {
      NEW: 0,
      RESEARCHED: 0,
      CONTACTED: 0,
      INTERESTED: 0,
      FOLLOW_UP: 0,
      WON: 0,
      LOST: 0,
    };

    statusGroups.forEach((group) => {
      pipelineCounts[group.crmStatus] = group._count._all;
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalLeads,
        newLeads,
        withWebsite,
        withoutWebsite,
        pcProspects,
        webDevProspects,
        bothProspects,
        withPhone,
        withEmail,
      },
      pipelineCounts,
      recentLeads,
      recentJobs,
    });
  } catch (err: any) {
    console.error('Error in GET /api/dashboard/stats:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
