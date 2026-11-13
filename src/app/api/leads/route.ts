import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeDomain, normalizePhone, categorizeLead } from '@/lib/normalization';
import { CrmStatus, Prisma, ServiceProspect } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const search = searchParams.get('search') || '';
    const city = searchParams.get('city') || '';
    const category = searchParams.get('category') || '';
    const source = searchParams.get('source') || '';
    const websiteFilter = searchParams.get('website') || ''; // 'has_website' | 'no_website' | 'all'
    const crmStatus = searchParams.get('crmStatus') as CrmStatus | null;
    const serviceProspect = searchParams.get('serviceProspect') as ServiceProspect | null;

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(1000, Math.max(1, parseInt(searchParams.get('limit') || '15', 10)));
    const skip = (page - 1) * limit;

    const where: Prisma.LeadWhereInput = {};

    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (city) {
      where.city = { equals: city, mode: 'insensitive' };
    }

    if (category) {
      where.category = { contains: category, mode: 'insensitive' };
    }

    if (source) {
      where.source = { equals: source, mode: 'insensitive' };
    }

    if (crmStatus) {
      where.crmStatus = crmStatus;
    }

    if (serviceProspect) {
      where.serviceProspect = serviceProspect;
    }

    const hasPhone = searchParams.get('hasPhone');
    const hasEmail = searchParams.get('hasEmail');

    if (hasPhone === 'true') {
      where.phone = { not: null };
      where.NOT = { phone: '' };
    }

    if (hasEmail === 'true') {
      where.email = { not: null };
      where.NOT = { email: '' };
    }

    if (websiteFilter === 'has_website') {
      where.website = { not: null };
      where.NOT = { website: '' };
    } else if (websiteFilter === 'no_website') {
      where.OR = [
        { website: null },
        { website: '' },
      ];
    }

    const followUpFilter = searchParams.get('followUp');
    if (followUpFilter === 'pending') {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          OR: [
            { nextFollowUpAt: { not: null } },
            { followUps: { some: { status: 'PENDING' } } },
          ],
        },
      ];
    } else if (followUpFilter === 'overdue') {
      const now = new Date();
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          OR: [
            { nextFollowUpAt: { lt: now } },
            { followUps: { some: { status: 'PENDING', dueAt: { lt: now } } } },
          ],
        },
      ];
    } else if (followUpFilter === 'completed') {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        { followUps: { some: { status: 'COMPLETED' } } },
      ];
    }

    const [total, leads, distinctCities, distinctCategories] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.lead.findMany({
        where: { city: { not: null } },
        distinct: ['city'],
        select: { city: true },
      }),
      prisma.lead.findMany({
        where: { category: { not: null } },
        distinct: ['category'],
        select: { category: true },
        take: 30,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: leads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        cities: distinctCities.map((c) => c.city).filter(Boolean),
        categories: distinctCategories.map((c) => c.category).filter(Boolean),
      },
    });
  } catch (err: any) {
    console.error('Error in GET /api/leads:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.businessName || !body.businessName.trim()) {
      return NextResponse.json(
        { success: false, error: 'Business Name is required' },
        { status: 400 }
      );
    }

    const normDomain = normalizeDomain(body.website);
    const normPhone = normalizePhone(body.phone);

    // Check duplicate
    if (normDomain || normPhone) {
      const orConditions: any[] = [];
      if (normDomain) orConditions.push({ normalizedDomain: normDomain });
      if (normPhone) orConditions.push({ normalizedPhone: normPhone });

      const existing = await prisma.lead.findFirst({
        where: { OR: orConditions },
      });

      if (existing) {
        return NextResponse.json(
          {
            success: false,
            error: `Duplicate lead already exists: "${existing.businessName}"`,
            existingId: existing.id,
          },
          { status: 409 }
        );
      }
    }

    const { serviceProspect, prospectReason } = categorizeLead({
      category: body.category,
      businessName: body.businessName,
      website: body.website,
    });

    const lead = await prisma.lead.create({
      data: {
        businessName: body.businessName.trim(),
        category: body.category ? body.category.trim() : null,
        website: body.website ? body.website.trim() : null,
        phone: body.phone ? body.phone.trim() : null,
        email: body.email ? body.email.trim() : null,
        address: body.address ? body.address.trim() : null,
        city: body.city ? body.city.trim() : 'Madurai',
        state: body.state ? body.state.trim() : 'Tamil Nadu',
        source: body.source || 'manual',
        sourceUrl: body.sourceUrl || null,
        notes: body.notes || null,
        crmStatus: body.crmStatus || CrmStatus.NEW,
        serviceProspect: body.serviceProspect || serviceProspect,
        prospectReason: body.prospectReason || prospectReason,
        rating: body.rating || null,
        latitude: body.latitude || null,
        longitude: body.longitude || null,
        normalizedDomain: normDomain,
        normalizedPhone: normPhone,
      },
    });

    return NextResponse.json({ success: true, data: lead });
  } catch (err: any) {
    console.error('Error in POST /api/leads:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Array of lead IDs is required' },
        { status: 400 }
      );
    }

    const deleteResult = await prisma.lead.deleteMany({
      where: {
        id: { in: ids },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deleteResult.count} leads`,
      count: deleteResult.count,
    });
  } catch (err: any) {
    console.error('Error in batch DELETE /api/leads:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
