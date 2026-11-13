import { ServiceProspect } from '@prisma/client';

export function normalizeDomain(rawUrl?: string | null): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  try {
    let clean = rawUrl.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'https://' + clean;
    }
    const parsed = new URL(clean);
    return parsed.hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return rawUrl.trim().toLowerCase().replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0] || null;
  }
}

export function normalizePhone(rawPhone?: string | null): string | null {
  if (!rawPhone || typeof rawPhone !== 'string') return null;
  // Keep only digits
  const digits = rawPhone.replace(/\D/g, '');
  if (!digits) return null;
  // If Indian 12-digit with 91 prefix, or 11 with 0 prefix, take last 10 digits
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits;
}

export interface CategorizationResult {
  serviceProspect: ServiceProspect;
  prospectReason: string;
}

/**
 * Strictly evidence-based lead classification:
 * Based on business category keywords and website availability.
 * Does not make subjective assumptions about buying intent.
 */
export function categorizeLead(data: {
  category?: string | null;
  businessName?: string | null;
  website?: string | null;
}): CategorizationResult {
  const categoryText = `${data.category || ''} ${data.businessName || ''}`.toLowerCase();
  const hasWebsite = Boolean(data.website && data.website.trim().length > 3);

  const isPcOrItBusiness =
    /pc repair|computer service|laptop service|hardware|it support|it solution|network service|computer shop|desktop repair/i.test(
      categoryText
    );

  const isGeneralBusinessWithoutWebsite = !hasWebsite;

  if (isPcOrItBusiness && !hasWebsite) {
    return {
      serviceProspect: ServiceProspect.BOTH,
      prospectReason: 'PC/IT category verified + No public website found in directory listing.',
    };
  }

  if (isPcOrItBusiness) {
    return {
      serviceProspect: ServiceProspect.PC_SUPPORT,
      prospectReason: 'Business category explicitly matches PC / IT Support services.',
    };
  }

  if (isGeneralBusinessWithoutWebsite) {
    return {
      serviceProspect: ServiceProspect.WEBSITE_DEV,
      prospectReason: 'Established business listing with phone/location but no public website recorded.',
    };
  }

  return {
    serviceProspect: ServiceProspect.GENERAL_BUSINESS,
    prospectReason: 'Business category verified with existing registered website.',
  };
}
