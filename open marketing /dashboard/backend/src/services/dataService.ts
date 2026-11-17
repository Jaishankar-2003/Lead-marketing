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

    // Filter for JSON, CSV, and TXT data files (skip hidden files)
    const validDataFiles = dirEntries.filter((f) => {
      const lower = f.toLowerCase();
      return (lower.endsWith('.json') || lower.endsWith('.csv') || lower.endsWith('.txt')) && !f.startsWith('.');
    });

    // 2. Classify and group files
    // Group files by base name without extension, e.g. "all_leads_anna_med"
    interface FileGroup {
      baseName: string;
      jsonFile?: string;
      csvFile?: string;
      type: 'ALL_LEADS' | 'QUALIFIED_LEADS' | 'OTHER';
    }

    const groups: Map<string, FileGroup> = new Map();

    for (const file of validDataFiles) {
      const ext = path.extname(file).toLowerCase();
      const base = path.basename(file, ext);
      const isQualified = base.toLowerCase().includes('qualified') || base.toLowerCase().includes('qual');
      const isOther = ext === '.txt';
      const type = isOther ? 'OTHER' : isQualified ? 'QUALIFIED_LEADS' : 'ALL_LEADS';

      if (!isOther && !groups.has(base)) {
        groups.set(base, { baseName: base, type });
      }

      if (!isOther) {
        const g = groups.get(base)!;
        if (ext === '.json') g.jsonFile = file;
        if (ext === '.csv') g.csvFile = file;
      }

      // Register file info
      const fullPath = path.join(this.currentOutputDir, file);
      try {
        const stat = fs.statSync(fullPath);
        let recordsCount = 0;
        if (ext === '.txt') {
          const raw = fs.readFileSync(fullPath, 'utf-8');
          recordsCount = raw.split('\n').filter((l) => l.trim().length > 0).length;
        }

        filesInfo[file] = {
          filename: file,
          path: fullPath,
          exists: true,
          sizeBytes: stat.size,
          lastModified: stat.mtime.toISOString(),
          recordsCount,
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

    // 4. Intelligent Cross-File Deduplication and Record Merging
    // Combine all parsed leads and perform multi-key deduplication (Phone, Domain, Name+Locality)
    const combinedRawLeads = [...collectedAllLeads, ...collectedQualifiedLeads];
    const rawRecordsScanned = combinedRawLeads.length;
    const dedupedLeads = this.deduplicateAndMergeLeads(combinedRawLeads);
    const duplicatesResolved = rawRecordsScanned - dedupedLeads.length;

    const dedupedQualified = dedupedLeads.filter(
      (l) => l.leadScores?.qualificationStatus === 'QUALIFIED'
    );

    // 5. Update in-memory state
    const hasData = dedupedLeads.length > 0;
    const isSuccess = hasData && errors.length === 0;

    if (hasData) {
      this.allLeads = dedupedLeads;
      this.qualifiedLeads = dedupedQualified;
      this.isStale = errors.length > 0;

      this.lastSyncResult = {
        success: isSuccess,
        timestamp,
        outputDir: this.currentOutputDir,
        allLeadsCount: this.allLeads.length,
        qualifiedLeadsCount: this.qualifiedLeads.length,
        totalFilesScanned: validDataFiles.length,
        datasetsFound,
        rawRecordsScanned,
        duplicatesResolved,
        files: filesInfo,
        isStale: this.isStale,
        warning: errors.length > 0 ? errors.join('; ') : undefined,
        errors,
      };
      return this.lastSyncResult;
    } else {
      this.allLeads = [];
      this.qualifiedLeads = [];
      this.isStale = true;
      this.lastSyncResult = {
        success: false,
        timestamp,
        outputDir: this.currentOutputDir,
        allLeadsCount: 0,
        qualifiedLeadsCount: 0,
        totalFilesScanned: validDataFiles.length,
        datasetsFound,
        rawRecordsScanned: 0,
        duplicatesResolved: 0,
        files: filesInfo,
        isStale: true,
        warning: 'No valid lead datasets found inside output folder.',
        errors,
      };
      return this.lastSyncResult;
    }
  }

  /**
   * Safely deletes a specific file from the configured output directory.
   */
  public async deleteFile(filename: string): Promise<{ success: boolean; message: string; syncResult?: SyncResult }> {
    try {
      const cleanName = path.basename(filename.trim());
      if (!cleanName || cleanName === '.' || cleanName === '..') {
        return { success: false, message: 'Invalid filename provided' };
      }

      // Restrict deletion to allowed extensions inside outputDir
      const ext = path.extname(cleanName).toLowerCase();
      if (!['.json', '.csv', '.txt'].includes(ext)) {
        return { success: false, message: 'Only .json, .csv, and .txt files can be deleted' };
      }

      const targetPath = path.join(this.currentOutputDir, cleanName);
      if (!fs.existsSync(targetPath)) {
        return { success: false, message: `File does not exist: ${cleanName}` };
      }

      fs.unlinkSync(targetPath);

      // Automatically re-synchronize data after deletion
      const syncResult = await this.syncData();

      return {
        success: true,
        message: `Successfully deleted ${cleanName}`,
        syncResult,
      };
    } catch (err: any) {
      return { success: false, message: `Failed to delete file: ${err.message}` };
    }
  }

  /**
   * Cleans all data files (.json, .csv, .txt) from the configured output directory.
   */
  public async clearOutputFiles(): Promise<{ success: boolean; message: string; deletedCount: number; syncResult?: SyncResult }> {
    try {
      if (!fs.existsSync(this.currentOutputDir)) {
        return { success: false, message: 'Output directory does not exist', deletedCount: 0 };
      }

      const entries = fs.readdirSync(this.currentOutputDir);
      let count = 0;
      for (const f of entries) {
        const ext = path.extname(f).toLowerCase();
        if (['.json', '.csv', '.txt'].includes(ext)) {
          fs.unlinkSync(path.join(this.currentOutputDir, f));
          count++;
        }
      }

      const syncResult = await this.syncData();

      return {
        success: true,
        message: `Deleted ${count} file(s) from output directory`,
        deletedCount: count,
        syncResult,
      };
    } catch (err: any) {
      return { success: false, message: `Failed to clear files: ${err.message}`, deletedCount: 0 };
    }
  }

  /**
   * Normalizes an Indian or international phone number to its canonical 10-digit format.
   */
  private normalizePhone(rawPhone?: string | null): string | null {
    if (!rawPhone || rawPhone === 'N/A' || rawPhone === 'None') return null;
    let digits = String(rawPhone).replace(/\D/g, '');
    if (!digits || digits.length < 7) return null;
    if (digits.length === 11 && digits.startsWith('0')) {
      digits = digits.slice(1);
    }
    if (digits.length === 12 && digits.startsWith('91')) {
      digits = digits.slice(2);
    }
    if (digits.length >= 10) {
      return digits.slice(-10);
    }
    return digits;
  }

  /**
   * Normalizes a business website domain to its root hostname, ignoring protocol, www, and query.
   */
  private normalizeDomain(rawUrl?: string | null): string | null {
    if (!rawUrl || rawUrl === 'N/A' || rawUrl === 'None') return null;
    try {
      let u = String(rawUrl).trim().toLowerCase();
      if (!u.startsWith('http://') && !u.startsWith('https://')) {
        u = 'http://' + u;
      }
      const parsed = new URL(u);
      const host = parsed.hostname.replace(/^www\./, '');
      const genericAggregators = [
        'facebook.com',
        'instagram.com',
        'linkedin.com',
        'twitter.com',
        'x.com',
        'youtube.com',
        'justdial.com',
        'indiamart.com',
        'sulekha.com',
        'google.com',
        'google.co.in',
        'maps.google.com',
      ];
      if (genericAggregators.some((g) => host === g || host.endsWith('.' + g))) {
        return null;
      }
      return host;
    } catch {
      return null;
    }
  }

  /**
   * Normalizes business name and locality to a canonical matching key.
   */
  private normalizeNameLoc(businessName?: string | null, area?: string | null, city?: string | null): string | null {
    if (!businessName || businessName === 'Unnamed Business') return null;
    const cleanName = businessName
      .toLowerCase()
      .replace(/\b(pvt|ltd|private|limited|associates|advocate|lawyer|law|firm|company|services|service|centre|center|shop|stores|agency)\b/g, '')
      .replace(/[^a-z0-9]/g, '');
    if (cleanName.length < 3) return null;

    const loc = ((area || '') + (city || '')).toLowerCase().replace(/[^a-z0-9]/g, '');
    return `${cleanName}_${loc.slice(0, 10)}`;
  }

  /**
   * Multi-key deduplication and intelligent record merging across multiple dataset files.
   */
  private deduplicateAndMergeLeads(leads: BusinessLead[]): BusinessLead[] {
    const uniqueList: BusinessLead[] = [];
    const phoneMap = new Map<string, number>();
    const domainMap = new Map<string, number>();
    const nameLocMap = new Map<string, number>();

    for (const lead of leads) {
      const normPhone = this.normalizePhone(lead.phone);
      const normDomain =
        this.normalizeDomain(lead.websiteUrl) ||
        (lead.rootDomain ? this.normalizeDomain('http://' + lead.rootDomain) : null);
      const normNameLoc = this.normalizeNameLoc(lead.businessName, lead.area, lead.city);

      let existingIndex: number | undefined = undefined;

      if (normPhone && phoneMap.has(normPhone)) {
        existingIndex = phoneMap.get(normPhone);
      } else if (normDomain && domainMap.has(normDomain)) {
        existingIndex = domainMap.get(normDomain);
      } else if (normNameLoc && nameLocMap.has(normNameLoc)) {
        existingIndex = nameLocMap.get(normNameLoc);
      }

      if (existingIndex !== undefined) {
        // Merge with existing record
        const existing = uniqueList[existingIndex];

        // Fill in missing phone
        if (!existing.phone && lead.phone) {
          existing.phone = lead.phone;
          const p = this.normalizePhone(lead.phone);
          if (p) phoneMap.set(p, existingIndex);
        }
        // Fill in missing email
        if (!existing.email && lead.email) {
          existing.email = lead.email;
        }
        // Fill in missing website
        if ((!existing.websiteUrl || existing.websiteStatus === 'NEEDS_VERIFICATION') && lead.websiteUrl) {
          existing.websiteUrl = lead.websiteUrl;
          existing.rootDomain = lead.rootDomain || existing.rootDomain;
          existing.websiteStatus = lead.websiteStatus;
          existing.websiteAnalysis = lead.websiteAnalysis || existing.websiteAnalysis;
          const d = this.normalizeDomain(lead.websiteUrl);
          if (d) domainMap.set(d, existingIndex);
        }
        // Fill in missing address
        if (!existing.address && lead.address) {
          existing.address = lead.address;
        }
        // Fill in missing googleMapsUrl
        if (!existing.googleMapsUrl && lead.googleMapsUrl) {
          existing.googleMapsUrl = lead.googleMapsUrl;
        }

        // Merge sources
        const mergedSources = new Set<string>([...existing.sources, ...lead.sources]);
        existing.sources = Array.from(mergedSources);

        // Merge sourceFiles
        const existingFiles = existing.sourceFiles || (existing.sourceFile ? [existing.sourceFile] : []);
        const newFiles = lead.sourceFiles || (lead.sourceFile ? [lead.sourceFile] : []);
        existing.sourceFiles = Array.from(new Set([...existingFiles, ...newFiles]));

        // Keep highest scores
        const exScores = existing.leadScores;
        const newScores = lead.leadScores;
        if (newScores) {
          exScores.websiteDevScore = Math.max(exScores.websiteDevScore || 0, newScores.websiteDevScore || 0);
          exScores.pcRepairScore = Math.max(exScores.pcRepairScore || 0, newScores.pcRepairScore || 0);
          exScores.networkingAmcScore = Math.max(exScores.networkingAmcScore || 0, newScores.networkingAmcScore || 0);
          if (newScores.qualificationStatus === 'QUALIFIED' && exScores.qualificationStatus !== 'QUALIFIED') {
            exScores.qualificationStatus = 'QUALIFIED';
            exScores.qualificationReason = newScores.qualificationReason || exScores.qualificationReason;
          }
        }

        // Re-evaluate primary opportunity
        const maxScore = Math.max(exScores.websiteDevScore || 0, exScores.pcRepairScore || 0, exScores.networkingAmcScore || 0);
        if (maxScore >= 40) {
          if (exScores.websiteDevScore === maxScore) existing.primaryOpportunity = 'WEB_DEV';
          else if (exScores.pcRepairScore === maxScore) existing.primaryOpportunity = 'PC_REPAIR';
          else existing.primaryOpportunity = 'NETWORKING_AMC';
        }
      } else {
        // New unique record
        const newIndex = uniqueList.length;
        const leadCopy: BusinessLead = {
          ...lead,
          id: `lead_${newIndex + 1}`,
          sourceFiles: lead.sourceFile ? [lead.sourceFile] : lead.sourceFiles || [],
        };

        uniqueList.push(leadCopy);

        if (normPhone) phoneMap.set(normPhone, newIndex);
        if (normDomain) domainMap.set(normDomain, newIndex);
        if (normNameLoc) nameLocMap.set(normNameLoc, newIndex);
      }
    }

    return uniqueList;
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
