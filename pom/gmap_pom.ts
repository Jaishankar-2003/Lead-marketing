import { Page, Locator, expect } from "@playwright/test";
import { promises as fs } from "fs";
import path from "path";

export interface BusinessData {
    name: string | null;
    category: string | null;
    rating: string | null;
    address: string | null;
    phone: string | null;
    website: string | null;
    latitude: string | null;
    longitude: string | null;
    googleMapsUrl: string;
}

export interface ScrapingOptions {
    maxResults?: number;
    outputFileName?: string;
    cooldownEvery?: number;
    cooldownMs?: number;
}

export class GMap {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    get search(): Locator {
        return this.page
            .locator("#searchboxinput")
            .or(this.page.getByRole("combobox", { name: "Search Google Maps" }))
            .first();
    }

    get searchIcon(): Locator {
        return this.page
            .locator("#searchbox-searchbutton")
            .or(this.page.getByRole("button", { name: "Search" }))
            .first();
    }

    get resultsFeed(): Locator {
        return this.page.locator('[role="feed"]');
    }

    get placeLinks(): Locator {
        return this.page.locator('a[href*="/maps/place/"]');
    }

    async handleConsent(): Promise<void> {
        const consentButton = this.page.locator(
            'button:has-text("Accept all"), button:has-text("I agree"), button:has-text("Reject all"), form[action*="consent"] button'
        ).first();

        if (await consentButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await consentButton.click().catch(() => {});
        }
    }

    async goto(): Promise<void> {
        if (!this.page.url().includes("google.com/maps")) {
            await this.page.goto("https://www.google.com/maps/", {
                waitUntil: "domcontentloaded",
                timeout: 30000,
            });
        }
        await this.handleConsent();
    }

    private async getText(locator: Locator): Promise<string | null> {
        try {
            if ((await locator.count()) === 0) {
                return null;
            }
            const text = await locator.first().textContent();
            return text ? text.trim() : null;
        } catch {
            return null;
        }
    }

    private async getAttr(locator: Locator, attribute: string): Promise<string | null> {
        try {
            if ((await locator.count()) === 0) {
                return null;
            }
            const val = await locator.first().getAttribute(attribute);
            return val ? val.trim() : null;
        } catch {
            return null;
        }
    }

    extractCoordinates(url: string): { latitude: string | null; longitude: string | null } {
        // Match /@lat,lng format
        const atMatch = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
        if (atMatch) {
            return {
                latitude: atMatch[1],
                longitude: atMatch[2],
            };
        }

        // Match Google Maps data URL parameters: !3d<lat>!4d<lng>
        const latMatch = url.match(/!3d(-?\d+(?:\.\d+)?)/);
        const lngMatch = url.match(/!4d(-?\d+(?:\.\d+)?)/);
        if (latMatch && lngMatch) {
            return {
                latitude: latMatch[1],
                longitude: lngMatch[1],
            };
        }

        return {
            latitude: null,
            longitude: null,
        };
    }

    async searchPlaces(searchTerm: string): Promise<Locator> {
        await this.goto();

        console.log(`\n=========================================`);
        console.log(`Searching Google Maps: "${searchTerm}"`);
        console.log(`=========================================`);

        await this.search.fill(searchTerm);
        await this.searchIcon.click();

        await this.page.waitForURL(/maps\/search/, {
            timeout: 30000,
        });

        const feed = this.resultsFeed;
        await expect(feed).toBeVisible({
            timeout: 30000,
        });

        return feed;
    }

    async scrollFeed(feed: Locator, maxResults?: number): Promise<string[]> {
        const links = this.placeLinks;
        let noChangeCount = 0;
        const endIndicator = feed.locator('text="You\'ve reached the end of the list."');

        console.log("Scrolling results feed to discover all leads...");

        while (noChangeCount < 5) {
            const currentCount = await links.count();
            console.log(`Leads discovered in feed: ${currentCount}`);

            if (maxResults && currentCount >= maxResults) {
                console.log(`Reached limit of ${maxResults} links.`);
                break;
            }

            if (await endIndicator.isVisible().catch(() => false)) {
                console.log("End of list reached on Google Maps feed.");
                break;
            }

            await feed.evaluate((el: HTMLElement) => {
                el.scrollTop = el.scrollHeight;
            });

            const lastLink = links.last();
            if ((await lastLink.count()) > 0) {
                await lastLink.scrollIntoViewIfNeeded().catch(() => {});
            }

            await this.page.waitForTimeout(2000);

            const newCount = await links.count();

            if (newCount === currentCount) {
                noChangeCount++;
                console.log(`Searching for more results... (${noChangeCount}/5)`);
            } else {
                noChangeCount = 0;
            }
        }

        const urls = await links.evaluateAll((elements) => {
            const hrefs = elements.map((el) => (el as HTMLAnchorElement).href);
            return [...new Set(hrefs)];
        });

        console.log(`\nTotal unique leads collected for extraction: ${urls.length}\n`);
        return urls;
    }

