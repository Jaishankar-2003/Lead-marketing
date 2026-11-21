import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const recipientId = body.recipientId?.trim();

    if (!recipientId) {
      return NextResponse.json(
        { success: false, error: 'recipientId is required' },
        { status: 400 }
      );
    }

    const recipient = await prisma.vendorEnquiryRecipient.findUnique({
      where: { id: recipientId },
      include: {
        vendor: true,
      },
    });

    if (!recipient || recipient.enquiryId !== id) {
      return NextResponse.json(
        { success: false, error: 'Recipient not found' },
        { status: 404 }
      );
    }

    const updated = await prisma.vendorEnquiryRecipient.update({
      where: { id: recipientId },
      data: {
        status: 'SENT_CONFIRMED',
        sentConfirmedAt: new Date(),
      },
    });

    await prisma.vendor.update({
      where: { id: recipient.vendorId },
      data: { lastContactedAt: new Date() },
    });

    await prisma.vendorActivityLog.create({
      data: {
        vendorId: recipient.vendorId,
        enquiryId: id,
        recipientId,
        type: 'WHATSAPP',
        status: 'SENT_CONFIRMED',
        channel: 'WHATSAPP',
        content: `User confirmed WhatsApp message sent to ${recipient.vendor.name}.`,
      },
    });

    return NextResponse.json({
      success: true,
      recipient: updated,
    });
  } catch (error) {
    console.error('POST /api/vendor-enquiries/[id]/whatsapp/confirm error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to confirm WhatsApp send' },
      { status: 500 }
    );
  }
}
