import { CONFIG } from '../config';

/**
 * Unwraps search-engine tracking redirect URLs (Bing, Google, DuckDuckGo)
 * to retrieve the real destination website domain.
 */
export function unwrapTrackingUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return rawUrl;

  try {
    // 1. Bing Click Tracking: https://www.bing.com/ck/a?!...&u=a1<base64>&...
    if (rawUrl.includes('bing.com/ck/a')) {
      const parsed = new URL(rawUrl);
      const uParam = parsed.searchParams.get('u');
      if (uParam) {
        // Bing prefixes base64 string with 'a1'
        const base64Str = uParam.startsWith('a1') ? uParam.slice(2) : uParam;
        // Fix URL-safe base64 padding and characters
        const standardBase64 = base64Str.replace(/-/g, '+').replace(/_/g, '/');
        const decoded = Buffer.from(standardBase64, 'base64').toString('utf-8');
        if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
          return decoded;
        }
      }
    }

    // 2. Google Click Tracking: https://www.google.com/url?q=<target>&...
    if (rawUrl.includes('google.co') && rawUrl.includes('/url')) {
      const parsed = new URL(rawUrl);
      const qParam = parsed.searchParams.get('q') || parsed.searchParams.get('url');
      if (qParam && (qParam.startsWith('http://') || qParam.startsWith('https://'))) {
        return qParam;
      }
    }

    // 3. DuckDuckGo Redirect Tracking: https://duckduckgo.com/l/?uddg=<encoded>&...
    if (rawUrl.includes('duckduckgo.com/l/')) {
      const parsed = new URL(rawUrl);
      const uddg = parsed.searchParams.get('uddg');
      if (uddg) {
        const decoded = decodeURIComponent(uddg);
        if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
          return decoded;
        }
      }
    }
  } catch {
    // Return original if unwrapping encounters parsing error
  }

  return rawUrl;
}

/**
 * Validates and normalizes any raw URL string to a clean, canonical root domain.
 * Strictly prevents malformed pseudo-domains like "https://https", "https://9.1k+", etc.
 */
export function normalizeUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;

  const unwrapped = unwrapTrackingUrl(rawUrl.trim());
  if (!unwrapped || unwrapped.length < 4) return null;

  try {
    const urlString = unwrapped.startsWith('http://') || unwrapped.startsWith('https://')
      ? unwrapped
      : `https://${unwrapped}`;

    const parsed = new URL(urlString);

    // Only allow HTTP/HTTPS
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }

    let hostname = parsed.hostname.toLowerCase().trim();

    // Remove leading 'www.'
    if (hostname.startsWith('www.')) {
      hostname = hostname.slice(4);
    }

    // Hostname must contain at least one dot (reject single words like "localhost", "http", "https")
    if (!hostname.includes('.')) {
      return null;
    }

    // Reject hostnames with invalid characters (e.g. "+", spaces, commas, brackets)
    if (/[+*~!()'"`,\s/\\:]/.test(hostname)) {
      return null;
    }

    // Strict domain regex verification:
    // Labels must be 1-63 chars of letters, digits, and hyphens (not leading/trailing hyphens)
    const domainRegex = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;
    if (!domainRegex.test(hostname)) {
      return null;
    }

    // TLD verification: last part must be purely alphabetic and 2-20 characters long
    const parts = hostname.split('.');
    const tld = parts[parts.length - 1];
    if (!/^[a-z]{2,20}$/.test(tld)) {
      return null;
    }

    // Check if the domain is on our excluded directory list
    if (isExcludedDomain(hostname)) {
      return null;
    }

    return `https://${hostname}`;
  } catch {
    return null;
  }
}

/**
 * Checks whether a given hostname or URL matches known aggregators, directories, or social networks.
 */
export function isExcludedDomain(hostnameOrUrl: string): boolean {
  if (!hostnameOrUrl) return true;

  try {
    let hostname = hostnameOrUrl.toLowerCase().trim();
    if (hostname.includes('://')) {
      hostname = new URL(hostname).hostname.toLowerCase();
    }
    if (hostname.startsWith('www.')) {
      hostname = hostname.slice(4);
    }

    return CONFIG.excludedDomains.some(
      (excluded) => hostname === excluded || hostname.endsWith(`.${excluded}`)
    );
  } catch {
    return true;
  }
}

/**
 * Validates and cleans Indian phone numbers (mobile 10 digits and landline with STD codes).
 */
