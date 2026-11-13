import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TEMPLATE_CATEGORIES } from '@/lib/outreach-utils';
import { ensureDefaultTemplates } from '@/outreach/template-defaults';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await ensureDefaultTemplates();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category')?.trim();

    const where = category && category !== 'ALL' ? { category } : undefined;
    const templates = await prisma.emailTemplate.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });

    return NextResponse.json({
      success: true,
      templates,
      categories: TEMPLATE_CATEGORIES,
    });
  } catch (error) {
    console.error('GET /api/outreach/templates error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load email templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const category = typeof body.category === 'string' ? body.category.trim() : '';
    const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
    const contentBody = typeof body.body === 'string' ? body.body.trim() : '';
    const isHtml = Boolean(body.isHtml);
    const isDefault = Boolean(body.isDefault);

    if (!name || !category || !subject || !contentBody) {
      return NextResponse.json(
        { success: false, error: 'name, category, subject, and body are required.' },
        { status: 400 }
      );
    }

    const template = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.emailTemplate.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.emailTemplate.create({
        data: {
          name,
          category,
          subject,
          body: contentBody,
          isHtml,
          isDefault,
        },
      });
    });

    return NextResponse.json({ success: true, template }, { status: 201 });
  } catch (error) {
    console.error('POST /api/outreach/templates error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create email template' },
      { status: 500 }
    );
  }
}

