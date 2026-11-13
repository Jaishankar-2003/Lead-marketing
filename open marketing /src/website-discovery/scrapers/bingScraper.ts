import { Browser, Page } from 'playwright';
import { CONFIG } from '../config';
import { RawDiscoveredItem, SearchInput } from '../types';
import { buildSearchQueries } from '../utils/queryBuilder';
import { cleanBusinessName, normalizeUrl, unwrapTrackingUrl } from '../utils/urlUtils';

function randomDelay(min: number, max: number): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function scrapeBing(
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
    extraHTTPHeaders: {
      'Accept-Language': 'en-IN,en;q=0.9',
    },
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  // Run top 4 diverse queries
  const activeQueries = queryItems.slice(0, 4);

  for (let idx = 0; idx < activeQueries.length; idx++) {
    const { query, category: targetCategory } = activeQueries[idx];
    const page: Page = await context.newPage();

    try {
      const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=en&cc=IN`;
      await page.goto(searchUrl, {
        waitUntil: 'domcontentloaded',
        timeout: CONFIG.pageLoadTimeout,
      });

      await randomDelay(800, 1400);

      const results = await page.evaluate(() => {
        const list: Array<{ title: string; href: string; snippet: string }> = [];
        const algoCards = document.querySelectorAll('#b_results li.b_algo, #b_results .b_algo');

        algoCards.forEach((card) => {
          const anchor = card.querySelector('h2 a, .b_title a') as HTMLAnchorElement | null;
          const snippetEl = card.querySelector('.b_caption p, .b_snippet');

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
        // Crucial fix: unwrap Bing click-tracking redirects (which contain base64 real destination URLs)
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
          description: res.snippet || `Discovered via Bing Search: "${query}"`,
          source: 'Bing Search',
          rawLocationSnippet: res.snippet,
        });

        added++;
      }

      console.log(`     [Bing ${idx + 1}/${activeQueries.length}] Extracted ${added} businesses for "${query}"`);
    } catch (err) {
      console.error(
        `     [Bing error] for query "${query}":`,
        err instanceof Error ? err.message : err
      );
    } finally {
      await page.close().catch(() => {});
    }

    await randomDelay(CONFIG.delayBetweenRequests.min, CONFIG.delayBetweenRequests.max);
  }

  await context.close().catch(() => {});
  return items;
}
