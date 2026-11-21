/**
 * Indian Phone Number Normalization and Validation Utilities.
 * Supports:
 * - 10-digit Indian Mobile Numbers (starting with 6, 7, 8, 9)
 * - Landlines with STD codes (e.g., 0452 for Madurai, 044 for Chennai, 0422 for Coimbatore, 080 for Bangalore, 011 for Delhi, etc.)
 * - Toll-Free numbers (1800, 1860)
 * - Multiple numbers in a single string (separated by commas, slashes, semicolons, etc.)
 */

export interface NormalizedPhoneResult {
  raw: string;
  normalized: string; // E.g. "+919876543210" or "04522345678"
  nationalFormat: string; // E.g. "98765 43210" or "0452-2345678"
  internationalFormat: string; // E.g. "+91 98765 43210"
  type: 'MOBILE' | 'LANDLINE' | 'TOLL_FREE' | 'UNKNOWN';
  isValid: boolean;
  canWhatsApp: boolean;
  stdCode?: string;
  cleanDigits: string;
}

// Major Indian STD codes and their city names for automatic location correlation
export const STD_CODE_MAP: Record<string, { city: string; state: string }> = {
  '0452': { city: 'Madurai', state: 'Tamil Nadu' },
  '044': { city: 'Chennai', state: 'Tamil Nadu' },
  '0422': { city: 'Coimbatore', state: 'Tamil Nadu' },
  '0421': { city: 'Tiruppur', state: 'Tamil Nadu' },
  '0431': { city: 'Tiruchirappalli', state: 'Tamil Nadu' },
  '0427': { city: 'Salem', state: 'Tamil Nadu' },
  '0424': { city: 'Erode', state: 'Tamil Nadu' },
  '0462': { city: 'Tirunelveli', state: 'Tamil Nadu' },
  '080': { city: 'Bangalore', state: 'Karnataka' },
  '0821': { city: 'Mysore', state: 'Karnataka' },
  '011': { city: 'Delhi', state: 'Delhi' },
  '022': { city: 'Mumbai', state: 'Maharashtra' },
  '020': { city: 'Pune', state: 'Maharashtra' },
  '040': { city: 'Hyderabad', state: 'Telangana' },
  '033': { city: 'Kolkata', state: 'West Bengal' },
  '079': { city: 'Ahmedabad', state: 'Gujarat' },
  '0141': { city: 'Jaipur', state: 'Rajasthan' },
  '0484': { city: 'Kochi', state: 'Kerala' },
};

/**
 * Extracts all distinct phone numbers from an unformatted text string.
 * Example: "9842112345 / 0452-2345678, 9894098765" -> array of 3 phone strings
 */
export function extractPhoneNumbers(input: string | null | undefined): string[] {
  if (!input) return [];
  const text = String(input).trim();
  if (!text) return [];

  // Split on delimiters common in Indian trade directories:
  // commas, semicolons, forward/backward slashes, ' | ', ' / ', ' and ', ' or ', '&', newlines
  const parts = text.split(/[,;\/\n\r\|]|\s+(?:and|or|&)\s+/i);
  const found: string[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    // Filter out parts with fewer than 6 digits
    const digitsOnly = trimmed.replace(/\D/g, '');
    if (digitsOnly.length >= 6) {
      found.push(trimmed);
    }
  }

  return found.length > 0 ? found : [text];
}

/**
 * Normalizes a single Indian phone number.
 */
