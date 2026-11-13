/**
 * LeadPilot SEO + SSR Analysis Engine
 * Adapted from reference implementation tests/seo.spec.ts
 * Performs non-destructive, additive SEO and SSR validation on business websites.
 */

export interface CheckResult {
  id: string;
  name: string;
  category: 'technical' | 'ssr' | 'structure' | 'social' | 'accessibility';
  status: 'PASS' | 'WARN' | 'FAIL';
  score: number;
  maxScore: number;
  value?: string | number | null;
  message: string;
}

export interface SsrDetails {
  totalRenderedCharacters: number;
  ssrPresentCharacters: number;
  clientOnlyCharacters: number;
  ssrCoveragePercentage: number;
  framework: string;
  missingTextSamples: string[];
}

export interface CategoryScore {
  score: number;
  maxScore: number;
  checks: CheckResult[];
}

export interface SeoAnalysisResult {
  overallScore: number;
  classification: 'Excellent' | 'Good' | 'Needs Improvement' | 'Poor';
  seoStatus: 'COMPLETED' | 'FAILED' | 'UNAVAILABLE';
  technicalSeoScore: number;
  ssrScore: number;
  structureScore: number;
  socialSeoScore: number;
  accessibilityScore: number;
  ssrCoveragePercentage: number;
  ssrFramework: string;
  categories: {
    technical: CategoryScore;
    ssr: CategoryScore;
    structure: CategoryScore;
    social: CategoryScore;
    accessibility: CategoryScore;
  };
  ssrDetails: SsrDetails;
  passedChecksCount: number;
  failedChecksCount: number;
  warningChecksCount: number;
  recommendations: string[];
  analyzedUrl: string;
  error?: string;
}

