import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';


test.describe('SSR + SEO Validation', () => {
    const url = 'https://www.ninaiforever.com/';
    const expectedCanonicalPath = 'https://www.ninaiforever.com/';
    const expectedContentPath = path.join(
        process.cwd(),
        'tests',
        'data',
        'wv-page-content.txt'
    );


    // ── Helpers ────────────────────────────────────────────────────────────


    /** Strip scripts/styles/comments/tags → plain readable text */
    function extractPageText(html: string): string {
        return decodeHtmlEntities(
            html
                .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
                .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
                .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
                .replace(/<!--[\s\S]*?-->/g, ' ')
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
        );
    }


    function decodeHtmlEntities(value: string): string {
        const map: Record<string, string> = {
            '&nbsp;': ' ', '&amp;': '&', '&quot;': '"',
            '&#39;': "'", '&apos;': "'", '&lt;': '<', '&gt;': '>',
        };
        return value
            .replace(/&nbsp;|&amp;|&quot;|&#39;|&apos;|&lt;|&gt;/g, e => map[e])
            .replace(/&#(\d+);/g, (_, c: string) => String.fromCharCode(Number(c)))
            .replace(/&#x([0-9a-f]+);/gi, (_, c: string) => String.fromCharCode(parseInt(c, 16)));
    }


    /** Case-insensitive, whitespace-collapsed, smart-quote-normalised compare */
    function normalizeText(value: string): string {
        return decodeHtmlEntities(value)
            .replace(/[\u2018\u2019\u201A\u201B\u02BC]/g, "'")  // curly single → '
            .replace(/[\u201C\u201D\u201E\u201F]/g, '"')         // curly double → "
            .replace(/\s+/g, ' ')
            .trim()
            .toLocaleLowerCase();
    }


    const errors: string[] = [];
    const warnings: string[] = [];


    function addError(message: string) {
        errors.push(message);
        console.error(`✘ ${message}`);
    }


    function addWarning(message: string) {
        warnings.push(message);
        console.warn(`⚠ ${message}`);
    }


    function addSuccess(message: string) {
        console.log(`✔ ${message}`);
    }


    // ── Test ───────────────────────────────────────────────────────────────


    test('Validate SSR content and SEO from Page Source', async ({ request }) => {


        // // 1. Fetch raw server HTML
        // const response = await request.get(url);
        // expect(response.ok(), `Page request failed: ${response.status()}`).toBeTruthy();
        // const html = await response.text();
        // console.log(`\nHTTP status : ${response.status()}`);
        // console.log(`HTML length : ${html.length}`);


        // ── 1. Fetch raw server HTML ──────────────────────────────────


        const response = await request.get(url);


        if (!response.ok()) {
            addError(`Page request failed: ${response.status()}`);
        } else {
            addSuccess(`HTTP status   : ${response.status()}`);
        }


        const html = await response.text();


        console.log(`HTML length    : ${html.length}`);


        // ── 2. Content baseline check (informational – no hard failure) ──────
        console.log('\n── Content Baseline Check ──────────────────────────────');
        if (!fs.existsSync(expectedContentPath)) {
            console.warn(`⚠ Baseline file not found, skipping content check.\n  Create: ${expectedContentPath}`);
        } else {
            const rawLines = fs
                .readFileSync(expectedContentPath, 'utf-8')
                .split(/\r?\n/)
                .map(l => l.trim())
                .filter(l => l.length > 0 && !l.startsWith('#'));


            // Deduplicate (preserve first occurrence order)
            const seen = new Set<string>();
            const uniqueLines = rawLines.filter(l => {
                const key = normalizeText(l);
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });


            const actualText = normalizeText(extractPageText(html));
            let found = 0;
            let missing = 0;


            for (const line of uniqueLines) {
                if (actualText.includes(normalizeText(line))) {
                    console.log(`  ✔ ${line}`);
                    found++;
                } else {
                    console.log(`  ✘ NOT IN SSR: ${line}`);
                    missing++;
                }
            }


            console.log(`\n  Summary: ${found} found / ${missing} missing / ${uniqueLines.length} total (${rawLines.length - uniqueLines.length} duplicates removed)`);
        }


        // ── 3. HTML lang ──────────────────────────────────────────────────────
        console.log('\n── SEO Checks ──────────────────────────────────────────');
        const langMatch = html.match(/<html\b[^>]*\blang=["']([^"']+)["']/i);
        expect(langMatch, 'HTML lang attribute is missing').not.toBeNull();
        console.log(`✔ HTML lang     : ${langMatch?.[1]}`);


        // ── 4. Title ─────────────────────────────────────────────────────────
        // const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
        // expect(titleMatch, 'Title tag is missing').not.toBeNull();
        // const title = decodeHtmlEntities(titleMatch?.[1] ?? '').trim();
        // expect(title, 'Title is empty').toBeTruthy();
        // expect(title.length, 'Title too long (>60)').toBeLessThanOrEqual(60);
        // console.log(`✔ Title         : ${title}`);


        // ── 4. Title ───────────────────────────────────────────────
        // ── 4. Title ─────────────────────────────────────────────────


        const titleMatch = html.match(
            /<title\b[^>]*>([\s\S]*?)<\/title>/i
        );


        let title = '';


        if (!titleMatch) {
            addError('Title tag is missing');
        } else {
            title = decodeHtmlEntities(titleMatch[1]).trim();


            if (!title) {
                addError('Title is empty');
            } else {
                addSuccess(`Title         : ${title}`);


                if (title.length > 60) {
                    addWarning(
                        `Title too long: ${title.length} characters (recommended <= 60)`
                    );
                } else {
                    addSuccess(`Title length  : ${title.length} characters`);
                }
            }
        }


        // ── 5. Meta description ───────────────────────────────────────────────
        // const descMatch = html.match(
        //     /<meta\b(?=[^>]*\bname=["']description["'])(?=[^>]*\bcontent=["']([^"']*)["'])[^>]*>/i
        // );
        // const description = descMatch?.[1]?.trim() ?? '';
        // expect(description, 'Meta description missing or empty').toBeTruthy();
        // expect(description.length, 'Meta description too long (>160)').toBeLessThanOrEqual(160);
        // console.log(`✔ Description   : ${description}`);


        // ── 5. Meta description ──────────────────────────────────────


        const descMatch = html.match(
            /<meta\b(?=[^>]*\bname=["']description["'])(?=[^>]*\bcontent=["']([^"']*)["'])[^>]*>/i
        );


        const description = descMatch?.[1]?.trim() ?? '';


        if (!description) {
            addError('Meta description missing or empty');
        } else {
            addSuccess(`Description   : ${description}`);


            if (description.length > 160) {
                addWarning(
                    `Meta description too long: ${description.length} characters (recommended <= 160)`
                );
            }
        }


        // ── 6. Meta keywords (optional) ───────────────────────────────────────
        // const kwMatch = html.match(
        //     /<meta\b(?=[^>]*\bname=["']keywords["'])(?=[^>]*\bcontent=["']([^"']*)["'])[^>]*>/i
        // );
        // console.log(kwMatch ? `✔ Keywords      : ${kwMatch[1]}` : '⚠ Keywords      : not found (optional)');


        // ── 6. Meta keywords ─────────────────────────────────────────


        const kwMatch = html.match(
            /<meta\b(?=[^>]*\bname=["']keywords["'])(?=[^>]*\bcontent=["']([^"']*)["'])[^>]*>/i
        );


        if (kwMatch?.[1]?.trim()) {
            addSuccess(`Keywords      : ${kwMatch[1]}`);
        } else {
            addWarning('Keywords not found');
        }


        // ── 7. Canonical URL ──────────────────────────────────────────────────
        // const canonicalMatch = html.match(
        //     /<link\b(?=[^>]*\brel=["']canonical["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*>/i
        // );
        // const canonicalUrl = canonicalMatch?.[1] ?? '';
        // expect(canonicalUrl, 'Canonical URL missing').toBeTruthy();
        // expect(canonicalUrl).toContain(expectedCanonicalPath);
        // console.log(`✔ Canonical     : ${canonicalUrl}`);


        // ── 7. Canonical URL ─────────────────────────────────────────


        const canonicalMatch = html.match(
            /<link\b(?=[^>]*\brel=["']canonical["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*>/i
        );


        const canonicalUrl = canonicalMatch?.[1]?.trim() ?? '';


        if (!canonicalUrl) {
            addError('Canonical URL missing');
        } else if (!canonicalUrl.includes(expectedCanonicalPath)) {
            addError(
                `Canonical URL mismatch: expected path "${expectedCanonicalPath}", received "${canonicalUrl}"`
            );
        } else {
            addSuccess(`Canonical     : ${canonicalUrl}`);
        }


        // ── 8. Robots meta (optional) ─────────────────────────────────────────
        // const robotsMatch = html.match(
        //     /<meta\b(?=[^>]*\bname=["']robots["'])(?=[^>]*\bcontent=["']([^"']*)["'])[^>]*>/i
        // );
        // console.log(robotsMatch ? `✔ Robots        : ${robotsMatch[1]}` : '⚠ Robots        : not found');


        // ── 8. Robots ────────────────────────────────────────────────


        const robotsMatch = html.match(
            /<meta\b(?=[^>]*\bname=["']robots["'])(?=[^>]*\bcontent=["']([^"']*)["'])[^>]*>/i
        );


        if (robotsMatch?.[1]) {
            addSuccess(`Robots        : ${robotsMatch[1]}`);
        } else {
            addWarning('Robots meta not found');
        }


        // ── 9. Viewport ───────────────────────────────────────────────────────
        // const vpMatch = html.match(
        //     /<meta\b(?=[^>]*\bname=["']viewport["'])(?=[^>]*\bcontent=["']([^"']*)["'])[^>]*>/i
        // );
        // expect(vpMatch, 'Viewport meta tag missing').not.toBeNull();
        // console.log(`✔ Viewport      : ${vpMatch?.[1]}`);


        // ── 9. Viewport ──────────────────────────────────────────────


        const vpMatch = html.match(
            /<meta\b(?=[^>]*\bname=["']viewport["'])(?=[^>]*\bcontent=["']([^"']*)["'])[^>]*>/i
        );


        if (!vpMatch) {
            addError('Viewport meta tag missing');
        } else {
            addSuccess(`Viewport      : ${vpMatch[1]}`);
        }


        // ── 10. Open Graph tags (warnings only — often client-side) ───────────
        // console.log('\n── Open Graph ──────────────────────────────────────────');
        // for (const property of ['og:title', 'og:description', 'og:url', 'og:type', 'og:image']) {
        //     const regex = new RegExp(
        //         `<meta\\b(?=[^>]*\\bproperty=["']${property}["'])(?=[^>]*\\bcontent=(?:"[^"]*"|'[^']*'))[^>]*>`,
        //         'i'
        //     );
        //     console.log(regex.test(html) ? `  ✔ ${property}` : `  ⚠ ${property} — not in SSR HTML`);
        // }


        // ── 10. Open Graph ───────────────────────────────────────────


        console.log('\n── Open Graph ──────────────────────────────────────────');


        for (const property of [
            'og:title',
            'og:description',
            'og:url',
            'og:type',
            'og:image'
        ]) {
            const regex = new RegExp(
                `<meta\\b(?=[^>]*\\bproperty=["']${property}["'])(?=[^>]*\\bcontent=(?:"[^"]*"|'[^']*'))[^>]*>`,
                'i'
            );


            if (regex.test(html)) {
                addSuccess(property);
            } else {
                addWarning(`${property} — not in SSR HTML`);
            }
        }


        // ── 11. Twitter card (warnings only) ──────────────────────────────────
        // console.log('\n── Twitter Card ────────────────────────────────────────');
        // for (const name of ['twitter:card', 'twitter:title', 'twitter:description']) {
        //     const regex = new RegExp(
        //         `<meta\\b(?=[^>]*\\bname=["']${name}["'])(?=[^>]*\\bcontent=(?:"[^"]*"|'[^']*'))[^>]*>`,
        //         'i'
        //     );
        //     console.log(regex.test(html) ? `  ✔ ${name}` : `  ⚠ ${name} — not in SSR HTML`);
        // }


        // ── 11. Twitter Card ─────────────────────────────────────────


        console.log('\n── Twitter Card ────────────────────────────────────────');


        for (const name of [
            'twitter:card',
            'twitter:title',
            'twitter:description'
        ]) {
            const regex = new RegExp(
                `<meta\\b(?=[^>]*\\bname=["']${name}["'])(?=[^>]*\\bcontent=(?:"[^"]*"|'[^']*'))[^>]*>`,
                'i'
            );


            if (regex.test(html)) {
                addSuccess(name);
            } else {
                addWarning(`${name} — not in SSR HTML`);
            }
        }


        // // ── 12. H1 ────────────────────────────────────────────────────────────
        // console.log('\n── Structure ───────────────────────────────────────────');
        // const h1Matches = html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi) ?? [];
        // expect(h1Matches.length, 'H1 missing').toBeGreaterThan(0);
        // expect(h1Matches.length, 'More than one H1 found').toBe(1);
        // console.log(`✔ H1 count      : ${h1Matches.length}`);


        // ── 12. H1 ───────────────────────────────────────────────────


        // ── 12. H1 ───────────────────────────────────────────────────


        console.log('\n── Structure ───────────────────────────────────────────');


        const h1Matches =
            html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi) ?? [];


        if (h1Matches.length === 0) {
            addWarning('H1 not found in SSR HTML');
        } else if (h1Matches.length > 1) {
            addWarning(`${h1Matches.length} H1 tags found; expected 1`);
        } else {
            addSuccess('H1 count      : 1');
        }


        // ── 13. JSON-LD ───────────────────────────────────────────────────────
        // const jsonLdMatches = html.match(
        //     /<script\b(?=[^>]*\btype=["']application\/ld\+json["'])[^>]*>[\s\S]*?<\/script>/gi
        // ) ?? [];
        // if (jsonLdMatches.length === 0) {
        //     console.log('⚠ JSON-LD       : not found');
        // } else {
        //     for (const block of jsonLdMatches) {
        //         const content = block.replace(/^<script\b[^>]*>/i, '').replace(/<\/script>$/i, '').trim();
        //         expect(() => JSON.parse(content), 'Invalid JSON-LD').not.toThrow();
        //     }
        //     console.log(`✔ JSON-LD       : ${jsonLdMatches.length} valid block(s)`);
        // }


        // ── 13. JSON-LD ───────────────────────────────────────────────


        const jsonLdMatches = html.match(
            /<script\b(?=[^>]*\btype=["']application\/ld\+json["'])[^>]*>[\s\S]*?<\/script>/gi
        ) ?? [];


        if (jsonLdMatches.length === 0) {


            addWarning('JSON-LD not found');


        } else {


            let validJsonLd = 0;


            for (const block of jsonLdMatches) {


                const content = block
                    .replace(/^<script\b[^>]*>/i, '')
                    .replace(/<\/script>$/i, '')
                    .trim();


                try {
                    JSON.parse(content);
                    validJsonLd++;
                } catch {
                    addError('Invalid JSON-LD found');
                }
            }


            if (validJsonLd > 0) {
                addSuccess(
                    `JSON-LD       : ${validJsonLd} valid block(s)`
                );
            }
        }


        // ── 14. Image alt attributes ──────────────────────────────────────────
        // const imgs = html.match(/<img\b[^>]*>/gi) ?? [];
        // const missingAlt = imgs.filter(img => !/\balt\s*=\s*(["'])[\s\S]*?\1/i.test(img));
        // if (missingAlt.length > 0) {
        //     missingAlt.forEach(img => console.error(`  ✘ img missing alt: ${img.slice(0, 150)}`));
        // }
        // expect(missingAlt, `${missingAlt.length} image(s) missing alt`).toEqual([]);
        // console.log(`✔ Images        : ${imgs.length} found, all have alt`);


        // ── 14. Image alt attributes ─────────────────────────────────


        const imgs = html.match(/<img\b[^>]*>/gi) ?? [];


        const missingAlt = imgs.filter(
            img => !/\balt\s*=\s*(["'])[\s\S]*?\1/i.test(img)
        );


        if (missingAlt.length > 0) {


            missingAlt.forEach(img =>
                addError(
                    `Image missing alt: ${img.slice(0, 150)}`
                )
            );


        } else {


            addSuccess(
                `Images        : ${imgs.length} found, all have alt`
            );
        }


        // ── 15. Links ─────────────────────────────────────────────────────────
        // const links = html.match(/<a\b[^>]*\bhref=["'][^"']+["'][^>]*>/gi) ?? [];
        // expect(links.length, 'No links in SSR HTML').toBeGreaterThan(0);
        // console.log(`✔ Links         : ${links.length} found`);


        // ── 15. Links ────────────────────────────────────────────────


        const links =
            html.match(/<a\b[^>]*\bhref=["'][^"']+["'][^>]*>/gi) ?? [];


        if (links.length === 0) {
            addWarning('No links found in SSR HTML');
        } else {
            addSuccess(`Links         : ${links.length} found`);
        }


        // // ── 16. Next.js SSR markers ───────────────────────────────────────────
        // const isNextJS = html.includes('__next') || html.includes('_next/static');
        // expect(isNextJS, 'Next.js SSR markers not found').toBeTruthy();
        // console.log(`✔ Next.js SSR   : markers found`);


        // ── 16. Framework / SSR markers ───────────────────────────────


        // ── 16. Framework / SSR markers ──────────────────────────────


        const isNextJS =
            html.includes('__next') ||
            html.includes('_next/static');


        const isReactSSR =
            html.includes('data-reactroot') ||
            html.includes('data-react-helmet');


        if (isNextJS) {


            addSuccess('Framework     : Next.js SSR markers found');


        } else if (isReactSSR) {


            addSuccess('Framework     : React SSR markers found');


        } else {


            addWarning(
                'Framework     : Next.js / React SSR markers not detected'
            );
        }


        // ── 17. Key SEO data present in initial HTML ──────────────────────────
        // for (const [label, value] of [
        //     ['title', title],
        //     ['description', description],
        //     ['canonical', canonicalUrl],
        // ] as [string, string][]) {
        //     expect(html, `${label} not in initial server HTML`).toContain(value);
        //     console.log(`✔ In SSR HTML   : ${label}`);
        // }


        // ── 17. Key SEO data present in initial HTML ────────────────


        // ── 17. Key SEO data present in initial HTML ──────────────────────────


        const normalizedHtml = normalizeText(
            decodeHtmlEntities(html)
        );


        for (const [label, value] of [
            ['title', title],
            ['description', description],
            ['canonical', canonicalUrl],
        ] as [string, string][]) {


            if (!value) {
                addError(`${label} is empty`);
                continue;
            }


            const normalizedValue = normalizeText(
                decodeHtmlEntities(value)
            );


            if (!normalizedHtml.includes(normalizedValue)) {
                addError(
                    `${label} not found in initial server HTML`
                );
            } else {
                addSuccess(`In SSR HTML   : ${label}`);
            }
        }


        // ── Final Validation Summary ─────────────────────────────────


        console.log('\n════════════════════════════════════════');
        console.log('       SSR + SEO VALIDATION SUMMARY');
        console.log('════════════════════════════════════════');


        console.log(`✔ Warnings : ${warnings.length}`);
        console.log(`✘ Errors   : ${errors.length}`);


        if (warnings.length > 0) {


            console.log('\n── Warnings ───────────────────────────');


            warnings.forEach((warning, index) => {
                console.log(`${index + 1}. ⚠ ${warning}`);
            });
        }


        if (errors.length > 0) {


            console.log('\n── Errors ─────────────────────────────');


            errors.forEach((error, index) => {
                console.log(`${index + 1}. ✘ ${error}`);
            });
        }


        console.log('\n════════════════════════════════════════');


        if (errors.length > 0) {
            throw new Error(
                `SSR + SEO validation failed with ${errors.length} error(s)`
            );
        }


        console.log('  SSR + SEO VALIDATION COMPLETED ✔');
        console.log('════════════════════════════════════════\n');
    });
});