import { chromium } from 'playwright';
import { scrapeGoogle } from '../open marketing /src/website-discovery/scrapers/googleScraper';
import { BraveSearchAdapter } from '../open marketing /src/website-discovery/scrapers/braveSearchAdapter';
import { MojeekSearchAdapter } from '../open marketing /src/website-discovery/scrapers/mojeekSearchAdapter';
import { SearXNGAdapter } from '../open marketing /src/website-discovery/scrapers/searxngAdapter';
import { buildSearchQueries } from '../open marketing /src/website-discovery/utils/queryBuilder';
import { deduplicateAndMergeLeads } from '../open marketing /src/website-discovery/utils/urlUtils';
import { RawDiscoveredItem, SearchInput } from '../open marketing /src/website-discovery/types';

interface EngineBenchmark {
  engine: string;
  queriesCount: number;
  rawCount: number;
  uniqueCount: number;
  websitesCount: number;
  phonesCount: number;
  emailsCount: number;
  elapsedMs: number;
  status: string;
}

async function runBenchmarkForQuery(input: SearchInput) {
  console.log(`\n========================================================================`);
  console.log(`🧪 BENCHMARK TEST: ${input.category.toUpperCase()} — ${input.area.toUpperCase()}, ${input.city.toUpperCase()}`);
  console.log(`========================================================================\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-blink-features=AutomationControlled'],
  });

  const queryItems = buildSearchQueries(input);
  console.log(`Generated ${queryItems.length} multi-intent query variations for ${input.category}.\n`);

  const resultsByEngine: Record<string, RawDiscoveredItem[]> = {
    'Google Web Search (Optimized)': [],
    'Brave Search': [],
    'Mojeek': [],
    'SearXNG': [],
  };

  const benchmarkTable: EngineBenchmark[] = [];

  // 1. Google Web Search (Optimized & Paginated)
  console.log(`⏳ Testing Google Web Search (Optimized)...`);
  const gStart = Date.now();
  try {
    const gItems = await scrapeGoogle(input, browser);
    resultsByEngine['Google Web Search (Optimized)'] = gItems;
    const gElapsed = Date.now() - gStart;
    const gUnique = deduplicateAndMergeLeads(gItems);

    benchmarkTable.push({
      engine: 'Google Web Search (Optimized)',
      queriesCount: Math.min(queryItems.length, 8),
      rawCount: gItems.length,
      uniqueCount: gUnique.length,
      websitesCount: gUnique.filter((i) => i.websiteUrl).length,
      phonesCount: gUnique.filter((i) => i.phone).length,
      emailsCount: gUnique.filter((i) => i.email).length,
      elapsedMs: gElapsed,
      status: 'SUCCESS',
    });
    console.log(`   ✅ Google returned ${gItems.length} raw results (${gUnique.length} unique) in ${(gElapsed / 1000).toFixed(1)}s`);
  } catch (err: any) {
    benchmarkTable.push({
      engine: 'Google Web Search (Optimized)',
      queriesCount: 0,
      rawCount: 0,
      uniqueCount: 0,
      websitesCount: 0,
      phonesCount: 0,
      emailsCount: 0,
      elapsedMs: Date.now() - gStart,
      status: `ERROR: ${err.message}`,
    });
  }

  // 2. Brave Search
  console.log(`\n⏳ Testing Brave Search Adapter...`);
  const bStart = Date.now();
  try {
    const braveAdapter = new BraveSearchAdapter();
    const bItems = await braveAdapter.search(queryItems, { browser });
    resultsByEngine['Brave Search'] = bItems;
    const bElapsed = Date.now() - bStart;
    const bUnique = deduplicateAndMergeLeads(bItems);

    benchmarkTable.push({
      engine: 'Brave Search',
      queriesCount: Math.min(queryItems.length, 6),
      rawCount: bItems.length,
      uniqueCount: bUnique.length,
      websitesCount: bUnique.filter((i) => i.websiteUrl).length,
      phonesCount: bUnique.filter((i) => i.phone).length,
      emailsCount: bUnique.filter((i) => i.email).length,
      elapsedMs: bElapsed,
      status: 'SUCCESS',
    });
    console.log(`   ✅ Brave returned ${bItems.length} raw results (${bUnique.length} unique) in ${(bElapsed / 1000).toFixed(1)}s`);
  } catch (err: any) {
    benchmarkTable.push({
      engine: 'Brave Search',
      queriesCount: 0,
      rawCount: 0,
      uniqueCount: 0,
      websitesCount: 0,
      phonesCount: 0,
      emailsCount: 0,
      elapsedMs: Date.now() - bStart,
      status: `ERROR: ${err.message}`,
    });
  }

  // 3. Mojeek
  console.log(`\n⏳ Testing Mojeek Search Adapter...`);
  const mStart = Date.now();
  try {
    const mojeekAdapter = new MojeekSearchAdapter();
    const mItems = await mojeekAdapter.search(queryItems, { browser });
    resultsByEngine['Mojeek'] = mItems;
    const mElapsed = Date.now() - mStart;
    const mUnique = deduplicateAndMergeLeads(mItems);

    benchmarkTable.push({
      engine: 'Mojeek',
      queriesCount: Math.min(queryItems.length, 6),
      rawCount: mItems.length,
      uniqueCount: mUnique.length,
      websitesCount: mUnique.filter((i) => i.websiteUrl).length,
      phonesCount: mUnique.filter((i) => i.phone).length,
      emailsCount: mUnique.filter((i) => i.email).length,
      elapsedMs: mElapsed,
      status: 'SUCCESS',
    });
    console.log(`   ✅ Mojeek returned ${mItems.length} raw results (${mUnique.length} unique) in ${(mElapsed / 1000).toFixed(1)}s`);
  } catch (err: any) {
    benchmarkTable.push({
      engine: 'Mojeek',
      queriesCount: 0,
      rawCount: 0,
      uniqueCount: 0,
      websitesCount: 0,
      phonesCount: 0,
      emailsCount: 0,
      elapsedMs: Date.now() - mStart,
      status: `ERROR: ${err.message}`,
    });
  }

  // 4. SearXNG
  console.log(`\n⏳ Testing SearXNG Adapter...`);
  const sStart = Date.now();
  try {
    const searxngAdapter = new SearXNGAdapter();
    const health = await searxngAdapter.healthCheck();
    if (health.available) {
      const sItems = await searxngAdapter.search(queryItems);
      resultsByEngine['SearXNG'] = sItems;
      const sElapsed = Date.now() - sStart;
      const sUnique = deduplicateAndMergeLeads(sItems);

      benchmarkTable.push({
        engine: 'SearXNG',
        queriesCount: Math.min(queryItems.length, 6),
        rawCount: sItems.length,
        uniqueCount: sUnique.length,
        websitesCount: sUnique.filter((i) => i.websiteUrl).length,
        phonesCount: sUnique.filter((i) => i.phone).length,
        emailsCount: sUnique.filter((i) => i.email).length,
        elapsedMs: sElapsed,
        status: 'SUCCESS',
      });
      console.log(`   ✅ SearXNG returned ${sItems.length} raw results in ${(sElapsed / 1000).toFixed(1)}s`);
    } else {
      benchmarkTable.push({
        engine: 'SearXNG',
        queriesCount: 0,
        rawCount: 0,
        uniqueCount: 0,
        websitesCount: 0,
        phonesCount: 0,
        emailsCount: 0,
        elapsedMs: Date.now() - sStart,
        status: `SKIPPED (${health.reason?.slice(0, 45)}...)`,
      });
      console.log(`   ℹ️ SearXNG: ${health.reason}`);
    }
  } catch (err: any) {
    benchmarkTable.push({
      engine: 'SearXNG',
      queriesCount: 0,
      rawCount: 0,
      uniqueCount: 0,
      websitesCount: 0,
      phonesCount: 0,
      emailsCount: 0,
      elapsedMs: Date.now() - sStart,
      status: `ERROR: ${err.message}`,
    });
  }

  // 5. Combined Multi-Search & Cross-Source Deduplication
  const combinedRaw: RawDiscoveredItem[] = [
    ...resultsByEngine['Google Web Search (Optimized)'],
    ...resultsByEngine['Brave Search'],
    ...resultsByEngine['Mojeek'],
    ...resultsByEngine['SearXNG'],
  ];

  const mergedLeads = deduplicateAndMergeLeads(combinedRaw);
  const multiSourceLeads = mergedLeads.filter((l) => l.sources.length > 1);

  await browser.close().catch(() => {});

  // Print Structured Benchmark Matrix
  console.log(`\n========================================================================`);
  console.log(`📊 MEASURED BENCHMARK MATRIX — ${input.category} (${input.area}, ${input.city})`);
  console.log(`========================================================================`);
  console.log(
    `| Source Engine                  | Raw Items | Unique | Websites | Phones | Emails | Elapsed | Status`
  );
  console.log(
    `|--------------------------------|-----------|--------|----------|--------|--------|---------|-------`
  );
  for (const b of benchmarkTable) {
    console.log(
      `| ${b.engine.padEnd(30)} | ${String(b.rawCount).padStart(9)} | ${String(b.uniqueCount).padStart(6)} | ${String(b.websitesCount).padStart(8)} | ${String(b.phonesCount).padStart(6)} | ${String(b.emailsCount).padStart(6)} | ${(b.elapsedMs / 1000).toFixed(1).padStart(6)}s | ${b.status}`
    );
  }
  console.log(`------------------------------------------------------------------------`);
  console.log(`🔗 COMBINED CROSS-SOURCE FUSION METRICS:`);
  console.log(`   • Total Raw Records Collected Across All Engines : ${combinedRaw.length}`);
  console.log(`   • Total De-duplicated Unique Business Leads      : ${mergedLeads.length}`);
  console.log(`   • Multi-Source Verified Businesses (≥ 2 engines)  : ${multiSourceLeads.length}`);
  console.log(`   • Cross-Engine Deduplication Ratio               : ${combinedRaw.length > 0 ? ((1 - mergedLeads.length / combinedRaw.length) * 100).toFixed(1) : 0}% overlap filtered`);
  console.log(`   • Unique Verified Websites Discovered            : ${mergedLeads.filter((l) => l.websiteUrl).length}`);
  console.log(`   • Unique Phone Numbers Recovered Directly        : ${mergedLeads.filter((l) => l.phone).length}`);
  console.log(`   • Unique Email Addresses Recovered Directly      : ${mergedLeads.filter((l) => l.email).length}`);
  console.log(`========================================================================\n`);

  return {
    combinedRawCount: combinedRaw.length,
    mergedCount: mergedLeads.length,
    multiSourceCount: multiSourceLeads.length,
    sampleLeads: mergedLeads.slice(0, 5),
  };
}

async function main() {
  console.log('🚀 Starting Multi-Search Engine Benchmark Suite...\n');

  // Test 1: Chartered Accountants — Anna Nagar, Madurai
  await runBenchmarkForQuery({
    category: 'Chartered Accountants',
    area: 'Anna Nagar',
    city: 'Madurai',
    country: 'India',
    maxSubcategories: 4,
  });

  // Test 2: Computer Repair Shops — Madurai
  await runBenchmarkForQuery({
    category: 'Computer Repair Shops',
    area: 'Simmakkal',
    city: 'Madurai',
    country: 'India',
    maxSubcategories: 4,
  });

  console.log('🎉 Multi-Search Benchmark Suite Completed Successfully!');
}

main().catch((err) => {
  console.error('Benchmark fatal error:', err);
  process.exit(1);
});
