import { Browser, Page } from 'playwright';
import { CONFIG } from '../config';
import { RawDiscoveredItem, SearchInput } from '../types';
import { buildSearchQueries } from '../utils/queryBuilder';
import { cleanBusinessName, normalizeUrl, unwrapTrackingUrl } from '../utils/urlUtils';

export async function scrapeDuckDuckGo(
  input: SearchInput,
  browser: Browser
): Promise<RawDiscoveredItem[]> {
  const queryItems = buildSearchQueries(input);
  const items: RawDiscoveredItem[] = [];

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'en-IN',
    viewport: { width: 1366, height: 768 },
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  const activeQueries = queryItems.slice(0, 3);

  for (let idx = 0; idx < activeQueries.length; idx++) {
    const { query, category: targetCategory } = activeQueries[idx];
    const page: Page = await context.newPage();

    try {
      const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&kl=in-en&ia=web`;
      await page.goto(searchUrl, {
        waitUntil: 'domcontentloaded',
        timeout: CONFIG.pageLoadTimeout,
      });

      await page.waitForTimeout(1400);

      const results = await page.evaluate(() => {
        const list: Array<{ title: string; href: string; snippet: string }> = [];
        const articles = document.querySelectorAll('article[data-testid="result"], .result');

        articles.forEach((art) => {
          const anchor = art.querySelector('a[data-testid="result-title-a"], h2 a, .result__a') as HTMLAnchorElement | null;
          const snippetEl = art.querySelector('div[data-result="snippet"], .result__snippet, .kOItc193IAflKn85OJhX');

          if (anchor && anchor.href) {
            list.push({
              title: anchor.innerText.trim(),
              href: anchor.href,
              snippet: snippetEl ? (snippetEl as HTMLElement).innerText.trim() : '',
            });
          }
        });

        return list;
      });

      let added = 0;
      for (const res of results) {
        const unwrapped = unwrapTrackingUrl(res.href);
        const norm = normalizeUrl(unwrapped);
        if (!norm) continue;

        items.push({
          businessName: cleanBusinessName(res.title),
          websiteUrl: norm,
          category: targetCategory,
          area: input.area,
          city: input.city,
          address: `${input.area}, ${input.city}`,
          description: res.snippet || `Discovered via DuckDuckGo: "${query}"`,
          source: 'DuckDuckGo Search',
          rawLocationSnippet: res.snippet,
        });

        added++;
      }

      console.log(`     [DDG ${idx + 1}/${activeQueries.length}] Extracted ${added} businesses for "${query}"`);
    } catch (err) {
      console.error(
        `     [DDG error] for query "${query}":`,
        err instanceof Error ? err.message : err
      );
    } finally {
      // Safely close page without subsequent operations on closed handles
      await page.close().catch(() => {});
    }

    // Delay happens between queries, NOT on a closed page
    await new Promise((r) => setTimeout(r, 1200));
  }

  await context.close().catch(() => {});
  return items;
}
