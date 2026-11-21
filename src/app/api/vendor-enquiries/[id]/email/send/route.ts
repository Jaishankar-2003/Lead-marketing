import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getEmailProvider } from '@/outreach/email-provider';

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
        vendor: {
          include: {
            contacts: true,
          },
        },
        enquiry: true,
      },
    });

    if (!recipient || recipient.enquiryId !== id) {
      return NextResponse.json(
        { success: false, error: 'Recipient not found' },
        { status: 404 }
      );
    }

    // Find vendor email
    const emailContact =
      recipient.vendor.contacts.find((c) => c.type === 'EMAIL' && c.isPrimary) ||
      recipient.vendor.contacts.find((c) => c.type === 'EMAIL');

    if (!emailContact || !emailContact.value) {
      return NextResponse.json(
        { success: false, error: 'Vendor does not have a registered email address' },
        { status: 400 }
      );
    }

    const emailProvider = getEmailProvider();
    const subject = recipient.renderedSubject || `Component Requirement - ${recipient.enquiry.requestCode}`;
    const text = recipient.renderedMessage || 'Please provide quotation for required components.';

    const sendResult = await emailProvider.sendEmail({
      to: emailContact.value,
      subject,
      text,
    });

    if (sendResult.success) {
      const updated = await prisma.vendorEnquiryRecipient.update({
        where: { id: recipientId },
        data: {
          status: 'SENT_CONFIRMED',
          channel: 'EMAIL',
          emailSentAt: new Date(),
          attempts: { increment: 1 },
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
          type: 'EMAIL',
          status: 'SENT',
          channel: 'EMAIL',
          content: `Enquiry email sent to ${recipient.vendor.name} (${emailContact.value}).`,
        },
      });

      return NextResponse.json({
        success: true,
        sendResult,
        recipient: updated,
      });
    } else {
      await prisma.vendorEnquiryRecipient.update({
        where: { id: recipientId },
        data: {
          status: 'FAILED',
          errorDetails: sendResult.errorMessage || 'Failed to send email',
          attempts: { increment: 1 },
        },
      });

      await prisma.vendorActivityLog.create({
        data: {
          vendorId: recipient.vendorId,
          enquiryId: id,
          recipientId,
          type: 'EMAIL',
          status: 'FAILED',
          channel: 'EMAIL',
          content: `Failed to send email to ${recipient.vendor.name}: ${sendResult.errorMessage}`,
        },
      });

      return NextResponse.json(
        {
          success: false,
          error: sendResult.errorMessage || 'Failed to send email',
          sendResult,
        },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error('POST /api/vendor-enquiries/[id]/email/send error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send enquiry email' },
      { status: 500 }
    );
  }
}
