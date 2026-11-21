import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const template = await prisma.vendorMessageTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error) {
    console.error('GET /api/vendors/templates/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch template' },
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

    const existing = await prisma.vendorMessageTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    const name = typeof body.name === 'string' ? body.name.trim() : existing.name;
    const channel = typeof body.channel === 'string' ? body.channel.trim() : existing.channel;
    const bodyText = typeof body.body === 'string' ? body.body.trim() : existing.body;
    const subject = body.subject !== undefined ? (body.subject ? String(body.subject).trim() : null) : existing.subject;
    const enquiryType = body.enquiryType !== undefined ? body.enquiryType : existing.enquiryType;
    const isDefault = body.isDefault !== undefined ? Boolean(body.isDefault) : existing.isDefault;

    if (!name || !bodyText) {
      return NextResponse.json(
        { success: false, error: 'Template name and body are required' },
        { status: 400 }
      );
    }

    // If marked as default, clear default flag from other templates in the same channel
    if (isDefault) {
      await prisma.vendorMessageTemplate.updateMany({
        where: {
          channel,
          id: { not: id },
        },
        data: {
          isDefault: false,
        },
      });
    }

    const updated = await prisma.vendorMessageTemplate.update({
      where: { id },
      data: {
        name,
        channel,
        subject,
        body: bodyText,
        enquiryType,
        isDefault,
      },
    });

    return NextResponse.json({
      success: true,
      template: updated,
    });
  } catch (error) {
    console.error('PUT /api/vendors/templates/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    const existing = await prisma.vendorMessageTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    const dataToUpdate: any = {};
    if (body.name !== undefined) dataToUpdate.name = String(body.name).trim();
    if (body.body !== undefined) dataToUpdate.body = String(body.body).trim();
    if (body.subject !== undefined) dataToUpdate.subject = body.subject ? String(body.subject).trim() : null;
    if (body.channel !== undefined) dataToUpdate.channel = String(body.channel).trim();
    if (body.isActive !== undefined) dataToUpdate.isActive = Boolean(body.isActive);
    if (body.isDefault !== undefined) {
      const isDef = Boolean(body.isDefault);
      dataToUpdate.isDefault = isDef;
      if (isDef) {
        await prisma.vendorMessageTemplate.updateMany({
          where: {
            channel: dataToUpdate.channel || existing.channel,
            id: { not: id },
          },
          data: { isDefault: false },
        });
      }
    }

    const updated = await prisma.vendorMessageTemplate.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json({
      success: true,
      template: updated,
    });
  } catch (error) {
    console.error('PATCH /api/vendors/templates/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to patch template' },
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
    const existing = await prisma.vendorMessageTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    await prisma.vendorMessageTemplate.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error) {
    console.error('DELETE /api/vendors/templates/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}
