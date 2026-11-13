export interface LeadContactLike {
  id?: string;
  businessName?: string | null;
  contactName?: string | null;
  city?: string | null;
  website?: string | null;
  email?: string | null;
  enrichedEmail?: string | null;
  phone?: string | null;
  enrichedPhone?: string | null;
  serviceProspect?: string | null;
  category?: string | null;
  crmStatus?: string | null;
  seoScore?: number | null;
  websiteStatus?: string | null;
  contactUrl?: string | null;
  linkedinUrl?: string | null;
  doNotContact?: boolean | null;
}

export const TEMPLATE_CATEGORIES = [
  'General Business Introduction',
  'Website Development Proposal',
  'Website Redesign',
  'SEO Improvement',
  'Google Business / Online Presence',
  'IT Support Services',
  'Computer Repair & Technical Support',
  'Follow-up Email',
] as const;

export const SUPPORTED_PLACEHOLDERS = [
  { key: '{{businessName}}', description: 'Company / Business name' },
  { key: '{{contactName}}', description: 'Contact person or team name' },
  { key: '{{city}}', description: 'City / Market location' },
  { key: '{{website}}', description: 'Business website URL' },
  { key: '{{email}}', description: 'Primary recipient email address' },
  { key: '{{phone}}', description: 'Primary business phone number' },
  { key: '{{serviceName}}', description: 'Recommended service pitch' },
  { key: '{{senderName}}', description: 'Sender name (Jai Shankar)' },
  { key: '{{portfolioUrl}}', description: 'Freelance development portfolio' },
  { key: '{{companyWebsite}}', description: 'JSPCS computer & IT services website' },
] as const;

const STRICT_EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;

export function isValidEmail(email?: string | null): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || trimmed.length > 254) return false;
  if (!STRICT_EMAIL_REGEX.test(trimmed)) return false;
  // Filter obvious image/asset false positives
  if (/\.(png|jpg|jpeg|gif|webp|svg|css|js|ico)$/i.test(trimmed)) return false;
  return true;
}

/**
 * Extracts all unique valid email addresses from a lead (handles comma/semicolon-separated strings
 * across both `email` and `enrichedEmail`).
 */
export function extractLeadEmails(lead: LeadContactLike): {
  valid: string[];
  invalid: string[];
} {
  const rawSources = [lead.email, lead.enrichedEmail].filter(
    (v): v is string => typeof v === 'string' && v.trim().length > 0
  );

  const validSet = new Set<string>();
  const invalidSet = new Set<string>();

  for (const src of rawSources) {
    const tokens = src
      .split(/[,;\n\r]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const token of tokens) {
      const lower = token.toLowerCase();
      if (isValidEmail(lower)) {
        validSet.add(lower);
      } else {
        invalidSet.add(token);
      }
    }
  }

  return {
    valid: Array.from(validSet),
    invalid: Array.from(invalidSet),
  };
}

/**
 * Normalizes a phone number into clean digits suitable for WhatsApp wa.me links.
 * Handles Indian 10-digit mobile numbers, 0-prefixed numbers, and +91 prefixed numbers.
 * Returns null if the number is invalid or too short.
 */
export function normalizeWhatsAppPhone(rawPhone?: string | null): string | null {
  if (!rawPhone || typeof rawPhone !== 'string') return null;
  const trimmed = rawPhone.trim();
  if (!trimmed) return null;

  // Strip everything except digits
  let digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;

  // Handle Indian landline or 0-prefixed mobile: e.g., 09876543210 -> 919876543210
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  // Indian 10-digit mobile number starting with 6,7,8,9 -> prepend 91
  if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) {
    return `91${digits}`;
  }

  // Already has 91 country code + 10-digit Indian mobile number
  if (digits.length === 12 && digits.startsWith('91') && /^[6-9]\d{9}$/.test(digits.slice(2))) {
    return digits;
  }

  // International numbers with country code (minimum 10 digits, max 15 digits per E.164)
  // Avoid Indian landline numbers like 0452... (usually not WhatsApp capable if 10 digits starting with 4/2/etc unless prefixed)
  if (digits.length >= 11 && digits.length <= 15 && !digits.startsWith('0')) {
    return digits;
  }

  return null;
}

/**
 * Extracts all valid phone numbers (display + WhatsApp-normalized) from a lead.
 */
