import { Browser, Page } from 'playwright';
import { CONFIG } from '../config';
import { RawDiscoveredItem, SearchInput } from '../types';
import { buildSulekhaUrl } from '../utils/queryBuilder';
import { cleanBusinessName, normalizeUrl, validatePhone } from '../utils/urlUtils';

export async function scrapeSulekha(
  input: SearchInput,
  browser: Browser
): Promise<RawDiscoveredItem[]> {
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

  const targetUrl = buildSulekhaUrl(input.category, input.city);
  const page: Page = await context.newPage();

  try {
    await page.goto(targetUrl, {
      waitUntil: 'domcontentloaded',
      timeout: CONFIG.pageLoadTimeout,
    });

    await page.waitForTimeout(2000);

    const cards = await page.evaluate(() => {
      const data: Array<{
        name: string;
        phoneText: string;
        addressText: string;
        websiteHref: string | null;
      }> = [];

      const listings = document.querySelectorAll('.listing-card, .biz-card, .slListingMain, .card');

      listings.forEach((el) => {
        const titleEl = el.querySelector('h3, h2, .title, .biz-title, a[title]');
        const phoneEl = el.querySelector('a[href^="tel:"], .phone, .contact-num');
        const addrEl = el.querySelector('.address, .location, .loc');
        const webEl = el.querySelector('a[href^="http"]:not([href*="sulekha"])');

        if (titleEl) {
          data.push({
            name: (titleEl as HTMLElement).innerText.trim(),
            phoneText: phoneEl ? (phoneEl as HTMLElement).innerText.trim() : '',
            addressText: addrEl ? (addrEl as HTMLElement).innerText.trim() : '',
            websiteHref: webEl ? (webEl as HTMLAnchorElement).href : null,
          });
        }
      });

      return data;
    });

    for (const card of cards) {
      if (!card.name) continue;

      const normWebsite = card.websiteHref ? normalizeUrl(card.websiteHref) : null;
      const phone = validatePhone(card.phoneText);

      items.push({
        businessName: cleanBusinessName(card.name),
        websiteUrl: normWebsite,
        category: input.category,
        area: input.area,
        city: input.city,
        address: card.addressText || `${input.area}, ${input.city}`,
        phone,
        source: 'Sulekha Directory',
      });
    }

    console.log(`     Sulekha: extracted ${items.length} listings from directory`);
  } catch (err) {
    console.error(
      `     Sulekha scraper error:`,
      err instanceof Error ? err.message : err
    );
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
  }

  return items;
}
