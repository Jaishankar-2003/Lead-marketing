import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { CONFIG } from '../config.js';
import { BusinessLead, FileInfo, SyncResult } from '../types.js';

class DataService {
  private currentOutputDir: string = CONFIG.defaultOutputDir;
  private allLeads: BusinessLead[] = [];
  private qualifiedLeads: BusinessLead[] = [];
  private lastSyncResult: SyncResult | null = null;
  private isStale: boolean = false;

  constructor() {
    this.syncData().catch((err) => {
      console.warn('Initial data sync encountered an issue:', err.message);
    });
  }

  public getOutputDir(): string {
    return this.currentOutputDir;
  }

  public setOutputDir(newPath: string): { success: boolean; message: string } {
    try {
      const resolved = path.resolve(newPath.trim());

      if (!fs.existsSync(resolved)) {
        return { success: false, message: `Directory does not exist: ${resolved}` };
      }

      const stat = fs.statSync(resolved);
      if (!stat.isDirectory()) {
        return { success: false, message: `Target path is not a directory: ${resolved}` };
      }

      this.currentOutputDir = resolved;
      return { success: true, message: `Output directory set to: ${resolved}` };
    } catch (err: any) {
      return { success: false, message: `Invalid directory path: ${err.message}` };
    }
  }

  public getAllLeads(): BusinessLead[] {
    return this.allLeads;
  }

  public getQualifiedLeads(): BusinessLead[] {
    return this.qualifiedLeads;
  }

  public getSyncStatus(): SyncResult | null {
    return this.lastSyncResult;
  }

  /**
   * Scans and syncs ALL data files present inside the configured output directory.
   * Dynamically discovers all JSON and CSV lead datasets regardless of file naming.
   */
  public async syncData(): Promise<SyncResult> {
    const timestamp = new Date().toISOString();
    const errors: string[] = [];
    const filesInfo: Record<string, FileInfo> = {};

    if (!fs.existsSync(this.currentOutputDir)) {
      const err = `Configured output directory does not exist: ${this.currentOutputDir}`;
      errors.push(err);
      this.isStale = true;
      this.lastSyncResult = {
        success: false,
        timestamp,
        outputDir: this.currentOutputDir,
        allLeadsCount: this.allLeads.length,
        qualifiedLeadsCount: this.qualifiedLeads.length,
        totalFilesScanned: 0,
        datasetsFound: [],
        files: {},
        isStale: true,
        warning: err,
        errors,
      };
      return this.lastSyncResult;
    }

    // 1. Read all files in the output directory
    let dirEntries: string[] = [];
    try {
      dirEntries = fs.readdirSync(this.currentOutputDir);
    } catch (err: any) {
      errors.push(`Failed to read output directory: ${err.message}`);
    }

    // Filter for JSON and CSV data files (skip txt, log, hidden files)
    const validDataFiles = dirEntries.filter((f) => {
      const lower = f.toLowerCase();
      return (lower.endsWith('.json') || lower.endsWith('.csv')) && !f.startsWith('.');
    });

    // 2. Classify and group files
    // Group files by base name without extension, e.g. "all_leads_anna_med"
    interface FileGroup {
      baseName: string;
      jsonFile?: string;
      csvFile?: string;
      type: 'ALL_LEADS' | 'QUALIFIED_LEADS';
    }

    const groups: Map<string, FileGroup> = new Map();

    for (const file of validDataFiles) {
      const ext = path.extname(file).toLowerCase();
      const base = path.basename(file, ext);
      const isQualified = base.toLowerCase().includes('qualified') || base.toLowerCase().includes('qual');
      const type = isQualified ? 'QUALIFIED_LEADS' : 'ALL_LEADS';

      if (!groups.has(base)) {
        groups.set(base, { baseName: base, type });
      }

      const g = groups.get(base)!;
      if (ext === '.json') g.jsonFile = file;
      if (ext === '.csv') g.csvFile = file;

      // Register file info
      const fullPath = path.join(this.currentOutputDir, file);
      try {
        const stat = fs.statSync(fullPath);
        filesInfo[file] = {
          filename: file,
          path: fullPath,
          exists: true,
          sizeBytes: stat.size,
          lastModified: stat.mtime.toISOString(),
          recordsCount: 0,
          status: 'OK',
          fileType: type,
        };
      } catch (err: any) {
        filesInfo[file] = {
          filename: file,
          path: fullPath,
          exists: true,
          sizeBytes: 0,
          lastModified: null,
          recordsCount: 0,
          status: 'ERROR',
          fileType: type,
          errorMessage: err.message,
        };
        errors.push(`Error accessing ${file}: ${err.message}`);
      }
    }

    // 3. Parse each group (prefer JSON for rich schema, fallback to CSV)
    const collectedAllLeads: BusinessLead[] = [];
    const collectedQualifiedLeads: BusinessLead[] = [];
    const datasetsFound: string[] = [];

    for (const [baseName, group] of groups.entries()) {
      datasetsFound.push(baseName);
      let parsedGroupLeads: BusinessLead[] = [];
      let sourceFilename = group.jsonFile || group.csvFile || baseName;

      // Try JSON first
      if (group.jsonFile) {
        const fullJsonPath = path.join(this.currentOutputDir, group.jsonFile);
        try {
          const raw = fs.readFileSync(fullJsonPath, 'utf-8');
          const data = JSON.parse(raw);
          if (Array.isArray(data)) {
            parsedGroupLeads = this.normalizeLeads(data, group.jsonFile);
            if (filesInfo[group.jsonFile]) {
              filesInfo[group.jsonFile].recordsCount = parsedGroupLeads.length;
            }
          }
        } catch (err: any) {
          if (filesInfo[group.jsonFile]) {
            filesInfo[group.jsonFile].status = 'ERROR';
            filesInfo[group.jsonFile].errorMessage = err.message;
          }
          errors.push(`Failed to parse ${group.jsonFile}: ${err.message}`);
        }
      }

      // Check / Parse CSV
      if (group.csvFile) {
        const fullCsvPath = path.join(this.currentOutputDir, group.csvFile);
        try {
          const raw = fs.readFileSync(fullCsvPath, 'utf-8');
          const records = parse(raw, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
          });
          if (filesInfo[group.csvFile]) {
            filesInfo[group.csvFile].recordsCount = records.length;
          }

          // If JSON failed or didn't exist, use CSV
          if (parsedGroupLeads.length === 0 && records.length > 0) {
            parsedGroupLeads = this.convertCsvToLeads(records, group.csvFile);
            sourceFilename = group.csvFile;
          }
        } catch (err: any) {
          if (filesInfo[group.csvFile]) {
            filesInfo[group.csvFile].status = 'ERROR';
            filesInfo[group.csvFile].errorMessage = err.message;
          }
          errors.push(`Failed to parse ${group.csvFile}: ${err.message}`);
        }
      }

      // Add to appropriate collection
      if (group.type === 'ALL_LEADS') {
        collectedAllLeads.push(...parsedGroupLeads);
      } else {
        collectedQualifiedLeads.push(...parsedGroupLeads);
      }
    }

