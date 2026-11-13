import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceOutputDir = path.resolve(__dirname, '../../../output');
const fallbackOutputDir = '/home/sri-jaya-shankaran/Downloads/demos/output';

export const CONFIG = {
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3001,
  defaultOutputDir: process.env.OUTPUT_DIR
    ? path.resolve(process.env.OUTPUT_DIR)
    : fs.existsSync(workspaceOutputDir)
    ? workspaceOutputDir
    : path.resolve(fallbackOutputDir),
  filenames: {
    allLeadsCsv: 'all_leads.csv',
    allLeadsJson: 'all_leads.json',
    qualifiedLeadsCsv: 'qualified_leads.csv',
    qualifiedLeadsJson: 'qualified_leads.json',
  },
};
