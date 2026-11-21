import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status')?.trim();
    const priority = searchParams.get('priority')?.trim();
    const search = searchParams.get('search')?.trim();

    const where: any = {};
    if (status && status !== 'ALL') where.status = status;
    if (priority && priority !== 'ALL') where.priority = priority;

    if (search) {
      where.OR = [
        { requestCode: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerLocation: { contains: search, mode: 'insensitive' } },
        {
          items: {
            some: {
              componentName: { contains: search, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    const enquiries = await prisma.componentEnquiry.findMany({
      where,
      include: {
        items: {
          include: {
            category: true,
          },
        },
        recipients: {
          include: {
            vendor: {
              select: {
                id: true,
                name: true,
                city: true,
                area: true,
              },
            },
          },
        },
        quotations: {
          include: {
            vendor: {
              select: {
                id: true,
                name: true,
                vendorCode: true,
                city: true,
                area: true,
              },
            },
            item: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return NextResponse.json({
      success: true,
      enquiries,
    });
  } catch (error) {
    console.error('GET /api/vendor-enquiries error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch enquiries' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const items = Array.isArray(body.items) ? body.items : [];

    if (items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one component item is required' },
        { status: 400 }
      );
    }

    // Generate requestCode: ENQ-YYYYMM-XXXX collision-safe
    const now = new Date();
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `ENQ-${yyyymm}-`;

    const existingEnquiries = await prisma.componentEnquiry.findMany({
      where: { requestCode: { startsWith: prefix } },
      select: { requestCode: true },
    });

    let maxNum = 0;
    for (const e of existingEnquiries) {
      const match = e.requestCode.match(new RegExp(`^${prefix}(\\d+)$`));
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }

    let nextNum = maxNum + 1;
    let candidateCode = `${prefix}${String(nextNum).padStart(3, '0')}`;
    while (await prisma.componentEnquiry.findUnique({ where: { requestCode: candidateCode } })) {
      nextNum += 1;
      candidateCode = `${prefix}${String(nextNum).padStart(3, '0')}`;
    }
    const requestCode = candidateCode;

    const enquiry = await prisma.componentEnquiry.create({
      data: {
        requestCode,
        customerName: body.customerName?.trim() || null,
        customerPhone: body.customerPhone?.trim() || null,
        shareCustomerContact: Boolean(body.shareCustomerContact),
        customerLocation: body.customerLocation?.trim() || null,
        cityId: body.cityId || null,
        areaId: body.areaId || null,
        locationLabel: body.locationLabel || null,
        priority: body.priority || 'NORMAL',
        urgency: body.urgency || 'Immediate / Today',
        deliveryPreference: body.deliveryPreference || 'EITHER',
        preferredContact: body.preferredContact || 'WHATSAPP',
        internalNotes: body.internalNotes?.trim() || null,
        status: 'OPEN',
        items: {
          create: items.map((item: any) => ({
            componentName: item.componentName?.trim() || 'Custom Component',
            brand: item.brand?.trim() || null,
            model: item.model?.trim() || null,
            specifications: item.specifications?.trim() || null,
            quantity: Math.max(1, parseInt(item.quantity || '1', 10)),
            budget: item.budget?.trim() || null,
            onlinePrice: item.onlinePrice != null && !isNaN(Number(item.onlinePrice)) ? Number(item.onlinePrice) : null,
            requirements: item.requirements?.trim() || null,
            categoryId: item.categoryId || null,
          })),
        },
        activities: {
          create: {
            type: 'STATUS_CHANGE',
            content: `Enquiry ${requestCode} created with ${items.length} item(s).`,
          },
        },
      },
      include: {
        items: {
          include: {
            category: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      enquiry,
    });
  } catch (error) {
    console.error('POST /api/vendor-enquiries error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create enquiry' },
      { status: 500 }
    );
  }
}