/** Decode common HTML entities */
export function decodeHtmlEntities(value: string): string {
  if (!value) return '';
  const map: Record<string, string> = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&lt;': '<',
    '&gt;': '>',
  };
  return value
    .replace(/&nbsp;|&amp;|&quot;|&#39;|&apos;|&lt;|&gt;/g, (e) => map[e] || e)
    .replace(/&#(\d+);/g, (_, c: string) => String.fromCharCode(Number(c)))
    .replace(/&#x([0-9a-f]+);/gi, (_, c: string) => String.fromCharCode(parseInt(c, 16)));
}

/** Strip scripts/styles/comments/tags -> plain text */
export function extractPageText(html: string): string {
  if (!html) return '';
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

/** Normalize text for robust comparison */
export function normalizeText(value: string): string {
  if (!value) return '';
  return decodeHtmlEntities(value)
    .replace(/[\u2018\u2019\u201A\u201B\u02BC]/g, "'") // curly single -> '
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"') // curly double -> "
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Detect framework and SSR markers in HTML */
export function detectFramework(html: string, ssrCoverage: number): string {
  if (!html) return 'Unknown';

  if (html.includes('__next') || html.includes('_next/static') || html.includes('__NEXT_DATA__')) {
    return 'Next.js (React)';
  }
  if (html.includes('__nuxt') || html.includes('_nuxt/')) {
    return 'Nuxt.js (Vue)';
  }
  if (html.includes('data-reactroot') || html.includes('data-react-helmet')) {
    return 'React (SSR)';
  }
  if (html.includes('ng-version') || html.includes('ng-server-context')) {
    return 'Angular (SSR)';
  }
  if (html.includes('__svelte') || html.includes('svelte-')) {
    return 'SvelteKit / Svelte';
  }
  if (html.includes('wp-content') || html.includes('wp-includes')) {
    return 'WordPress';
  }
  if (html.includes('data-drupal') || html.includes('drupal.org')) {
    return 'Drupal';
  }
  if (html.includes('data-v-') || html.includes('vue-router')) {
    return ssrCoverage > 50 ? 'Vue.js (SSR)' : 'Vue.js (Client SPA)';
  }
  if (html.includes('id="root"') || html.includes('id="__root"') || html.includes('id="app"')) {
    if (ssrCoverage < 40) {
      return 'Client-side SPA (React/Vue/Other)';
    }
  }
  if (ssrCoverage >= 60) {
    return 'Server-Rendered / Static HTML';
  }
  return 'Custom Web Application';
}

/**
 * Perform comprehensive SEO + SSR analysis on raw HTML and browser-rendered text
 */
export function analyzeSeoAndSsr(
  targetUrl: string,
  rawHtml: string | null,
  browserVisibleText: string
): SeoAnalysisResult {
  const recommendations: string[] = [];
  const checks: CheckResult[] = [];

  if (!rawHtml || !rawHtml.trim()) {
    return {
      overallScore: 0,
      classification: 'Poor',
      seoStatus: 'UNAVAILABLE',
      technicalSeoScore: 0,
      ssrScore: 0,
      structureScore: 0,
      socialSeoScore: 0,
      accessibilityScore: 0,
      ssrCoveragePercentage: 0,
      ssrFramework: 'Unknown',
      categories: {
        technical: { score: 0, maxScore: 30, checks: [] },
        ssr: { score: 0, maxScore: 30, checks: [] },
        structure: { score: 0, maxScore: 20, checks: [] },
        social: { score: 0, maxScore: 10, checks: [] },
        accessibility: { score: 0, maxScore: 10, checks: [] },
      },
      ssrDetails: {
        totalRenderedCharacters: 0,
        ssrPresentCharacters: 0,
        clientOnlyCharacters: 0,
        ssrCoveragePercentage: 0,
        framework: 'Unknown',
        missingTextSamples: [],
      },
      passedChecksCount: 0,
      failedChecksCount: 0,
      warningChecksCount: 0,
      recommendations: ['Unable to fetch initial server HTML. Ensure website server is online and responding.'],
      analyzedUrl: targetUrl,
      error: 'Raw HTML content is empty',
    };
  }

  const rawServerText = extractPageText(rawHtml);
  const normalizedRawServerText = normalizeText(rawServerText);

  // -------------------------------------------------------------
  // A. SSR CONTENT VALIDATION (HIGHEST PRIORITY)
  // -------------------------------------------------------------
  let ssrPresentCharacters = 0;
  let clientOnlyCharacters = 0;
  const missingTextSamples: string[] = [];

  // Break visible browser text into meaningful lines/paragraphs
  const visibleLines = (browserVisibleText || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => {
      if (l.length < 4) return false;
      // Skip pure digits, time strings, or common navigation separator symbols
      if (/^[\d\s:.,\/\-|+•]+$/.test(l)) return false;
      return true;
    });

  // Deduplicate lines while preserving order
  const seenLines = new Set<string>();
  const uniqueVisibleLines = visibleLines.filter((line) => {
    const key = normalizeText(line);
    if (!key || seenLines.has(key)) return false;
    seenLines.add(key);
    return true;
  });

  if (uniqueVisibleLines.length === 0) {
    // If no distinct lines, fallback to length of raw text
    if (rawServerText.length > 50) {
      ssrPresentCharacters = rawServerText.length;
      clientOnlyCharacters = 0;
    }
  } else {
    for (const line of uniqueVisibleLines) {
      const normalizedLine = normalizeText(line);
      if (normalizedRawServerText.includes(normalizedLine)) {
        ssrPresentCharacters += line.length;
      } else {
        // Also check if significant words in this line are present in raw text
        const words = normalizedLine.split(' ').filter((w) => w.length > 3);
        const matchCount = words.filter((w) => normalizedRawServerText.includes(w)).length;
        if (words.length > 3 && matchCount / words.length >= 0.75) {
          // Mostly present (e.g. minor dynamic punctuation or span spacing)
          ssrPresentCharacters += line.length;
        } else {
          clientOnlyCharacters += line.length;
          if (missingTextSamples.length < 8) {
            missingTextSamples.push(line.length > 120 ? line.slice(0, 117) + '...' : line);
          }
        }
      }
    }
  }

  const totalRenderedCharacters = ssrPresentCharacters + clientOnlyCharacters;
  let ssrCoveragePercentage = 100;
  if (totalRenderedCharacters > 0) {
    ssrCoveragePercentage = Math.min(
      100,
      Math.max(0, Math.round((ssrPresentCharacters / totalRenderedCharacters) * 1000) / 10)
    );
  } else if (!rawServerText || rawServerText.length < 20) {
    ssrCoveragePercentage = 0;
  }

  const detectedFramework = detectFramework(rawHtml, ssrCoveragePercentage);

  // SSR Score breakdown (30 points total):
  // 1. SSR Text Coverage (16 pts)
  let ssrCoverageScore = 0;
  let ssrCoverageStatus: 'PASS' | 'WARN' | 'FAIL' = 'PASS';
  let ssrCoverageMessage = `SSR text coverage is ${ssrCoveragePercentage}%`;

  if (ssrCoveragePercentage >= 80) {
    ssrCoverageScore = 16;
    ssrCoverageStatus = 'PASS';
    ssrCoverageMessage = `High SSR text coverage (${ssrCoveragePercentage}%). Most visible text is directly in initial server HTML.`;
  } else if (ssrCoveragePercentage >= 50) {
    ssrCoverageScore = 10;
    ssrCoverageStatus = 'WARN';
    ssrCoverageMessage = `Moderate SSR text coverage (${ssrCoveragePercentage}%). Some dynamic or client-rendered content is missing from initial HTML.`;
    recommendations.push('Improve server-side rendering coverage to ensure all key visible body text is indexed by search engine crawlers.');
  } else if (ssrCoveragePercentage >= 20) {
    ssrCoverageScore = 5;
    ssrCoverageStatus = 'WARN';
    ssrCoverageMessage = `Low SSR text coverage (${ssrCoveragePercentage}%). Search engine bots without full JavaScript execution may miss visible content.`;
    recommendations.push('Implement server-side pre-rendering or SSR to increase crawlable content for search engines.');
  } else {
    ssrCoverageScore = 0;
    ssrCoverageStatus = 'FAIL';
    ssrCoverageMessage = `Very low or zero SSR text coverage (${ssrCoveragePercentage}%). Website relies almost entirely on client-side JavaScript rendering.`;
    recommendations.push('Critical: Migrate key landing page content to Server-Side Rendering (SSR) or Static Site Generation (SSG) for SEO visibility.');
  }

  checks.push({
    id: 'ssr_coverage',
    name: 'SSR Text Coverage',
    category: 'ssr',
    status: ssrCoverageStatus,
    score: ssrCoverageScore,
    maxScore: 16,
    value: `${ssrCoveragePercentage}%`,
    message: ssrCoverageMessage,
  });

  // 2. Initial HTML Core SEO Data (8 pts) - tests/seo.spec.ts check 17
  const titleMatch = rawHtml.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const rawTitle = titleMatch ? decodeHtmlEntities(titleMatch[1]).trim() : '';

  const descMatch = rawHtml.match(
    /<meta\b(?=[^>]*\bname=["']description["'])(?=[^>]*\bcontent=["']([^"']*)["'])[^>]*>/i
  );
  const rawDesc = descMatch ? decodeHtmlEntities(descMatch[1]).trim() : '';

  const canonicalMatch = rawHtml.match(
    /<link\b(?=[^>]*\brel=["']canonical["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*>/i
  );
  const rawCanonical = canonicalMatch ? canonicalMatch[1].trim() : '';

  let coreMetaPresentCount = 0;
  if (rawTitle && normalizedRawServerText.includes(normalizeText(rawTitle))) coreMetaPresentCount++;
  else if (rawTitle && rawHtml.includes(rawTitle)) coreMetaPresentCount++;

  if (rawDesc && rawHtml.includes(rawDesc)) coreMetaPresentCount++;
  if (rawCanonical && rawHtml.includes(rawCanonical)) coreMetaPresentCount++;

  let coreMetaScore = 0;
  let coreMetaStatus: 'PASS' | 'WARN' | 'FAIL' = 'PASS';
  let coreMetaMessage = '';

  if (coreMetaPresentCount === 3) {
    coreMetaScore = 8;
    coreMetaStatus = 'PASS';
    coreMetaMessage = 'Title, meta description, and canonical URL are all embedded in initial server HTML.';
  } else if (coreMetaPresentCount === 2) {
    coreMetaScore = 5;
    coreMetaStatus = 'WARN';
    coreMetaMessage = '2 of 3 core SEO tags (title, description, canonical) found in initial server HTML.';
    recommendations.push('Ensure title, meta description, and canonical link are all directly rendered in initial server HTML.');
  } else if (coreMetaPresentCount === 1) {
    coreMetaScore = 3;
    coreMetaStatus = 'WARN';
    coreMetaMessage = 'Only 1 of 3 core SEO tags found in initial server HTML.';
    recommendations.push('Move title and meta tags into initial server HTML rather than injecting them via client-side scripts.');
  } else {
    coreMetaScore = 0;
    coreMetaStatus = 'FAIL';
    coreMetaMessage = 'Core SEO tags are missing from initial server HTML.';
    recommendations.push('Include title and meta tags in the server-rendered HTML template.');
  }

  checks.push({
    id: 'ssr_core_metadata',
    name: 'Initial HTML Core Metadata',
    category: 'ssr',
    status: coreMetaStatus,
    score: coreMetaScore,
    maxScore: 8,
    value: `${coreMetaPresentCount}/3 Present`,
    message: coreMetaMessage,
  });

  // 3. Framework / SSR Architecture (6 pts) - tests/seo.spec.ts check 16
  let frameworkScore = 0;
  let frameworkStatus: 'PASS' | 'WARN' = 'PASS';
  let frameworkMessage = `Detected architecture: ${detectedFramework}`;

  if (
    detectedFramework.includes('Next.js') ||
    detectedFramework.includes('Nuxt') ||
    detectedFramework.includes('React (SSR)') ||
    detectedFramework.includes('WordPress') ||
    detectedFramework.includes('Server-Rendered')
  ) {
    frameworkScore = 6;
    frameworkStatus = 'PASS';
    frameworkMessage = `Server-side rendering architecture detected: ${detectedFramework}.`;
  } else if (detectedFramework.includes('Client-side SPA')) {
    frameworkScore = 2;
    frameworkStatus = 'WARN';
    frameworkMessage = `Client-side SPA detected (${detectedFramework}). Content rendering relies heavily on client browser capabilities.`;
    recommendations.push('Consider adopting a framework with SSR or SSG (such as Next.js or Astro) for optimal search indexing.');
  } else {
    frameworkScore = ssrCoveragePercentage >= 60 ? 6 : 4;
    frameworkStatus = ssrCoveragePercentage >= 60 ? 'PASS' : 'WARN';
    frameworkMessage = `Framework architecture: ${detectedFramework}.`;
  }

  checks.push({
    id: 'ssr_framework',
    name: 'Rendering Architecture',
    category: 'ssr',
    status: frameworkStatus,
    score: frameworkScore,
    maxScore: 6,
    value: detectedFramework,
    message: frameworkMessage,
  });

  const ssrTotalScore = Math.min(30, ssrCoverageScore + coreMetaScore + frameworkScore);

  // -------------------------------------------------------------
  // B. TECHNICAL SEO (30 POINTS TOTAL)
  // -------------------------------------------------------------
  // 1. HTML Lang attribute (4 pts) - tests/seo.spec.ts check 3
  const langMatch = rawHtml.match(/<html\b[^>]*\blang=["']([^"']+)["']/i);
  const langVal = langMatch ? langMatch[1].trim() : null;
  const langPass = Boolean(langVal);
  checks.push({
    id: 'tech_lang',
    name: 'HTML Lang Attribute',
    category: 'technical',
    status: langPass ? 'PASS' : 'FAIL',
    score: langPass ? 4 : 0,
    maxScore: 4,
    value: langVal || 'Missing',
    message: langPass
      ? `Document language declared as "${langVal}".`
      : 'HTML <html> tag is missing a "lang" attribute (e.g. lang="en").',
  });
  if (!langPass) {
    recommendations.push('Add a valid "lang" attribute to your <html> tag (e.g. <html lang="en">) to help search engines identify the language.');
  }

  // 2. Title presence & length (6 pts) - tests/seo.spec.ts check 4
  let titleScore = 0;
  let titleStatus: 'PASS' | 'WARN' | 'FAIL' = 'PASS';
  let titleMessage = '';

  if (!rawTitle) {
    titleScore = 0;
    titleStatus = 'FAIL';
    titleMessage = 'Page <title> tag is missing or empty.';
    recommendations.push('Add an informative <title> tag (50–60 characters) describing the business and primary services.');
  } else if (rawTitle.length > 60) {
    titleScore = 4;
    titleStatus = 'WARN';
    titleMessage = `Title is ${rawTitle.length} characters long (recommended: <= 60 characters to avoid SERP truncation).`;
    recommendations.push(`Shorten title from ${rawTitle.length} characters to 60 characters or fewer.`);
  } else {
    titleScore = 6;
    titleStatus = 'PASS';
    titleMessage = `Title present and optimal length (${rawTitle.length} characters).`;
  }
  checks.push({
    id: 'tech_title',
    name: 'Page Title',
    category: 'technical',
    status: titleStatus,
    score: titleScore,
    maxScore: 6,
    value: rawTitle || 'Missing',
    message: titleMessage,
  });

  // 3. Meta Description (6 pts) - tests/seo.spec.ts check 5
  let descScore = 0;
  let descStatus: 'PASS' | 'WARN' | 'FAIL' = 'PASS';
  let descMessage = '';

  if (!rawDesc) {
    descScore = 0;
    descStatus = 'FAIL';
    descMessage = 'Meta description tag is missing or empty.';
    recommendations.push('Add a meta description (120–160 characters) summarizing your business offering to improve click-through rates.');
  } else if (rawDesc.length > 160) {
    descScore = 4;
    descStatus = 'WARN';
    descMessage = `Meta description is ${rawDesc.length} characters long (recommended: <= 160 characters).`;
    recommendations.push(`Trim meta description from ${rawDesc.length} characters to 160 characters or fewer.`);
  } else {
    descScore = 6;
    descStatus = 'PASS';
    descMessage = `Meta description present and optimal length (${rawDesc.length} characters).`;
  }
  checks.push({
    id: 'tech_description',
    name: 'Meta Description',
    category: 'technical',
    status: descStatus,
    score: descScore,
    maxScore: 6,
    value: rawDesc || 'Missing',
    message: descMessage,
  });

  // 4. Viewport tag (4 pts) - tests/seo.spec.ts check 9
  const vpMatch = rawHtml.match(
    /<meta\b(?=[^>]*\bname=["']viewport["'])(?=[^>]*\bcontent=["']([^"']*)["'])[^>]*>/i
  );
  const vpVal = vpMatch ? vpMatch[1].trim() : null;
  const vpPass = Boolean(vpVal);
  checks.push({
    id: 'tech_viewport',
    name: 'Mobile Viewport Meta',
    category: 'technical',
    status: vpPass ? 'PASS' : 'FAIL',
    score: vpPass ? 4 : 0,
    maxScore: 4,
    value: vpVal || 'Missing',
    message: vpPass
      ? `Mobile viewport configured: "${vpVal}".`
      : 'Viewport meta tag missing. Page is not configured for mobile devices.',
  });
  if (!vpPass) {
    recommendations.push('Add <meta name="viewport" content="width=device-width, initial-scale=1.0"> for mobile responsiveness.');
  }

  // 5. Canonical URL (4 pts) - tests/seo.spec.ts check 7
  let canonicalScore = 0;
  let canonicalStatus: 'PASS' | 'WARN' = 'PASS';
  let canonicalMessage = '';

  if (rawCanonical) {
    canonicalScore = 4;
    canonicalStatus = 'PASS';
    canonicalMessage = `Canonical link configured: "${rawCanonical}".`;
  } else {
    canonicalScore = 2;
    canonicalStatus = 'WARN';
    canonicalMessage = 'Canonical URL link tag not found. Recommended to prevent duplicate content indexing.';
    recommendations.push('Add a <link rel="canonical" href="..."> tag pointing to your preferred homepage URL.');
  }
  checks.push({
    id: 'tech_canonical',
    name: 'Canonical URL',
    category: 'technical',
    status: canonicalStatus,
    score: canonicalScore,
    maxScore: 4,
    value: rawCanonical || 'Not specified',
    message: canonicalMessage,
  });

  // 6. Robots Meta (3 pts) - tests/seo.spec.ts check 8
  const robotsMatch = rawHtml.match(
    /<meta\b(?=[^>]*\bname=["']robots["'])(?=[^>]*\bcontent=["']([^"']*)["'])[^>]*>/i
  );
  const robotsVal = robotsMatch ? robotsMatch[1].trim() : null;
  let robotsScore = 3;
  let robotsStatus: 'PASS' | 'WARN' = 'PASS';
  let robotsMessage = '';

  if (robotsVal) {
    robotsScore = 3;
    robotsStatus = 'PASS';
    robotsMessage = `Robots meta tag configured: "${robotsVal}".`;
  } else {
    robotsScore = 2;
    robotsStatus = 'WARN';
    robotsMessage = 'Robots meta tag not specified (search engine defaults to index, follow).';
  }
  checks.push({
    id: 'tech_robots',
    name: 'Robots Directive',
    category: 'technical',
    status: robotsStatus,
    score: robotsScore,
    maxScore: 3,
    value: robotsVal || 'Default (index, follow)',
    message: robotsMessage,
  });

  // 7. Meta Keywords (3 pts) - tests/seo.spec.ts check 6
  const kwMatch = rawHtml.match(
    /<meta\b(?=[^>]*\bname=["']keywords["'])(?=[^>]*\bcontent=["']([^"']*)["'])[^>]*>/i
  );
  const kwVal = kwMatch ? kwMatch[1].trim() : null;
  let kwScore = 3;
  let kwStatus: 'PASS' | 'WARN' = 'PASS';
  let kwMessage = '';

  if (kwVal) {
    kwScore = 3;
    kwStatus = 'PASS';
    kwMessage = `Meta keywords tag present (${kwVal.split(',').length} keywords).`;
  } else {
    kwScore = 2;
    kwStatus = 'WARN';
    kwMessage = 'Meta keywords tag not found (optional for Google, but supported by secondary search engines).';
  }
  checks.push({
    id: 'tech_keywords',
    name: 'Meta Keywords',
    category: 'technical',
    status: kwStatus,
    score: kwScore,
    maxScore: 3,
    value: kwVal || 'Not specified',
    message: kwMessage,
  });

  const technicalTotalScore = Math.min(
    30,
    (langPass ? 4 : 0) + titleScore + descScore + (vpPass ? 4 : 0) + canonicalScore + robotsScore + kwScore
  );

  // -------------------------------------------------------------
  // C. HTML STRUCTURE (20 POINTS TOTAL)
  // -------------------------------------------------------------
  // 1. H1 Heading (10 pts) - tests/seo.spec.ts check 12
  const h1Matches = rawHtml.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi) ?? [];
  let h1Score = 0;
  let h1Status: 'PASS' | 'WARN' = 'PASS';
  let h1Message = '';

  if (h1Matches.length === 1) {
    h1Score = 10;
    h1Status = 'PASS';
    h1Message = 'Exactly 1 H1 heading tag found in initial server HTML.';
  } else if (h1Matches.length > 1) {
    h1Score = 6;
    h1Status = 'WARN';
    h1Message = `${h1Matches.length} H1 tags found. Best practice is to have exactly one H1 per page for clear topic hierarchy.`;
    recommendations.push('Consolidate page headings so that only one primary H1 tag exists per page.');
  } else {
    h1Score = 3;
    h1Status = 'WARN';
    h1Message = 'No H1 tag found in initial server HTML.';
    recommendations.push('Add an H1 heading with your business name and primary service keyword.');
  }
  checks.push({
    id: 'struct_h1',
    name: 'H1 Heading Hierarchy',
    category: 'structure',
    status: h1Status,
    score: h1Score,
    maxScore: 10,
    value: `${h1Matches.length} H1 tag(s)`,
    message: h1Message,
  });

  // 2. Links (10 pts) - tests/seo.spec.ts check 15
  const links = rawHtml.match(/<a\b[^>]*\bhref=["'][^"']+["'][^>]*>/gi) ?? [];
  let linksScore = 0;
  let linksStatus: 'PASS' | 'WARN' = 'PASS';
  let linksMessage = '';

  if (links.length >= 5) {
    linksScore = 10;
    linksStatus = 'PASS';
    linksMessage = `${links.length} links found in initial server HTML for search bot crawling.`;
  } else if (links.length >= 1) {
    linksScore = 7;
    linksStatus = 'PASS';
    linksMessage = `${links.length} links found in initial server HTML.`;
  } else {
    linksScore = 2;
    linksStatus = 'WARN';
    linksMessage = 'No links found in initial server HTML. Search engine crawlers cannot discover subpages.';
    recommendations.push('Add standard HTML anchor links (<a href="...">) to ensure navigation links are crawlable without JavaScript.');
  }
  checks.push({
    id: 'struct_links',
    name: 'Crawlable Anchor Links',
    category: 'structure',
    status: linksStatus,
    score: linksScore,
    maxScore: 10,
    value: `${links.length} link(s)`,
    message: linksMessage,
  });

  const structureTotalScore = Math.min(20, h1Score + linksScore);

  // -------------------------------------------------------------
  // D. SOCIAL METADATA (10 POINTS TOTAL)
  // -------------------------------------------------------------
  // 1. Open Graph Tags (6 pts) - tests/seo.spec.ts check 10
  const ogProps = ['og:title', 'og:description', 'og:url', 'og:type', 'og:image'];
  const ogFound: string[] = [];
  for (const prop of ogProps) {
    const regex = new RegExp(
      `<meta\\b(?=[^>]*\\bproperty=["']${prop}["'])(?=[^>]*\\bcontent=(?:"[^"]*"|'[^']*'))[^>]*>`,
      'i'
    );
    if (regex.test(rawHtml)) ogFound.push(prop);
  }

  let ogScore = 0;
  let ogStatus: 'PASS' | 'WARN' = 'PASS';
  let ogMessage = '';

  if (ogFound.length >= 4) {
    ogScore = 6;
    ogStatus = 'PASS';
    ogMessage = `Open Graph tags well configured (${ogFound.length}/5 found: ${ogFound.join(', ')}).`;
  } else if (ogFound.length >= 2) {
    ogScore = 4;
    ogStatus = 'WARN';
    ogMessage = `${ogFound.length} of 5 Open Graph tags present (${ogFound.join(', ')}).`;
    recommendations.push('Add missing Open Graph tags (og:image, og:description) to make shared links attractive on WhatsApp, LinkedIn, and Facebook.');
  } else if (ogFound.length === 1) {
    ogScore = 2;
    ogStatus = 'WARN';
    ogMessage = `Only 1 Open Graph tag found (${ogFound[0]}).`;
    recommendations.push('Configure Open Graph metadata tags for rich social media cards.');
  } else {
    ogScore = 0;
    ogStatus = 'WARN';
    ogMessage = 'Open Graph tags missing from initial server HTML.';
    recommendations.push('Add Open Graph tags (og:title, og:description, og:image, og:url) for social media previews.');
  }
  checks.push({
    id: 'social_og',
    name: 'Open Graph (Facebook / WhatsApp)',
    category: 'social',
    status: ogStatus,
    score: ogScore,
    maxScore: 6,
    value: `${ogFound.length}/5 tags`,
    message: ogMessage,
  });

  // 2. Twitter Card (4 pts) - tests/seo.spec.ts check 11
  const twitterTags = ['twitter:card', 'twitter:title', 'twitter:description'];
  const twitterFound: string[] = [];
  for (const name of twitterTags) {
    const regex = new RegExp(
      `<meta\\b(?=[^>]*\\bname=["']${name}["'])(?=[^>]*\\bcontent=(?:"[^"]*"|'[^']*'))[^>]*>`,
      'i'
    );
    if (regex.test(rawHtml)) twitterFound.push(name);
  }

  let twitterScore = 0;
  let twitterStatus: 'PASS' | 'WARN' = 'PASS';
  let twitterMessage = '';

  if (twitterFound.length >= 2) {
    twitterScore = 4;
    twitterStatus = 'PASS';
    twitterMessage = `Twitter Card tags configured (${twitterFound.join(', ')}).`;
  } else if (twitterFound.length === 1) {
    twitterScore = 2;
    twitterStatus = 'WARN';
    twitterMessage = `Only 1 Twitter Card tag found (${twitterFound[0]}).`;
    recommendations.push('Add twitter:card and twitter:title meta tags for Twitter / X preview cards.');
  } else {
    twitterScore = 0;
    twitterStatus = 'WARN';
    twitterMessage = 'Twitter Card tags not found in initial server HTML.';
    recommendations.push('Add twitter:card (e.g. summary_large_image) and twitter:title tags.');
  }
  checks.push({
    id: 'social_twitter',
    name: 'Twitter Card (X)',
    category: 'social',
    status: twitterStatus,
    score: twitterScore,
    maxScore: 4,
    value: `${twitterFound.length}/3 tags`,
    message: twitterMessage,
  });

  const socialTotalScore = Math.min(10, ogScore + twitterScore);

  // -------------------------------------------------------------
  // E. STRUCTURED DATA & IMAGE ACCESSIBILITY (10 POINTS TOTAL)
  // -------------------------------------------------------------
  // 1. JSON-LD Structured Data (5 pts) - tests/seo.spec.ts check 13
  const jsonLdMatches =
    rawHtml.match(
      /<script\b(?=[^>]*\btype=["']application\/ld\+json["'])[^>]*>[\s\S]*?<\/script>/gi
    ) ?? [];

  let jsonLdScore = 0;
  let jsonLdStatus: 'PASS' | 'WARN' | 'FAIL' = 'PASS';
  let jsonLdMessage = '';
  let validJsonLdCount = 0;
  let invalidJsonLdCount = 0;

  if (jsonLdMatches.length === 0) {
    jsonLdScore = 2;
    jsonLdStatus = 'WARN';
    jsonLdMessage = 'JSON-LD structured data not found in server HTML.';
    recommendations.push('Add Schema.org JSON-LD structured data (e.g. LocalBusiness or Organization schema) to qualify for Google rich search results.');
  } else {
    for (const block of jsonLdMatches) {
      const content = block
        .replace(/^<script\b[^>]*>/i, '')
        .replace(/<\/script>$/i, '')
        .trim();
      try {
        JSON.parse(content);
        validJsonLdCount++;
      } catch {
        invalidJsonLdCount++;
      }
    }

    if (invalidJsonLdCount > 0) {
      jsonLdScore = 1;
      jsonLdStatus = 'FAIL';
      jsonLdMessage = `${invalidJsonLdCount} invalid JSON-LD script block(s) detected (syntax error).`;
      recommendations.push('Fix syntax errors in your application/ld+json script tags.');
    } else {
      jsonLdScore = 5;
      jsonLdStatus = 'PASS';
      jsonLdMessage = `${validJsonLdCount} valid Schema.org JSON-LD block(s) found.`;
    }
  }
  checks.push({
    id: 'access_jsonld',
    name: 'Schema.org JSON-LD',
    category: 'accessibility',
    status: jsonLdStatus,
    score: jsonLdScore,
    maxScore: 5,
    value: `${validJsonLdCount} valid block(s)`,
    message: jsonLdMessage,
  });

  // 2. Image alt attributes (5 pts) - tests/seo.spec.ts check 14
  const imgs = rawHtml.match(/<img\b[^>]*>/gi) ?? [];
  const missingAlt = imgs.filter(
    (img) => !/\balt\s*=\s*(["'])[\s\S]*?\1/i.test(img)
  );

  let imgScore = 0;
  let imgStatus: 'PASS' | 'WARN' | 'FAIL' = 'PASS';
  let imgMessage = '';

  if (imgs.length === 0) {
    imgScore = 5;
    imgStatus = 'PASS';
    imgMessage = 'No image tags found requiring alt attributes.';
  } else if (missingAlt.length === 0) {
    imgScore = 5;
    imgStatus = 'PASS';
    imgMessage = `All ${imgs.length} image(s) have descriptive "alt" attributes.`;
  } else {
    const altRatio = (imgs.length - missingAlt.length) / imgs.length;
    if (altRatio >= 0.75) {
      imgScore = 3;
      imgStatus = 'WARN';
      imgMessage = `${missingAlt.length} of ${imgs.length} image(s) are missing an "alt" attribute.`;
      recommendations.push(`Add descriptive alt attributes to ${missingAlt.length} images for accessibility and image search indexing.`);
    } else {
      imgScore = 1;
      imgStatus = 'FAIL';
      imgMessage = `${missingAlt.length} of ${imgs.length} image(s) are missing an "alt" attribute.`;
      recommendations.push('Add alt text to all product and logo images to comply with accessibility standards.');
    }
  }
  checks.push({
    id: 'access_img_alt',
    name: 'Image Alt Coverage',
    category: 'accessibility',
    status: imgStatus,
    score: imgScore,
    maxScore: 5,
    value: `${imgs.length - missingAlt.length}/${imgs.length} with alt`,
    message: imgMessage,
  });

  const accessibilityTotalScore = Math.min(10, jsonLdScore + imgScore);

  // -------------------------------------------------------------
  // F. OVERALL SCORE & CLASSIFICATION
  // -------------------------------------------------------------
  const overallScore = Math.min(
    100,
    Math.max(
      0,
      technicalTotalScore +
        ssrTotalScore +
        structureTotalScore +
        socialTotalScore +
        accessibilityTotalScore
    )
  );

  let classification: 'Excellent' | 'Good' | 'Needs Improvement' | 'Poor';
  if (overallScore >= 90) classification = 'Excellent';
  else if (overallScore >= 75) classification = 'Good';
  else if (overallScore >= 50) classification = 'Needs Improvement';
  else classification = 'Poor';

  const passedChecksCount = checks.filter((c) => c.status === 'PASS').length;
  const warningChecksCount = checks.filter((c) => c.status === 'WARN').length;
  const failedChecksCount = checks.filter((c) => c.status === 'FAIL').length;

  return {
    overallScore,
    classification,
    seoStatus: 'COMPLETED',
    technicalSeoScore: technicalTotalScore,
    ssrScore: ssrTotalScore,
    structureScore: structureTotalScore,
    socialSeoScore: socialTotalScore,
    accessibilityScore: accessibilityTotalScore,
    ssrCoveragePercentage,
    ssrFramework: detectedFramework,
    categories: {
      technical: {
        score: technicalTotalScore,
        maxScore: 30,
        checks: checks.filter((c) => c.category === 'technical'),
      },
      ssr: {
        score: ssrTotalScore,
        maxScore: 30,
        checks: checks.filter((c) => c.category === 'ssr'),
      },
      structure: {
        score: structureTotalScore,
        maxScore: 20,
        checks: checks.filter((c) => c.category === 'structure'),
      },
      social: {
        score: socialTotalScore,
        maxScore: 10,
        checks: checks.filter((c) => c.category === 'social'),
      },
      accessibility: {
        score: accessibilityTotalScore,
        maxScore: 10,
        checks: checks.filter((c) => c.category === 'accessibility'),
      },
    },
    ssrDetails: {
      totalRenderedCharacters,
      ssrPresentCharacters,
      clientOnlyCharacters,
      ssrCoveragePercentage,
      framework: detectedFramework,
      missingTextSamples,
    },
    passedChecksCount,
    failedChecksCount,
    warningChecksCount,
    recommendations: Array.from(new Set(recommendations)),
    analyzedUrl: targetUrl,
  };
}