export function validatePhone(rawPhone: string | null | undefined): string | null {
  if (!rawPhone || typeof rawPhone !== 'string') return null;

  // Remove non-digit characters except leading plus
  let cleaned = rawPhone.replace(/[^\d+]/g, '').trim();

  // Handle +91 prefix
  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.slice(1);
  }

  // 10-digit Indian mobile (starts with 6, 7, 8, or 9)
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }

  // Landline with STD code (e.g., Madurai 0452 + 7 digits = 11 digits total with leading 0)
  const fullDigits = rawPhone.replace(/\D/g, '');
  if (fullDigits.length >= 8 && fullDigits.length <= 11) {
    return rawPhone.trim().replace(/\s+/g, ' ');
  }

  return null;
}

/**
 * Validates and filters public business email addresses.
 */
export function validateEmail(rawEmail: string | null | undefined): string | null {
  if (!rawEmail || typeof rawEmail !== 'string') return null;

  const email = rawEmail.toLowerCase().trim();

  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
  if (!emailRegex.test(email)) return null;

  if (/\.(png|jpg|jpeg|gif|svg|webp|css|js)$/i.test(email)) return null;

  const ignoredPrefixes = [
    'example@', 'yourname@', 'test@', 'user@', 'admin@example',
    'support@wix.com', 'wordpress@', 'info@mysite.com', 'name@domain.com',
    'sample@', 'privacy@', 'abuse@'
  ];
  if (ignoredPrefixes.some((p) => email.startsWith(p))) return null;

  return email;
}

/**
 * Cleans extracted business names by removing search engine and directory noise.
 */
export function cleanBusinessName(rawName: string | null | undefined): string {
  if (!rawName) return 'Local Business';

  let cleaned = rawName.trim();

  cleaned = cleaned.replace(/\s*[-–|•:]\s*(Justdial|Sulekha|Facebook|Instagram|Google Maps|YouTube|LinkedIn|Website).*$/i, '');
  cleaned = cleaned.replace(/\s*[-–|•]\s*Best.*$/i, '');
  cleaned = cleaned.replace(/\s*[-–|•]\s*Top\s+\d+.*$/i, '');
  cleaned = cleaned.replace(/\s*[-–|•]\s*Reviews.*$/i, '');
  cleaned = cleaned.replace(/\s*,\s*(Anna Nagar|Madurai|Tamil Nadu|India)$/i, '');

  return cleaned.trim() || 'Local Business';
}

/**
 * Cross-source deduplication that merges records and preserves all contributing sources.
 */
export function deduplicateAndMergeLeads<
  T extends {
    websiteUrl?: string | null;
    businessName?: string;
    phone?: string | null;
    address?: string | null;
    source: string;
    sources?: string[];
    googleMapsUrl?: string | null;
    category?: string;
    description?: string | null;
  }
>(items: T[]): Array<T & { sources: string[] }> {
  const mergedMap = new Map<string, T & { sources: string[] }>();

  for (const item of items) {
    const normUrl = item.websiteUrl ? normalizeUrl(item.websiteUrl) : null;
    const cleanPhone = item.phone ? item.phone.replace(/\D/g, '') : null;
    const nameKey = (item.businessName || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

    // Formulate a robust deduplication key
    let matchKey = '';
    if (normUrl) {
      matchKey = `url:${normUrl}`;
    } else if (cleanPhone && cleanPhone.length >= 10) {
      matchKey = `phone:${cleanPhone}`;
    } else if (nameKey.length >= 6) {
      // Include street token if present to prevent false merges of generic names
      const streetToken = (item.address || '').toLowerCase().slice(0, 15).replace(/[^a-z0-9]/g, '');
      matchKey = `name:${nameKey}_${streetToken}`;
    } else {
      matchKey = `raw:${Math.random().toString(36).slice(2)}`;
    }

    if (mergedMap.has(matchKey)) {
      const existing = mergedMap.get(matchKey)!;

      // Merge sources
      if (!existing.sources.includes(item.source)) {
        existing.sources.push(item.source);
      }

      // Merge missing phone
      if (!existing.phone && item.phone) {
        existing.phone = item.phone;
      }

      // Merge missing website
      if (!existing.websiteUrl && normUrl) {
        existing.websiteUrl = normUrl;
      }

      // Merge Google Maps URL
      if (!existing.googleMapsUrl && item.googleMapsUrl) {
        existing.googleMapsUrl = item.googleMapsUrl;
      }

      // Keep more detailed address
      if ((!existing.address || existing.address.length < 15) && item.address && item.address.length > 15) {
        existing.address = item.address;
      }

      // Clean category if existing was generic or "Open"
      if ((!existing.category || existing.category === 'Open' || existing.category === 'Businesses') && item.category && item.category !== 'Open') {
        existing.category = item.category;
      }
    } else {
      mergedMap.set(matchKey, {
        ...item,
        websiteUrl: normUrl,
        sources: [item.source],
      });
    }
  }

  return Array.from(mergedMap.values());
}
