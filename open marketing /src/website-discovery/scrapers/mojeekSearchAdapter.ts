import { Browser, Page } from 'playwright';
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

export class MojeekSearchAdapter implements SearchSourceAdapter {
  readonly sourceName = 'Mojeek';
  readonly isEnabled = true;

  private metrics: SourceMetrics = {
    sourceName: 'Mojeek',
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

  private getApiKey(): string | null {
    return process.env.MOJEEK_API_KEY || process.env.MOJEEK_SEARCH_KEY || null;
  }

  async healthCheck(): Promise<{
    available: boolean;
    reason?: string;
    authType?: 'api_key' | 'public_web' | 'self_hosted';
  }> {
    const key = this.getApiKey();
    if (key) {
      return { available: true, authType: 'api_key', reason: 'Official Mojeek Search API Key detected' };
    }
    return { available: true, authType: 'public_web', reason: 'Running via compliant web extraction' };
  }

  getMetrics(): SourceMetrics {
    return { ...this.metrics };
  }

  async search(
    queries: QueryItem[],
    options?: { browser?: Browser; maxResults?: number }
  ): Promise<RawDiscoveredItem[]> {
    const startTime = Date.now();
    const apiKey = this.getApiKey();
    const items: RawDiscoveredItem[] = [];
    const visitedUrls = new Set<string>();

    const activeQueries = queries.slice(0, 6);
    console.log(`   🔍 [Mojeek] Executing ${activeQueries.length} search queries (Mode: ${apiKey ? 'REST API' : 'Browser Web'})...`);

    if (apiKey) {
      // 1. Official Mojeek REST API
      for (let idx = 0; idx < activeQueries.length; idx++) {
        const { query, category } = activeQueries[idx];
        this.metrics.queriesExecuted++;

        try {
          const apiUrl = `https://www.mojeek.com/search?api=1&api_key=${apiKey}&q=${encodeURIComponent(query)}&fmt=json`;
          const res = await fetch(apiUrl, {
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(10000),
          });

          if (!res.ok) {
            this.metrics.failedRequests++;
            console.warn(`     [Mojeek API] HTTP ${res.status} on query "${query}"`);
            continue;
          }

          const data: any = await res.json();
          const results = data.response?.results || [];
          this.metrics.rawResultsCount += results.length;

          let added = 0;
          let position = 1;

          for (const r of results) {
            const rawUrl = r.url;
            const norm = normalizeUrl(rawUrl);
            if (!norm || visitedUrls.has(norm)) continue;

            const title = r.title || '';
            const snippet = r.desc || '';

            if (!isLikelyBusinessResult(norm, title, snippet)) continue;

            visitedUrls.add(norm);
            this.metrics.validBusinessCount++;
            this.metrics.websitesFound++;

            const phone = extractSnippetPhone(snippet);
            const email = extractSnippetEmail(snippet);

            if (phone) this.metrics.phonesExtracted++;
            if (email) this.metrics.emailsExtracted++;

            items.push({
              businessName: cleanBusinessName(title),
              websiteUrl: norm,
              category,
              phone,
              email,
              description: snippet || `Discovered via Mojeek API: "${query}"`,
              source: 'Mojeek',
              rawLocationSnippet: snippet,
              query,
              searchPosition: position++,
              sourceEvidence: [
                {
                  source: 'Mojeek',
                  query,
                  position,
                  snippet,
                  extractedAt: new Date().toISOString(),
                },
              ],
            });

            added++;
          }

          console.log(`     [Mojeek API ${idx + 1}/${activeQueries.length}] Extracted ${added} businesses for "${query}"`);
        } catch (err) {
          this.metrics.failedRequests++;
          console.error(`     [Mojeek API error] query "${query}":`, err instanceof Error ? err.message : err);
        }
      }
    } else {
      // 2. Playwright Web Extraction Fallback
      if (!options?.browser) {
        console.warn(`     [Mojeek] Browser instance required for web fallback mode`);
        this.metrics.status = 'DEGRADED';
        return items;
      }

      const context = await options.browser.newContext({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        locale: 'en-IN',
        viewport: { width: 1366, height: 768 },
      });

      await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      });

      for (let idx = 0; idx < activeQueries.length; idx++) {
        const { query, category } = activeQueries[idx];
        this.metrics.queriesExecuted++;
        const page: Page = await context.newPage();

        // Simplify query for Mojeek (strip heavy boolean syntax/quotes which Mojeek drops)
        const cleanMojeekQuery = query
          .replace(/["+()]/g, ' ')
          .replace(/\b(OR|AND|official|website|firms)\b/gi, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        try {
          const searchUrl = `https://www.mojeek.com/search?q=${encodeURIComponent(cleanMojeekQuery)}`;
          await page.goto(searchUrl, {
            waitUntil: 'domcontentloaded',
            timeout: CONFIG.pageLoadTimeout,
          });

          await page.waitForTimeout(1200);

          const pageTitle = await page.title().catch(() => '');
          const pageUrl = page.url();
          const isBotChallenge = await page.evaluate(() => {
            const txt = document.body ? document.body.innerText.toLowerCase() : '';
            return (
              txt.includes('verification required') ||
              txt.includes('altcha') ||
              txt.includes("i'm not a robot") ||
              txt.includes('captcha')
            );
          }).catch(() => false);

          if (isBotChallenge || pageTitle.toLowerCase().includes('captcha')) {
            console.warn(`     [Mojeek] Anti-bot challenge detected on query "${query}"`);
            console.warn(`     [Mojeek] TIP: Set MOJEEK_API_KEY in .env for official unblocked discovery, or run in Headed Mode`);
            this.metrics.status = 'DEGRADED';
            await page.close().catch(() => {});
            break;
          }

          const results = await page.evaluate(() => {
            const list: Array<{ title: string; href: string; snippet: string; position: number }> = [];
            const items = document.querySelectorAll(
              'ul.results-standard li, div.results-standard li, .results li, li.result, .result'
            );

            let pos = 1;
            items.forEach((item) => {
              const anchor = item.querySelector('a.ob, a.title, h2 a, a[href^="http"]') as HTMLAnchorElement | null;
              const snippetEl = item.querySelector('p.s, .desc, .snippet, p');

              if (anchor && anchor.href && !anchor.href.includes('mojeek.com')) {
                list.push({
                  title: anchor.innerText.trim(),
                  href: anchor.href,
                  snippet: snippetEl ? (snippetEl as HTMLElement).innerText.trim() : '',
                  position: pos++,
                });
              }
            });

            return list;
          });

          this.metrics.rawResultsCount += results.length;
          let added = 0;

          for (const res of results) {
            const unwrapped = unwrapTrackingUrl(res.href);
            const norm = normalizeUrl(unwrapped);
            if (!norm || visitedUrls.has(norm)) continue;

            if (!isLikelyBusinessResult(norm, res.title, res.snippet)) continue;

            visitedUrls.add(norm);
            this.metrics.validBusinessCount++;
            this.metrics.websitesFound++;

            const phone = extractSnippetPhone(res.snippet);
            const email = extractSnippetEmail(res.snippet);

            if (phone) this.metrics.phonesExtracted++;
            if (email) this.metrics.emailsExtracted++;

            items.push({
              businessName: cleanBusinessName(res.title),
              websiteUrl: norm,
              category,
              phone,
              email,
              description: res.snippet || `Discovered via Mojeek Web: "${query}"`,
              source: 'Mojeek',
              rawLocationSnippet: res.snippet,
              query,
              searchPosition: res.position,
              sourceEvidence: [
                {
                  source: 'Mojeek',
                  query,
                  position: res.position,
                  snippet: res.snippet,
                  extractedAt: new Date().toISOString(),
                },
              ],
            });

            added++;
          }

          console.log(`     [Mojeek Web ${idx + 1}/${activeQueries.length}] Extracted ${added} businesses for "${query}"`);
        } catch (err) {
          this.metrics.failedRequests++;
          console.error(`     [Mojeek Web error] query "${query}":`, err instanceof Error ? err.message : err);
        } finally {
          await page.close().catch(() => {});
        }

        await new Promise((r) => setTimeout(r, 1200));
      }

      await context.close().catch(() => {});
    }

    this.metrics.executionTimeMs = Date.now() - startTime;
    return items;
  }
}

/**
 * Functional export for direct pipeline use
 */
export async function scrapeMojeek(
  input: SearchInput,
  browser?: Browser
): Promise<RawDiscoveredItem[]> {
  const adapter = new MojeekSearchAdapter();
  const queryItems = buildSearchQueries(input);
  return adapter.search(queryItems, { browser });
}
