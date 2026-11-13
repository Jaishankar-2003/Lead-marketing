import { chromium, Browser } from '@playwright/test';
import { prisma } from '../lib/prisma';
import { Lead } from '@prisma/client';
import { analyzeSeoAndSsr, SeoAnalysisResult } from './seo-analyzer';

export interface EnrichmentResult {
  websiteStatus: 'ONLINE' | 'UNREACHABLE' | 'TIMEOUT' | 'INVALID_URL';
  isHttps: boolean;
  pageTitle: string | null;
  aboutUrl: string | null;
  contactUrl: string | null;
  enrichedEmail: string | null;
  enrichedPhone: string | null;
  error?: string;
  seoResult?: SeoAnalysisResult;
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(?:\+91[-.\s]?)?[6-9]\d{9}|0\d{2,4}[-.\s]?\d{6,8}/g;

export async function enrichWebsite(url: string): Promise<EnrichmentResult> {
  if (!url || !url.trim()) {
    return {
      websiteStatus: 'INVALID_URL',
      isHttps: false,
      pageTitle: null,
      aboutUrl: null,
      contactUrl: null,
      enrichedEmail: null,
      enrichedPhone: null,
      error: 'URL is empty',
    };
  }

  let targetUrl = url.trim();
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl;
  }

  const isHttps = targetUrl.startsWith('https://');

  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 (LeadPilot Enrichment Bot)',
    });

    const page = await context.newPage();

    // Navigate to homepage with strict 12s timeout
    let response;
    try {
      response = await page.goto(targetUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 12000,
      });
    } catch (navErr: any) {
      // If HTTPS fails with SSL/cert error, fallback to HTTP
      if (targetUrl.startsWith('https://')) {
        try {
          const httpFallback = targetUrl.replace('https://', 'http://');
          response = await page.goto(httpFallback, {
            waitUntil: 'domcontentloaded',
            timeout: 10000,
          });
        } catch (fallbackErr: any) {
          return {
            websiteStatus: 'TIMEOUT',
            isHttps: false,
            pageTitle: null,
            aboutUrl: null,
            contactUrl: null,
            enrichedEmail: null,
            enrichedPhone: null,
            error: navErr.message,
          };
        }
      } else {
        return {
          websiteStatus: 'UNREACHABLE',
          isHttps: false,
          pageTitle: null,
          aboutUrl: null,
          contactUrl: null,
          enrichedEmail: null,
          enrichedPhone: null,
          error: navErr.message,
        };
      }
    }

    if (!response || !response.ok() && response.status() >= 400) {
      return {
        websiteStatus: 'UNREACHABLE',
        isHttps,
        pageTitle: await page.title().catch(() => null),
        aboutUrl: null,
        contactUrl: null,
        enrichedEmail: null,
        enrichedPhone: null,
        error: `HTTP status ${response?.status()}`,
      };
    }

    // Extract title
    const pageTitle = (await page.title().catch(() => ''))?.trim() || null;

    // Scan links for About and Contact pages
    const links = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href]'));
      return anchors.map((a) => ({
        href: (a as HTMLAnchorElement).href,
        text: (a.textContent || '').trim().toLowerCase(),
      }));
    });

    let aboutUrl: string | null = null;
    let contactUrl: string | null = null;

    for (const link of links) {
      if (!aboutUrl && (/about|who-we-are|company/i.test(link.href) || /about/i.test(link.text))) {
        aboutUrl = link.href;
      }
      if (!contactUrl && (/contact|reach-us|support/i.test(link.href) || /contact/i.test(link.text))) {
        contactUrl = link.href;
      }
    }

    // Extract emails and phone numbers from visible page text & mailto/tel links
    const pageText = await page.evaluate(() => document.body.innerText || '');

    const emailsFound = new Set<string>();
    // Check mailto links first
    for (const link of links) {
      if (link.href.startsWith('mailto:')) {
        const mail = link.href.replace(/^mailto:/i, '').split('?')[0].trim().toLowerCase();
        if (mail.includes('@')) emailsFound.add(mail);
      }
    }
    // Regex scan text
    const textEmails = pageText.match(EMAIL_REGEX) || [];
    textEmails.forEach((e) => {
      const clean = e.trim().toLowerCase();
      // Filter out image assets like logo@2x.png
      if (!/\.(png|jpg|jpeg|webp|gif|svg)$/i.test(clean)) {
        emailsFound.add(clean);
      }
    });

    // Check tel links & regex phone
    const phonesFound = new Set<string>();
    for (const link of links) {
      if (link.href.startsWith('tel:')) {
        const phone = link.href.replace(/^tel:/i, '').trim();
        if (phone.length >= 7) phonesFound.add(phone);
      }
    }
    const textPhones = pageText.match(PHONE_REGEX) || [];
    textPhones.forEach((p) => {
      const clean = p.trim();
      if (clean.length >= 8) phonesFound.add(clean);
    });

    // If contact page exists, inspect it for emails
    if (contactUrl && contactUrl.startsWith('http')) {
      try {
        await page.goto(contactUrl, { waitUntil: 'domcontentloaded', timeout: 8000 });
        const contactPageText = await page.evaluate(() => document.body.innerText || '');
        const contactEmails = contactPageText.match(EMAIL_REGEX) || [];
        contactEmails.forEach((e) => {
          const clean = e.trim().toLowerCase();
          if (!/\.(png|jpg|jpeg|webp|gif|svg)$/i.test(clean)) emailsFound.add(clean);
        });
      } catch {
        // Ignore contact page visit timeout
      }
    }

    // -------------------------------------------------------------
    // Additive Stage: SEO + SSR Content Analysis
    // -------------------------------------------------------------
    let seoResult: SeoAnalysisResult | undefined;
    try {
      let rawServerHtml = '';
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 9000);
        const fetchRes = await fetch(targetUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 (LeadPilot SEO Crawler)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (fetchRes.ok) {
          rawServerHtml = await fetchRes.text();
        }
      } catch {
        // Direct fetch timed out or failed; fallback to page.content()
      }

      if (!rawServerHtml) {
        rawServerHtml = await page.content().catch(() => '');
      }

      seoResult = analyzeSeoAndSsr(targetUrl, rawServerHtml, pageText);
    } catch (seoErr: any) {
      console.warn(`SEO analysis failed for ${targetUrl}:`, seoErr);
    }

    return {
      websiteStatus: 'ONLINE',
      isHttps,
      pageTitle,
      aboutUrl,
      contactUrl,
      enrichedEmail: Array.from(emailsFound)[0] || null,
      enrichedPhone: Array.from(phonesFound)[0] || null,
      seoResult,
    };
  } catch (err: any) {
    return {
      websiteStatus: 'UNREACHABLE',
      isHttps,
      pageTitle: null,
      aboutUrl: null,
      contactUrl: null,
      enrichedEmail: null,
      enrichedPhone: null,
      error: err.message,
    };
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

export async function enrichLeadRecord(leadId: string): Promise<Lead> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
  });

  if (!lead) throw new Error('Lead not found');
  if (!lead.website) throw new Error('Lead has no registered website to enrich');

  const enrichment = await enrichWebsite(lead.website);
  const seo = enrichment.seoResult;

  const updated = await prisma.lead.update({
    where: { id: leadId },
    data: {
      websiteStatus: enrichment.websiteStatus,
      isHttps: enrichment.isHttps,
      pageTitle: enrichment.pageTitle,
      aboutUrl: enrichment.aboutUrl,
      contactUrl: enrichment.contactUrl,
      enrichedEmail: enrichment.enrichedEmail,
      enrichedPhone: enrichment.enrichedPhone,
      enrichedAt: new Date(),
      // Automatically populate empty lead contact details if verified from corporate website
      email: lead.email || enrichment.enrichedEmail,
      phone: lead.phone || enrichment.enrichedPhone,

      // SEO & SSR Analysis fields (Additive)
      seoScore: seo ? seo.overallScore : null,
      seoStatus: seo ? seo.seoStatus : (enrichment.websiteStatus === 'ONLINE' ? 'COMPLETED' : 'UNAVAILABLE'),
      technicalSeoScore: seo ? seo.technicalSeoScore : null,
      ssrScore: seo ? seo.ssrScore : null,
      structureScore: seo ? seo.structureScore : null,
      socialSeoScore: seo ? seo.socialSeoScore : null,
      accessibilityScore: seo ? seo.accessibilityScore : null,
      ssrCoveragePercentage: seo ? seo.ssrCoveragePercentage : null,
      ssrFramework: seo ? seo.ssrFramework : null,
      seoAnalysisResults: seo ? (seo as any) : undefined,
      seoAnalyzedAt: seo ? new Date() : null,

      activities: {
        create: {
          type: 'ENRICHMENT',
          content: `Website enriched. Status: ${enrichment.websiteStatus}, Title: "${enrichment.pageTitle || 'N/A'}"${
            enrichment.enrichedEmail ? `, Discovered Email: ${enrichment.enrichedEmail}` : ''
          }${
            seo && seo.seoStatus === 'COMPLETED'
              ? `, SEO Score: ${seo.overallScore}/100 (${seo.classification}), SSR Coverage: ${seo.ssrCoveragePercentage}%`
              : ''
          }`,
        },
      },
    },
  });

  return updated;
}