export function extractLeadPhones(lead: LeadContactLike): {
  rawPhones: string[];
  whatsappPhones: { raw: string; normalized: string }[];
  invalidPhones: string[];
} {
  const rawSources = [lead.phone, lead.enrichedPhone].filter(
    (v): v is string => typeof v === 'string' && v.trim().length > 0
  );

  const rawSet = new Set<string>();
  const whatsappMap = new Map<string, string>(); // normalized -> raw
  const invalidSet = new Set<string>();

  for (const src of rawSources) {
    const tokens = src
      .split(/[,;/|\n\r]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const token of tokens) {
      const digitsOnly = token.replace(/\D/g, '');
      if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
        rawSet.add(token);
      } else if (token.length > 0) {
        invalidSet.add(token);
      }

      const wa = normalizeWhatsAppPhone(token);
      if (wa && !whatsappMap.has(wa)) {
        whatsappMap.set(wa, token);
      }
    }
  }

  return {
    rawPhones: Array.from(rawSet),
    whatsappPhones: Array.from(whatsappMap.entries()).map(([normalized, raw]) => ({
      raw,
      normalized,
    })),
    invalidPhones: Array.from(invalidSet),
  };
}

/**
 * Builds a clean WhatsApp click-to-chat URL with no spaces or invalid characters in the phone segment.
 */
export function buildWhatsAppUrl(normalizedPhone: string, message?: string): string {
  const cleanDigits = normalizedPhone.replace(/\D/g, '');
  if (!cleanDigits) return '';
  if (message && message.trim()) {
    return `https://wa.me/${cleanDigits}?text=${encodeURIComponent(message.trim())}`;
  }
  return `https://wa.me/${cleanDigits}`;
}

/**
 * Builds a direct WhatsApp Web URL (skips the wa.me landing interstitial so authenticated sessions open the chat directly).
 */
export function buildWhatsAppWebUrl(normalizedPhone: string, message?: string): string {
  const cleanDigits = normalizedPhone.replace(/\D/g, '');
  if (!cleanDigits) return '';
  if (message && message.trim()) {
    return `https://web.whatsapp.com/send?phone=${cleanDigits}&text=${encodeURIComponent(message.trim())}`;
  }
  return `https://web.whatsapp.com/send?phone=${cleanDigits}`;
}

export function getServiceLabel(serviceProspect?: string | null): string {
  switch (serviceProspect) {
    case 'PC_SUPPORT':
      return 'PC Repair & IT Support Services';
    case 'WEBSITE_DEV':
      return 'Website Design & Development';
    case 'BOTH':
      return 'Website Development & IT Support';
    case 'GENERAL_BUSINESS':
      return 'Digital Growth & Web Solutions';
    case 'NEEDS_REVIEW':
      return 'Business Technology Consulting';
    default:
      return 'Web Development & IT Services';
  }
}

/**
 * Replaces template placeholders cleanly without ever outputting "undefined", "null", or broken "{{...}}" markers.
 */
export function renderTemplate(
  templateText: string,
  lead: LeadContactLike,
  overrides?: { email?: string; phone?: string; serviceName?: string }
): string {
  if (!templateText) return '';

  const emails = extractLeadEmails(lead);
  const phones = extractLeadPhones(lead);

  const safeBusinessName = (lead.businessName || '').trim() || 'your business';
  const safeContactName = (lead.contactName || '').trim() || `${safeBusinessName} Team`;
  const safeCity = (lead.city || '').trim() || 'your city';
  const safeWebsite = (lead.website || '').trim() || 'your online presence';
  const safeEmail = (overrides?.email || emails.valid[0] || '').trim() || '';
  const safePhone = (overrides?.phone || phones.rawPhones[0] || '').trim() || '';
  const safeService = (overrides?.serviceName || getServiceLabel(lead.serviceProspect)).trim();

  const replacements: Record<string, string> = {
    businessName: safeBusinessName,
    contactName: safeContactName,
    city: safeCity,
    website: safeWebsite,
    email: safeEmail,
    phone: safePhone,
    serviceName: safeService,
    senderName: 'Jai Shankar',
    portfolioUrl: 'https://jaishankar-ops.vercel.app/',
    companyWebsite: 'https://jspcs.online',
  };

  let rendered = templateText.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key) => {
    if (Object.prototype.hasOwnProperty.call(replacements, key)) {
      return replacements[key];
    }
    return '';
  });

  // Clean up any accidental double spaces or trailing punctuation gaps when optional values were empty
  rendered = rendered.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n');
  return rendered.trim();
}

