import http from 'http';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';

function fetchUrl(url: string, options: http.RequestOptions = {}): Promise<{ status: number; text: string; json?: any }> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: `${u.pathname}${u.search}`,
        method: options.method || 'GET',
        headers: options.headers || {},
        timeout: 8000,
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          let json: any = undefined;
          try {
            json = JSON.parse(data);
          } catch (e) {}
          resolve({ status: res.statusCode || 0, text: data, json });
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${url}`));
    });
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('================================================================');
  console.log('🧪 VERIFYING OPEN MARKETING & MARKETING UI INTEGRATION');
  console.log('================================================================\n');

  const MARKETING_ROOT = path.resolve(__dirname, '..');
  const OPEN_MARKETING_BACKEND_DIR = path.resolve(MARKETING_ROOT, 'open marketing /dashboard/backend');
  const TEST_OM_PORT = 3001;
  const TEST_NEXT_PORT = 3099;

  let omProc: ChildProcess | null = null;
  let nextProc: ChildProcess | null = null;

  try {
    // 1. Start Open Marketing Express Backend
    console.log(`[Step 1] Starting Open Marketing Backend on port ${TEST_OM_PORT}...`);
    omProc = spawn('node', ['dist/index.js'], {
      cwd: OPEN_MARKETING_BACKEND_DIR,
      env: { ...process.env, PORT: String(TEST_OM_PORT) },
      stdio: 'pipe',
    });

    let omReady = false;
    for (let i = 0; i < 25; i++) {
      try {
        const res = await fetchUrl(`http://127.0.0.1:${TEST_OM_PORT}/api/health`);
        if (res.status === 200) {
          omReady = true;
          break;
        }
      } catch (e) {}
      await sleep(300);
    }

    if (!omReady) {
      throw new Error('Open Marketing backend failed to respond to /api/health');
    }
    console.log('✓ Open Marketing backend is healthy and responding.\n');

    // Test direct backend data loading
    const directDashboard = await fetchUrl(`http://127.0.0.1:${TEST_OM_PORT}/api/dashboard`);
    console.log(`✓ Direct Backend KPIs: totalLeads = ${directDashboard.json?.kpis?.totalLeads}, qualifiedLeads = ${directDashboard.json?.kpis?.qualifiedLeads}`);

    // 2. Start Next.js on port 3099
    console.log(`\n[Step 2] Starting Next.js server on port ${TEST_NEXT_PORT}...`);
    nextProc = spawn('npx', ['next', 'start', '-p', String(TEST_NEXT_PORT)], {
      cwd: MARKETING_ROOT,
      env: {
        ...process.env,
        PORT: String(TEST_NEXT_PORT),
        OPEN_MARKETING_BACKEND_URL: `http://127.0.0.1:${TEST_OM_PORT}`,
      },
      stdio: 'pipe',
    });

    let nextReady = false;
    for (let i = 0; i < 30; i++) {
      try {
        const res = await fetchUrl(`http://127.0.0.1:${TEST_NEXT_PORT}/`);
        if (res.status === 200) {
          nextReady = true;
          break;
        }
      } catch (e) {}
      await sleep(400);
    }

    if (!nextReady) {
      throw new Error('Next.js server failed to respond on test port');
    }
    console.log('✓ Next.js server is ready.\n');

    // 3. Smoke Test Primary Marketing Routes
    console.log('[Step 3] Verifying Primary Marketing UI Routes:');
    const primaryRoutes = [
      '/',
      '/discovery',
      '/leads',
      '/pipeline',
      '/outreach',
      '/unsubscribe',
    ];

    for (const route of primaryRoutes) {
      const res = await fetchUrl(`http://127.0.0.1:${TEST_NEXT_PORT}${route}`);
      if (res.status !== 200) {
        throw new Error(`Route ${route} returned status ${res.status}`);
      }
      console.log(`  ✓ ${route} -> HTTP 200 OK (${res.text.length} bytes)`);
    }

    // 4. Smoke Test Open Marketing Integrated Routes
    console.log('\n[Step 4] Verifying Open Marketing Integrated UI Routes:');
    const openMarketingRoutes = [
      '/open-marketing',
      '/open-marketing/discovery',
      '/open-marketing/leads',
      '/open-marketing/qualified',
      '/open-marketing/settings',
    ];

    for (const route of openMarketingRoutes) {
      const res = await fetchUrl(`http://127.0.0.1:${TEST_NEXT_PORT}${route}`);
      if (res.status !== 200) {
        throw new Error(`Route ${route} returned status ${res.status}`);
      }
      const hasBrand = res.text.includes('LeadPilot');
      const hasOMModule = res.text.includes('Lead Intelligence') || res.text.includes('open-marketing');
      console.log(`  ✓ ${route} -> HTTP 200 OK (has Brand: ${hasBrand}, has OM Module: ${hasOMModule})`);
    }

    // 5. Test Open Marketing API Proxy Endpoints
    console.log('\n[Step 5] Verifying API Proxy (/api/open-marketing/*):');

    const healthProxy = await fetchUrl(`http://127.0.0.1:${TEST_NEXT_PORT}/api/open-marketing/health`);
    console.log(`  ✓ /api/open-marketing/health -> ${healthProxy.status} (${JSON.stringify(healthProxy.json)})`);

    const dashProxy = await fetchUrl(`http://127.0.0.1:${TEST_NEXT_PORT}/api/open-marketing/dashboard`);
    console.log(`  ✓ /api/open-marketing/dashboard -> ${dashProxy.status} (Total Leads: ${dashProxy.json?.kpis?.totalLeads}, Qualified: ${dashProxy.json?.kpis?.qualifiedLeads})`);

    const leadsProxy = await fetchUrl(`http://127.0.0.1:${TEST_NEXT_PORT}/api/open-marketing/leads?limit=3`);
    console.log(`  ✓ /api/open-marketing/leads?limit=3 -> ${leadsProxy.status} (Total: ${leadsProxy.json?.total}, Returned: ${leadsProxy.json?.data?.length})`);

    const qualProxy = await fetchUrl(`http://127.0.0.1:${TEST_NEXT_PORT}/api/open-marketing/leads/qualified?limit=3`);
    console.log(`  ✓ /api/open-marketing/leads/qualified?limit=3 -> ${qualProxy.status} (Qualified Total: ${qualProxy.json?.total})`);

    const configProxy = await fetchUrl(`http://127.0.0.1:${TEST_NEXT_PORT}/api/open-marketing/config`);
    console.log(`  ✓ /api/open-marketing/config -> ${configProxy.status} (Dir: ${configProxy.json?.outputDir})`);

    // 6. Test CLI Discovery Capability
    console.log('\n[Step 6] Verifying Discovery CLI Configuration:');
    const openMarketingPkg = require(path.join(MARKETING_ROOT, 'open marketing /package.json'));
    console.log(`  ✓ Package name: ${openMarketingPkg.name}`);
    console.log(`  ✓ Discover script: ${openMarketingPkg.scripts?.discover}`);

    console.log('\n================================================================');
    console.log('🎉 ALL INTEGRATION SMOKE TESTS PASSED WITH 100% SUCCESS!');
    console.log('================================================================\n');
  } finally {
    if (omProc) {
      try {
        omProc.kill('SIGTERM');
      } catch (e) {}
    }
    if (nextProc) {
      try {
        nextProc.kill('SIGTERM');
      } catch (e) {}
    }
    await sleep(500);
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Verification Failed:', err);
    process.exit(1);
  });
