import { Browser, Page } from 'playwright';
import { CONFIG } from '../config';
import { WebsiteAnalysis, WebsiteStatus } from '../types';
import { validateEmail, validatePhone } from '../utils/urlUtils';

/**
 * Analyzes a business's official website for technical health, responsiveness,
 * contact information, and service improvement opportunities.
 * Strictly separates WEBSITE_BROKEN (explicit 404/500/DNS failure) from WEBSITE_UNAVAILABLE (timeout/network glitch).
 */
export async function analyzeWebsite(
  url: string,
  browser: Browser
): Promise<WebsiteAnalysis> {
  const analysis: WebsiteAnalysis = {
    isAccessible: false,
    statusCode: null,
    hasHttps: url.toLowerCase().startsWith('https://'),
    isMobileFriendly: false,
    hasOutdatedIndicators: false,
    outdatedReasons: [],
    hasContactInfo: false,
    extractedEmails: [],
    extractedPhones: [],
    socialLinks: {},
    improvementOpportunities: [],
    responseTimeMs: null,
    websiteStatus: 'NEEDS_VERIFICATION',
  };

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    ignoreHTTPSErrors: true,
  });

  const page: Page = await context.newPage();
  const startTime = Date.now();

  try {
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: CONFIG.websiteAuditTimeout,
    });

    analysis.responseTimeMs = Date.now() - startTime;

    if (response) {
      analysis.statusCode = response.status();
      analysis.hasHttps = page.url().toLowerCase().startsWith('https://');

      if (analysis.statusCode >= 200 && analysis.statusCode < 400) {
        analysis.isAccessible = true;
        analysis.websiteStatus = 'WEBSITE_FOUND';
      } else if (analysis.statusCode === 404 || analysis.statusCode === 410 || analysis.statusCode >= 500) {
        analysis.isAccessible = false;
        analysis.websiteStatus = 'WEBSITE_BROKEN';
        analysis.improvementOpportunities.push(
          `Server returned fatal error HTTP ${analysis.statusCode} (Broken Website)`
        );
      } else {
        analysis.isAccessible = false;
        analysis.websiteStatus = 'WEBSITE_UNAVAILABLE';
        analysis.improvementOpportunities.push(
          `Website returned non-standard status: ${analysis.statusCode}`
        );
      }
    }

    if (!analysis.hasHttps) {
      analysis.improvementOpportunities.push('Lacks HTTPS encryption (Not Secure in browser)');
    }

    if (analysis.responseTimeMs && analysis.responseTimeMs > 4500) {
      analysis.improvementOpportunities.push(
        `Slow page response time (${(analysis.responseTimeMs / 1000).toFixed(1)}s)`
      );
    }

    // Inspect DOM for mobile viewport, obsolete markup, copyright, contacts, social
    if (analysis.isAccessible) {
      const pageData = await page.evaluate(() => {
        const doc = document;
        const bodyText = doc.body?.innerText || '';

        const viewportMeta = doc.querySelector('meta[name="viewport"]');
        const hasViewport = !!viewportMeta;

        const descMeta = doc.querySelector('meta[name="description"]');
        const hasDescription = !!descMeta && (descMeta.getAttribute('content')?.trim().length || 0) > 10;

        const currentYear = new Date().getFullYear();
        const copyrightMatch = bodyText.match(/(?:©|copyright|&copy;)\s*(?:20\d\d\s*[-–]\s*)?(20\d\d)/i);
        const copyrightYear = copyrightMatch ? parseInt(copyrightMatch[1], 10) : null;

        const fontTags = doc.querySelectorAll('font, center, frameset, marquee').length;

        const mailtoHrefs = Array.from(doc.querySelectorAll('a[href^="mailto:"]')).map(
          (a) => (a as HTMLAnchorElement).href.replace(/^mailto:/i, '').split('?')[0].trim()
        );

        const telHrefs = Array.from(doc.querySelectorAll('a[href^="tel:"]')).map(
          (a) => (a as HTMLAnchorElement).href.replace(/^tel:/i, '').trim()
        );

        const allLinks = Array.from(doc.querySelectorAll('a[href]')).map(
          (a) => (a as HTMLAnchorElement).href
        );

        const findSocial = (domain: string) =>
          allLinks.find((l) => l.toLowerCase().includes(domain) && !l.includes('sharer') && !l.includes('share'));

        return {
          hasViewport,
          hasDescription,
          copyrightYear,
          currentYear,
          fontTags,
          mailtoHrefs,
          telHrefs,
          bodyText: bodyText.slice(0, 100000),
          socialLinks: {
            facebook: findSocial('facebook.com'),
            instagram: findSocial('instagram.com'),
            linkedin: findSocial('linkedin.com'),
            twitter: findSocial('twitter.com') || findSocial('x.com'),
            youtube: findSocial('youtube.com'),
          },
        };
      });

      // 1. Mobile Responsiveness
      analysis.isMobileFriendly = pageData.hasViewport;
      if (!analysis.isMobileFriendly) {
        analysis.improvementOpportunities.push(
          'Missing responsive viewport meta tag (Poor mobile user experience)'
        );
      }

      // 2. Outdated Design Indicators
      const currentYear = new Date().getFullYear();
      if (pageData.copyrightYear && pageData.copyrightYear < currentYear - 3) {
        analysis.hasOutdatedIndicators = true;
        const reason = `Website copyright notice appears outdated (${pageData.copyrightYear})`;
        analysis.outdatedReasons.push(reason);
        analysis.improvementOpportunities.push(reason);
      }

      if (pageData.fontTags > 2) {
        analysis.hasOutdatedIndicators = true;
        const reason = 'Uses deprecated legacy HTML elements (<font>/<center>/<marquee>)';
        analysis.outdatedReasons.push(reason);
        analysis.improvementOpportunities.push(reason);
      }

      // 3. Contact Info Extraction
      const foundEmails = new Set<string>();
      for (const m of pageData.mailtoHrefs) {
        const valid = validateEmail(m);
        if (valid) foundEmails.add(valid);
      }
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const textEmailMatches = pageData.bodyText.match(emailRegex) || [];
      for (const em of textEmailMatches) {
        const valid = validateEmail(em);
        if (valid) foundEmails.add(valid);
      }
      analysis.extractedEmails = Array.from(foundEmails).slice(0, 3);

      const foundPhones = new Set<string>();
      for (const t of pageData.telHrefs) {
        const valid = validatePhone(t);
        if (valid) foundPhones.add(valid);
      }
      const phoneRegex = /(?:\+91[\s-]?)?[6789]\d{4}[\s-]?\d{5}|0\d{3,4}[\s-]?\d{6,7}/g;
      const textPhoneMatches = pageData.bodyText.match(phoneRegex) || [];
      for (const ph of textPhoneMatches) {
        const valid = validatePhone(ph);
        if (valid) foundPhones.add(valid);
      }
      analysis.extractedPhones = Array.from(foundPhones).slice(0, 3);

      analysis.socialLinks = pageData.socialLinks;
      analysis.hasContactInfo = analysis.extractedEmails.length > 0 || analysis.extractedPhones.length > 0;
    }
  } catch (err: any) {
    const msg = (err?.message || '').toLowerCase();
    analysis.isAccessible = false;
    analysis.statusCode = null;

    if (msg.includes('net::err_name_not_resolved') || msg.includes('dns') || msg.includes('404')) {
      analysis.websiteStatus = 'WEBSITE_BROKEN';
      analysis.improvementOpportunities.push('Domain does not resolve or host not found (DNS Failure)');
    } else {
      // Timeout or transient connection issue -> mark UNAVAILABLE, not broken!
      analysis.websiteStatus = 'WEBSITE_UNAVAILABLE';
      analysis.improvementOpportunities.push('Connection timed out or host unreachable during audit');
    }
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
  }

  return analysis;
}
