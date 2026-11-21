import { prisma } from '../prisma';
import { ExtractedVendorRow } from './excelParser';

export interface DuplicateMatch {
  incomingRow: ExtractedVendorRow;
  existingVendorId?: string;
  existingVendorName?: string;
  existingVendorLocation?: string;
  existingVendorPhone?: string;
  confidenceScore: number; // 0 to 1
  matchReason: 'EXACT_PHONE' | 'NAME_AND_LOCATION' | 'NAME_ONLY' | 'EMAIL' | 'INTRA_BATCH_PHONE' | 'INTRA_BATCH_NAME' | 'NONE';
  matchDescription: string;
  suggestedAction: 'ADD_NEW' | 'UPDATE_EXISTING' | 'SKIP_DUPLICATES' | 'MANUAL_REVIEW';
}

const BUSINESS_STOP_WORDS = new Set([
  'm/s', 'ms', 'pvt', 'ltd', 'limited', 'private', 'enterprises', 'enterprise',
  'infotech', 'technologies', 'technology', 'tech', 'computers', 'computer',
  'systems', 'system', 'solutions', 'solution', 'traders', 'trader', 'trading',
  'agency', 'agencies', 'co', 'company', 'corp', 'corporation', 'electronics',
  'electronic', 'hardware', 'peripherals', 'store', 'shop', 'services', 'service',
  'india', 'inc', 'llp'
]);

/**
 * Normalizes a vendor name to find base business identity.
 */
export function normalizeBusinessName(name: string): string {
  if (!name) return '';
  const clean = name
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const tokens = clean.split(' ').filter(t => t.length > 0 && !BUSINESS_STOP_WORDS.has(t));
  return tokens.join(' ');
}

/**
 * Computes Jaccard token overlap similarity between two strings.
 */
function tokenSimilarity(a: string, b: string): number {
  const tokensA = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
  const tokensB = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++;
  }
  const union = new Set([...tokensA, ...tokensB]).size;
  return union > 0 ? intersection / union : 0;
}

/**
 * Checks an array of extracted spreadsheet rows against the database and within the batch.
 */
