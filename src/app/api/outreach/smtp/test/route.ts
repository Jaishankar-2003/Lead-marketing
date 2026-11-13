import { NextRequest, NextResponse } from 'next/server';
import { getEmailProvider } from '@/outreach/email-provider';
import { isValidEmail, plainTextToHtml } from '@/lib/outreach-utils';
import { checkRateLimit } from '@/lib/outreach-security';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const rl = checkRateLimit('smtp-test', 10, 60_000);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many SMTP test requests. Please wait a minute.' },
        { status: 429 }
      );
    }

    let testRecipient: string | undefined;
    try {
      const body = await request.json();
      if (typeof body?.testRecipient === 'string' && body.testRecipient.trim()) {
        testRecipient = body.testRecipient.trim();
      }
    } catch {
      // Empty request body is allowed for connection-only verify
    }

    const provider = getEmailProvider();
    const verifyResult = await provider.verifyConnection();

    if (!verifyResult.connected || !testRecipient) {
      return NextResponse.json({
        success: verifyResult.connected,
        verification: verifyResult,
      });
    }

    if (!isValidEmail(testRecipient)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid recipient email for test delivery.', verification: verifyResult },
        { status: 400 }
      );
    }

    const text = [
      'LeadPilot Gmail SMTP Connection Test',
      '',
      'Your Gmail SMTP transport is configured and verified successfully.',
      `Provider: ${verifyResult.provider}`,
      `Host: ${verifyResult.host}:${verifyResult.port} (TLS=${verifyResult.secure})`,
      `Sent at: ${new Date().toISOString()}`,
    ].join('\n');

    const sendResult = await provider.sendEmail({
      to: testRecipient,
      subject: 'LeadPilot SMTP Test — Delivery Verified',
      text,
      html: plainTextToHtml(text),
    });

    return NextResponse.json({
      success: sendResult.success,
      verification: verifyResult,
      testEmail: {
        to: testRecipient,
        sent: sendResult.success,
        messageId: sendResult.messageId,
        error: sendResult.errorMessage,
      },
    });
  } catch (error) {
    console.error('POST /api/outreach/smtp/test error:', error);
    return NextResponse.json(
      { success: false, error: 'SMTP verification failed unexpectedly' },
      { status: 500 }
    );
  }
}

