import { Router, Request, Response } from 'express';
import { dataService } from '../services/dataService.js';
import { AnalyticsService } from '../services/analyticsService.js';

const router = Router();

// POST /api/sync - Re-read all 4 files, reload in-memory dataset
router.post('/', async (_req: Request, res: Response) => {
  try {
    const syncResult = await dataService.syncData();
    const allLeads = dataService.getAllLeads();
    const qualifiedLeads = dataService.getQualifiedLeads();

    const kpis = AnalyticsService.calculateKPIs(allLeads, qualifiedLeads);
    const charts = AnalyticsService.calculateCharts(allLeads);

    res.json({
      syncResult,
      kpis,
      charts,
    });
  } catch (err: any) {
    res.status(500).json({
      error: `Sync execution failed: ${err.message}`,
    });
  }
});

export default router;

