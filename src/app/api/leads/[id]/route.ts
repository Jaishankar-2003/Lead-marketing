import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeDomain, normalizePhone, categorizeLead } from '@/lib/normalization';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: params.id },
      include: {
        job: {
          select: {
            id: true,
            location: true,
            status: true,
            startedAt: true,
          },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: lead });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();

    const existing = await prisma.lead.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    const normDomain = body.website !== undefined ? normalizeDomain(body.website) : existing.normalizedDomain;
    const normPhone = body.phone !== undefined ? normalizePhone(body.phone) : existing.normalizedPhone;

    // Recalculate categorization if category, name, or website changed
    let serviceProspect = existing.serviceProspect;
    let prospectReason = existing.prospectReason;

    if (
      body.category !== undefined ||
      body.businessName !== undefined ||
      body.website !== undefined
    ) {
      const rec = categorizeLead({
        category: body.category !== undefined ? body.category : existing.category,
        businessName: body.businessName !== undefined ? body.businessName : existing.businessName,
        website: body.website !== undefined ? body.website : existing.website,
      });
      serviceProspect = body.serviceProspect || rec.serviceProspect;
      prospectReason = body.prospectReason || rec.prospectReason;
    }

    // Prepare activity log creation if status changed or explicit activity passed
    const activitiesToCreate: any[] = [];
    if (body.crmStatus && body.crmStatus !== existing.crmStatus) {
      activitiesToCreate.push({
        type: 'STATUS_CHANGE',
        content: `Stage updated from ${existing.crmStatus} to ${body.crmStatus}`,
      });
    }

    if (body.newActivity) {
      activitiesToCreate.push({
        type: body.newActivity.type || 'NOTE',
        content: body.newActivity.content,
      });
    }

    const updated = await prisma.lead.update({
      where: { id: params.id },
      data: {
        businessName: body.businessName !== undefined ? body.businessName : undefined,
        category: body.category !== undefined ? body.category : undefined,
        website: body.website !== undefined ? body.website : undefined,
        phone: body.phone !== undefined ? body.phone : undefined,
        email: body.email !== undefined ? body.email : undefined,
        address: body.address !== undefined ? body.address : undefined,
        city: body.city !== undefined ? body.city : undefined,
        state: body.state !== undefined ? body.state : undefined,
        notes: body.notes !== undefined ? body.notes : undefined,
        crmStatus: body.crmStatus !== undefined ? body.crmStatus : undefined,
        serviceProspect,
        prospectReason,
        rating: body.rating !== undefined ? body.rating : undefined,
        latitude: body.latitude !== undefined ? body.latitude : undefined,
        longitude: body.longitude !== undefined ? body.longitude : undefined,
        lastContactedAt: body.lastContactedAt ? new Date(body.lastContactedAt) : undefined,
        nextFollowUpAt: body.nextFollowUpAt ? new Date(body.nextFollowUpAt) : (body.nextFollowUpAt === null ? null : undefined),
        normalizedDomain: normDomain,
        normalizedPhone: normPhone,
        activities: activitiesToCreate.length > 0 ? { create: activitiesToCreate } : undefined,
      },
      include: {
        activities: { orderBy: { createdAt: 'desc' } },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.lead.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: 'Lead deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
