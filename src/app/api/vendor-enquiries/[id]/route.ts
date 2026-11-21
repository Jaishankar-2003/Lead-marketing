import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const enquiry = await prisma.componentEnquiry.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            category: true,
          },
          orderBy: { id: 'asc' },
        },
        recipients: {
          include: {
            vendor: {
              include: {
                contacts: true,
                city: true,
                area: true,
              },
            },
            quotations: {
              include: {
                item: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        quotations: {
          include: {
            vendor: true,
            item: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 30,
        },
      },
    });

    if (!enquiry) {
      return NextResponse.json(
        { success: false, error: 'Enquiry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      enquiry,
    });
  } catch (error) {
    console.error('GET /api/vendor-enquiries/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch enquiry' },
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

    const existing = await prisma.componentEnquiry.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Enquiry not found' },
        { status: 404 }
      );
    }

    // Update items if provided
    if (Array.isArray(body.items)) {
      const incomingItemIds = new Set(body.items.filter((it: any) => it.id).map((it: any) => it.id));

      // Delete items removed from list
      const itemsToDelete = existing.items.filter((it) => !incomingItemIds.has(it.id));
      if (itemsToDelete.length > 0) {
        await prisma.componentEnquiryItem.deleteMany({
          where: { id: { in: itemsToDelete.map((it) => it.id) } },
        });
      }

      // Upsert/Update items
      for (const it of body.items) {
        const onlinePrice = it.onlinePrice != null && !isNaN(Number(it.onlinePrice)) ? Number(it.onlinePrice) : null;
        const qty = Math.max(1, parseInt(it.quantity || '1', 10));

        if (it.id && existing.items.some((ex) => ex.id === it.id)) {
          await prisma.componentEnquiryItem.update({
            where: { id: it.id },
            data: {
              componentName: it.componentName?.trim() || 'Custom Component',
              brand: it.brand?.trim() || null,
              model: it.model?.trim() || null,
              specifications: it.specifications?.trim() || null,
              quantity: qty,
              onlinePrice,
              categoryId: it.categoryId || null,
            },
          });
        } else {
          await prisma.componentEnquiryItem.create({
            data: {
              enquiryId: id,
              componentName: it.componentName?.trim() || 'Custom Component',
              brand: it.brand?.trim() || null,
              model: it.model?.trim() || null,
              specifications: it.specifications?.trim() || null,
              quantity: qty,
              onlinePrice,
              categoryId: it.categoryId || null,
            },
          });
        }
      }
    }

    const updated = await prisma.componentEnquiry.update({
      where: { id },
      data: {
        customerName: body.customerName !== undefined ? body.customerName : existing.customerName,
        status: body.status !== undefined ? body.status : existing.status,
        priority: body.priority !== undefined ? body.priority : existing.priority,
        internalNotes: body.internalNotes !== undefined ? body.internalNotes : existing.internalNotes,
        customerLocation: body.customerLocation !== undefined ? body.customerLocation : existing.customerLocation,
        urgency: body.urgency !== undefined ? body.urgency : existing.urgency,
        activities: {
          create: {
            type: 'UPDATE',
            content: `Enquiry status/details updated${body.status ? ` (Status: ${body.status})` : ''}.`,
          },
        },
      },
      include: {
        items: {
          include: { category: true },
        },
        recipients: {
          include: {
            vendor: {
              include: {
                contacts: true,
                city: true,
                area: true,
              },
            },
          },
        },
        quotations: {
          include: {
            vendor: true,
            item: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      enquiry: updated,
    });
  } catch (error) {
    console.error('PUT /api/vendor-enquiries/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update enquiry' },
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
    await prisma.componentEnquiry.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Enquiry deleted successfully',
    });
  } catch (error) {
    console.error('DELETE /api/vendor-enquiries/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete enquiry' },
      { status: 500 }
    );
  }
}