export const OFFICIAL_SENDER_NAME = 'Jai Shankar';
export const OFFICIAL_SENDER_PHONE = '9842139997';
export const OFFICIAL_SENDER_PHONE_TEL = 'tel:+919842139997';
export const OFFICIAL_JSPCS_URL = 'https://jspcs.online';
export const OFFICIAL_PORTFOLIO_URL = 'https://jaishankar-ops.vercel.app/';

export interface ProfessionalEmailOptions {
  subject: string;
  bodyText: string;
  lead?: (LeadContactLike & { seoScore?: number | null; websiteStatus?: string | null }) | null;
  recipientEmail?: string | null;
  unsubscribeUrl?: string | null;
  category?: string | null;
  templateName?: string | null;
}

export interface RenderedEmailOutput {
  html: string;
  text: string;
  brand: 'JSPCS' | 'FREELANCE_WEB' | 'GENERAL';
  brandTitle: string;
  brandSubtitle: string;
  ctaText: string;
  ctaUrl: string;
  websiteUrl: string;
  senderPhone: string;
}

/**
 * Intelligent template recommendation engine based on verified lead intelligence.
 */
export function getRecommendedTemplate(
  lead: LeadContactLike & { seoScore?: number | null; websiteStatus?: string | null }
): { templateName: string; category: string; reason: string } {
  // If previously contacted or follow-up due
  if (lead.crmStatus === 'CONTACTED') {
    return {
      templateName: 'Follow-Up Email',
      category: 'Follow-up Email',
      reason: 'Previous contact recorded — follow up on earlier conversation',
    };
  }

  const catLower = (lead.category || '').toLowerCase();
  const nameLower = (lead.businessName || '').toLowerCase();

  // Hardware, laptop, printer or computer repair
  if (
    catLower.includes('repair') ||
    catLower.includes('printer') ||
    catLower.includes('hardware') ||
    nameLower.includes('repair')
  ) {
    return {
      templateName: 'Computer Repair & Technical Support',
      category: 'Computer Repair & Technical Support',
      reason: 'Matches hardware, laptop, or printer technical support requirements',
    };
  }

  // School, college, office IT infrastructure, maintenance or AMC
  if (
    catLower.includes('school') ||
    catLower.includes('college') ||
    catLower.includes('academy') ||
    catLower.includes('institution') ||
    catLower.includes('hospital') ||
    catLower.includes('office') ||
    catLower.includes('it support') ||
    lead.serviceProspect === 'PC_SUPPORT'
  ) {
    return {
      templateName: 'IT Support Services Introduction',
      category: 'IT Support Services',
      reason: 'Matches business IT equipment maintenance & AMC support profile',
    };
  }

  // No website found -> Website Development Proposal
  if (!lead.website || lead.websiteStatus === 'UNAVAILABLE') {
    return {
      templateName: 'Website Development Proposal',
      category: 'Website Development Proposal',
      reason: 'No active business website detected — prime prospect for new web design',
    };
  }

  // Verified SEO opportunities or low SSR score
  if (typeof lead.seoScore === 'number' && lead.seoScore < 75) {
    return {
      templateName: 'SEO Improvement Audit',
      category: 'SEO Improvement',
      reason: `SEO score ${lead.seoScore}/100 indicates clear search visibility opportunities`,
    };
  }

  // Existing website identified for modernization
  if (lead.website) {
    return {
      templateName: 'Website Redesign Proposal',
      category: 'Website Redesign',
      reason: 'Existing website identified for mobile, speed, and conversion upgrade',
    };
  }

  return {
    templateName: 'General Business Introduction',
    category: 'General Business Introduction',
    reason: 'Balanced technology, website, and IT support introduction',
  };
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Resolves brand identity, URLs, CTA, and headers according to the service offered.
 */
export function resolveBrandIdentity(options: {
  category?: string | null;
  templateName?: string | null;
  serviceProspect?: string | null;
}) {
  const cat = (options.category || '').toLowerCase();
  const name = (options.templateName || '').toLowerCase();
  const prospect = options.serviceProspect || '';

  const isJspcs =
    cat.includes('it support') ||
    cat.includes('repair') ||
    cat.includes('computer') ||
    name.includes('it support') ||
    name.includes('computer repair') ||
    prospect === 'PC_SUPPORT';

  const isWeb =
    cat.includes('website') ||
    cat.includes('seo') ||
    name.includes('website') ||
    name.includes('seo') ||
    prospect === 'WEBSITE_DEV';

  if (isJspcs) {
    return {
      brand: 'JSPCS' as const,
      brandTitle: 'JSPCS',
      brandSubtitle: 'Computer Services & IT Support',
      badgeText: 'IT Support & AMC Services',
      websiteUrl: OFFICIAL_JSPCS_URL,
      websiteLabel: 'Website',
      ctaText: name.includes('repair') || cat.includes('repair') ? 'Contact JSPCS' : 'Discuss IT Support',
      ctaUrl: OFFICIAL_JSPCS_URL,
      headerAccentColor: '#1160B7',
    };
  }

  if (isWeb) {
    return {
      brand: 'FREELANCE_WEB' as const,
      brandTitle: 'Jai Shankar',
      brandSubtitle: 'Freelance Web Developer',
      badgeText: 'Web Design & Performance',
      websiteUrl: OFFICIAL_PORTFOLIO_URL,
      websiteLabel: 'Portfolio',
      ctaText:
        name.includes('redesign') || cat.includes('redesign')
          ? 'View My Work'
          : name.includes('seo') || cat.includes('seo')
          ? 'Request SEO Suggestions'
          : 'Explore My Portfolio',
      ctaUrl: OFFICIAL_PORTFOLIO_URL,
      headerAccentColor: '#1160B7',
    };
  }

  // General Business Introduction or default
  return {
    brand: 'GENERAL' as const,
    brandTitle: 'Jai Shankar',
    brandSubtitle: 'Digital Growth & Technology Solutions',
    badgeText: 'Technology Partner',
    websiteUrl: OFFICIAL_JSPCS_URL,
    websiteLabel: 'Website',
    ctaText: name.includes('follow') || cat.includes('follow') ? 'Continue the Conversation' : "Let's Connect",
    ctaUrl: OFFICIAL_JSPCS_URL,
    headerAccentColor: '#1160B7',
  };
}

/**
 * Compiles email text into an email-client safe, responsive HTML template with inline styles,
 * while generating a clean, matched plain-text fallback.
 */
export function renderProfessionalHtmlEmail(options: ProfessionalEmailOptions): RenderedEmailOutput {
  const { subject, bodyText, lead, unsubscribeUrl, category, templateName } = options;
  const brandInfo = resolveBrandIdentity({
    category: category || lead?.category,
    templateName,
    serviceProspect: lead?.serviceProspect,
  });

  let rawText = (bodyText || '').trim();
  if (lead && rawText.includes('{{')) {
    rawText = renderTemplate(rawText, lead, { email: options.recipientEmail || undefined });
  }

  let finalSubject = subject || '';
  if (lead && finalSubject.includes('{{')) {
    finalSubject = renderTemplate(finalSubject, lead, { email: options.recipientEmail || undefined });
  }

  // If user provided a complete custom HTML document, preserve it safely
  if (rawText.toLowerCase().includes('<!doctype html') || (rawText.includes('<html') && rawText.includes('</html>'))) {
    return {
      html: rawText,
      text: stripHtml(rawText),
      brand: brandInfo.brand,
      brandTitle: brandInfo.brandTitle,
      brandSubtitle: brandInfo.brandSubtitle,
      ctaText: brandInfo.ctaText,
      ctaUrl: brandInfo.ctaUrl,
      websiteUrl: brandInfo.websiteUrl,
      senderPhone: OFFICIAL_SENDER_PHONE,
    };
  }

  // Parse paragraphs and bullet list items
  const lines = rawText.split(/\r?\n/);
  const contentBlocks: Array<{ type: 'paragraph' | 'bullets'; text?: string; items?: string[] }> = [];
  let currentBullets: string[] = [];

  const flushBullets = () => {
    if (currentBullets.length > 0) {
      contentBlocks.push({ type: 'bullets', items: [...currentBullets] });
      currentBullets = [];
    }
  };

  let currentPara: string[] = [];
  const flushPara = () => {
    if (currentPara.length > 0) {
      const pText = currentPara.join(' ').trim();
      if (pText) contentBlocks.push({ type: 'paragraph', text: pText });
      currentPara = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushBullets();
      flushPara();
      continue;
    }

    const isBullet =
      trimmed.startsWith('•') ||
      trimmed.startsWith('- ') ||
      trimmed.startsWith('* ') ||
      trimmed.startsWith('— ');

    if (isBullet) {
      flushPara();
      const itemText = trimmed.replace(/^([•\-*—]\s*)/, '').trim();
      if (itemText) currentBullets.push(itemText);
    } else {
      flushBullets();
      currentPara.push(trimmed);
    }
  }
  flushBullets();
  flushPara();

  // Build HTML Content elements
  const bodyHtmlElements: string[] = [];

  for (const block of contentBlocks) {
    if (block.type === 'paragraph' && block.text) {
      const escaped = escapeHtml(block.text);
      // Auto-link URLs inside paragraph text safely
      const linked = escaped.replace(
        /(https?:\/\/[^\s<]+)/g,
        '<a href="$1" target="_blank" style="color: #1160B7; text-decoration: underline;">$1</a>'
      );
      bodyHtmlElements.push(
        `<p style="margin: 0 0 16px 0; font-size: 14.5px; line-height: 1.65; color: #1E293B;">${linked}</p>`
      );
    } else if (block.type === 'bullets' && block.items && block.items.length > 0) {
      const bulletRows = block.items
        .map(
          (item) => `
          <tr>
            <td valign="top" style="padding: 5px 8px 5px 0; width: 18px; color: #1160B7; font-size: 14px; line-height: 1.5; font-weight: 700;">&bull;</td>
            <td valign="top" style="padding: 5px 0; font-size: 14px; line-height: 1.5; color: #1E293B;">${escapeHtml(item)}</td>
          </tr>`
        )
        .join('');

      bodyHtmlElements.push(`
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 14px 0 20px 0; background-color: #F8FAFC; border: 1px solid #DFE2E8; border-radius: 8px; padding: 10px 16px;">
          ${bulletRows}
        </table>
      `);
    }
  }

  const escapedSubject = escapeHtml(finalSubject || 'Outreach from Jai Shankar');
  const unsubscribeHtml = unsubscribeUrl
    ? `<p style="margin: 12px 0 0 0; font-size: 11.5px; color: #64748B; line-height: 1.5;">
         If you prefer not to receive future communications, you can
         <a href="${escapeHtml(unsubscribeUrl)}" style="color: #1160B7; text-decoration: underline;">opt out here</a>.
       </p>`
    : '';

  // Table-based, inline-CSS email HTML layout (responsive max 600px)
  const fullHtml = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapedSubject}</title>
  <style type="text/css">
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
    @media only screen and (max-width: 620px) {
      .email-container {
        width: 100% !important;
        margin: 0 !important;
        border-radius: 0 !important;
      }
      .email-content {
        padding: 20px 18px !important;
      }
      .email-header {
        padding: 20px 18px !important;
      }
      .email-footer {
        padding: 16px 18px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F5F7FA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F5F7FA; width: 100%; margin: 0; padding: 24px 10px;">
    <tr>
      <td align="center">
        <!-- Main Email Container (Max 600px) -->
        <table class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #FFFFFF; border-radius: 12px; border: 1px solid #DFE2E8; overflow: hidden; box-shadow: 0 4px 16px rgba(0, 32, 80, 0.05);">
          <!-- Header -->
          <tr>
            <td class="email-header" style="background-color: #002050; padding: 24px 30px; border-bottom: 3px solid #1160B7;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="middle">
                    <div style="font-size: 20px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.2px; margin: 0; line-height: 1.2;">
                      ${escapeHtml(brandInfo.brandTitle)}
                    </div>
                    <div style="font-size: 12px; font-weight: 500; color: #B1D6F0; margin-top: 4px; letter-spacing: 0.2px;">
                      ${escapeHtml(brandInfo.brandSubtitle)}
                    </div>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display: inline-block; padding: 4px 12px; background-color: rgba(177, 214, 240, 0.15); border: 1px solid rgba(177, 214, 240, 0.35); border-radius: 16px; font-size: 11px; font-weight: 600; color: #B1D6F0;">
                      ${escapeHtml(brandInfo.badgeText)}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Subject Pill -->
          <tr>
            <td style="padding: 16px 30px 0 30px;">
              <div style="padding: 8px 14px; background-color: #F0F4F8; border-left: 3px solid #1160B7; border-radius: 4px; font-size: 12px; font-weight: 600; color: #002050;">
                Subject: ${escapedSubject}
              </div>
            </td>
          </tr>

          <!-- Email Body Content -->
          <tr>
            <td class="email-content" style="padding: 22px 30px 20px 30px;">
              ${bodyHtmlElements.join('\n')}

              <!-- Call-to-Action Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0 20px 0;">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" style="background-color: #1160B7; border-radius: 8px; box-shadow: 0 2px 6px rgba(17, 96, 183, 0.25);">
                          <a href="${escapeHtml(brandInfo.ctaUrl)}" target="_blank" style="display: inline-block; padding: 12px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 700; color: #FFFFFF; text-decoration: none; border-radius: 8px; letter-spacing: 0.2px;">
                            ${escapeHtml(brandInfo.ctaText)} &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Direct Contact Box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0 10px 0; background-color: #F8FAFC; border: 1px solid #DFE2E8; border-left: 4px solid #1160B7; border-radius: 6px;">
                <tr>
                  <td style="padding: 14px 18px;">
                    <div style="font-size: 11px; font-weight: 700; color: #002050; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px;">
                      Direct Business Contact
                    </div>
                    <div style="font-size: 13.5px; line-height: 1.6; color: #1E293B;">
                      <strong>Jai Shankar</strong> &bull;
                      Phone / WhatsApp: <a href="${OFFICIAL_SENDER_PHONE_TEL}" style="color: #1160B7; font-weight: 700; text-decoration: none;">${OFFICIAL_SENDER_PHONE}</a><br />
                      <strong>${escapeHtml(brandInfo.websiteLabel)}:</strong>
                      <a href="${escapeHtml(brandInfo.websiteUrl)}" target="_blank" style="color: #1160B7; text-decoration: underline;">
                        ${escapeHtml(brandInfo.websiteUrl)}
                      </a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="email-footer" style="background-color: #F8FAFC; border-top: 1px solid #DFE2E8; padding: 18px 30px; border-radius: 0 0 12px 12px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-size: 12px; color: #64748B; line-height: 1.55;">
                    <div style="font-weight: 700; color: #002050; margin-bottom: 2px;">
                      Jai Shankar &bull; ${escapeHtml(brandInfo.brandSubtitle)}
                    </div>
                    <div>
                      Contact: <a href="${OFFICIAL_SENDER_PHONE_TEL}" style="color: #1160B7; text-decoration: none; font-weight: 600;">${OFFICIAL_SENDER_PHONE}</a> &bull;
                      <a href="${escapeHtml(brandInfo.websiteUrl)}" target="_blank" style="color: #1160B7; text-decoration: none;">
                        ${escapeHtml(brandInfo.websiteUrl)}
                      </a>
                    </div>
                    ${unsubscribeHtml}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  // Matched Plain-Text Alternative
  const cleanBodyText = rawText;
  const plainTextAlternative = `${cleanBodyText}

---
Direct Contact:
Jai Shankar
Contact: ${OFFICIAL_SENDER_PHONE}
${brandInfo.websiteLabel}: ${brandInfo.websiteUrl}
${unsubscribeUrl ? `\n---\nTo opt out of future messages: ${unsubscribeUrl}` : ''}`.trim();

  return {
    html: fullHtml,
    text: plainTextAlternative,
    brand: brandInfo.brand,
    brandTitle: brandInfo.brandTitle,
    brandSubtitle: brandInfo.brandSubtitle,
    ctaText: brandInfo.ctaText,
    ctaUrl: brandInfo.ctaUrl,
    websiteUrl: brandInfo.websiteUrl,
    senderPhone: OFFICIAL_SENDER_PHONE,
  };
}

export function plainTextToHtml(text: string, unsubscribeUrl?: string): string {
  const compiled = renderProfessionalHtmlEmail({
    subject: 'Direct Business Outreach',
    bodyText: text,
    unsubscribeUrl,
  });
  return compiled.html;
}

export function stripHtml(html: string): string {
  return (html || '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

