import express from 'express';
import cors from 'cors';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { CONFIG } from './config.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import leadsRoutes from './routes/leadsRoutes.js';
import configRoutes from './routes/configRoutes.js';
import syncRoutes from './routes/syncRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'lead-intelligence-backend',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/config', configRoutes);
app.use('/api/sync', syncRoutes);

// Serve built frontend if available
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Error Handling
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(CONFIG.port, '0.0.0.0', () => {
  console.log(`\n===================================================================`);
  console.log(`🚀 Lead Intelligence Dashboard running on: http://localhost:${CONFIG.port}`);
  console.log(`📁 Configured Output Directory: ${CONFIG.defaultOutputDir}`);
  console.log(`===================================================================\n`);
});