export async function analyzeDuplicates(
  rows: ExtractedVendorRow[]
): Promise<DuplicateMatch[]> {
  const results: DuplicateMatch[] = [];

  // 1. Gather all phone digits to query in bulk
  const phoneDigitsToQuery = new Set<string>();
  for (const r of rows) {
    for (const p of r.normalizedPhones) {
      const d = p.normalized.replace(/\D/g, '');
      if (d) {
        phoneDigitsToQuery.add(d);
        if (d.length >= 10) {
          phoneDigitsToQuery.add(d.slice(-10));
        }
      }
    }
  }

  // 2. Fetch all matching existing vendor contacts from database
  const existingContacts = await prisma.vendorContact.findMany({
    where: {
      type: 'PHONE',
      OR: [
        { normalized: { in: Array.from(phoneDigitsToQuery) } },
        { value: { in: Array.from(phoneDigitsToQuery) } },
      ],
    },
    include: {
      vendor: {
        include: {
          city: true,
          area: true,
        },
      },
    },
  });

  // Map phone -> existing contact & vendor
  const phoneToExistingVendor = new Map<string, typeof existingContacts[0]>();
  for (const c of existingContacts) {
    if (c.normalized) {
      const normDigits = c.normalized.replace(/\D/g, '');
      phoneToExistingVendor.set(normDigits, c);
      if (normDigits.length >= 10) {
        phoneToExistingVendor.set(normDigits.slice(-10), c);
      }
    }
    if (c.value) {
      const valDigits = c.value.replace(/\D/g, '');
      phoneToExistingVendor.set(valDigits, c);
      if (valDigits.length >= 10) {
        phoneToExistingVendor.set(valDigits.slice(-10), c);
      }
    }
  }

  // 3. Fetch all active vendors for name & location matching
  const allExistingVendors = await prisma.vendor.findMany({
    where: { status: { not: 'ARCHIVED' } },
    select: {
      id: true,
      name: true,
      normalizedName: true,
      city: { select: { name: true } },
      area: { select: { name: true } },
      fullAddress: true,
      contacts: {
        where: { isPrimary: true },
        select: { value: true, normalized: true },
      },
    },
  });

  // Intra-batch tracking
  const batchPhoneMap = new Map<string, number>(); // phoneDigits -> rowIndex
  const batchNameMap = new Map<string, number>(); // normalizedName -> rowIndex

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const normName = normalizeBusinessName(row.name);

    let matchFound = false;

    // Check Phone exact match in DB
    for (const p of row.normalizedPhones) {
      const d = p.normalized.replace(/\D/g, '');
      const last10 = d.length >= 10 ? d.slice(-10) : d;

      const existingMatch = phoneToExistingVendor.get(d) || phoneToExistingVendor.get(last10);
      if (existingMatch && existingMatch.vendor) {
        const v = existingMatch.vendor;
        const locParts = [v.area?.name, v.city?.name].filter(Boolean);
        results.push({
          incomingRow: row,
          existingVendorId: v.id,
          existingVendorName: v.name,
          existingVendorLocation: locParts.join(', '),
          existingVendorPhone: existingMatch.value,
          confidenceScore: 1.0,
          matchReason: 'EXACT_PHONE',
          matchDescription: `Exact phone match (${existingMatch.value}) with existing vendor "${v.name}"`,
          suggestedAction: 'UPDATE_EXISTING',
        });
        matchFound = true;
        break;
      }
    }

    if (matchFound) continue;

    // Check Name and Location match in DB
    if (normName && normName.length > 2) {
      let bestVendorMatch: typeof allExistingVendors[0] | null = null;
      let highestSimilarity = 0;

      for (const ev of allExistingVendors) {
        const evNorm = ev.normalizedName || normalizeBusinessName(ev.name);
        if (evNorm === normName) {
          bestVendorMatch = ev;
          highestSimilarity = 1.0;
          break;
        }

        const sim = tokenSimilarity(normName, evNorm);
        if (sim > 0.75 && sim > highestSimilarity) {
          highestSimilarity = sim;
          bestVendorMatch = ev;
        }
      }

      if (bestVendorMatch && highestSimilarity >= 0.75) {
        const rowCity = (row.city || '').toLowerCase();
        const evCityName = (bestVendorMatch.city?.name || '').toLowerCase();
        const sameCity = Boolean(rowCity && evCityName && (rowCity === evCityName || rowCity.includes(evCityName) || evCityName.includes(rowCity)));

        const score = sameCity ? 0.9 : 0.6;
        const reason = sameCity ? 'NAME_AND_LOCATION' : 'NAME_ONLY';
        const primaryPhone = bestVendorMatch.contacts[0]?.value || '';

        results.push({
          incomingRow: row,
          existingVendorId: bestVendorMatch.id,
          existingVendorName: bestVendorMatch.name,
          existingVendorLocation: [bestVendorMatch.area?.name, bestVendorMatch.city?.name].filter(Boolean).join(', ') || bestVendorMatch.fullAddress || '',
          existingVendorPhone: primaryPhone,
          confidenceScore: score,
          matchReason: reason,
          matchDescription: sameCity
            ? `High name similarity (${Math.round(highestSimilarity * 100)}%) and matching city "${bestVendorMatch.city?.name}"`
            : `Name similarity (${Math.round(highestSimilarity * 100)}%) with vendor "${bestVendorMatch.name}" in different/unspecified city`,
          suggestedAction: sameCity ? 'MANUAL_REVIEW' : 'ADD_NEW',
        });
        matchFound = true;
      }
    }

    if (matchFound) continue;

    // Check Intra-Batch duplicate (e.g. repeated in multiple rows of same spreadsheet)
    for (const p of row.normalizedPhones) {
      const d = p.normalized.replace(/\D/g, '');
      const last10 = d.length >= 10 ? d.slice(-10) : d;
      const prevRowIdx = batchPhoneMap.get(last10);
      if (prevRowIdx !== undefined) {
        const prevRow = rows[prevRowIdx];
        results.push({
          incomingRow: row,
          confidenceScore: 0.95,
          matchReason: 'INTRA_BATCH_PHONE',
          matchDescription: `Duplicate phone number shared with Row ${prevRow.rowNumber} ("${prevRow.name}") in current file`,
          suggestedAction: 'SKIP_DUPLICATES',
        });
        matchFound = true;
        break;
      }
      batchPhoneMap.set(last10, i);
    }

    if (matchFound) continue;

    if (normName && normName.length > 2) {
      const prevRowIdx = batchNameMap.get(normName);
      if (prevRowIdx !== undefined) {
        const prevRow = rows[prevRowIdx];
        results.push({
          incomingRow: row,
          confidenceScore: 0.85,
          matchReason: 'INTRA_BATCH_NAME',
          matchDescription: `Identical business name to Row ${prevRow.rowNumber} ("${prevRow.name}") in current file`,
          suggestedAction: 'MANUAL_REVIEW',
        });
        matchFound = true;
      } else {
        batchNameMap.set(normName, i);
      }
    }

    if (!matchFound) {
      results.push({
        incomingRow: row,
        confidenceScore: 0,
        matchReason: 'NONE',
        matchDescription: 'Unique new vendor record',
        suggestedAction: 'ADD_NEW',
      });
    }
  }

  return results;
}
