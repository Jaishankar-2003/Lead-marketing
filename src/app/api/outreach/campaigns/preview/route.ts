import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  buildWhatsAppUrl,
  extractLeadEmails,
  extractLeadPhones,
  renderTemplate,
} from '@/lib/outreach-utils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const leadIds = Array.isArray(body.leadIds)
      ? body.leadIds.filter((id: unknown): id is string => typeof id === 'string' && id.trim().length > 0)
      : [];
    const channel = body.channel === 'WHATSAPP' ? 'WHATSAPP' : 'EMAIL';
    const subjectTemplate = typeof body.subject === 'string' ? body.subject : '';
    const bodyTemplate = typeof body.body === 'string' ? body.body : '';
    const excludedSet = new Set<string>(
      Array.isArray(body.excludedLeadIds)
        ? body.excludedLeadIds.filter((id: unknown): id is string => typeof id === 'string')
        : []
    );

    if (leadIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Select at least one lead to audit recipients.' },
        { status: 400 }
      );
    }

    const leads = await prisma.lead.findMany({
      where: { id: { in: leadIds } },
      orderBy: { createdAt: 'desc' },
    });

    if (channel === 'EMAIL') {
      const seenEmails = new Set<string>();
      const eligible: Array<{
        leadId: string;
        businessName: string;
        city: string | null;
        email: string;
        excluded: boolean;
      }> = [];
      const missingEmail: Array<{ leadId: string; businessName: string; city: string | null }> = [];
      const duplicateEmails: Array<{ leadId: string; businessName: string; email: string }> = [];
      const invalidEmails: Array<{ leadId: string; businessName: string; rawValues: string[] }> = [];
      const optedOut: Array<{ leadId: string; businessName: string; reason: string | null }> = [];

      for (const lead of leads) {
        if (lead.doNotContact) {
          optedOut.push({
            leadId: lead.id,
            businessName: lead.businessName,
            reason: lead.optOutReason,
          });
          continue;
        }

        const { valid, invalid } = extractLeadEmails(lead);
        if (valid.length === 0) {
          if (invalid.length > 0) {
            invalidEmails.push({
              leadId: lead.id,
              businessName: lead.businessName,
              rawValues: invalid,
            });
          } else {
            missingEmail.push({
              leadId: lead.id,
              businessName: lead.businessName,
              city: lead.city,
            });
          }
          continue;
        }

        const primaryEmail = valid[0];
        if (seenEmails.has(primaryEmail)) {
          duplicateEmails.push({
            leadId: lead.id,
            businessName: lead.businessName,
            email: primaryEmail,
          });
          continue;
        }

        seenEmails.add(primaryEmail);
        eligible.push({
          leadId: lead.id,
          businessName: lead.businessName,
          city: lead.city,
          email: primaryEmail,
          excluded: excludedSet.has(lead.id),
        });
      }

      const activeLeadsMap = new Map(leads.map((l) => [l.id, l]));
      const activeRecipients = eligible.filter((r) => !r.excluded);
      const samples = activeRecipients.slice(0, 3).map((rec) => {
        const lead = activeLeadsMap.get(rec.leadId)!;
        return {
          leadId: rec.leadId,
          businessName: rec.businessName,
          recipient: rec.email,
          subject: renderTemplate(subjectTemplate || 'Quick note for {{businessName}}', lead, {
            email: rec.email,
          }),
          body: renderTemplate(
            bodyTemplate || 'Hello {{contactName}}, reaching out to {{businessName}}.',
            lead,
            { email: rec.email }
          ),
        };
      });

      return NextResponse.json({
        success: true,
        channel: 'EMAIL',
        summary: {
          selectedCount: leads.length,
          eligibleCount: eligible.length,
          finalRecipientCount: activeRecipients.length,
          missingCount: missingEmail.length,
          duplicateCount: duplicateEmails.length,
          invalidCount: invalidEmails.length,
          optedOutCount: optedOut.length,
        },
        eligible,
        missingEmail,
        duplicateEmails,
        invalidEmails,
        optedOut,
        samples,
      });
    }

    // WHATSAPP channel audit
    const seenPhones = new Set<string>();
    const eligible: Array<{
      leadId: string;
      businessName: string;
      city: string | null;
      phone: string;
      normalizedPhone: string;
      whatsappUrl: string;
      renderedMessage: string;
      excluded: boolean;
    }> = [];
    const missingPhone: Array<{ leadId: string; businessName: string; city: string | null }> = [];
    const invalidPhones: Array<{ leadId: string; businessName: string; rawValues: string[] }> = [];
    const duplicatePhones: Array<{ leadId: string; businessName: string; phone: string }> = [];
    const optedOut: Array<{ leadId: string; businessName: string; reason: string | null }> = [];

    for (const lead of leads) {
      if (lead.doNotContact) {
        optedOut.push({
          leadId: lead.id,
          businessName: lead.businessName,
          reason: lead.optOutReason,
        });
        continue;
      }

      const phoneInfo = extractLeadPhones(lead);
      if (phoneInfo.whatsappPhones.length === 0) {
        if (phoneInfo.invalidPhones.length > 0) {
          invalidPhones.push({
            leadId: lead.id,
            businessName: lead.businessName,
            rawValues: phoneInfo.invalidPhones,
          });
        } else {
          missingPhone.push({
            leadId: lead.id,
            businessName: lead.businessName,
            city: lead.city,
          });
        }
        continue;
      }

      const primary = phoneInfo.whatsappPhones[0];
      if (seenPhones.has(primary.normalized)) {
        duplicatePhones.push({
          leadId: lead.id,
          businessName: lead.businessName,
          phone: primary.raw,
        });
        continue;
      }

      seenPhones.add(primary.normalized);
      const renderedMessage = renderTemplate(
        bodyTemplate ||
          'Hello {{businessName}}, I noticed your listing in {{city}} and wanted to share a quick idea for {{serviceName}}.',
        lead,
        { phone: primary.raw }
      );
      eligible.push({
        leadId: lead.id,
        businessName: lead.businessName,
        city: lead.city,
        phone: primary.raw,
        normalizedPhone: primary.normalized,
        whatsappUrl: buildWhatsAppUrl(primary.normalized, renderedMessage),
        renderedMessage,
        excluded: excludedSet.has(lead.id),
      });
    }

    const activeRecipients = eligible.filter((r) => !r.excluded);

    return NextResponse.json({
      success: true,
      channel: 'WHATSAPP',
      summary: {
        selectedCount: leads.length,
        eligibleCount: eligible.length,
        finalRecipientCount: activeRecipients.length,
        missingCount: missingPhone.length,
        duplicateCount: duplicatePhones.length,
        invalidCount: invalidPhones.length,
        optedOutCount: optedOut.length,
      },
      eligible,
      missingPhone,
      duplicatePhones,
      invalidPhones,
      optedOut,
      samples: activeRecipients.slice(0, 3).map((r) => ({
        leadId: r.leadId,
        businessName: r.businessName,
        recipient: r.normalizedPhone,
        body: r.renderedMessage,
      })),
    });
  } catch (error) {
    console.error('POST /api/outreach/campaigns/preview error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to preview bulk recipients' },
      { status: 500 }
    );
  }
}

