import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeDomain, normalizePhone } from '@/lib/normalization';
import { CrmStatus, ServiceProspect } from '@prisma/client';
import { BusinessLead } from '@/types/open-marketing';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const leadId = searchParams.get('leadId')?.trim();
    const domain = searchParams.get('domain')?.trim();
    const phone = searchParams.get('phone')?.trim();

    if (!leadId && !domain && !phone) {
      return NextResponse.json(
        { success: false, error: 'leadId, domain, or phone query parameter is required.' },
        { status: 400 }
      );
    }

    const orConditions: any[] = [];
    if (leadId) orConditions.push({ id: leadId });
    if (domain) {
      const normDomain = normalizeDomain(domain);
      if (normDomain) orConditions.push({ normalizedDomain: normDomain });
    }
    if (phone) {
      const normPhone = normalizePhone(phone);
      if (normPhone) orConditions.push({ normalizedPhone: normPhone });
    }

    const crmLead = await prisma.lead.findFirst({
      where: { OR: orConditions },
      include: {
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 30,
        },
        followUps: {
          orderBy: { dueAt: 'asc' },
        },
        outreachRecipients: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!crmLead) {
      return NextResponse.json({ success: false, found: false, lead: null });
    }

    return NextResponse.json({
      success: true,
      found: true,
      lead: crmLead,
    });
  } catch (error: any) {
    console.error('GET /api/open-marketing/crm-sync error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'CRM query failed' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawLead: BusinessLead = body.lead || body;

    if (!rawLead || !rawLead.businessName || !rawLead.businessName.trim()) {
      return NextResponse.json(
        { success: false, error: 'Valid business lead with businessName is required.' },
        { status: 400 }
      );
    }

    const businessName = rawLead.businessName.trim();
    const normDomain = normalizeDomain(rawLead.rootDomain || rawLead.websiteUrl);
    const normPhone = normalizePhone(rawLead.phone);

    // 1. Check for duplicate/existing CRM lead by normalized domain or phone
    const orConditions: any[] = [];
    if (normDomain) orConditions.push({ normalizedDomain: normDomain });
    if (normPhone) orConditions.push({ normalizedPhone: normPhone });

    let existingLead = null;
    if (orConditions.length > 0) {
      existingLead = await prisma.lead.findFirst({
        where: { OR: orConditions },
        include: {
          activities: {
            orderBy: { createdAt: 'desc' },
            take: 30,
          },
          followUps: {
            orderBy: { dueAt: 'asc' },
          },
          outreachRecipients: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });
    }

    // If duplicate/existing lead found, preserve past history and return it
    if (existingLead) {
      return NextResponse.json({
        success: true,
        isNew: false,
        lead: existingLead,
        message: `Linked to existing CRM Lead "${existingLead.businessName}" without modifying historical records.`,
      });
    }

    // 2. Map service prospect from Open Marketing opportunity scores
    const scores = rawLead.leadScores || {
      websiteDevScore: 0,
      pcRepairScore: 0,
      networkingAmcScore: 0,
    };

    let serviceProspect: ServiceProspect = ServiceProspect.GENERAL_BUSINESS;
    if (scores.websiteDevScore >= 70 && (scores.pcRepairScore >= 70 || scores.networkingAmcScore >= 70)) {
      serviceProspect = ServiceProspect.BOTH;
    } else if (scores.websiteDevScore >= 70) {
      serviceProspect = ServiceProspect.WEBSITE_DEV;
    } else if (scores.pcRepairScore >= 70 || scores.networkingAmcScore >= 70) {
      serviceProspect = ServiceProspect.PC_SUPPORT;
    }

    // 3. Create new CRM lead with 'open_marketing' source inside transaction
    const newLead = await prisma.$transaction(async (tx) => {
      const created = await tx.lead.create({
        data: {
          businessName,
          category: rawLead.category ? rawLead.category.trim() : null,
          website: rawLead.websiteUrl ? rawLead.websiteUrl.trim() : null,
          phone: rawLead.phone ? rawLead.phone.trim() : null,
          email: rawLead.email ? rawLead.email.trim() : null,
          address: rawLead.address ? rawLead.address.trim() : null,
          city: rawLead.city ? rawLead.city.trim() : null,
          source: 'open_marketing',
          sourceUrl: rawLead.googleMapsUrl || null,
          crmStatus: CrmStatus.NEW,
          serviceProspect,
          prospectReason: rawLead.leadScores?.qualificationReason || 'Discovered via Open Marketing Playwright engine',
          normalizedDomain: normDomain,
          normalizedPhone: normPhone,
          websiteStatus: rawLead.websiteStatus || null,
          isHttps: rawLead.websiteAnalysis?.hasHttps ?? null,
          pageTitle: businessName,
        },
      });

      // Log initial discovery activity
      await tx.activityLog.create({
        data: {
          leadId: created.id,
          type: 'STATUS_CHANGE',
          channel: 'SYSTEM',
          status: 'COMPLETED',
          content: `Lead discovered and synchronized to CRM from Open Marketing (${(rawLead.sources || []).join(', ') || 'Playwright'})`,
          metadata: {
            sources: rawLead.sources || [],
            qualificationStatus: rawLead.leadScores?.qualificationStatus || 'UNKNOWN',
            scores: (rawLead.leadScores as any) || null,
          },
        },
      });

      return tx.lead.findUnique({
        where: { id: created.id },
        include: {
          activities: {
            orderBy: { createdAt: 'desc' },
            take: 30,
          },
          followUps: {
            orderBy: { dueAt: 'asc' },
          },
          outreachRecipients: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      isNew: true,
      lead: newLead,
      message: `Created new CRM Lead "${businessName}" from Open Marketing discovery.`,
    });
  } catch (error: any) {
    console.error('POST /api/open-marketing/crm-sync error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'CRM sync failed' },
      { status: 500 }
    );
  }
}
