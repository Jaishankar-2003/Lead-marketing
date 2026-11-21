import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { openPersistentWhatsAppChat } from '@/outreach/whatsapp-session';
import { normalizeIndianPhone } from '@/lib/vendors/phoneUtils';

export const dynamic = 'force-dynamic';

function renderTemplateText(templateText: string, vars: Record<string, string>): string {
  let text = templateText;
  for (const [key, val] of Object.entries(vars)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    text = text.replace(regex, val);
  }
  return text;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const recipientId = body.recipientId?.trim();
    const customMessage = body.message as string | undefined;
    const templateId = body.templateId as string | undefined;
    const customContact = body.contactUsed as string | undefined;

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
        enquiry: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!recipient || recipient.enquiryId !== id) {
      return NextResponse.json(
        { success: false, error: 'Recipient not found for this enquiry' },
        { status: 404 }
      );
    }

    // Determine phone number to use
    const contactToUse =
      customContact?.trim() ||
      recipient.contactUsed ||
      recipient.vendor.contacts.find((c) => c.type === 'PHONE' && c.isPrimary)?.normalized ||
      recipient.vendor.contacts.find((c) => c.type === 'PHONE')?.value;

    if (!contactToUse) {
      return NextResponse.json(
        { success: false, error: 'Vendor has no valid phone number' },
        { status: 400 }
      );
    }

    const norm = normalizeIndianPhone(contactToUse);
    const cleanDigits = norm.cleanDigits;
    const intlDigits = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;

    // Resolve message: customMessage > templateId > recipient.renderedMessage > default
    let message = customMessage?.trim();

    if (!message && templateId) {
      const template = await prisma.vendorMessageTemplate.findUnique({ where: { id: templateId } });
      if (template) {
        const componentList = recipient.enquiry.items
          .map((it, idx) => `${idx + 1}. ${it.componentName}${it.brand ? ` (${it.brand})` : ''} - Qty: ${it.quantity}${it.specifications ? ` [${it.specifications}]` : ''}`)
          .join('\n');

        message = renderTemplateText(template.body, {
          vendor_name: recipient.vendor.name,
          customer_location: recipient.enquiry.customerLocation || 'Tamil Nadu',
          component_list: componentList,
          urgency: recipient.enquiry.urgency || 'Immediate',
          enquiry_code: recipient.enquiry.requestCode,
        });
      }
    }

    if (!message) {
      message = recipient.renderedMessage || `Hello ${recipient.vendor.name}, urgent requirement for components regarding ${recipient.enquiry.requestCode}`;
    }

    const directWhatsAppWebUrl = `https://web.whatsapp.com/send?phone=${intlDigits}&text=${encodeURIComponent(message)}`;

    // Try persistent browser session if available
    let openResult;
    try {
      openResult = await openPersistentWhatsAppChat(
        norm.normalized || contactToUse,
        message
      );
    } catch (e: any) {
      openResult = {
        success: true,
        mode: 'external_fallback',
        targetUrl: directWhatsAppWebUrl,
        normalizedPhone: norm.normalized,
        reusedSession: false,
        needsQrAuth: false,
        statusMessage: e.message || 'Direct WhatsApp Web link generated.',
      };
    }

    // Update recipient status to CHAT_OPENED and record message
    const updated = await prisma.vendorEnquiryRecipient.update({
      where: { id: recipientId },
      data: {
        status: 'CHAT_OPENED',
        channel: 'WHATSAPP',
        chatOpenedAt: new Date(),
        renderedMessage: message,
        contactUsed: norm.normalized || contactToUse,
        attempts: { increment: 1 },
      },
    });

    await prisma.vendorActivityLog.create({
      data: {
        vendorId: recipient.vendorId,
        enquiryId: id,
        recipientId,
        type: 'WHATSAPP',
        status: 'CHAT_OPENED',
        channel: 'WHATSAPP',
        content: `WhatsApp chat opened for vendor ${recipient.vendor.name} (${norm.nationalFormat}).`,
      },
    });

    return NextResponse.json({
      success: true,
      openResult,
      directUrl: directWhatsAppWebUrl,
      recipient: updated,
      message,
    });
  } catch (error) {
    console.error('POST /api/vendor-enquiries/[id]/whatsapp/open error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to open WhatsApp chat' },
      { status: 500 }
    );
  }
}