    // If no explicit qualified files existed, filter qualified leads directly from all leads
    if (collectedQualifiedLeads.length === 0 && collectedAllLeads.length > 0) {
      collectedQualifiedLeads.push(
        ...collectedAllLeads.filter((l) => l.leadScores?.qualificationStatus === 'QUALIFIED')
      );
    }

    // 4. Update in-memory state
    const hasData = collectedAllLeads.length > 0 || collectedQualifiedLeads.length > 0;
    const isSuccess = hasData && errors.length === 0;

    if (hasData) {
      this.allLeads = collectedAllLeads;
      this.qualifiedLeads = collectedQualifiedLeads;
      this.isStale = errors.length > 0;

      this.lastSyncResult = {
        success: isSuccess,
        timestamp,
        outputDir: this.currentOutputDir,
        allLeadsCount: this.allLeads.length,
        qualifiedLeadsCount: this.qualifiedLeads.length,
        totalFilesScanned: validDataFiles.length,
        datasetsFound,
        files: filesInfo,
        isStale: this.isStale,
        warning: errors.length > 0 ? errors.join('; ') : undefined,
        errors,
      };
      return this.lastSyncResult;
    } else {
      this.isStale = true;
      this.lastSyncResult = {
        success: false,
        timestamp,
        outputDir: this.currentOutputDir,
        allLeadsCount: this.allLeads.length,
        qualifiedLeadsCount: this.qualifiedLeads.length,
        totalFilesScanned: validDataFiles.length,
        datasetsFound,
        files: filesInfo,
        isStale: true,
        warning: 'No valid lead datasets found inside output folder.',
        errors,
      };
      return this.lastSyncResult;
    }
  }

  private normalizeLeads(rawItems: any[], sourceFile: string): BusinessLead[] {
    const filePrefix = path.basename(sourceFile, path.extname(sourceFile));

    return rawItems.map((item, idx) => {
      const cleanPhone = item.phone && item.phone !== 'N/A' && item.phone !== 'None' ? String(item.phone).trim() : null;
      const cleanEmail = item.email && item.email !== 'N/A' && item.email !== 'None' ? String(item.email).trim() : null;
      const cleanWebsite = item.websiteUrl && item.websiteUrl !== 'N/A' && item.websiteUrl !== 'None' ? String(item.websiteUrl).trim() : null;

      const scores = item.leadScores || {
        websiteDevScore: 0,
        websiteDevRating: 'NONE',
        pcRepairScore: 0,
        pcRepairRating: 'NONE',
        networkingAmcScore: 0,
        networkingAmcRating: 'NONE',
        qualificationReason: '',
        qualificationStatus: 'UNQUALIFIED',
      };

      let primaryOpportunity: 'WEB_DEV' | 'PC_REPAIR' | 'NETWORKING_AMC' | 'NONE' = 'NONE';
      const webScore = scores.websiteDevScore || 0;
      const pcScore = scores.pcRepairScore || 0;
      const amcScore = scores.networkingAmcScore || 0;

      const maxScore = Math.max(webScore, pcScore, amcScore);
      if (maxScore >= 40) {
        if (webScore === maxScore) primaryOpportunity = 'WEB_DEV';
        else if (pcScore === maxScore) primaryOpportunity = 'PC_REPAIR';
        else primaryOpportunity = 'NETWORKING_AMC';
      }

      return {
        id: item.id ? `${filePrefix}_${item.id}` : `${filePrefix}_lead_${idx + 1}`,
        businessName: item.businessName || 'Unnamed Business',
        category: item.category || 'General Business',
        websiteUrl: cleanWebsite,
        rootDomain: item.rootDomain || (cleanWebsite ? cleanWebsite.replace(/^https?:\/\//, '').replace(/\/.*$/, '') : null),
        phone: cleanPhone,
        email: cleanEmail,
        address: item.address && item.address !== 'N/A' ? item.address : null,
        area: item.area || 'Unknown Area',
        city: item.city || 'Unknown City',
        country: item.country || 'India',
        locationStatus: item.locationStatus || 'LOCATION_UNVERIFIED',
        websiteStatus: item.websiteStatus || 'NEEDS_VERIFICATION',
        googleMapsUrl: item.googleMapsUrl && item.googleMapsUrl !== 'N/A' ? item.googleMapsUrl : null,
        socialLinks: item.socialLinks || {},
        description: item.description && item.description !== 'N/A' ? item.description : null,
        sources: Array.isArray(item.sources) ? item.sources : (item.source ? [item.source] : ['Unknown']),
        websiteAnalysis: item.websiteAnalysis,
        leadScores: scores,
        collectedAt: item.collectedAt || new Date().toISOString(),
        primaryOpportunity,
        sourceFile,
      };
    });
  }

  private convertCsvToLeads(records: any[], sourceFile: string): BusinessLead[] {
    const filePrefix = path.basename(sourceFile, path.extname(sourceFile));

    return records.map((r, idx) => {
      const getVal = (key: string) => {
        const val = r[key];
        if (!val || val === '""' || val === 'N/A' || val === 'None') return null;
        return String(val).trim();
      };

      const phone = getVal('Phone');
      const email = getVal('Email');
      const website = getVal('Website');

      const webDevScore = parseInt(r['Website Dev Score'] || '0', 10);
      const pcRepairScore = parseInt(r['PC Repair Score'] || '0', 10);
      const netAmcScore = parseInt(r['Networking AMC Score'] || '0', 10);

      const maxScore = Math.max(webDevScore, pcRepairScore, netAmcScore);
      let primaryOpportunity: 'WEB_DEV' | 'PC_REPAIR' | 'NETWORKING_AMC' | 'NONE' = 'NONE';
      if (maxScore >= 40) {
        if (webDevScore === maxScore) primaryOpportunity = 'WEB_DEV';
        else if (pcRepairScore === maxScore) primaryOpportunity = 'PC_REPAIR';
        else primaryOpportunity = 'NETWORKING_AMC';
      }

      const sourcesStr = getVal('Contributing Sources') || '';
      const sources = sourcesStr ? sourcesStr.split(';').map((s) => s.trim()) : ['CSV Import'];

      return {
        id: `${filePrefix}_csv_${idx + 1}`,
        businessName: getVal('Business Name') || 'Unnamed Business',
        category: getVal('Category') || 'General Business',
        websiteUrl: website,
        rootDomain: website ? website.replace(/^https?:\/\//, '').replace(/\/.*$/, '') : null,
        phone,
        email,
        address: getVal('Address'),
        area: getVal('Area') || 'Unknown Area',
        city: getVal('City') || 'Unknown City',
        country: getVal('Country') || 'India',
        locationStatus: (getVal('Location Match Status') as any) || 'LOCATION_UNVERIFIED',
        websiteStatus: (getVal('Website Status') as any) || 'NEEDS_VERIFICATION',
        googleMapsUrl: getVal('Google Maps URL'),
        socialLinks: {
          facebook: getVal('Facebook') || undefined,
          instagram: getVal('Instagram') || undefined,
          linkedin: getVal('LinkedIn') || undefined,
        },
        description: null,
        sources,
        leadScores: {
          websiteDevScore: webDevScore,
          websiteDevRating: (getVal('Website Dev Rating') as any) || 'NONE',
          pcRepairScore,
          pcRepairRating: (getVal('PC Repair Rating') as any) || 'NONE',
          networkingAmcScore: netAmcScore,
          networkingAmcRating: (getVal('Networking AMC Rating') as any) || 'NONE',
          qualificationReason: getVal('Qualification Reason') || '',
          qualificationStatus: (getVal('Qualification Status') as any) || 'UNQUALIFIED',
        },
        collectedAt: getVal('Collection Date') || new Date().toISOString(),
        primaryOpportunity,
        sourceFile,
      };
    });
  }
}

export const dataService = new DataService();
