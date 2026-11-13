import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const existing = await prisma.emailTemplate.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Duplicate action support
    if (body.action === 'duplicate') {
      const copy = await prisma.emailTemplate.create({
        data: {
          name: `${existing.name} (Copy)`,
          category: existing.category,
          subject: existing.subject,
          body: existing.body,
          isHtml: existing.isHtml,
          isDefault: false,
        },
      });
      return NextResponse.json({ success: true, template: copy }, { status: 201 });
    }

    const updateData: {
      name?: string;
      category?: string;
      subject?: string;
      body?: string;
      isHtml?: boolean;
      isDefault?: boolean;
    } = {};

    if (typeof body.name === 'string') {
      const trimmed = body.name.trim();
      if (!trimmed) {
        return NextResponse.json({ success: false, error: 'Template name cannot be empty' }, { status: 400 });
      }
      updateData.name = trimmed;
    }
    if (typeof body.category === 'string') {
      const trimmed = body.category.trim();
      if (!trimmed) {
        return NextResponse.json({ success: false, error: 'Category cannot be empty' }, { status: 400 });
      }
      updateData.category = trimmed;
    }
    if (typeof body.subject === 'string') {
      const trimmed = body.subject.trim();
      if (!trimmed) {
        return NextResponse.json({ success: false, error: 'Subject cannot be empty' }, { status: 400 });
      }
      updateData.subject = trimmed;
    }
    if (typeof body.body === 'string') {
      const trimmed = body.body.trim();
      if (!trimmed) {
        return NextResponse.json({ success: false, error: 'Body cannot be empty' }, { status: 400 });
      }
      updateData.body = trimmed;
    }
    if (typeof body.isHtml === 'boolean') {
      updateData.isHtml = body.isHtml;
    }
    if (typeof body.isDefault === 'boolean') {
      updateData.isDefault = body.isDefault;
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (updateData.isDefault === true) {
        await tx.emailTemplate.updateMany({
          where: { isDefault: true, id: { not: params.id } },
          data: { isDefault: false },
        });
      }
      return tx.emailTemplate.update({
        where: { id: params.id },
        data: updateData,
      });
    });

    return NextResponse.json({ success: true, template: updated });
  } catch (error) {
    console.error('PATCH /api/outreach/templates/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update email template' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const existing = await prisma.emailTemplate.findUnique({
      where: { id: params.id },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    await prisma.emailTemplate.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/outreach/templates/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete email template' },
      { status: 500 }
    );
  }
}

