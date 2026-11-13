import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { exportLeadsToCsv } from '@/lib/csv';
import { CrmStatus, Prisma, ServiceProspect } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const search = searchParams.get('search') || '';
    const city = searchParams.get('city') || '';
    const category = searchParams.get('category') || '';
    const source = searchParams.get('source') || '';
    const websiteFilter = searchParams.get('website') || '';
    const crmStatus = searchParams.get('crmStatus') as CrmStatus | null;
    const serviceProspect = searchParams.get('serviceProspect') as ServiceProspect | null;
    const ids = searchParams.get('ids')?.split(',').filter(Boolean);

    const where: Prisma.LeadWhereInput = {};

    if (ids && ids.length > 0) {
      where.id = { in: ids };
    } else {
      if (search) {
        where.OR = [
          { businessName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { address: { contains: search, mode: 'insensitive' } },
          { category: { contains: search, mode: 'insensitive' } },
        ];
      }
      if (city) where.city = { equals: city, mode: 'insensitive' };
      if (category) where.category = { contains: category, mode: 'insensitive' };
      if (source) where.source = { equals: source, mode: 'insensitive' };
      if (crmStatus) where.crmStatus = crmStatus;
      if (serviceProspect) where.serviceProspect = serviceProspect;

      if (websiteFilter === 'has_website') {
        where.website = { not: null };
        where.NOT = { website: '' };
      } else if (websiteFilter === 'no_website') {
        where.OR = [{ website: null }, { website: '' }];
      }
    }

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const csvData = exportLeadsToCsv(leads);
    const dateStr = new Date().toISOString().split('T')[0];

    return new NextResponse(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="leadpilot-leads-${dateStr}.csv"`,
      },
    });
  } catch (err: any) {
    console.error('Error exporting leads:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
