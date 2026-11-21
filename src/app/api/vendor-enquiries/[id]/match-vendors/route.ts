import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const filterCityId = searchParams.get('cityId')?.trim();
    const filterAreaId = searchParams.get('areaId')?.trim();

    const enquiry = await prisma.componentEnquiry.findUnique({
      where: { id },
      include: {
        items: {
          select: {
            categoryId: true,
            componentName: true,
          },
        },
        recipients: {
          select: {
            vendorId: true,
            status: true,
          },
        },
      },
    });

    if (!enquiry) {
      return NextResponse.json(
        { success: false, error: 'Enquiry not found' },
        { status: 404 }
      );
    }

    const existingRecipientVendorIds = new Set(
      enquiry.recipients.map((r) => r.vendorId)
    );

    const neededCategoryIds = new Set(
      enquiry.items.map((it) => it.categoryId).filter(Boolean) as string[]
    );

    // Fetch all active vendors with contacts and locations
    const allVendors = await prisma.vendor.findMany({
      where: {
        status: { not: 'ARCHIVED' },
        doNotContact: false,
      },
      include: {
        contacts: {
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
        categories: {
          include: {
            category: true,
          },
        },
        city: true,
        area: true,
        state: true,
      },
    });

    const targetCityId = filterCityId && filterCityId !== 'ALL' ? filterCityId : enquiry.cityId;
    const targetAreaId = filterAreaId && filterAreaId !== 'ALL' ? filterAreaId : enquiry.areaId;

    const matchedVendors = allVendors.map((vendor) => {
      let score = 0;
      const reasons: string[] = [];

      // Check Area / Market match
      if (targetAreaId && vendor.areaId === targetAreaId) {
        score += 45;
        reasons.push(`Located in ${vendor.area?.name || 'target market'}`);
      }

      // Check City match
      if (targetCityId && vendor.cityId === targetCityId) {
        score += 35;
        if (!reasons.some((r) => r.includes(vendor.city?.name || ''))) {
          reasons.push(`Located in ${vendor.city?.name}`);
        }
      } else if (!targetCityId && enquiry.customerLocation) {
        // Fallback text check
        const locLower = enquiry.customerLocation.toLowerCase();
        if (vendor.city?.name && locLower.includes(vendor.city.name.toLowerCase())) {
          score += 30;
          reasons.push(`City matches "${vendor.city.name}"`);
        }
      }

      // Check Category matches
      let catMatches = 0;
      for (const vc of vendor.categories) {
        if (neededCategoryIds.has(vc.categoryId)) {
          catMatches++;
          score += 20;
          reasons.push(`Supplies ${vc.category.name}`);
        }
      }

      // If no category restriction on vendor, give partial score
      if (vendor.categories.length === 0) {
        score += 10;
        reasons.push('General hardware vendor');
      }

      // Contact readiness
      const primaryPhone = vendor.contacts.find((c) => c.type === 'PHONE' && c.isPrimary) || vendor.contacts.find((c) => c.type === 'PHONE');
      if (primaryPhone?.isWhatsApp) {
        score += 10;
        reasons.push('WhatsApp available');
      }

      const isAlreadyRecipient = existingRecipientVendorIds.has(vendor.id);

      return {
        vendorId: vendor.id,
        vendorCode: vendor.vendorCode,
        name: vendor.name,
        contactPerson: vendor.contactPerson,
        primaryPhone: primaryPhone?.value || null,
        normalizedPhone: primaryPhone?.normalized || null,
        canWhatsApp: Boolean(primaryPhone?.isWhatsApp),
        phones: vendor.contacts
          .filter((c) => c.type === 'PHONE')
          .map((c) => ({
            value: c.value,
            normalized: c.normalized,
            isWhatsApp: c.isWhatsApp,
            label: c.label,
            isPrimary: c.isPrimary,
          })),
        primaryEmail: vendor.contacts.find((c) => c.type === 'EMAIL')?.value || null,
        cityName: vendor.city?.name || null,
        areaName: vendor.area?.name || null,
        fullAddress: vendor.fullAddress,
        categories: vendor.categories.map((c) => c.category.name),
        matchScore: score,
        matchReasons: reasons,
        isAlreadyRecipient,
      };
    });

    // Sort by match score descending
    matchedVendors.sort((a, b) => b.matchScore - a.matchScore);

    return NextResponse.json({
      success: true,
      enquiryId: id,
      targetCityId,
      targetAreaId,
      matchedVendors,
    });
  } catch (error) {
    console.error('GET /api/vendor-enquiries/[id]/match-vendors error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to match vendors' },
      { status: 500 }
    );
  }
}
