import { chromium } from 'playwright';
import { analyzeWebsite } from './analyzers/websiteAnalyzer';
import { scoreLead } from './analyzers/leadScorer';
import { CONFIG } from './config';
import { expandCategory } from './utils/categoryTaxonomy';
import { buildLocationGrids, validateLocation } from './utils/locationValidator';
import { scrapeGoogleMaps } from './scrapers/googleMapsScraper';
import { scrapeJustdial } from './scrapers/justdialScraper';
import { scrapeOpenStreetMap } from './scrapers/osmScraper';
import { scrapeSulekha } from './scrapers/sulekhaScraper';
import { orchestrateMultiSearch } from './scrapers/searchOrchestrator';
import { BusinessLead, RawDiscoveredItem, SearchInput, WebsiteStatus } from './types';
import { exportLeadsToCsv, exportLeadsToJson, exportWebsitesTxt } from './utils/exporter';
import { deduplicateAndMergeLeads, normalizeUrl } from './utils/urlUtils';

export async function discoverAndQualifyLeads(input: SearchInput): Promise<BusinessLead[]> {
  const subcategories = expandCategory(input.category, input.maxSubcategories || 12);
  const locationGrids = buildLocationGrids(input.area, input.city);

  console.log(`\n===================================================================`);
  console.log(`🚀 SCALED BUSINESS DISCOVERY & LEAD GENERATION SYSTEM`);
  console.log(`===================================================================`);
  console.log(`📍 Target Area       : ${input.area}, ${input.city}, ${input.country}`);
  console.log(`🏷️ Primary Category  : ${input.category}`);
  console.log(`📂 Subcategories     : ${subcategories.length} expanded niches (IT, Retail, Healthcare, Professional)`);
  console.log(`🗺️ Geographical Grids: ${locationGrids.length} street/locality sectors in Madurai`);
  console.log(`🛠️ Target Services   : Website Dev, PC Repair, Networking & AMC`);
  console.log(`===================================================================\n`);

  const browser = await chromium.launch({
    headless: CONFIG.headless,
    slowMo: CONFIG.slowMo,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-infobars',
      '--disable-dev-shm-usage',
    ],
  });

  const rawPool: RawDiscoveredItem[] = [];
  const sourceStats: Record<string, number> = {
    'Google Maps': 0,
    'OpenStreetMap': 0,
    'Google Web Search': 0,
    'Brave Search': 0,
    'Mojeek': 0,
    'SearXNG Metasearch': 0,
    'Bing Search': 0,
    'DuckDuckGo Search': 0,
    'Justdial Directory': 0,
    'Sulekha Directory': 0,
  };

  // 1. Google Maps (Multi-subcategory & Street Grid Crawl - 100% Preserved)
  console.log(`📡 [1/4] Discovering local businesses via Google Maps Local Pack...`);
  try {
    const mapsItems = await scrapeGoogleMaps(input, browser);
    sourceStats['Google Maps'] = mapsItems.length;
    console.log(`   ✅ Discovered ${mapsItems.length} businesses from Google Maps`);
    rawPool.push(...mapsItems);
  } catch (err) {
    console.error(`   ⚠️ Google Maps error:`, err instanceof Error ? err.message : err);
  }

  // 2. OpenStreetMap Overpass (Free Public POI Dataset - 100% Preserved)
  console.log(`\n📡 [2/4] Querying OpenStreetMap public POIs for ${input.area}...`);
  try {
    const osmItems = await scrapeOpenStreetMap(input);
    sourceStats['OpenStreetMap'] = osmItems.length;
    console.log(`   ✅ Discovered ${osmItems.length} mapped entities from OpenStreetMap`);
    rawPool.push(...osmItems);
  } catch (err) {
    console.error(`   ⚠️ OpenStreetMap skipped:`, err instanceof Error ? err.message : err);
  }

  // 3. Advanced Multi-Search Orchestration (Google Web, Brave, Mojeek, SearXNG, Bing, DDG)
  console.log(`\n📡 [3/4] Launching Multi-Search Engine Ecosystem...`);
  try {
    const searchResults = await orchestrateMultiSearch(input, browser);
    Object.assign(sourceStats, searchResults.sourceStats);
    rawPool.push(...searchResults.items);
  } catch (err) {
    console.error(`   ⚠️ Multi-search engine orchestrator error:`, err instanceof Error ? err.message : err);
  }

  // 4. Local Directories (Justdial & Sulekha - 100% Preserved)
  console.log(`\n📡 [4/4] Scanning Local Directories (Justdial & Sulekha)...`);
  try {
    const jdItems = await scrapeJustdial(input, browser);
    sourceStats['Justdial Directory'] = jdItems.length;
    console.log(`   ✅ Discovered ${jdItems.length} businesses from Justdial`);
    rawPool.push(...jdItems);
  } catch (err) {
    console.error(`   ⚠️ Justdial skipped:`, err instanceof Error ? err.message : err);
  }

  try {
    const sulekhaItems = await scrapeSulekha(input, browser);
    sourceStats['Sulekha Directory'] = sulekhaItems.length;
    console.log(`   ✅ Discovered ${sulekhaItems.length} businesses from Sulekha`);
    rawPool.push(...sulekhaItems);
  } catch (err) {
    console.error(`   ⚠️ Sulekha skipped:`, err instanceof Error ? err.message : err);
  }
  console.log(`\n📡 [7/7] Scanning Sulekha Directory...`);
  try {
    const sulekhaItems = await scrapeSulekha(input, browser);
    sourceStats['Sulekha Directory'] = sulekhaItems.length;
    console.log(`   ✅ Discovered ${sulekhaItems.length} businesses from Sulekha`);
    rawPool.push(...sulekhaItems);
  } catch (err) {
    console.error(`   ⚠️ Sulekha skipped:`, err instanceof Error ? err.message : err);
  }

  // Cross-source deduplication & multi-source attribution
  const mergedLeads = deduplicateAndMergeLeads(rawPool);
  const duplicatesRemoved = rawPool.length - mergedLeads.length;

  console.log(`\n-------------------------------------------------------------------`);
  console.log(`✨ Total raw records collected    : ${rawPool.length}`);
  console.log(`🧹 Duplicate records cross-merged : ${duplicatesRemoved}`);
  console.log(`🏢 Unique businesses discovered   : ${mergedLeads.length}`);
  console.log(`-------------------------------------------------------------------`);

  // Website Verification, Analysis & Lead Scoring
  console.log(`\n🔬 Auditing websites & validating location matches...`);
  const finalLeads: BusinessLead[] = [];
  const now = new Date().toISOString();

  let websitesAudited = 0;
  let auditFailures = 0;
  let exactLocationCount = 0;
  let nearbyLocationCount = 0;
  let verifiedNoWebsiteCount = 0;

  for (let i = 0; i < mergedLeads.length; i++) {
    const item = mergedLeads[i];
    const normUrl = item.websiteUrl ? normalizeUrl(item.websiteUrl) : null;

    // 1. Location Validation
    const locationStatus = validateLocation(item.address, input.area, input.city);
    if (locationStatus === 'EXACT_AREA_MATCH') exactLocationCount++;
    if (locationStatus === 'NEARBY_AREA_MATCH') nearbyLocationCount++;

    // 2. Website Verification Status
    let websiteStatus: WebsiteStatus = 'NEEDS_VERIFICATION';
    let analysis = undefined;
    let harvestedEmail = item.email || null;
    let harvestedPhone = item.phone || null;
    const socialLinks = {
      facebook: undefined as string | undefined,
      instagram: undefined as string | undefined,
      linkedin: undefined as string | undefined,
      twitter: undefined as string | undefined,
      youtube: undefined as string | undefined,
    };

    if (normUrl) {
      if (!input.skipWebsiteAnalysis) {
        process.stdout.write(`   [${i + 1}/${mergedLeads.length}] Auditing: ${normUrl} ... `);
        try {
          analysis = await analyzeWebsite(normUrl, browser);
          websitesAudited++;
          websiteStatus = analysis.websiteStatus;

          if (analysis.extractedEmails.length > 0 && !harvestedEmail) {
            harvestedEmail = analysis.extractedEmails[0];
          }
          if (analysis.extractedPhones.length > 0 && !harvestedPhone) {
            harvestedPhone = analysis.extractedPhones[0];
          }
          Object.assign(socialLinks, analysis.socialLinks);

          console.log(`[${websiteStatus}]`);
        } catch {
          auditFailures++;
          websiteStatus = 'WEBSITE_UNAVAILABLE';
          console.log(`[WEBSITE_UNAVAILABLE (timeout)]`);
        }
      } else {
        websiteStatus = 'WEBSITE_FOUND';
      }
    } else {
      // No website was discovered. Was it verified absent on structured directories?
      if (item.source.includes('Google Maps') || item.source.includes('Justdial')) {
        websiteStatus = 'VERIFIED_NO_WEBSITE';
        verifiedNoWebsiteCount++;
      } else {
        websiteStatus = 'NEEDS_VERIFICATION';
      }
    }

    // 3. Lead Qualification (3 separate scores)
    const leadScores = scoreLead({
      category: item.category || input.category,
      websiteUrl: normUrl,
      phone: harvestedPhone,
      email: harvestedEmail,
      address: item.address,
      websiteStatus,
      websiteAnalysis: analysis,
    });

    finalLeads.push({
      id: `lead_${i + 1}`,
      businessName: item.businessName || 'Local Business',
      category: item.category || input.category,
      websiteUrl: normUrl,
      rootDomain: normUrl ? normUrl.replace(/^https?:\/\//, '') : null,
      phone: harvestedPhone,
      email: harvestedEmail,
      address: item.address || `${input.area}, ${input.city}`,
      area: input.area,
      city: input.city,
      country: input.country,
      locationStatus,
      websiteStatus,
      googleMapsUrl: item.googleMapsUrl || null,
      socialLinks,
      description: item.description || null,
      sources: item.sources || [item.source],
      websiteAnalysis: analysis,
      leadScores,
      collectedAt: now,
    });
  }

  await browser.close().catch(() => {});

  // Separate leads by qualification status
  const qualifiedLeads = finalLeads.filter((l) => l.leadScores.qualificationStatus === 'QUALIFIED');
  const needsVerification = finalLeads.filter(
    (l) => l.leadScores.qualificationStatus === 'NEEDS_VERIFICATION'
  );
  const unqualified = finalLeads.filter((l) => l.leadScores.qualificationStatus === 'UNQUALIFIED');

  // Generate scan-specific unique timestamp and slug so every scan creates a new output file
  const scanDate = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const timestamp = `${scanDate.getFullYear()}${pad(scanDate.getMonth() + 1)}${pad(scanDate.getDate())}_${pad(scanDate.getHours())}${pad(scanDate.getMinutes())}${pad(scanDate.getSeconds())}`;

  const sanitizeSlug = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 25);

  const catSlug = sanitizeSlug(input.category || 'leads');
  const areaSlug = sanitizeSlug(input.area || 'local');

  const scanAllJson = `all_leads_${catSlug}_${areaSlug}_${timestamp}.json`;
  const scanAllCsv = `all_leads_${catSlug}_${areaSlug}_${timestamp}.csv`;
  const scanQualJson = `qualified_leads_${catSlug}_${areaSlug}_${timestamp}.json`;
  const scanQualCsv = `qualified_leads_${catSlug}_${areaSlug}_${timestamp}.csv`;

  // Exports
  console.log(`\n💾 Exporting leads to structured datasets...`);
  exportLeadsToCsv(finalLeads, scanAllCsv);
  exportLeadsToJson(finalLeads, scanAllJson);
  exportLeadsToCsv(qualifiedLeads, scanQualCsv);
  exportLeadsToJson(qualifiedLeads, scanQualJson);

  const allCsv = exportLeadsToCsv(finalLeads, CONFIG.allLeadsCsv);
  const allJson = exportLeadsToJson(finalLeads, CONFIG.allLeadsJson);
  const qualCsv = exportLeadsToCsv(qualifiedLeads, CONFIG.qualifiedLeadsCsv);
  const qualJson = exportLeadsToJson(qualifiedLeads, CONFIG.qualifiedLeadsJson);
  const txtPath = exportWebsitesTxt(finalLeads, CONFIG.txtFileName);

  console.log(`   📁 Created dedicated scan files: ${scanAllJson}, ${scanAllCsv}`);
  console.log(`   📁 Updated snapshot: ${CONFIG.allLeadsJson}, ${CONFIG.allLeadsCsv}`);

  // Print Structured Final Metrics
  console.log(`\n===================================================================`);
  console.log(`📊 FINAL DISCOVERY & LEAD QUALIFICATION METRICS`);
  console.log(`===================================================================`);
  console.log(`📡 RAW RECORDS COLLECTED BY SOURCE:`);
  Object.entries(sourceStats).forEach(([src, count]) => {
    console.log(`   • ${src.padEnd(20)}: ${count}`);
  });
  console.log(`-------------------------------------------------------------------`);
  console.log(`📍 LOCATION ACCURACY BREAKDOWN:`);
  console.log(`   • Exact Area Match (${input.area}) : ${exactLocationCount}`);
  console.log(`   • Nearby Adjacent Neighborhoods : ${nearbyLocationCount}`);
  console.log(`   • City-Only / Unverified        : ${finalLeads.length - (exactLocationCount + nearbyLocationCount)}`);
  console.log(`-------------------------------------------------------------------`);
  console.log(`🌐 WEBSITE VERIFICATION BREAKDOWN:`);
  console.log(`   • Businesses With Verified Website   : ${finalLeads.filter((l) => l.websiteStatus === 'WEBSITE_FOUND').length}`);
  console.log(`   • Verified NO Website (Prime Web Dev): ${verifiedNoWebsiteCount}`);
  console.log(`   • Broken Websites (404/500/DNS error): ${finalLeads.filter((l) => l.websiteStatus === 'WEBSITE_BROKEN').length}`);
  console.log(`   • Websites Successfully Audited      : ${websitesAudited}`);
  console.log(`   • Failed / Timed Out Website Checks  : ${auditFailures}`);
  console.log(`-------------------------------------------------------------------`);
  console.log(`🎯 LEAD QUALIFICATION TOTALS:`);
  console.log(`   🔥 High-Priority Qualified Leads     : ${qualifiedLeads.length}`);
  console.log(`   ⚠️ Needs Manual Verification        : ${needsVerification.length}`);
  console.log(`   ❌ Unqualified / Low Opportunity     : ${unqualified.length}`);
  console.log(`   🏢 TOTAL UNIQUE BUSINESSES           : ${finalLeads.length}`);
  console.log(`-------------------------------------------------------------------`);
  console.log(`📁 OUTPUT ARTIFACTS SAVED:`);
  console.log(`   • All Leads (CSV)       : ${allCsv}`);
  console.log(`   • All Leads (JSON)      : ${allJson}`);
  console.log(`   • Qualified Leads (CSV) : ${qualCsv}`);
  console.log(`   • Qualified Leads (JSON): ${qualJson}`);
  console.log(`   • Clean Websites TXT    : ${txtPath}`);
  console.log(`===================================================================\n`);

  return finalLeads;
}
