import { Router, Request, Response } from 'express';
import { dataService } from '../services/dataService.js';
import { FilterService } from '../services/filterService.js';
import { LeadFilterParams } from '../types.js';

const router = Router();

function parseFilterParams(req: Request): LeadFilterParams {
  const query = req.query;
  return {
    search: query.search ? String(query.search) : undefined,
    area: query.area ? String(query.area) : undefined,
    category: query.category ? String(query.category) : undefined,
    websiteStatus: query.websiteStatus ? String(query.websiteStatus) : undefined,
    locationStatus: query.locationStatus ? String(query.locationStatus) : undefined,
    qualificationStatus: query.qualificationStatus ? String(query.qualificationStatus) : undefined,
    source: query.source ? String(query.source) : undefined,
    opportunityType: query.opportunityType ? String(query.opportunityType) : undefined,
    datasetFile: query.datasetFile ? String(query.datasetFile) : undefined,
    hasPhone: query.hasPhone === 'true' ? true : query.hasPhone === 'false' ? false : undefined,
    hasEmail: query.hasEmail === 'true' ? true : query.hasEmail === 'false' ? false : undefined,
    minScore: query.minScore ? parseInt(String(query.minScore), 10) : undefined,
    sortBy: query.sortBy ? String(query.sortBy) : undefined,
    sortOrder: query.sortOrder === 'asc' ? 'asc' : 'desc',
    page: query.page ? parseInt(String(query.page), 10) : 1,
    limit: query.limit ? parseInt(String(query.limit), 10) : 25,
  };
}

// GET /api/leads - All leads with filtering and pagination
router.get('/', (req: Request, res: Response) => {
  const allLeads = dataService.getAllLeads();
  const params = parseFilterParams(req);
  const result = FilterService.filterAndPaginate(allLeads, params);
  res.json({
    ...result,
    syncStatus: dataService.getSyncStatus(),
  });
});

// GET /api/leads/qualified - Qualified leads only
router.get('/qualified', (req: Request, res: Response) => {
  const qualifiedLeads = dataService.getQualifiedLeads();
  const params = parseFilterParams(req);
  const result = FilterService.filterAndPaginate(qualifiedLeads, params);
  res.json({
    ...result,
    syncStatus: dataService.getSyncStatus(),
  });
});

// GET /api/leads/export - Export filtered leads as CSV
router.get('/export', (req: Request, res: Response) => {
  const isQualifiedOnly = req.query.qualifiedOnly === 'true';
  const sourceDataset = isQualifiedOnly
    ? dataService.getQualifiedLeads()
    : dataService.getAllLeads();

  const params = parseFilterParams(req);
  // Remove pagination limit for export
  params.limit = 10000;
  params.page = 1;

  const result = FilterService.filterAndPaginate(sourceDataset, params);
  const leads = result.data;

  // Generate CSV format
  const escapeCsv = (val: any) => {
    if (val === null || val === undefined) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  const headers = [
    'Business Name',
    'Category',
    'Website',
    'Phone',
    'Email',
    'Address',
    'Area',
    'City',
    'Location Match Status',
    'Website Status',
    'Website Dev Score',
    'PC Repair Score',
    'Networking AMC Score',
    'Qualification Status',
    'Qualification Reason',
    'Source Dataset',
    'Contributing Sources',
    'Google Maps URL',
  ];

  const rows = leads.map((l) => [
    escapeCsv(l.businessName),
    escapeCsv(l.category),
    escapeCsv(l.websiteUrl || 'None'),
    escapeCsv(l.phone || 'N/A'),
    escapeCsv(l.email || 'N/A'),
    escapeCsv(l.address || 'N/A'),
    escapeCsv(l.area),
    escapeCsv(l.city),
    escapeCsv(l.locationStatus),
    escapeCsv(l.websiteStatus),
    escapeCsv(l.leadScores?.websiteDevScore),
    escapeCsv(l.leadScores?.pcRepairScore),
    escapeCsv(l.leadScores?.networkingAmcScore),
    escapeCsv(l.leadScores?.qualificationStatus),
    escapeCsv(l.leadScores?.qualificationReason),
    escapeCsv(l.sourceFile || 'N/A'),
    escapeCsv(l.sources.join('; ')),
    escapeCsv(l.googleMapsUrl || 'N/A'),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  const filename = isQualifiedOnly ? 'qualified_leads_export.csv' : 'all_leads_export.csv';
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csvContent);
});

// GET /api/leads/:id - Single lead detail
router.get('/:id', (req: Request, res: Response) => {
  const allLeads = dataService.getAllLeads();
  const lead = allLeads.find((l) => l.id === req.params.id);

  if (!lead) {
    res.status(404).json({ error: `Lead not found with id ${req.params.id}` });
    return;
  }

  res.json(lead);
});

export default router;