    async extractBusinessDetails(detailPage: Page, url: string): Promise<BusinessData> {
        await detailPage.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 30000,
        });

        const h1 = detailPage.locator("h1").first();
        await h1.waitFor({ timeout: 10000 });

        const name = await this.getText(h1);

        // Category: supports modern Maps class and jsaction
        const categoryLoc = detailPage
            .locator('button[jsaction*="category"], button.DkEaL, button[jsaction*="pane.rating.category"]')
            .first();
        const category = await this.getText(categoryLoc);

        // Rating: extract numeric rating
        const starLoc = detailPage.locator('span[role="img"][aria-label*="star"]').first();
        const rawRating = await this.getAttr(starLoc, "aria-label");
        const ratingMatch = rawRating?.match(/(\d+(?:\.\d+)?)/);
        const rating = ratingMatch ? ratingMatch[1] : (rawRating || null);

        // Address: strip prefix "Address: "
        const addrLoc = detailPage.locator('button[data-item-id="address"]').first();
        const rawAddress = await this.getAttr(addrLoc, "aria-label");
        const address = rawAddress ? rawAddress.replace(/^Address:\s*/i, "").trim() : null;

        // Phone: strip prefix "Phone: "
        const phoneLoc = detailPage.locator('button[data-item-id^="phone"]').first();
        const rawPhone = await this.getAttr(phoneLoc, "aria-label");
        const phone = rawPhone ? rawPhone.replace(/^Phone:\s*/i, "").trim() : null;

        // Website: clean authority link
        const webLoc = detailPage.locator('a[data-item-id="authority"]').first();
        let website = await this.getAttr(webLoc, "href");
        if (website && website.startsWith("/url?q=")) {
            try {
                const parsed = new URL(website, "https://www.google.com");
                website = parsed.searchParams.get("q") || website;
            } catch {
                // Keep raw link on error
            }
        }

        const currentUrl = detailPage.url();
        let coords = this.extractCoordinates(currentUrl);
        if (!coords.latitude || !coords.longitude) {
            coords = this.extractCoordinates(url);
        }

        return {
            name,
            category,
            rating,
            address,
            phone,
            website,
            latitude: coords.latitude,
            longitude: coords.longitude,
            googleMapsUrl: currentUrl,
        };
    }

    async operation(
        searchTerm: string,
        options?: ScrapingOptions
    ): Promise<BusinessData[]> {
        const feed = await this.searchPlaces(searchTerm);

        const urls = await this.scrollFeed(feed, options?.maxResults);
        const urlsToProcess = options?.maxResults ? urls.slice(0, options.maxResults) : urls;

        const outputDir = path.join(process.cwd(), "output");
        await fs.mkdir(outputDir, { recursive: true });

        const outputFileName = options?.outputFileName || "gmap-results.json";
        const resultFile = path.join(outputDir, outputFileName);

        const results: BusinessData[] = [];
        const cooldownEvery = options?.cooldownEvery ?? 10;
        const cooldownMs = options?.cooldownMs ?? 3000;

        console.log(`Starting extraction of ${urlsToProcess.length} leads.`);
        console.log(`💡 Note: Every lead is saved to "${resultFile}" immediately as it is scraped.`);
        console.log(`💡 You can press Ctrl+C anytime to stop — all saved leads will be preserved.\n`);

        // Graceful interruption handling
        let isInterrupted = false;
        const handleInterrupt = () => {
            console.log(`\n[STOPPED BY USER] Received stop signal. Safely preserving ${results.length} leads in ${resultFile}`);
            isInterrupted = true;
        };

        process.once("SIGINT", handleInterrupt);
        process.once("SIGTERM", handleInterrupt);

        // Reuse a single detail page for maximum speed and memory efficiency
        const detailPage = await this.page.context().newPage();

        try {
            for (let i = 0; i < urlsToProcess.length; i++) {
                if (isInterrupted) {
                    console.log(`Stopping extraction as requested. Total leads saved: ${results.length}`);
                    break;
                }

                const url = urlsToProcess[i];

                try {
                    const businessData = await this.extractBusinessDetails(detailPage, url);
                    results.push(businessData);

                    console.log(`[${i + 1}/${urlsToProcess.length}] Saved: "${businessData.name}" | Rating: ${businessData.rating ?? 'N/A'} | Phone: ${businessData.phone ?? 'N/A'}`);

                    // Save immediately on every extracted business so no data is ever lost
                    await fs.writeFile(
                        resultFile,
                        JSON.stringify(results, null, 2),
                        "utf-8"
                    );
                } catch (error) {
                    console.log(`[${i + 1}/${urlsToProcess.length}] Skipped due to error:`, error);
                }

                // Cooldown every N requests to prevent rate limiting
                if (cooldownEvery > 0 && (i + 1) % cooldownEvery === 0 && i + 1 < urlsToProcess.length) {
                    await this.page.waitForTimeout(cooldownMs);
                }
            }
        } finally {
            process.removeListener("SIGINT", handleInterrupt);
            process.removeListener("SIGTERM", handleInterrupt);

            if (!detailPage.isClosed()) {
                await detailPage.close().catch(() => {});
            }
        }

        console.log(`\nDone! Successfully extracted and saved ${results.length} leads in "${resultFile}".`);
        return results;
    }
}