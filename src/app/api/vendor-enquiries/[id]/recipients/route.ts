import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function renderEnquiryMessage(template: string, vars: Record<string, string>): string {
  let text = template;
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
    const vendorIds: string[] = Array.isArray(body.vendorIds) ? body.vendorIds : [];
    const templateId = body.templateId as string | undefined;

    if (vendorIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one vendorId must be selected' },
        { status: 400 }
      );
    }

    const enquiry = await prisma.componentEnquiry.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!enquiry) {
      return NextResponse.json(
        { success: false, error: 'Enquiry not found' },
        { status: 404 }
      );
    }

    // Load template
    let template = templateId
      ? await prisma.vendorMessageTemplate.findUnique({ where: { id: templateId } })
      : await prisma.vendorMessageTemplate.findFirst({
          where: { isDefault: true, channel: 'WHATSAPP' },
        });

    if (!template) {
      template = await prisma.vendorMessageTemplate.findFirst({
        where: { isActive: true },
      });
    }

    // Format component list string
    const componentList = enquiry.items
      .map(
        (it, idx) =>
          `${idx + 1}. ${it.componentName}${it.brand ? ` (${it.brand}${it.model ? ` ${it.model}` : ''})` : ''} - Qty: ${it.quantity}${it.specifications ? ` [${it.specifications}]` : ''}`
      )
      .join('\n');

    const customerLoc = enquiry.customerLocation || enquiry.locationLabel || 'Tamil Nadu';

    const results = [];

    for (const vId of vendorIds) {
      const vendor = await prisma.vendor.findUnique({
        where: { id: vId },
        include: {
          contacts: true,
          city: true,
          area: true,
        },
      });

      if (!vendor) continue;

      const primaryPhone = vendor.contacts.find((c) => c.type === 'PHONE' && c.isPrimary) || vendor.contacts.find((c) => c.type === 'PHONE');
      const primaryEmail = vendor.contacts.find((c) => c.type === 'EMAIL')?.value;

      const renderedBody = template
        ? renderEnquiryMessage(template.body, {
            vendor_name: vendor.name,
            customer_location: customerLoc,
            component_list: componentList,
            urgency: enquiry.urgency || 'Immediate',
            enquiry_code: enquiry.requestCode,
          })
        : `Requirement for ${customerLoc}:\n${componentList}`;

      const renderedSubject = template?.subject
        ? renderEnquiryMessage(template.subject, {
            vendor_name: vendor.name,
            enquiry_code: enquiry.requestCode,
          })
        : `Hardware Component Requirement - ${enquiry.requestCode}`;

      const recipient = await prisma.vendorEnquiryRecipient.upsert({
        where: {
          enquiryId_vendorId: {
            enquiryId: id,
            vendorId: vId,
          },
        },
        update: {
          renderedSubject,
          renderedMessage: renderedBody,
          contactUsed: primaryPhone?.normalized || primaryPhone?.value || primaryEmail || null,
        },
        create: {
          enquiryId: id,
          vendorId: vId,
          status: 'READY_TO_CONTACT',
          channel: primaryPhone?.isWhatsApp ? 'WHATSAPP' : primaryEmail ? 'EMAIL' : 'PHONE',
          contactUsed: primaryPhone?.normalized || primaryPhone?.value || primaryEmail || null,
          renderedSubject,
          renderedMessage: renderedBody,
        },
      });

      results.push(recipient);
    }

    // Update enquiry status to IN_PROGRESS if was OPEN
    if (enquiry.status === 'OPEN') {
      await prisma.componentEnquiry.update({
        where: { id },
        data: { status: 'IN_PROGRESS' },
      });
    }

    await prisma.vendorActivityLog.create({
      data: {
        enquiryId: id,
        type: 'UPDATE',
        content: `Added ${results.length} vendor(s) as enquiry recipients.`,
      },
    });

    return NextResponse.json({
      success: true,
      addedRecipients: results,
    });
  } catch (error) {
    console.error('POST /api/vendor-enquiries/[id]/recipients error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add recipients' },
      { status: 500 }
    );
  }
}
