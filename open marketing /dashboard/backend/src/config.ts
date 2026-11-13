import * as path from 'path';

export const CONFIG = {
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3001,
  defaultOutputDir: path.resolve('/home/sri-jaya-shankaran/Downloads/demos/output'),
  filenames: {
    allLeadsCsv: 'all_leads.csv',
    allLeadsJson: 'all_leads.json',
    qualifiedLeadsCsv: 'qualified_leads.csv',
    qualifiedLeadsJson: 'qualified_leads.json',
  },
};