export function normalizeIndianPhone(input: string | null | undefined): NormalizedPhoneResult {
  const raw = String(input ?? '').trim();
  const digits = raw.replace(/\D/g, '');

  const invalidResult: NormalizedPhoneResult = {
    raw,
    normalized: '',
    nationalFormat: raw,
    internationalFormat: raw,
    type: 'UNKNOWN',
    isValid: false,
    canWhatsApp: false,
    cleanDigits: digits,
  };

  if (!digits || digits.length < 7) {
    return invalidResult;
  }

  // Case 1: Toll Free (1800xxxxxxx or 1860xxxxxxx)
  if (digits.startsWith('1800') || digits.startsWith('1860')) {
    return {
      raw,
      normalized: digits,
      nationalFormat: digits,
      internationalFormat: digits,
      type: 'TOLL_FREE',
      isValid: digits.length >= 10 && digits.length <= 11,
      canWhatsApp: false,
      cleanDigits: digits,
    };
  }

  // Case 2: Mobile Number
  // Could be formatted as:
  // - 10 digits starting with 6, 7, 8, 9
  // - 11 digits starting with 0 followed by 6, 7, 8, 9
  // - 12 digits starting with 91 followed by 6, 7, 8, 9
  // - 13 digits starting with 091 followed by 6, 7, 8, 9
  let tenDigitMobile = '';

  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    tenDigitMobile = digits;
  } else if (digits.length === 11 && digits.startsWith('0') && /^[6-9]/.test(digits.slice(1))) {
    tenDigitMobile = digits.slice(1);
  } else if (digits.length === 12 && digits.startsWith('91') && /^[6-9]/.test(digits.slice(2))) {
    tenDigitMobile = digits.slice(2);
  } else if (digits.length === 13 && digits.startsWith('091') && /^[6-9]/.test(digits.slice(3))) {
    tenDigitMobile = digits.slice(3);
  }

  if (tenDigitMobile) {
    const formatted = `${tenDigitMobile.slice(0, 5)} ${tenDigitMobile.slice(5)}`;
    return {
      raw,
      normalized: `+91${tenDigitMobile}`,
      nationalFormat: formatted,
      internationalFormat: `+91 ${formatted}`,
      type: 'MOBILE',
      isValid: true,
      canWhatsApp: true,
      cleanDigits: tenDigitMobile,
    };
  }

  // Case 3: Landline with STD code
  // Indian landline numbers typically have 2-4 digit STD code + 6-8 digit phone number = 10-11 total digits.
  // Standardized with leading 0.
  let fullLandline = digits;
  if (!fullLandline.startsWith('0')) {
    if (fullLandline.startsWith('91') && fullLandline.length >= 10) {
      fullLandline = '0' + fullLandline.slice(2);
    } else {
      fullLandline = '0' + fullLandline;
    }
  }

  // Check known STD codes
  let matchedStd: string | undefined;
  for (const std of Object.keys(STD_CODE_MAP)) {
    if (fullLandline.startsWith(std)) {
      matchedStd = std;
      break;
    }
  }

  if (fullLandline.length >= 10 && fullLandline.length <= 11) {
    const std = matchedStd || fullLandline.slice(0, fullLandline.length - 7);
    const local = fullLandline.slice(std.length);
    return {
      raw,
      normalized: fullLandline,
      nationalFormat: `${std}-${local}`,
      internationalFormat: `+91-${std.replace(/^0/, '')}-${local}`,
      type: 'LANDLINE',
      isValid: true,
      canWhatsApp: false,
      stdCode: std,
      cleanDigits: fullLandline,
    };
  }

  // Fallback for irregular length or unverified
  return {
    raw,
    normalized: digits,
    nationalFormat: digits,
    internationalFormat: digits,
    type: 'UNKNOWN',
    isValid: digits.length >= 8 && digits.length <= 12,
    canWhatsApp: /^[6-9]/.test(digits) && digits.length === 10,
    cleanDigits: digits,
  };
}

/**
 * Returns the E.164 phone string suitable for WhatsApp Web (e.g., "919876543210" without plus).
 */
export function toWhatsAppFormat(normalizedPhone: string): string | null {
  const cleaned = normalizedPhone.replace(/\D/g, '');
  if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) {
    return `91${cleaned}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith('91') && /^[6-9]/.test(cleaned.slice(2))) {
    return cleaned;
  }
  return null;
}
