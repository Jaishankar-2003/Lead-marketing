import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const quotations = await prisma.vendorQuotation.findMany({
      where: { enquiryId: id },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            vendorCode: true,
            city: true,
            area: true,
            contacts: {
              where: { isPrimary: true },
              select: { value: true, normalized: true, isWhatsApp: true },
            },
          },
        },
        item: true,
        recipient: {
          select: {
            status: true,
            chatOpenedAt: true,
            sentConfirmedAt: true,
          },
        },
      },
      orderBy: [{ unitPrice: 'asc' }, { createdAt: 'desc' }],
    });

    // Group quotations by component item for side-by-side comparison
    const items = await prisma.componentEnquiryItem.findMany({
      where: { enquiryId: id },
      include: { category: true },
      orderBy: { id: 'asc' },
    });

    const itemComparison = items.map((item) => {
      const itemQuotes = quotations.filter((q) => q.itemId === item.id);
      const lowestPrice = itemQuotes.length > 0
        ? Math.min(...itemQuotes.map((q) => q.totalPrice || q.unitPrice || Infinity))
        : null;

      const onlinePrice = item.onlinePrice || null;
      let savingsAmount: number | null = null;
      let savingsPercent: number | null = null;

      if (onlinePrice && lowestPrice) {
        savingsAmount = onlinePrice - lowestPrice;
        savingsPercent = Math.round((savingsAmount / onlinePrice) * 100);
      }

      return {
        item,
        quotes: itemQuotes,
        lowestPrice,
        onlinePrice,
        savingsAmount,
        savingsPercent,
      };
    });

    return NextResponse.json({
      success: true,
      quotations,
      itemComparison,
    });
  } catch (error) {
    console.error('GET /api/vendor-enquiries/[id]/quotations error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch quotations' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const recipientId = body.recipientId?.trim();
    const itemId = body.itemId?.trim() || null;

    if (!recipientId) {
      return NextResponse.json(
        { success: false, error: 'recipientId is required' },
        { status: 400 }
      );
    }

    const recipient = await prisma.vendorEnquiryRecipient.findUnique({
      where: { id: recipientId },
      include: { vendor: true },
    });

    if (!recipient || recipient.enquiryId !== id) {
      return NextResponse.json(
        { success: false, error: 'Recipient not found' },
        { status: 404 }
      );
    }

    const unitPrice = body.unitPrice != null ? parseFloat(body.unitPrice) : null;
    const gstPercent = body.gstPercent != null ? parseFloat(body.gstPercent) : 18;
    const qty = body.availableQty != null ? parseInt(body.availableQty, 10) : 1;
    const deliveryCharge = body.deliveryCharge != null ? parseFloat(body.deliveryCharge) : 0;

    let gstAmount: number | null = null;
    let totalPrice: number | null = null;

    if (unitPrice != null && !isNaN(unitPrice)) {
      gstAmount = (unitPrice * (gstPercent || 0)) / 100;
      totalPrice = (unitPrice + gstAmount) * qty + deliveryCharge;
    }

    // Optional update of online price on item
    if (itemId && body.onlinePrice != null && !isNaN(Number(body.onlinePrice))) {
      await prisma.componentEnquiryItem.update({
        where: { id: itemId },
        data: { onlinePrice: Number(body.onlinePrice) },
      });
    }

    const quotation = await prisma.vendorQuotation.create({
      data: {
        enquiryId: id,
        recipientId,
        vendorId: recipient.vendorId,
        itemId,
        availability: body.availability || 'AVAILABLE',
        availableQty: qty,
        brand: body.brand?.trim() || null,
        model: body.model?.trim() || null,
        unitPrice,
        gstPercent,
        gstAmount,
        deliveryCharge,
        totalPrice,
        warranty: body.warranty?.trim() || null,
        deliveryTime: body.deliveryTime?.trim() || null,
        paymentTerms: body.paymentTerms?.trim() || null,
        remarks: body.remarks?.trim() || null,
        responseDate: new Date(),
      },
    });

    // Update recipient responded state
    await prisma.vendorEnquiryRecipient.update({
      where: { id: recipientId },
      data: {
        status: 'QUOTE_RECEIVED',
        respondedAt: new Date(),
      },
    });

    await prisma.vendorActivityLog.create({
      data: {
        vendorId: recipient.vendorId,
        enquiryId: id,
        recipientId,
        type: 'QUOTATION',
        status: 'QUOTE_RECEIVED',
        content: `Quotation recorded from ${recipient.vendor.name}: ₹${totalPrice ?? unitPrice ?? 'N/A'}${body.availability ? ` (${body.availability})` : ''}.`,
      },
    });

    return NextResponse.json({
      success: true,
      quotation,
    });
  } catch (error) {
    console.error('POST /api/vendor-enquiries/[id]/quotations error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to record quotation' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const quoteId = body.quoteId?.trim();

    if (!quoteId) {
      return NextResponse.json(
        { success: false, error: 'quoteId is required' },
        { status: 400 }
      );
    }

    await prisma.vendorQuotation.delete({
      where: { id: quoteId },
    });

    return NextResponse.json({
      success: true,
      message: 'Quotation deleted successfully',
    });
  } catch (error) {
    console.error('DELETE /api/vendor-enquiries/[id]/quotations error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete quotation' },
      { status: 500 }
    );
  }
}
