import { CONFIG } from '../config';
import { QueryItem, RawDiscoveredItem, SearchInput, SearchSourceAdapter, SourceMetrics } from '../types';
import { buildSearchQueries } from '../utils/queryBuilder';
import {
  cleanBusinessName,
  normalizeUrl,
  unwrapTrackingUrl,
  extractSnippetPhone,
  extractSnippetEmail,
  isLikelyBusinessResult,
} from '../utils/urlUtils';

export class SearXNGAdapter implements SearchSourceAdapter {
  readonly sourceName = 'SearXNG';
  readonly isEnabled = true;

  private metrics: SourceMetrics = {
    sourceName: 'SearXNG',
    queriesExecuted: 0,
    rawResultsCount: 0,
    validBusinessCount: 0,
    uniqueLeadsContributed: 0,
    duplicateCount: 0,
    websitesFound: 0,
    phonesExtracted: 0,
    emailsExtracted: 0,
    failedRequests: 0,
    executionTimeMs: 0,
    status: 'HEALTHY',
  };

  private getInstanceUrl(): string | null {
    const raw = process.env.SEARXNG_URL || process.env.SEARXNG_INSTANCE_URL || null;
    if (!raw) return null;
    return raw.replace(/\/+$/, '');
  }

  async healthCheck(): Promise<{
    available: boolean;
    reason?: string;
    authType?: 'api_key' | 'public_web' | 'self_hosted';
  }> {
    const instanceUrl = this.getInstanceUrl();
    if (!instanceUrl) {
      return {
        available: false,
        reason: 'SearXNG instance URL is not configured (SEARXNG_URL env var is unset). Adapter will be safely skipped.',
        authType: 'self_hosted',
      };
    }

    try {
      const res = await fetch(`${instanceUrl}/config`, {
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        return { available: true, authType: 'self_hosted', reason: `Active instance verified at ${instanceUrl}` };
      }
      return { available: true, authType: 'self_hosted', reason: `Instance reachable at ${instanceUrl} (HTTP ${res.status})` };
    } catch (err: any) {
      return {
        available: false,
        reason: `SearXNG instance unreachable at ${instanceUrl}: ${err.message}`,
        authType: 'self_hosted',
      };
    }
  }

  getMetrics(): SourceMetrics {
    return { ...this.metrics };
  }

  async search(
    queries: QueryItem[],
    options?: { maxResults?: number }
  ): Promise<RawDiscoveredItem[]> {
    const startTime = Date.now();
    const instanceUrl = this.getInstanceUrl();
    const items: RawDiscoveredItem[] = [];
    const visitedUrls = new Set<string>();

    if (!instanceUrl) {
      this.metrics.status = 'DISABLED';
      console.log(`   ⚙️ [SearXNG] Skipped (SEARXNG_URL not configured)`);
      return items;
    }

    // Configured complementary engines: avoid repeating Google, Bing, Brave, and Mojeek directly
    const complementaryEngines = 'qwant,startpage,yahoo,wikidata';
    const activeQueries = queries.slice(0, 6);
    console.log(`   🌐 [SearXNG] Querying self-hosted instance at ${instanceUrl} (engines: ${complementaryEngines})...`);

    for (let idx = 0; idx < activeQueries.length; idx++) {
      const { query, category } = activeQueries[idx];
      this.metrics.queriesExecuted++;

      try {
        const searchUrl = `${instanceUrl}/search?q=${encodeURIComponent(query)}&format=json&categories=general&language=en-IN&engines=${encodeURIComponent(complementaryEngines)}`;

        const res = await fetch(searchUrl, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'LeadPilot-OpenMarketing/2.0 (+http://localhost:3000)',
          },
          signal: AbortSignal.timeout(8000), // Strict 8s timeout
        });

        if (!res.ok) {
          this.metrics.failedRequests++;
          console.warn(`     [SearXNG] HTTP ${res.status} on query "${query}"`);
          continue;
        }

        const data: any = await res.json();
        const results = data.results || [];
        this.metrics.rawResultsCount += results.length;

        let added = 0;
        let position = 1;

        for (const r of results) {
          const rawUrl = r.url;
          const norm = normalizeUrl(rawUrl);
          if (!norm || visitedUrls.has(norm)) continue;

          const title = r.title || '';
          const snippet = r.content || '';

          if (!isLikelyBusinessResult(norm, title, snippet)) continue;

          visitedUrls.add(norm);
          this.metrics.validBusinessCount++;
          this.metrics.websitesFound++;

          const phone = extractSnippetPhone(snippet);
          const email = extractSnippetEmail(snippet);

          if (phone) this.metrics.phonesExtracted++;
          if (email) this.metrics.emailsExtracted++;

          // Preserve specific engine provenance (e.g. Qwant or Startpage)
          const underlyingEngine = r.engine || (Array.isArray(r.engines) ? r.engines[0] : null) || 'Metasearch';
          const sourceTag = `SearXNG (${underlyingEngine})`;

          items.push({
            businessName: cleanBusinessName(title),
            websiteUrl: norm,
            category,
            phone,
            email,
            description: snippet || `Discovered via SearXNG (${underlyingEngine}): "${query}"`,
            source: sourceTag,
            rawLocationSnippet: snippet,
            query,
            searchPosition: position++,
            sourceEvidence: [
              {
                source: sourceTag,
                query,
                position,
                snippet,
                extractedAt: new Date().toISOString(),
              },
            ],
          });

          added++;
        }

        console.log(`     [SearXNG ${idx + 1}/${activeQueries.length}] Extracted ${added} businesses for "${query}"`);
      } catch (err) {
        this.metrics.failedRequests++;
        console.error(`     [SearXNG error] query "${query}":`, err instanceof Error ? err.message : err);
      }

      await new Promise((r) => setTimeout(r, 600));
    }

    this.metrics.executionTimeMs = Date.now() - startTime;
    return items;
  }
}

/**
 * Functional export for direct pipeline use
 */
export async function scrapeSearXNG(input: SearchInput): Promise<RawDiscoveredItem[]> {
  const adapter = new SearXNGAdapter();
  const queryItems = buildSearchQueries(input);
  return adapter.search(queryItems);
}
