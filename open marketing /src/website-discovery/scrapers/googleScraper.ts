import { Browser, Page } from 'playwright';
import { CONFIG } from '../config';
import { RawDiscoveredItem, SearchInput } from '../types';
import { buildSearchQueries } from '../utils/queryBuilder';
import { cleanBusinessName, normalizeUrl, unwrapTrackingUrl } from '../utils/urlUtils';

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
  const activeQueries = queryItems.slice(0, 3);

  for (let idx = 0; idx < activeQueries.length; idx++) {
    if (captchaEncountered) {
      console.log(`     [Google] Skipping remaining queries due to anti-bot challenge`);
      break;
    }

    const { query, category: targetCategory } = activeQueries[idx];
    const page: Page = await context.newPage();

    try {
      const searchUrl = `https://www.google.co.in/search?q=${encodeURIComponent(query)}&hl=en&gl=in`;
      await page.goto(searchUrl, {
        waitUntil: 'domcontentloaded',
        timeout: CONFIG.pageLoadTimeout,
      });

      await randomDelay(800, 1400);

      if (await isCaptchaPage(page)) {
        console.log(`     [Google] Anti-bot challenge detected — switching smoothly to other providers`);
        captchaEncountered = true;
        await page.close().catch(() => {});
        continue;
      }

      // Handle cookie consent dialog if visible
      try {
        const acceptBtn = page.locator('button:has-text("Accept all"), button:has-text("I agree")').first();
        if (await acceptBtn.isVisible({ timeout: 2000 })) {
          await acceptBtn.click();
          await page.waitForTimeout(500);
        }
      } catch { /* No dialog */ }

      // Extract modern Google result cards
      const results = await page.evaluate(() => {
        const list: Array<{ title: string; href: string; snippet: string }> = [];
        const cards = document.querySelectorAll('div.MjjYud, div.g, div[data-hveid]');

        cards.forEach((card) => {
          const anchor = card.querySelector('a[href^="http"]') as HTMLAnchorElement | null;
          const h3 = card.querySelector('h3');
          const snippetEl = card.querySelector('div[style*="-webkit-line-clamp"], .VwiC3b, .IsZvec');

          if (anchor && anchor.href && h3) {
            list.push({
              title: h3.innerText.trim(),
              href: anchor.href,
              snippet: snippetEl ? (snippetEl as HTMLElement).innerText.trim() : '',
            });
          }
        });

        return list;
      });

      let added = 0;
      for (const res of results) {
        // Crucial fix: unwrap Google /url?q= tracking redirects
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
          description: res.snippet || `Discovered via Google Search: "${query}"`,
          source: 'Google Search',
          rawLocationSnippet: res.snippet,
        });

        added++;
      }

      console.log(`     [Google ${idx + 1}/${activeQueries.length}] Extracted ${added} businesses for "${query}"`);
    } catch (err) {
      console.error(
        `     [Google error] for query "${query}":`,
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
