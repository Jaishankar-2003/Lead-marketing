import { DashboardData, LeadFilterParams, PaginatedResult, BusinessLead, SyncResult } from '../types';

const BASE_URL = '/api';

export const api = {
  async getDashboard(): Promise<DashboardData> {
    const res = await fetch(`${BASE_URL}/dashboard`);
    if (!res.ok) throw new Error(`Failed to load dashboard: ${res.statusText}`);
    return res.json();
  },

  async getLeads(params: LeadFilterParams): Promise<PaginatedResult<BusinessLead>> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.set(key, String(val));
      }
    });

    const res = await fetch(`${BASE_URL}/leads?${query.toString()}`);
    if (!res.ok) throw new Error(`Failed to load leads: ${res.statusText}`);
    return res.json();
  },

  async getQualifiedLeads(params: LeadFilterParams): Promise<PaginatedResult<BusinessLead>> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.set(key, String(val));
      }
    });

    const res = await fetch(`${BASE_URL}/leads/qualified?${query.toString()}`);
    if (!res.ok) throw new Error(`Failed to load qualified leads: ${res.statusText}`);
    return res.json();
  },

  async getLeadById(id: string): Promise<BusinessLead> {
    const res = await fetch(`${BASE_URL}/leads/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error(`Failed to fetch lead ${id}: ${res.statusText}`);
    return res.json();
  },

  async triggerSync(): Promise<{ syncResult: SyncResult; kpis: any; charts: any }> {
    const res = await fetch(`${BASE_URL}/sync`, { method: 'POST' });
    if (!res.ok) throw new Error(`Sync failed: ${res.statusText}`);
    return res.json();
  },

  async getConfig(): Promise<any> {
    const res = await fetch(`${BASE_URL}/config`);
    if (!res.ok) throw new Error(`Failed to fetch config: ${res.statusText}`);
    return res.json();
  },

  async updateConfig(outputDir: string): Promise<any> {
    const res = await fetch(`${BASE_URL}/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outputDir }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to update config: ${res.statusText}`);
    }
    return res.json();
  },

  getExportUrl(params: LeadFilterParams, qualifiedOnly = false): string {
    const query = new URLSearchParams();
    if (qualifiedOnly) query.set('qualifiedOnly', 'true');
    Object.entries(params).forEach(([key, val]) => {
      if (key !== 'page' && key !== 'limit' && val !== undefined && val !== null && val !== '') {
        query.set(key, String(val));
      }
    });
    return `${BASE_URL}/leads/export?${query.toString()}`;
  },
};

