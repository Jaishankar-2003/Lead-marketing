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

export class BraveSearchAdapter implements SearchSourceAdapter {
  readonly sourceName = 'Brave Search';
  readonly isEnabled = true;

  private metrics: SourceMetrics = {
    sourceName: 'Brave Search',
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
    return process.env.BRAVE_SEARCH_API_KEY || process.env.BRAVE_API_KEY || null;
  }

  async healthCheck(): Promise<{
    available: boolean;
    reason?: string;
    authType?: 'api_key' | 'public_web' | 'self_hosted';
  }> {
    const key = this.getApiKey();
    if (key) {
      return { available: true, authType: 'api_key', reason: 'Official Brave Search API Key detected' };
    }
    return { available: true, authType: 'public_web', reason: 'Running via compliant Playwright web extraction' };
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
    console.log(`   🦁 [Brave] Executing ${activeQueries.length} search queries (Mode: ${apiKey ? 'REST API' : 'Browser Web'})...`);

    if (apiKey) {
      // 1. Official Brave Search REST API
      for (let idx = 0; idx < activeQueries.length; idx++) {
        const { query, category } = activeQueries[idx];
        this.metrics.queriesExecuted++;

        try {
          const apiUrl = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&country=in&search_lang=en&count=20`;
          const res = await fetch(apiUrl, {
            headers: {
              'Accept': 'application/json',
              'Accept-Encoding': 'gzip',
              'X-Subscription-Token': apiKey,
            },
            signal: AbortSignal.timeout(12000),
          });

          if (!res.ok) {
            this.metrics.failedRequests++;
            console.warn(`     [Brave API] HTTP ${res.status} on query "${query}"`);
            continue;
          }

          const data: any = await res.json();
          const results = data.web?.results || [];
          this.metrics.rawResultsCount += results.length;

          let added = 0;
          let position = 1;

          for (const r of results) {
            const rawUrl = r.url;
            const norm = normalizeUrl(rawUrl);
            if (!norm || visitedUrls.has(norm)) continue;

            const title = r.title || '';
            const snippet = r.description || '';

            if (!isLikelyBusinessResult(norm, title, snippet)) continue;

            visitedUrls.add(norm);
            this.metrics.validBusinessCount++;
            this.metrics.websitesFound++;

            const phone = extractSnippetPhone(snippet) || (r.profile?.phone ? extractSnippetPhone(r.profile.phone) : null);
            const email = extractSnippetEmail(snippet);

            if (phone) this.metrics.phonesExtracted++;
            if (email) this.metrics.emailsExtracted++;

            items.push({
              businessName: cleanBusinessName(title),
              websiteUrl: norm,
              category,
              phone,
              email,
              description: snippet || `Discovered via Brave API: "${query}"`,
              source: 'Brave Search',
              rawLocationSnippet: snippet,
              query,
              searchPosition: position++,
              sourceEvidence: [
                {
                  source: 'Brave Search',
                  query,
                  position,
                  snippet,
                  extractedAt: new Date().toISOString(),
                },
              ],
            });

            added++;
          }

          console.log(`     [Brave API ${idx + 1}/${activeQueries.length}] Extracted ${added} businesses for "${query}"`);
        } catch (err) {
          this.metrics.failedRequests++;
          console.error(`     [Brave API error] query "${query}":`, err instanceof Error ? err.message : err);
        }
      }
    } else {
      // 2. Playwright Web Extraction Fallback
      if (!options?.browser) {
        console.warn(`     [Brave] Browser instance required for web fallback mode`);
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

        try {
          const searchUrl = `https://search.brave.com/search?q=${encodeURIComponent(query)}&source=web`;
          await page.goto(searchUrl, {
            waitUntil: 'domcontentloaded',
            timeout: CONFIG.pageLoadTimeout,
          });

          await page.waitForTimeout(1400);

          const pageTitle = await page.title().catch(() => '');
          const pageUrl = page.url();
          const isBotChallenge = await page.evaluate(() => {
            const txt = document.body ? document.body.innerText.toLowerCase() : '';
            return (
              txt.includes("verifying you're not a bot") ||
              txt.includes('traditional captcha') ||
              txt.includes('verify you are human') ||
              txt.includes('turnstile') ||
              txt.includes('protected by cloudflare')
            );
          }).catch(() => false);

          if (isBotChallenge || pageTitle.toLowerCase().includes('captcha')) {
            console.warn(`     [Brave] Anti-bot challenge detected on query "${query}"`);
            console.warn(`     [Brave] TIP: Set BRAVE_SEARCH_API_KEY in .env for official unblocked discovery (free 2,000 queries/mo), or run in Headed Mode`);
            this.metrics.status = 'DEGRADED';
            await page.close().catch(() => {});
            break;
          }

          const cards = await page.evaluate(() => {
            const list: Array<{ title: string; href: string; snippet: string; position: number }> = [];
            const elements = document.querySelectorAll('div.snippet[data-type="web"], div[data-type="web"], .fdb');

            let pos = 1;
            elements.forEach((el) => {
              const anchor = el.querySelector('a.heading-serpresult, a[href^="http"]') as HTMLAnchorElement | null;
              const titleEl = el.querySelector('.title, h2, .heading-serpresult');
              const snippetEl = el.querySelector('.snippet-description, p.snippet-content, .content');

              if (anchor && anchor.href) {
                list.push({
                  title: titleEl ? (titleEl as HTMLElement).innerText.trim() : anchor.innerText.trim(),
                  href: anchor.href,
                  snippet: snippetEl ? (snippetEl as HTMLElement).innerText.trim() : '',
                  position: pos++,
                });
              }
            });

            return list;
          });

          this.metrics.rawResultsCount += cards.length;
          let added = 0;

          for (const card of cards) {
            const unwrapped = unwrapTrackingUrl(card.href);
            const norm = normalizeUrl(unwrapped);
            if (!norm || visitedUrls.has(norm)) continue;

            if (!isLikelyBusinessResult(norm, card.title, card.snippet)) continue;

            visitedUrls.add(norm);
            this.metrics.validBusinessCount++;
            this.metrics.websitesFound++;

            const phone = extractSnippetPhone(card.snippet);
            const email = extractSnippetEmail(card.snippet);

            if (phone) this.metrics.phonesExtracted++;
            if (email) this.metrics.emailsExtracted++;

            items.push({
              businessName: cleanBusinessName(card.title),
              websiteUrl: norm,
              category,
              phone,
              email,
              description: card.snippet || `Discovered via Brave Web: "${query}"`,
              source: 'Brave Search',
              rawLocationSnippet: card.snippet,
              query,
              searchPosition: card.position,
              sourceEvidence: [
                {
                  source: 'Brave Search',
                  query,
                  position: card.position,
                  snippet: card.snippet,
                  extractedAt: new Date().toISOString(),
                },
              ],
            });

            added++;
          }

          console.log(`     [Brave Web ${idx + 1}/${activeQueries.length}] Extracted ${added} businesses for "${query}"`);
        } catch (err) {
          this.metrics.failedRequests++;
          console.error(`     [Brave Web error] query "${query}":`, err instanceof Error ? err.message : err);
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
export async function scrapeBrave(
  input: SearchInput,
  browser?: Browser
): Promise<RawDiscoveredItem[]> {
  const adapter = new BraveSearchAdapter();
  const queryItems = buildSearchQueries(input);
  return adapter.search(queryItems, { browser });
}
