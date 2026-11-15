import { Browser } from 'playwright';
import { RawDiscoveredItem, SearchInput, SourceMetrics } from '../types';
import { buildSearchQueries } from '../utils/queryBuilder';
import { scrapeGoogle } from './googleScraper';
import { BraveSearchAdapter } from './braveSearchAdapter';
import { MojeekSearchAdapter } from './mojeekSearchAdapter';
import { SearXNGAdapter } from './searxngAdapter';
import { scrapeBing } from './bingScraper';
import { scrapeDuckDuckGo } from './duckduckgoScraper';

export interface OrchestratedSearchResult {
  items: RawDiscoveredItem[];
  sourceStats: Record<string, number>;
  metrics: Record<string, SourceMetrics>;
}

/**
 * Intelligent Multi-Search Engine Orchestrator
 * Coordinates Google Web Search, Brave Search, Mojeek, SearXNG, Bing, and DuckDuckGo
 * with fault isolation, per-source timeouts, and comprehensive metrics telemetry.
 */
export async function orchestrateMultiSearch(
  input: SearchInput,
  browser: Browser
): Promise<OrchestratedSearchResult> {
  const queryItems = buildSearchQueries(input);
  const allItems: RawDiscoveredItem[] = [];
  const sourceStats: Record<string, number> = {};
  const metrics: Record<string, SourceMetrics> = {};

  const braveAdapter = new BraveSearchAdapter();
  const mojeekAdapter = new MojeekSearchAdapter();
  const searxngAdapter = new SearXNGAdapter();

  console.log(`\n===================================================================`);
  console.log(`🧭 ADVANCED MULTI-SEARCH ENGINE ORCHESTRATION INITIATED`);
  console.log(`===================================================================`);
  console.log(`📍 Locality  : ${input.area}, ${input.city}`);
  console.log(`🏷️ Category  : ${input.category}`);
  console.log(`🔍 Queries   : ${queryItems.length} multi-intent variations generated`);
  console.log(`===================================================================\n`);

  // 1. Google Web Search (Optimized with 2-page pagination & snippet contact extraction)
  console.log(`📡 [Engine 1/6] Scanning Google Web Search (Optimized & Paginated)...`);
  const googleStart = Date.now();
  try {
    const googleItems = await scrapeGoogle(input, browser);
    sourceStats['Google Web Search'] = googleItems.length;
    allItems.push(...googleItems);
    metrics['Google Web Search'] = {
      sourceName: 'Google Web Search',
      queriesExecuted: Math.min(queryItems.length, 8),
      rawResultsCount: googleItems.length,
      validBusinessCount: googleItems.length,
      uniqueLeadsContributed: googleItems.length,
      duplicateCount: 0,
      websitesFound: googleItems.filter((i) => i.websiteUrl).length,
      phonesExtracted: googleItems.filter((i) => i.phone).length,
      emailsExtracted: googleItems.filter((i) => i.email).length,
      failedRequests: 0,
      executionTimeMs: Date.now() - googleStart,
      status: 'HEALTHY',
    };
    console.log(`   ✅ Google Web Search extracted ${googleItems.length} businesses`);
  } catch (err: any) {
    sourceStats['Google Web Search'] = 0;
    metrics['Google Web Search'] = {
      sourceName: 'Google Web Search',
      queriesExecuted: 0,
      rawResultsCount: 0,
      validBusinessCount: 0,
      uniqueLeadsContributed: 0,
      duplicateCount: 0,
      websitesFound: 0,
      phonesExtracted: 0,
      emailsExtracted: 0,
      failedRequests: 1,
      executionTimeMs: Date.now() - googleStart,
      status: 'DEGRADED',
      errorMessage: err.message,
    };
    console.error(`   ⚠️ Google Web Search error (continuing with remaining engines):`, err.message);
  }

  // 2. Brave Search (Dual mode: REST API if BRAVE_SEARCH_API_KEY present, or Playwright web fallback)
  console.log(`\n📡 [Engine 2/6] Scanning Brave Search (Independent Search Index)...`);
  try {
    const braveItems = await braveAdapter.search(queryItems, { browser });
    sourceStats['Brave Search'] = braveItems.length;
    allItems.push(...braveItems);
    metrics['Brave Search'] = braveAdapter.getMetrics();
    console.log(`   ✅ Brave Search extracted ${braveItems.length} businesses`);
  } catch (err: any) {
    sourceStats['Brave Search'] = 0;
    metrics['Brave Search'] = braveAdapter.getMetrics();
    console.error(`   ⚠️ Brave Search error:`, err.message);
  }

  // 3. Mojeek Search (Independent Web Search Index)
  console.log(`\n📡 [Engine 3/6] Scanning Mojeek (Independent European/Privacy Index)...`);
  try {
    const mojeekItems = await mojeekAdapter.search(queryItems, { browser });
    sourceStats['Mojeek'] = mojeekItems.length;
    allItems.push(...mojeekItems);
    metrics['Mojeek'] = mojeekAdapter.getMetrics();
    console.log(`   ✅ Mojeek extracted ${mojeekItems.length} businesses`);
  } catch (err: any) {
    sourceStats['Mojeek'] = 0;
    metrics['Mojeek'] = mojeekAdapter.getMetrics();
    console.error(`   ⚠️ Mojeek error:`, err.message);
  }

  // 4. SearXNG Metasearch (Configurable self-hosted metasearch instance)
  console.log(`\n📡 [Engine 4/6] Checking SearXNG Metasearch (Configurable Self-Hosted Instance)...`);
  try {
    const searxngHealth = await searxngAdapter.healthCheck();
    if (searxngHealth.available) {
      const searxngItems = await searxngAdapter.search(queryItems);
      sourceStats['SearXNG Metasearch'] = searxngItems.length;
      allItems.push(...searxngItems);
      metrics['SearXNG'] = searxngAdapter.getMetrics();
      console.log(`   ✅ SearXNG extracted ${searxngItems.length} businesses across complementary engines`);
    } else {
      sourceStats['SearXNG Metasearch'] = 0;
      metrics['SearXNG'] = searxngAdapter.getMetrics();
      console.log(`   ℹ️ SearXNG status: ${searxngHealth.reason}`);
    }
  } catch (err: any) {
    sourceStats['SearXNG Metasearch'] = 0;
    metrics['SearXNG'] = searxngAdapter.getMetrics();
    console.error(`   ⚠️ SearXNG error:`, err.message);
  }

  // 5. Bing Search (Tracking unwrap enabled)
  console.log(`\n📡 [Engine 5/6] Scanning Bing Search...`);
  const bingStart = Date.now();
  try {
    const bingItems = await scrapeBing(input, browser);
    sourceStats['Bing Search'] = bingItems.length;
    allItems.push(...bingItems);
    metrics['Bing Search'] = {
      sourceName: 'Bing Search',
      queriesExecuted: 4,
      rawResultsCount: bingItems.length,
      validBusinessCount: bingItems.length,
      uniqueLeadsContributed: bingItems.length,
      duplicateCount: 0,
      websitesFound: bingItems.filter((i) => i.websiteUrl).length,
      phonesExtracted: bingItems.filter((i) => i.phone).length,
      emailsExtracted: bingItems.filter((i) => i.email).length,
      failedRequests: 0,
      executionTimeMs: Date.now() - bingStart,
      status: 'HEALTHY',
    };
    console.log(`   ✅ Bing Search extracted ${bingItems.length} businesses`);
  } catch (err: any) {
    sourceStats['Bing Search'] = 0;
    console.error(`   ⚠️ Bing Search skipped:`, err.message);
  }

  // 6. DuckDuckGo Search
  console.log(`\n📡 [Engine 6/6] Scanning DuckDuckGo Search...`);
  const ddgStart = Date.now();
  try {
    const ddgItems = await scrapeDuckDuckGo(input, browser);
    sourceStats['DuckDuckGo Search'] = ddgItems.length;
    allItems.push(...ddgItems);
    metrics['DuckDuckGo Search'] = {
      sourceName: 'DuckDuckGo Search',
      queriesExecuted: 3,
      rawResultsCount: ddgItems.length,
      validBusinessCount: ddgItems.length,
      uniqueLeadsContributed: ddgItems.length,
      duplicateCount: 0,
      websitesFound: ddgItems.filter((i) => i.websiteUrl).length,
      phonesExtracted: ddgItems.filter((i) => i.phone).length,
      emailsExtracted: ddgItems.filter((i) => i.email).length,
      failedRequests: 0,
      executionTimeMs: Date.now() - ddgStart,
      status: 'HEALTHY',
    };
    console.log(`   ✅ DuckDuckGo Search extracted ${ddgItems.length} businesses`);
  } catch (err: any) {
    sourceStats['DuckDuckGo Search'] = 0;
    console.error(`   ⚠️ DuckDuckGo Search skipped:`, err.message);
  }

  return {
    items: allItems,
    sourceStats,
    metrics,
  };
}
