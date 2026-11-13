import { test as base, expect } from '@playwright/test';
import { GMap } from '../pom/gmap_pom';

type GMapFixtures = {
    gmap: GMap;
};

export const test = base.extend<GMapFixtures>({
    page: async ({ page }, use) => {
        await page.goto('https://www.google.com/maps/', {
            waitUntil: 'domcontentloaded',
            timeout: 30000,
        });

        // Dismiss cookie/consent banner if present
        const consentButton = page.locator(
            'button:has-text("Accept all"), button:has-text("I agree"), button:has-text("Reject all"), form[action*="consent"] button'
        ).first();

        if (await consentButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await consentButton.click().catch(() => {});
        }

        await use(page);
    },

    gmap: async ({ page }, use) => {
        const gmap = new GMap(page);
        await use(gmap);
    },
});

export { expect };