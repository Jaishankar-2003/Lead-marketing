import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeIndianPhone } from '@/lib/vendors/phoneUtils';
import { normalizeBusinessName } from '@/lib/vendors/duplicateEngine';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        contacts: {
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
        categories: {
          include: {
            category: true,
          },
        },
        state: true,
        district: true,
        city: true,
        area: true,
        recipients: {
          include: {
            enquiry: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        quotations: {
          include: {
            enquiry: true,
            item: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!vendor) {
      return NextResponse.json(
        { success: false, error: 'Vendor not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      vendor,
    });
  } catch (error) {
    console.error('GET /api/vendors/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch vendor' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    const existing = await prisma.vendor.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Vendor not found' },
        { status: 404 }
      );
    }

    const name = typeof body.name === 'string' ? body.name.trim() : existing.name;
    const normalizedName = normalizeBusinessName(name);

    // Support custom area creation if entered as text
    let areaId = body.areaId !== undefined ? body.areaId : existing.areaId;
    const customArea = typeof body.customAreaName === 'string' ? body.customAreaName.trim() : '';
    if (customArea) {
      const cityIdToUse = body.cityId || existing.cityId;
      const normArea = customArea.toLowerCase().replace(/[^a-z0-9]/g, '');
      let existingArea = await prisma.vendorLocation.findFirst({
        where: {
          normalizedName: normArea,
          parentId: cityIdToUse || undefined,
        },
      });
      if (!existingArea) {
        existingArea = await prisma.vendorLocation.create({
          data: {
            name: customArea,
            normalizedName: normArea,
            level: 'AREA',
            country: 'India',
            parentId: cityIdToUse || null,
          },
        });
      }
      areaId = existingArea.id;
    }

    // If categories are updated, recreate assignments
    if (Array.isArray(body.categoryIds) || Array.isArray(body.customCategoryNames)) {
      const finalCategoryIds: string[] = Array.isArray(body.categoryIds) ? [...body.categoryIds] : [];
      if (Array.isArray(body.customCategoryNames)) {
        for (const catName of body.customCategoryNames) {
          const trimmed = String(catName).trim();
          if (!trimmed) continue;
          let cat = await prisma.vendorCategory.findFirst({
            where: { name: { equals: trimmed, mode: 'insensitive' } },
          });
          if (!cat) {
            cat = await prisma.vendorCategory.create({
              data: { name: trimmed, isActive: true },
            });
          }
          if (!finalCategoryIds.includes(cat.id)) {
            finalCategoryIds.push(cat.id);
          }
        }
      }

      await prisma.vendorCategoryAssignment.deleteMany({
        where: { vendorId: id },
      });
      if (finalCategoryIds.length > 0) {
        await prisma.vendorCategoryAssignment.createMany({
          data: finalCategoryIds.map((cid: string) => ({
            vendorId: id,
            categoryId: cid,
          })),
        });
      }
    }

    // If contacts are updated
    if (Array.isArray(body.contacts)) {
      await prisma.vendorContact.deleteMany({
        where: { vendorId: id },
      });
      const contactsToCreate = body.contacts.map((c: any) => {
        const val = String(c.value).trim();
        const type = c.type === 'EMAIL' ? 'EMAIL' : 'PHONE';
        if (type === 'PHONE') {
          const norm = normalizeIndianPhone(val);
          return {
            vendorId: id,
            type: 'PHONE',
            value: val,
            normalized: norm.normalized || val,
            kind: norm.type,
            label: c.label || 'Mobile',
            isPrimary: Boolean(c.isPrimary),
            isWhatsApp: norm.canWhatsApp,
            isValid: norm.isValid,
          };
        } else {
          return {
            vendorId: id,
            type: 'EMAIL',
            value: val,
            normalized: val.toLowerCase(),
            kind: 'EMAIL',
            label: c.label || 'Office',
            isPrimary: Boolean(c.isPrimary),
            isValid: val.includes('@'),
          };
        }
      });
      if (contactsToCreate.length > 0) {
        await prisma.vendorContact.createMany({
          data: contactsToCreate,
        });
      }
    }

    const updated = await prisma.vendor.update({
      where: { id },
      data: {
        name,
        normalizedName,
        status: body.status !== undefined ? body.status : existing.status,
        businessType: body.businessType !== undefined ? body.businessType : existing.businessType,
        doNotContact: body.doNotContact !== undefined ? Boolean(body.doNotContact) : existing.doNotContact,
        contactPerson: body.contactPerson !== undefined ? body.contactPerson : existing.contactPerson,
        preferredContactMethod: body.preferredContactMethod !== undefined ? body.preferredContactMethod : existing.preferredContactMethod,
        stateId: body.stateId !== undefined ? body.stateId : existing.stateId,
        districtId: body.districtId !== undefined ? body.districtId : existing.districtId,
        cityId: body.cityId !== undefined ? body.cityId : existing.cityId,
        areaId,
        fullAddress: body.fullAddress !== undefined ? body.fullAddress : existing.fullAddress,
        pincode: body.pincode !== undefined ? body.pincode : existing.pincode,
        notes: body.notes !== undefined ? body.notes : existing.notes,
        productsBrands: Array.isArray(body.productsBrands) ? body.productsBrands : existing.productsBrands,
        activities: {
          create: {
            type: 'UPDATE',
            content: `Vendor details updated.`,
          },
        },
      },
      include: {
        contacts: true,
        categories: { include: { category: true } },
        state: true,
        city: true,
        area: true,
      },
    });

    return NextResponse.json({
      success: true,
      vendor: updated,
    });
  } catch (error) {
    console.error('PUT /api/vendors/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update vendor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const archiveOnly = searchParams.get('archive') === 'true';

    if (archiveOnly) {
      const vendor = await prisma.vendor.update({
        where: { id },
        data: {
          status: 'ARCHIVED',
          activities: {
            create: {
              type: 'STATUS_CHANGE',
              content: 'Vendor archived.',
            },
          },
        },
      });

      return NextResponse.json({
        success: true,
        vendor,
      });
    }

    // Permanent delete in transaction
    await prisma.$transaction([
      prisma.vendorQuotation.deleteMany({ where: { vendorId: id } }),
      prisma.vendorEnquiryRecipient.deleteMany({ where: { vendorId: id } }),
      prisma.vendorContact.deleteMany({ where: { vendorId: id } }),
      prisma.vendorCategoryAssignment.deleteMany({ where: { vendorId: id } }),
      prisma.vendorActivityLog.deleteMany({ where: { vendorId: id } }),
      prisma.vendorImportRecord.updateMany({
        where: { vendorId: id },
        data: { vendorId: null },
      }),
      prisma.vendorImportRecord.updateMany({
        where: { matchVendorId: id },
        data: { matchVendorId: null },
      }),
      prisma.vendor.delete({ where: { id } }),
    ]);

    return NextResponse.json({
      success: true,
      deletedId: id,
    });
  } catch (error) {
    console.error('DELETE /api/vendors/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete vendor' },
      { status: 500 }
    );
  }
}
