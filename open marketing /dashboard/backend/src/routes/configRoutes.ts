import { Router, Request, Response } from 'express';
import { dataService } from '../services/dataService.js';
import { CONFIG } from '../config.js';

const router = Router();

// GET /api/config
router.get('/', (_req: Request, res: Response) => {
  const currentOutputDir = dataService.getOutputDir();
  const syncStatus = dataService.getSyncStatus();

  res.json({
    outputDir: currentOutputDir,
    defaultOutputDir: CONFIG.defaultOutputDir,
    filenames: CONFIG.filenames,
    filesInfo: syncStatus?.files || {},
    lastSyncTime: syncStatus?.timestamp || null,
    isStale: syncStatus?.isStale || false,
    errors: syncStatus?.errors || [],
  });
});

// PUT /api/config - Change output directory
router.put('/', async (req: Request, res: Response) => {
  const { outputDir } = req.body;

  if (!outputDir || typeof outputDir !== 'string') {
    res.status(400).json({ error: 'outputDir string is required in request body' });
    return;
  }

  const result = dataService.setOutputDir(outputDir);
  if (!result.success) {
    res.status(400).json({ error: result.message });
    return;
  }

  // Trigger sync on the new directory
  const syncResult = await dataService.syncData();

  res.json({
    message: result.message,
    outputDir: dataService.getOutputDir(),
    syncResult,
  });
});

// DELETE /api/config/files/:filename - Delete a single dataset file
router.delete('/files/:filename', async (req: Request, res: Response) => {
  const { filename } = req.params;
  const result = await dataService.deleteFile(filename);
  if (!result.success) {
    res.status(400).json({ error: result.message });
    return;
  }
  res.json(result);
});

// DELETE /api/config/files - Purge all output dataset files
router.delete('/files', async (_req: Request, res: Response) => {
  const result = await dataService.clearOutputFiles();
  if (!result.success) {
    res.status(400).json({ error: result.message });
    return;
  }
  res.json(result);
});

export default router;

