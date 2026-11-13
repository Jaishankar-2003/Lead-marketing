import { NextResponse } from 'next/server';
import { getEmailProvider } from '@/outreach/email-provider';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const provider = getEmailProvider();
    const status = provider.getConfigStatus();
    return NextResponse.json({
      success: true,
      smtp: status,
    });
  } catch (error) {
    console.error('GET /api/outreach/smtp error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to read SMTP status' },
      { status: 500 }
    );
  }
}

