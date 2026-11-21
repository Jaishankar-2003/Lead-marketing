import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channel = searchParams.get('channel')?.trim();

    const where: any = { isActive: true };
    if (channel && channel !== 'ALL') where.channel = channel;

    const templates = await prisma.vendorMessageTemplate.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });

    return NextResponse.json({
      success: true,
      templates,
    });
  } catch (error) {
    console.error('GET /api/vendors/templates error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch vendor templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const channel = typeof body.channel === 'string' ? body.channel.trim() : 'WHATSAPP';
    const bodyText = typeof body.body === 'string' ? body.body.trim() : '';

    if (!name || !bodyText) {
      return NextResponse.json(
        { success: false, error: 'Template name and body are required' },
        { status: 400 }
      );
    }

    const template = await prisma.vendorMessageTemplate.create({
      data: {
        name,
        channel,
        enquiryType: body.enquiryType || 'CUSTOM',
        subject: body.subject?.trim() || null,
        body: bodyText,
        isDefault: Boolean(body.isDefault),
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error) {
    console.error('POST /api/vendors/templates error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create vendor template' },
      { status: 500 }
    );
  }
}
