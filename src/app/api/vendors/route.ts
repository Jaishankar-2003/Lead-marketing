import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeIndianPhone, extractPhoneNumbers } from '@/lib/vendors/phoneUtils';
import { normalizeBusinessName } from '@/lib/vendors/duplicateEngine';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const status = searchParams.get('status')?.trim();
    const stateId = searchParams.get('stateId')?.trim();
    const cityId = searchParams.get('cityId')?.trim();
    const areaId = searchParams.get('areaId')?.trim();
    const categoryId = searchParams.get('categoryId')?.trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status && status !== 'ALL') {
      where.status = status;
    } else {
      // By default in directory, exclude archived vendors unless specifically filtered
      where.status = { not: 'ARCHIVED' };
    }

    if (stateId && stateId !== 'ALL') {
      where.stateId = stateId;
    }

    if (cityId && cityId !== 'ALL') {
      where.cityId = cityId;
    }

    if (areaId && areaId !== 'ALL') {
      where.areaId = areaId;
    }

    if (categoryId && categoryId !== 'ALL') {
      where.categories = {
        some: {
          categoryId,
        },
      };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { vendorCode: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { fullAddress: { contains: search, mode: 'insensitive' } },
        {
          contacts: {
            some: {
              value: { contains: search, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    const [total, vendors] = await Promise.all([
      prisma.vendor.count({ where }),
      prisma.vendor.findMany({
        where,
        include: {
          contacts: {
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
          },
          categories: {
            include: {
              category: true,
            },
          },
          state: { select: { id: true, name: true } },
          city: { select: { id: true, name: true } },
          area: { select: { id: true, name: true } },
          _count: {
            select: {
              recipients: true,
              quotations: true,
            },
          },
        },
        orderBy: [{ updatedAt: 'desc' }],
        skip,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      success: true,
      vendors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('GET /api/vendors error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch vendors' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Vendor name is required' },
        { status: 400 }
      );
    }

    // Auto-generate sequential, collision-free vendorCode (e.g. VEN-0035)
    let vendorCode = typeof body.vendorCode === 'string' ? body.vendorCode.trim() : '';
    if (!vendorCode) {
      const allCodes = await prisma.vendor.findMany({
        where: { vendorCode: { startsWith: 'VEN-' } },
        select: { vendorCode: true },
      });

      let maxNum = 0;
      for (const v of allCodes) {
        const match = v.vendorCode.match(/^VEN-(\d+)$/i);
        if (match) {
          const n = parseInt(match[1], 10);
          if (!isNaN(n) && n > maxNum) {
            maxNum = n;
          }
        }
      }

      let candidateNum = maxNum + 1;
      while (true) {
        const candidate = `VEN-${String(candidateNum).padStart(4, '0')}`;
        const exists = await prisma.vendor.findUnique({
          where: { vendorCode: candidate },
          select: { id: true },
        });
        if (!exists) {
          vendorCode = candidate;
          break;
        }
        candidateNum++;
      }
    } else {
      const exists = await prisma.vendor.findUnique({
        where: { vendorCode },
        select: { id: true },
      });
      if (exists) {
        vendorCode = `${vendorCode}-${Date.now().toString().slice(-4)}`;
      }
    }

    const normalizedName = normalizeBusinessName(name);

    // Handle custom area name creation if user typed text instead of choosing from dropdown
    let areaId = body.areaId || null;
    const customArea = typeof body.customAreaName === 'string' ? body.customAreaName.trim() : '';
    if (!areaId && customArea) {
      const normArea = customArea.toLowerCase().replace(/[^a-z0-9]/g, '');
      let existingArea = await prisma.vendorLocation.findFirst({
        where: {
          normalizedName: normArea,
          parentId: body.cityId || undefined,
        },
      });
      if (!existingArea) {
        existingArea = await prisma.vendorLocation.create({
          data: {
            name: customArea,
            normalizedName: normArea,
            level: 'AREA',
            country: 'India',
            parentId: body.cityId || null,
          },
        });
      }
      areaId = existingArea.id;
    }

    // Process contacts (phones and emails)
    const contactsData: any[] = [];
    if (Array.isArray(body.contacts)) {
      for (const c of body.contacts) {
        if (!c.value) continue;
        const val = String(c.value).trim();
        const type = c.type === 'EMAIL' ? 'EMAIL' : 'PHONE';

        if (type === 'PHONE') {
          const normPhone = normalizeIndianPhone(val);
          contactsData.push({
            type: 'PHONE',
            value: val,
            normalized: normPhone.normalized || val,
            kind: normPhone.type,
            label: c.label || 'Primary',
            isPrimary: Boolean(c.isPrimary),
            isWhatsApp: normPhone.canWhatsApp,
            isValid: normPhone.isValid,
          });
        } else {
          contactsData.push({
            type: 'EMAIL',
            value: val,
            normalized: val.toLowerCase(),
            kind: 'EMAIL',
            label: c.label || 'Office',
            isPrimary: Boolean(c.isPrimary),
            isValid: val.includes('@'),
          });
        }
      }
    } else if (body.phone) {
      const extracted = extractPhoneNumbers(body.phone);
      for (let i = 0; i < extracted.length; i++) {
        const normPhone = normalizeIndianPhone(extracted[i]);
        contactsData.push({
          type: 'PHONE',
          value: extracted[i],
          normalized: normPhone.normalized || extracted[i],
          kind: normPhone.type,
          label: i === 0 ? 'Primary' : 'Alternative',
          isPrimary: i === 0,
          isWhatsApp: normPhone.canWhatsApp,
          isValid: normPhone.isValid,
        });
      }
    }

    if (body.email && !contactsData.some(c => c.type === 'EMAIL')) {
      contactsData.push({
        type: 'EMAIL',
        value: body.email.trim(),
        normalized: body.email.trim().toLowerCase(),
        kind: 'EMAIL',
        label: 'Primary',
        isPrimary: true,
        isValid: body.email.includes('@'),
      });
    }

    // Prepare category assignments with support for newly typed custom categories
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

    const categoryConnect = finalCategoryIds.map((cid: string) => ({
      category: { connect: { id: cid } },
    }));

    const vendor = await prisma.vendor.create({
      data: {
        vendorCode,
        name,
        normalizedName,
        businessType: body.businessType || 'Retailer / Wholesaler',
        status: body.status || 'ACTIVE',
        doNotContact: Boolean(body.doNotContact),
        contactPerson: body.contactPerson?.trim() || null,
        preferredContactMethod: body.preferredContactMethod || 'WHATSAPP',
        country: 'India',
        stateId: body.stateId || null,
        districtId: body.districtId || null,
        cityId: body.cityId || null,
        areaId: areaId || null,
        fullAddress: body.fullAddress?.trim() || body.address?.trim() || null,
        pincode: body.pincode?.trim() || null,
        notes: body.notes?.trim() || null,
        tags: Array.isArray(body.tags) ? body.tags : [],
        productsBrands: Array.isArray(body.productsBrands) ? body.productsBrands : [],
        contacts: {
          create: contactsData,
        },
        categories: {
          create: categoryConnect,
        },
        activities: {
          create: {
            type: 'IMPORT',
            content: `Vendor profile created manually (${vendorCode}).`,
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
      vendor,
    });
  } catch (error) {
    console.error('POST /api/vendors error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create vendor' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const vendorIds: string[] = Array.isArray(body.vendorIds) ? body.vendorIds : [];

    if (vendorIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'vendorIds array is required' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const archiveOnly = searchParams.get('archive') === 'true' || body.archiveOnly === true;

    if (archiveOnly) {
      await prisma.vendor.updateMany({
        where: { id: { in: vendorIds } },
        data: { status: 'ARCHIVED' },
      });
      return NextResponse.json({
        success: true,
        archivedCount: vendorIds.length,
      });
    }

    // Permanent deletion across all relations in transaction
    await prisma.$transaction([
      prisma.vendorQuotation.deleteMany({ where: { vendorId: { in: vendorIds } } }),
      prisma.vendorEnquiryRecipient.deleteMany({ where: { vendorId: { in: vendorIds } } }),
      prisma.vendorContact.deleteMany({ where: { vendorId: { in: vendorIds } } }),
      prisma.vendorCategoryAssignment.deleteMany({ where: { vendorId: { in: vendorIds } } }),
      prisma.vendorActivityLog.deleteMany({ where: { vendorId: { in: vendorIds } } }),
      prisma.vendorImportRecord.updateMany({
        where: { vendorId: { in: vendorIds } },
        data: { vendorId: null },
      }),
      prisma.vendorImportRecord.updateMany({
        where: { matchVendorId: { in: vendorIds } },
        data: { matchVendorId: null },
      }),
      prisma.vendor.deleteMany({ where: { id: { in: vendorIds } } }),
    ]);

    return NextResponse.json({
      success: true,
      deletedCount: vendorIds.length,
    });
  } catch (error) {
    console.error('DELETE /api/vendors error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete vendors' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const vendorIds: string[] = Array.isArray(body.vendorIds) ? body.vendorIds : [];
    const status = typeof body.status === 'string' ? body.status.trim() : '';

    if (vendorIds.length === 0 || !status) {
      return NextResponse.json(
        { success: false, error: 'vendorIds and status are required' },
        { status: 400 }
      );
    }

    await prisma.vendor.updateMany({
      where: { id: { in: vendorIds } },
      data: { status },
    });

    return NextResponse.json({
      success: true,
      updatedCount: vendorIds.length,
    });
  } catch (error) {
    console.error('PATCH /api/vendors error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update vendors' },
      { status: 500 }
    );
  }
}
