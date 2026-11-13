import {
  extractPageText,
  normalizeText,
  decodeHtmlEntities,
  detectFramework,
  analyzeSeoAndSsr,
} from '../src/enrichment/seo-analyzer';
import { prisma } from '../src/lib/prisma';
import { enrichLeadRecord } from '../src/enrichment/enricher';

async function runTests() {
  console.log('🚀 Running SEO + SSR Analysis & Enrichment Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: any) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`, detail !== undefined ? detail : '');
      failed++;
    }
  }

  // -------------------------------------------------------------
  // Test 1: Helper Functions & Text Extraction
  // -------------------------------------------------------------
  console.log('1. Testing Helper Functions & Text Processing...');
  const sampleHtml = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <title>Madurai IT &amp; Cloud Services &ndash; 2026</title>
        <style>body { font-size: 14px; }</style>
        <script>console.log("secret analytics");</script>
      </head>
      <body>
        <!-- Header comment -->
        <h1>Madurai Computer &amp; Laptop Repair</h1>
        <p>Serving West Masi Street with &#8220;expert&#8221; IT solutions &amp; maintenance.</p>
        <noscript>Please enable JavaScript</noscript>
      </body>
    </html>
  `;

  const extracted = extractPageText(sampleHtml);
  assert(!extracted.includes('font-size'), 'Styles stripped from extracted text');
  assert(!extracted.includes('secret analytics'), 'Scripts stripped from extracted text');
  assert(!extracted.includes('Header comment'), 'Comments stripped from extracted text');
  assert(!extracted.includes('Please enable JavaScript'), 'Noscript stripped from extracted text');
  assert(extracted.includes('Madurai Computer & Laptop Repair'), 'HTML entities properly decoded (&amp; -> &)');

  const norm = normalizeText('“Expert” Solutions');
  assert(norm === '"expert" solutions', 'Curly double quotes normalized to straight quotes and lowercased');

  // -------------------------------------------------------------
  // Test 2: SSR Text Coverage & Content Comparison
  // -------------------------------------------------------------
  console.log('\n2. Testing SSR Text Coverage Calculation...');

  const serverHtml = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <title>Pandian Web Services</title>
        <meta name="description" content="Top web design company in Madurai providing modern web development." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="canonical" href="https://pandianweb.in/" />
      </head>
      <body>
        <h1>Pandian Web Services</h1>
        <p>We build high performance websites and applications in Tamil Nadu.</p>
        <a href="/about">About Us</a>
        <a href="/services">Our Services</a>
        <a href="/portfolio">Portfolio</a>
        <a href="/team">Our Team</a>
        <a href="/contact">Contact Us</a>
        <img src="/logo.png" alt="Pandian Web Logo" />
      </body>
    </html>
  `;

  // Case 2A: Complete SSR (Browser visible text is fully present in raw server HTML)
  const fullySsrBrowserText = `
    Pandian Web Services
    We build high performance websites and applications in Tamil Nadu.
    About Us
    Our Services
    Portfolio
    Our Team
    Contact Us
  `;

  const resFull = analyzeSeoAndSsr('https://pandianweb.in', serverHtml, fullySsrBrowserText);
  assert(resFull.overallScore > 75, `High SEO score achieved: ${resFull.overallScore}/100`);
  assert(resFull.ssrCoveragePercentage >= 80, `SSR coverage is high (${resFull.ssrCoveragePercentage}%)`);
  assert(resFull.ssrDetails.missingTextSamples.length === 0, 'No missing text samples for full SSR');
  assert(resFull.categories.technical.score >= 20, `Technical SEO score: ${resFull.categories.technical.score}/30`);
  assert(resFull.categories.structure.score >= 15, `Structure score: ${resFull.categories.structure.score}/20`);

  // Case 2B: Client-Side Only SPA (Initial HTML has minimal markup, but browser renders extensive dynamic text)
  const clientSpaHtml = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <title>SPA Application</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>
        <div id="root"></div>
        <script src="/bundle.js"></script>
      </body>
    </html>
  `;

  const clientRenderedText = `
    Welcome to our Dynamic Client Dashboard
    We provide advanced AI powered analytics and enterprise automation.
    Contact our sales team today to schedule an in-depth product demonstration.
    Explore our comprehensive documentation and developer API guides online.
    Read customer testimonials from over 500 satisfied enterprise businesses worldwide.
  `;

  const resSpa = analyzeSeoAndSsr('https://spademo.com', clientSpaHtml, clientRenderedText);
  assert(resSpa.ssrCoveragePercentage < 30, `Client SPA shows low SSR coverage: ${resSpa.ssrCoveragePercentage}%`);
  assert(resSpa.ssrDetails.clientOnlyCharacters > 0, `Client-only characters identified: ${resSpa.ssrDetails.clientOnlyCharacters}`);
  assert(resSpa.ssrDetails.missingTextSamples.length > 0, `Missing text samples captured (${resSpa.ssrDetails.missingTextSamples.length} samples)`);
  assert(
    resSpa.recommendations.some((r) => r.includes('Server-Side Rendering') || r.includes('SSR') || r.includes('pre-rendering')),
    'Actionable recommendation generated for low SSR coverage'
  );

  // -------------------------------------------------------------
  // Test 3: Technical SEO Checks & Edge Cases
  // -------------------------------------------------------------
  console.log('\n3. Testing Technical & Social SEO Validation Checks...');

  const richHtml = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <title>Optimal Title Under 60 Characters</title>
        <meta name="description" content="A concise, well structured meta description for testing SEO audits." />
        <meta name="keywords" content="web, design, madurai" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="canonical" href="https://example.com/" />
        <meta name="robots" content="index, follow" />
        
        <!-- Open Graph -->
        <meta property="og:title" content="Optimal Title" />
        <meta property="og:description" content="A concise description" />
        <meta property="og:url" content="https://example.com/" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://example.com/og.jpg" />

        <!-- Twitter Card -->
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Optimal Title" />
        <meta name="twitter:description" content="A concise description" />

        <!-- Schema.org JSON-LD -->
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            "name": "Optimal Business"
          }
        </script>
      </head>
      <body>
        <h1>Main Business Heading</h1>
        <p>Optimal content paragraph for indexing.</p>
        <a href="/p1">Page 1</a><a href="/p2">Page 2</a><a href="/p3">Page 3</a><a href="/p4">Page 4</a><a href="/p5">Page 5</a>
        <img src="/banner.jpg" alt="Company Banner" />
      </body>
    </html>
  `;

  const richRes = analyzeSeoAndSsr('https://example.com', richHtml, 'Main Business Heading Optimal content paragraph for indexing.');
  assert(richRes.overallScore >= 90, `Rich SEO page scores Excellent: ${richRes.overallScore}/100`);
  assert(richRes.classification === 'Excellent', `Classification is Excellent: ${richRes.classification}`);
  assert(richRes.categories.social.score === 10, `Social metadata score is 10/10: ${richRes.categories.social.score}`);
  assert(richRes.categories.accessibility.score === 10, `Accessibility score is 10/10: ${richRes.categories.accessibility.score}`);
  assert(richRes.failedChecksCount === 0, 'Zero failed checks on rich SEO HTML');

  // Test gracefully handling empty/unreachable site
  const emptyRes = analyzeSeoAndSsr('https://badurl.test', '', '');
  assert(emptyRes.seoStatus === 'UNAVAILABLE', 'Empty raw HTML marked as UNAVAILABLE');
  assert(emptyRes.overallScore === 0, 'Zero score for unavailable website');

  // -------------------------------------------------------------
  // Test 4: Database Integration & Lead Enrichment Flow
  // -------------------------------------------------------------
  console.log('\n4. Testing Database Persistence in Lead Record...');

  // Create or find a test lead
  const testLead = await prisma.lead.create({
    data: {
      businessName: 'SEO Verification Test Business',
      category: 'Software company',
      website: 'https://example.com',
      city: 'Madurai',
      state: 'Tamil Nadu',
      source: 'manual',
    },
  });

  assert(Boolean(testLead.id), `Created temporary test lead with ID: ${testLead.id}`);

  try {
    // Run enrichLeadRecord
    const enrichedLead = await enrichLeadRecord(testLead.id);

    assert(enrichedLead.websiteStatus === 'ONLINE', `Website status is ${enrichedLead.websiteStatus}`);
    assert(enrichedLead.seoScore !== null && enrichedLead.seoScore !== undefined, `SEO score persisted: ${enrichedLead.seoScore}/100`);
    assert(Boolean(enrichedLead.seoStatus), `SEO status persisted: ${enrichedLead.seoStatus}`);
    assert(enrichedLead.technicalSeoScore !== null, `technicalSeoScore persisted: ${enrichedLead.technicalSeoScore}`);
    assert(enrichedLead.ssrScore !== null, `ssrScore persisted: ${enrichedLead.ssrScore}`);
    assert(enrichedLead.structureScore !== null, `structureScore persisted: ${enrichedLead.structureScore}`);
    assert(enrichedLead.socialSeoScore !== null, `socialSeoScore persisted: ${enrichedLead.socialSeoScore}`);
    assert(enrichedLead.accessibilityScore !== null, `accessibilityScore persisted: ${enrichedLead.accessibilityScore}`);
    assert(enrichedLead.ssrCoveragePercentage !== null, `ssrCoveragePercentage persisted: ${enrichedLead.ssrCoveragePercentage}%`);
    assert(Boolean(enrichedLead.ssrFramework), `ssrFramework persisted: ${enrichedLead.ssrFramework}`);
    assert(Boolean(enrichedLead.seoAnalyzedAt), 'seoAnalyzedAt timestamp recorded');

    // Check activity log
    const activities = await prisma.activityLog.findMany({
      where: { leadId: testLead.id },
      orderBy: { createdAt: 'desc' },
    });
    assert(activities.length > 0, `Activity logged: "${activities[0]?.content}"`);
  } finally {
    // Clean up temporary test lead
    await prisma.activityLog.deleteMany({ where: { leadId: testLead.id } });
    await prisma.lead.delete({ where: { id: testLead.id } });
    console.log('  Cleaned up temporary test lead.');
  }

  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

