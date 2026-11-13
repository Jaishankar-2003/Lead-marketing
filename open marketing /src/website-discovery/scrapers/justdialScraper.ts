import { Browser, Page } from 'playwright';
import { CONFIG } from '../config';
import { RawDiscoveredItem, SearchInput } from '../types';
import { buildJustdialUrls } from '../utils/queryBuilder';
import { cleanBusinessName, normalizeUrl, validatePhone } from '../utils/urlUtils';

export async function scrapeJustdial(
  input: SearchInput,
  browser: Browser
): Promise<RawDiscoveredItem[]> {
  const targetUrls = buildJustdialUrls(input);
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

  // Query top 2 subcategories in Justdial
  const activeTargets = targetUrls.slice(0, 2);

  for (let idx = 0; idx < activeTargets.length; idx++) {
    const { url: targetUrl, category: targetCategory } = activeTargets[idx];
    const page: Page = await context.newPage();

    try {
      await page.goto(targetUrl, {
        waitUntil: 'domcontentloaded',
        timeout: CONFIG.pageLoadTimeout,
      });

      await page.waitForTimeout(1800);

      // Dismiss login or popup modal
      try {
        const closeBtn = page.locator(
          'button.close, .modal-close, [aria-label="Close"], button:has-text("×"), button:has-text("Skip"), span.close'
        ).first();
        if (await closeBtn.isVisible({ timeout: 2000 })) {
          await closeBtn.click();
          await page.waitForTimeout(500);
        }
      } catch { /* No modal */ }

      // Scroll multiple times to trigger lazy-loading of 30+ listing cards
      for (let s = 0; s < 3; s++) {
        await page.evaluate(() => window.scrollBy(0, 1000));
        await page.waitForTimeout(1000);
      }

      const cards = await page.evaluate(() => {
        const data: Array<{
          name: string;
          phoneText: string;
          addressText: string;
          websiteHref: string | null;
        }> = [];

        const resultBoxes = document.querySelectorAll(
          '.resultbox_info, .jsx-resultbox, .jdCard, li.cntanr, .card'
        );

        resultBoxes.forEach((box) => {
          const titleEl = box.querySelector(
            '.resultbox_title_anchor, .store-name, h2 a, .lng_cont_name, .card-title'
          );
          const phoneEl = box.querySelector('.callcontent, .contact-info, a[href^="tel:"], .callNow');
          const addrEl = box.querySelector('.address-info, .cont_fl_addr, .resultbox_address, .address');
          const webEl = box.querySelector('a[href^="http"]:not([href*="justdial"])');

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

      let added = 0;
      for (const card of cards) {
        if (!card.name) continue;

        const normWebsite = card.websiteHref ? normalizeUrl(card.websiteHref) : null;
        const phone = validatePhone(card.phoneText);

        items.push({
          businessName: cleanBusinessName(card.name),
          websiteUrl: normWebsite,
          category: targetCategory,
          area: input.area,
          city: input.city,
          address: card.addressText || `${input.area}, ${input.city}`,
          phone,
          source: 'Justdial Directory',
          rawLocationSnippet: card.addressText,
        });

        added++;
      }

      console.log(`     [Justdial ${idx + 1}/${activeTargets.length}] Extracted ${added} businesses for "${targetCategory}"`);
    } catch (err) {
      console.error(
        `     [Justdial error] for category "${targetCategory}":`,
        err instanceof Error ? err.message : err
      );
    } finally {
      await page.close().catch(() => {});
    }

    await new Promise((r) => setTimeout(r, 1500));
  }

  await context.close().catch(() => {});
  return items;
}
