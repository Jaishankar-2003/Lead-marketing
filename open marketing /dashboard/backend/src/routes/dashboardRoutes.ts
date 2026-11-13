import { Router, Request, Response } from 'express';
import { dataService } from '../services/dataService.js';
import { AnalyticsService } from '../services/analyticsService.js';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const allLeads = dataService.getAllLeads();
  const qualifiedLeads = dataService.getQualifiedLeads();
  const syncStatus = dataService.getSyncStatus();

  const kpis = AnalyticsService.calculateKPIs(allLeads, qualifiedLeads);
  const charts = AnalyticsService.calculateCharts(allLeads);

  res.json({
    kpis,
    charts,
    syncStatus,
  });
});

export default router;

