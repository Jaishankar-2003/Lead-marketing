import Papa from 'papaparse';
import { prisma } from './prisma';
import { normalizeDomain, normalizePhone, categorizeLead } from './normalization';
import { CrmStatus, Lead } from '@prisma/client';

export interface CsvImportRecord {
  businessName: string;
  category?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  source?: string;
  sourceUrl?: string;
  notes?: string;
}

export function exportLeadsToCsv(leads: Lead[]): string {
  const rows = leads.map((l) => ({
    'Business Name': l.businessName,
    'Category': l.category || '',
    'Website': l.website || '',
    'Phone': l.phone || '',
    'Email': l.email || '',
    'Address': l.address || '',
    'City': l.city || '',
    'State': l.state || '',
    'Source': l.source || '',
    'Source URL': l.sourceUrl || '',
    'CRM Status': l.crmStatus,
    'Service Prospect': l.serviceProspect,
    'Prospect Reason': l.prospectReason || '',
    'Rating': l.rating || '',
    'Latitude': l.latitude || '',
    'Longitude': l.longitude || '',
    'Notes': l.notes || '',
    'Last Contacted': l.lastContactedAt ? l.lastContactedAt.toISOString() : '',
    'Next Follow-Up': l.nextFollowUpAt ? l.nextFollowUpAt.toISOString() : '',
    'Collected At': l.collectedAt ? l.collectedAt.toISOString() : '',
  }));

  return Papa.unparse(rows);
}

export interface CsvImportResult {
  totalRows: number;
  importedCount: number;
  duplicateCount: number;
  errorCount: number;
  sampleImported: string[];
  errors: string[];
}

export async function processCsvImport(
  csvContent: string,
  userCityDefault = 'Madurai'
): Promise<CsvImportResult> {
  const parseResult = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim().toLowerCase(),
  });

  if (parseResult.errors.length > 0 && parseResult.data.length === 0) {
    return {
      totalRows: 0,
      importedCount: 0,
      duplicateCount: 0,
      errorCount: parseResult.errors.length,
      sampleImported: [],
      errors: parseResult.errors.map((e) => e.message),
    };
  }

  let importedCount = 0;
  let duplicateCount = 0;
  let errorCount = 0;
  const sampleImported: string[] = [];
  const errors: string[] = [];

  for (const row of parseResult.data) {
    // Intelligent column resolver
    const businessName =
      row['business name'] ||
      row['business'] ||
      row['company name'] ||
      row['company'] ||
      row['name'] ||
      row['title'];

    if (!businessName || !businessName.trim()) {
      errorCount++;
      continue;
    }

    const category = row['category'] || row['industry'] || row['type'] || null;
    const website = row['website'] || row['url'] || row['web'] || row['domain'] || null;
    const phone = row['phone'] || row['telephone'] || row['mobile'] || row['contact'] || null;
    const email = row['email'] || row['mail'] || null;
    const address = row['address'] || row['location'] || row['street'] || null;
    const city = row['city'] || userCityDefault;
    const state = row['state'] || 'Tamil Nadu';
    const source = row['source'] || 'csv_import';
    const sourceUrl = row['source url'] || row['sourceurl'] || null;
    const notes = row['notes'] || row['note'] || row['description'] || null;

    const normDomain = normalizeDomain(website);
    const normPhone = normalizePhone(phone);

    // Deduplication check: check if phone or domain already exists
    const duplicateWhere: any[] = [];
    if (normDomain) duplicateWhere.push({ normalizedDomain: normDomain });
    if (normPhone) duplicateWhere.push({ normalizedPhone: normPhone });

    if (duplicateWhere.length > 0) {
      const existing = await prisma.lead.findFirst({
        where: { OR: duplicateWhere },
        select: { id: true, businessName: true },
      });

      if (existing) {
        duplicateCount++;
        continue;
      }
    }

    const { serviceProspect, prospectReason } = categorizeLead({
      category,
      businessName,
      website,
    });

    try {
      const newLead = await prisma.lead.create({
        data: {
          businessName: businessName.trim(),
          category: category ? category.trim() : null,
          website: website ? website.trim() : null,
          phone: phone ? phone.trim() : null,
          email: email ? email.trim() : null,
          address: address ? address.trim() : null,
          city: city ? city.trim() : null,
          state: state ? state.trim() : null,
          source: source ? source.trim() : 'csv_import',
          sourceUrl: sourceUrl ? sourceUrl.trim() : null,
          notes: notes ? notes.trim() : null,
          crmStatus: CrmStatus.NEW,
          serviceProspect,
          prospectReason,
          normalizedDomain: normDomain,
          normalizedPhone: normPhone,
        },
      });

      importedCount++;
      if (sampleImported.length < 5) {
        sampleImported.push(newLead.businessName);
      }
    } catch (err: any) {
      errorCount++;
      if (errors.length < 5) {
        errors.push(`Row '${businessName}': ${err.message}`);
      }
    }
  }

  return {
    totalRows: parseResult.data.length,
    importedCount,
    duplicateCount,
    errorCount,
    sampleImported,
    errors,
  };
}
