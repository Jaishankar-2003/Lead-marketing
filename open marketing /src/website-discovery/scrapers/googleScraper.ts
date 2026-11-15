import { Browser, Page } from 'playwright';
import { CONFIG } from '../config';
import { RawDiscoveredItem, SearchInput } from '../types';
import { buildSearchQueries } from '../utils/queryBuilder';
import {
  cleanBusinessName,
  normalizeUrl,
  unwrapTrackingUrl,
  extractSnippetPhone,
  extractSnippetEmail,
  isLikelyBusinessResult,
} from '../utils/urlUtils';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
];

function randomDelay(min: number, max: number): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isCaptchaPage(page: Page): Promise<boolean> {
  const url = page.url();
  if (url.includes('/sorry/') || url.includes('recaptcha')) return true;
  try {
    const text = await page.$eval('body', (b) => b.innerText.slice(0, 400));
    return text.includes('unusual traffic') || text.includes('not a robot');
  } catch {
    return false;
  }
}

export async function scrapeGoogle(
  input: SearchInput,
  browser: Browser
): Promise<RawDiscoveredItem[]> {
  const queryItems = buildSearchQueries(input);
  const items: RawDiscoveredItem[] = [];
  const visitedUrls = new Set<string>();

  const context = await browser.newContext({
    userAgent: USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
    locale: 'en-IN',
    viewport: { width: 1366, height: 768 },
    extraHTTPHeaders: {
      'Accept-Language': 'en-IN,en;q=0.9',
    },
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  let captchaEncountered = false;
  // Execute up to 8 diverse query variations covering business discovery, contact, and locality grids
  const activeQueries = queryItems.slice(0, 8);
  const maxPages = 2; // Controlled 2-page pagination

  console.log(`   🔎 Running up to ${activeQueries.length} targeted search queries on Google Web Search (with 2-page pagination)...`);

  for (let idx = 0; idx < activeQueries.length; idx++) {
    if (captchaEncountered) {
      console.log(`     [Google] Anti-bot safeguard active — returning collected leads and continuing pipeline`);
      break;
    }

    const { query, category: targetCategory } = activeQueries[idx];

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const page: Page = await context.newPage();
      const startParam = pageNum > 1 ? `&start=${(pageNum - 1) * 10}` : '';

      try {
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en&gl=in${startParam}`;
        await page.goto(searchUrl, {
          waitUntil: 'domcontentloaded',
          timeout: CONFIG.pageLoadTimeout,
        });

        await randomDelay(800, 1400);

        if (await isCaptchaPage(page)) {
          console.log(`     [Google] Anti-bot challenge detected on query "${query}" (page ${pageNum})`);
          captchaEncountered = true;
          await page.close().catch(() => {});
          break;
        }

        // Handle cookie consent dialog if visible
        try {
          const acceptBtn = page.locator('button:has-text("Accept all"), button:has-text("I agree")').first();
          if (await acceptBtn.isVisible({ timeout: 1500 })) {
            await acceptBtn.click();
            await page.waitForTimeout(400);
          }
        } catch { /* No dialog */ }

        // Extract Google result cards with robust modern selectors
        const results = await page.evaluate(() => {
          const list: Array<{ title: string; href: string; snippet: string; position: number }> = [];
          const cards = document.querySelectorAll('div.MjjYud, div.g, div.tF2Cxc');

          let pos = 1;
          cards.forEach((card) => {
            const anchor = card.querySelector('a[href^="http"]') as HTMLAnchorElement | null;
            const h3 = card.querySelector('h3');
            const snippetEl = card.querySelector('div.VwiC3b, div[data-snf], span.aCOpRe, div[style*="-webkit-line-clamp"]');

            if (anchor && anchor.href && h3) {
              const href = anchor.href;
              // Ignore internal Google and ad links
              if (!href.includes('google.co') && !href.includes('/aclk?') && !href.includes('support.google')) {
                list.push({
                  title: h3.innerText.trim(),
                  href,
                  snippet: snippetEl ? (snippetEl as HTMLElement).innerText.trim() : '',
                  position: pos++,
                });
              }
            }
          });

          return list;
        });

        let addedOnPage = 0;
        for (const res of results) {
          const unwrapped = unwrapTrackingUrl(res.href);
          const norm = normalizeUrl(unwrapped);
          if (!norm || visitedUrls.has(norm)) continue;

          // Validate that the result is likely an authentic business, not a generic blog or article
          if (!isLikelyBusinessResult(norm, res.title, res.snippet)) {
            continue;
          }

          visitedUrls.add(norm);

          // Extract phone and email embedded directly in search snippet
          const snippetPhone = extractSnippetPhone(res.snippet);
          const snippetEmail = extractSnippetEmail(res.snippet);

          items.push({
            businessName: cleanBusinessName(res.title),
            websiteUrl: norm,
            category: targetCategory,
            area: input.area,
            city: input.city,
            address: `${input.area}, ${input.city}`,
            phone: snippetPhone,
            email: snippetEmail,
            description: res.snippet || `Discovered via Google Search: "${query}"`,
            source: 'Google Search',
            rawLocationSnippet: res.snippet,
            query,
            searchPosition: res.position,
            sourceEvidence: [
              {
                source: 'Google Search',
                query,
                position: res.position,
                snippet: res.snippet,
                extractedAt: new Date().toISOString(),
              },
            ],
          });

          addedOnPage++;
        }

        console.log(
          `     [Google ${idx + 1}/${activeQueries.length} - P${pageNum}] Extracted ${addedOnPage} businesses for "${query}"`
        );

        // If page 1 produced very few results (< 4), there's no page 2 available
        if (results.length < 4) {
          await page.close().catch(() => {});
          break;
        }
      } catch (err) {
        console.error(
          `     [Google error] query "${query}" (page ${pageNum}):`,
          err instanceof Error ? err.message : err
        );
      } finally {
        await page.close().catch(() => {});
      }

      await randomDelay(800, 1500);
    }

    await randomDelay(CONFIG.delayBetweenRequests.min, CONFIG.delayBetweenRequests.max);
  }

  await context.close().catch(() => {});
  return items;
}
