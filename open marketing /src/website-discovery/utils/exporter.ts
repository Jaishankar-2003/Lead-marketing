import * as fs from 'fs';
import * as path from 'path';
import { CONFIG } from '../config';
import { BusinessLead } from '../types';

export function ensureOutputDir(): void {
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }
}

function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Exports leads to CSV with complete structured business attributes.
 */
export function exportLeadsToCsv(leads: BusinessLead[], filename: string): string {
  ensureOutputDir();
  const filePath = path.join(CONFIG.outputDir, filename);

  const headers = [
    'Business Name',
    'Category',
    'Website',
    'Phone',
    'Email',
    'Address',
    'Area',
    'City',
    'Country',
    'Location Match Status',
    'Website Status',
    'HTTP Status',
    'HTTPS Secure',
    'Mobile Friendly',
    'Response Time (ms)',
    'Website Quality Findings',
    'Website Dev Score',
    'Website Dev Rating',
    'PC Repair Score',
    'PC Repair Rating',
    'Networking AMC Score',
    'Networking AMC Rating',
    'Qualification Status',
    'Qualification Reason',
    'Contributing Sources',
    'Google Maps URL',
    'Facebook',
    'Instagram',
    'LinkedIn',
    'Collection Date',
  ];

  const rows = leads.map((lead) => {
    const wa = lead.websiteAnalysis;
    const scores = lead.leadScores;

    const qualityFindings = wa
      ? wa.improvementOpportunities.join(' | ') || 'Good modern website'
      : 'N/A';

    return [
      escapeCsv(lead.businessName),
      escapeCsv(lead.category),
      escapeCsv(lead.websiteUrl || 'None'),
      escapeCsv(lead.phone || 'N/A'),
      escapeCsv(lead.email || 'N/A'),
      escapeCsv(lead.address || 'N/A'),
      escapeCsv(lead.area),
      escapeCsv(lead.city),
      escapeCsv(lead.country),
      escapeCsv(lead.locationStatus),
      escapeCsv(lead.websiteStatus),
      escapeCsv(wa?.statusCode || 'N/A'),
      escapeCsv(wa ? (wa.hasHttps ? 'Yes' : 'No') : 'N/A'),
      escapeCsv(wa ? (wa.isMobileFriendly ? 'Yes' : 'No') : 'N/A'),
      escapeCsv(wa?.responseTimeMs || 'N/A'),
      escapeCsv(qualityFindings),
      escapeCsv(scores.websiteDevScore),
      escapeCsv(scores.websiteDevRating),
      escapeCsv(scores.pcRepairScore),
      escapeCsv(scores.pcRepairRating),
      escapeCsv(scores.networkingAmcScore),
      escapeCsv(scores.networkingAmcRating),
      escapeCsv(scores.qualificationStatus),
      escapeCsv(scores.qualificationReason),
      escapeCsv(lead.sources.join('; ')),
      escapeCsv(lead.googleMapsUrl || 'N/A'),
      escapeCsv(lead.socialLinks?.facebook || ''),
      escapeCsv(lead.socialLinks?.instagram || ''),
      escapeCsv(lead.socialLinks?.linkedin || ''),
      escapeCsv(lead.collectedAt),
    ].join(',');
  });

  const content = [headers.join(','), ...rows].join('\n');
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

/**
 * Exports leads to structured JSON with full nested data.
 */
export function exportLeadsToJson(leads: BusinessLead[], filename: string): string {
  ensureOutputDir();
  const filePath = path.join(CONFIG.outputDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(leads, null, 2), 'utf-8');
  return filePath;
}

/**
 * Exports clean list of unique official websites to plain text.
 */
export function exportWebsitesTxt(leads: BusinessLead[], filename: string): string {
  ensureOutputDir();
  const filePath = path.join(CONFIG.outputDir, filename);

  const uniqueWebsites = Array.from(
    new Set(
      leads
        .map((l) => l.websiteUrl)
        .filter((url): url is string => !!url && url.startsWith('http'))
    )
  );

  fs.writeFileSync(filePath, uniqueWebsites.join('\n') + '\n', 'utf-8');
  return filePath;
}
