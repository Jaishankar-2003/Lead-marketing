import {
  DashboardData,
  LeadFilterParams,
  PaginatedResult,
  BusinessLead,
  SyncResult,
  DiscoveryJobState,
} from '@/types/open-marketing';

const BASE_URL = '/api/open-marketing';

export const openMarketingApi = {
  async getDashboard(): Promise<DashboardData> {
    const res = await fetch(`${BASE_URL}/dashboard`, { cache: 'no-store' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to load dashboard: ${res.statusText}`);
    }
    return res.json();
  },

  async getLeads(params: LeadFilterParams): Promise<PaginatedResult<BusinessLead>> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.set(key, String(val));
      }
    });

    const res = await fetch(`${BASE_URL}/leads?${query.toString()}`, { cache: 'no-store' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to load leads: ${res.statusText}`);
    }
    return res.json();
  },

  async getQualifiedLeads(params: LeadFilterParams): Promise<PaginatedResult<BusinessLead>> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.set(key, String(val));
      }
    });

    const res = await fetch(`${BASE_URL}/leads/qualified?${query.toString()}`, { cache: 'no-store' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to load qualified leads: ${res.statusText}`);
    }
    return res.json();
  },

  async getLeadById(id: string): Promise<BusinessLead> {
    const res = await fetch(`${BASE_URL}/leads/${encodeURIComponent(id)}`, { cache: 'no-store' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to fetch lead ${id}: ${res.statusText}`);
    }
    return res.json();
  },

  async triggerSync(): Promise<{ syncResult: SyncResult; kpis: any; charts: any }> {
    const res = await fetch(`${BASE_URL}/sync`, { method: 'POST', cache: 'no-store' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Sync failed: ${res.statusText}`);
    }
    return res.json();
  },

  async getConfig(): Promise<any> {
    const res = await fetch(`${BASE_URL}/config`, { cache: 'no-store' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to fetch config: ${res.statusText}`);
    }
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

  async runDiscovery(payload: {
    category: string;
    area: string;
    city: string;
    browserMode?: 'headless' | 'headed';
  }): Promise<{
    success: boolean;
    message: string;
    job?: DiscoveryJobState;
  }> {
    const res = await fetch(`${BASE_URL}/discover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || data.message || 'Discovery run failed');
    }
    return data;
  },

  async getDiscoveryStatus(): Promise<DiscoveryJobState> {
    const res = await fetch(`${BASE_URL}/discover/status`, { cache: 'no-store' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to fetch discovery status');
    }
    return res.json();
  },

  async stopDiscovery(): Promise<{
    success: boolean;
    message: string;
    job: DiscoveryJobState;
  }> {
    const res = await fetch(`${BASE_URL}/discover/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || data.message || 'Failed to stop discovery');
    }
    return data;
  },

  /**
   * Synchronizes an Open Marketing lead with the primary PostgreSQL CRM Lead database.
   * If an existing lead with identical domain or phone exists, links without overwriting history.
   * If new, creates a new Lead with source 'open_marketing' and initial activity log.
   */
  async syncLeadWithCrm(lead: BusinessLead): Promise<{
    success: boolean;
    isNew: boolean;
    lead: any;
    message: string;
  }> {
    const res = await fetch('/api/open-marketing/crm-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to sync lead with CRM');
    }
    return data;
  },

  async getCrmLeadDetails(leadId: string): Promise<{
    success: boolean;
    found: boolean;
    lead: any;
  }> {
    const res = await fetch(`/api/open-marketing/crm-sync?leadId=${encodeURIComponent(leadId)}`, {
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to fetch CRM lead details');
    }
    return data;
  },

  async updateLeadCrmStatus(leadId: string, crmStatus: string): Promise<any> {
    const res = await fetch(`/api/leads/${encodeURIComponent(leadId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crmStatus }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update CRM status');
    }
    return data;
  },

  async saveLeadNotes(leadId: string, notes: string): Promise<any> {
    const res = await fetch(`/api/leads/${encodeURIComponent(leadId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to save lead notes');
    }
    return data;
  },

  async scheduleFollowUp(leadId: string, dueAt: string, notes?: string): Promise<any> {
    const res = await fetch('/api/outreach/follow-ups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId, dueAt, notes }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to schedule follow-up');
    }
    return data;
  },

  async completeFollowUp(followUpId: string): Promise<any> {
    const res = await fetch(`/api/outreach/follow-ups/${encodeURIComponent(followUpId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'COMPLETED' }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to complete follow-up');
    }
    return data;
  },

  async toggleOptOut(leadId: string, doNotContact: boolean): Promise<any> {
    const res = await fetch(`/api/leads/${encodeURIComponent(leadId)}/opt-out`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doNotContact }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to toggle opt-out');
    }
    return data;
  },
};
