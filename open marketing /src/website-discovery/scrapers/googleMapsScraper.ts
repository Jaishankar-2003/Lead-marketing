import { Browser, Page } from 'playwright';
import { CONFIG } from '../config';
import { RawDiscoveredItem, SearchInput } from '../types';
import { buildGoogleMapsQueries } from '../utils/queryBuilder';
import { cleanBusinessName, normalizeUrl, validatePhone } from '../utils/urlUtils';

export async function scrapeGoogleMaps(
  input: SearchInput,
  browser: Browser
): Promise<RawDiscoveredItem[]> {
  const queryList = buildGoogleMapsQueries(input);
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

  // Execute top 6 diverse subcategory and street-grid queries for maximum local coverage
  const activeQueries = queryList.slice(0, 6);
  console.log(`   🔎 Running ${activeQueries.length} subcategory & street-grid searches on Google Maps...`);

  for (let qIdx = 0; qIdx < activeQueries.length; qIdx++) {
    const { query, category: targetCategory } = activeQueries[qIdx];
    const page: Page = await context.newPage();

    try {
      const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}?hl=en`;
      await page.goto(searchUrl, {
        waitUntil: 'domcontentloaded',
        timeout: CONFIG.pageLoadTimeout,
      });

      // Handle cookie consent dialog if present
      try {
        const acceptBtn = page.locator('button:has-text("Accept all"), button:has-text("I agree")').first();
        if (await acceptBtn.isVisible({ timeout: 2000 })) {
          await acceptBtn.click();
          await page.waitForTimeout(600);
        }
      } catch { /* No dialog */ }

      // Wait for feed container
      const feedSelector = 'div[role="feed"]';
      try {
        await page.waitForSelector(feedSelector, { timeout: 10000 });
      } catch {
        console.log(`     [Maps ${qIdx + 1}/${activeQueries.length}] Feed not found for "${query}"`);
        await page.close();
        continue;
      }

      // Deep scroll feed up to 6 times to uncover 30-60+ businesses per query
      for (let s = 0; s < 6; s++) {
        await page.evaluate((sel) => {
          const feed = document.querySelector(sel);
          if (feed) feed.scrollTop = feed.scrollHeight;
        }, feedSelector);

        await page.waitForTimeout(1200);

        // Check if reached end of list
        const reachedEnd = await page.evaluate(() => {
          const text = document.body.innerText;
          return text.includes("You've reached the end of the list") || text.includes("No more results");
        });
        if (reachedEnd) break;
      }

      // Extract cards
      const listings = await page.evaluate(() => {
        const results: Array<{
          name: string;
          mapsUrl: string;
          cardText: string;
          websiteUrl: string | null;
        }> = [];

        const placeLinks = document.querySelectorAll('a[href*="/maps/place/"]');
        placeLinks.forEach((a) => {
          const anchor = a as HTMLAnchorElement;
          const name = anchor.getAttribute('aria-label') || anchor.innerText.trim();
          const mapsUrl = anchor.href;
          const container = anchor.closest('div[jsaction]') || anchor.parentElement?.parentElement;
          const cardText = container ? (container as HTMLElement).innerText : '';

          let websiteUrl: string | null = null;
          if (container) {
            const webBtn = container.querySelector(
              'a[data-value="Website"], a[aria-label*="website" i], a[href^="http"]:not([href*="google"])'
            );
            if (webBtn) {
              websiteUrl = (webBtn as HTMLAnchorElement).href;
            }
          }

          if (name && mapsUrl && !results.some((r) => r.mapsUrl === mapsUrl)) {
            results.push({ name, mapsUrl, cardText, websiteUrl });
          }
        });

        return results;
      });

      let addedForQuery = 0;
      for (const item of listings) {
        const lines = item.cardText.split('\n').map((l) => l.trim()).filter(Boolean);
        let phone: string | null = null;
        let detectedCategory: string = targetCategory;
        let detectedAddress: string | null = null;

        for (const line of lines) {
          // 1. Phone extraction
          const ph = validatePhone(line);
          if (ph && !phone) {
            phone = ph;
          }

          // 2. Accurate category parsing (fix "Open" bug!)
          const lowerLine = line.toLowerCase();
          const isHoursLine =
            lowerLine.startsWith('open') ||
            lowerLine.startsWith('closed') ||
            lowerLine.startsWith('closing') ||
            lowerLine.includes('hours') ||
            lowerLine.includes('am') ||
            lowerLine.includes('pm');

          if (!isHoursLine && (line.includes('·') || line.includes('•'))) {
            const parts = line.split(/[·•]/).map((p) => p.trim());
            // Format is often: "4.3 ★ (84) · Supermarket · Anna Nagar"
            for (const part of parts) {
              if (
                part.length > 2 &&
                part.length < 35 &&
                !part.includes('★') &&
                !part.match(/^\d+$/) &&
                !part.toLowerCase().includes('review') &&
                !part.toLowerCase().includes('open') &&
                !part.toLowerCase().includes('closed')
              ) {
                detectedCategory = part;
                break;
              }
            }
          }

          // 3. Address parsing
          if (
            line.includes('Street') ||
            line.includes('Road') ||
            line.includes('Salai') ||
            line.includes('Colony') ||
            line.includes('Nagar') ||
            line.includes('Madurai')
          ) {
            if (!isHoursLine && !detectedAddress) {
              detectedAddress = line;
            }
          }
        }

        const normWebsite = item.websiteUrl ? normalizeUrl(item.websiteUrl) : null;

        items.push({
          businessName: cleanBusinessName(item.name),
          websiteUrl: normWebsite,
          category: detectedCategory || targetCategory,
          address: detectedAddress || `${input.area}, ${input.city}`,
          area: input.area,
          city: input.city,
          phone,
          googleMapsUrl: item.mapsUrl,
          description: `Discovered on Google Maps for: "${query}"`,
          source: 'Google Maps',
          rawLocationSnippet: item.cardText,
        });

        addedForQuery++;
      }

      console.log(`     [Maps ${qIdx + 1}/${activeQueries.length}] Extracted ${addedForQuery} businesses for "${query}"`);
    } catch (err) {
      console.error(
        `     [Maps error] Failed on query "${query}":`,
        err instanceof Error ? err.message : err
      );
    } finally {
      await page.close().catch(() => {});
    }

    await new Promise((r) => setTimeout(r, 1200));
  }

  await context.close().catch(() => {});
  return items;
}
