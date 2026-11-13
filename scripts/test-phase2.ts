import { promises as fs } from 'fs';
import path from 'path';

async function runPhase2Tests() {
  console.log('🧪 Running LeadPilot Phase 2 Verification Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  const BASE_URL = 'http://localhost:3000';

  // Test 1: Dashboard Stats API
  console.log('1. Testing Dashboard Stats API...');
  try {
    const res = await fetch(`${BASE_URL}/api/dashboard/stats`);
    const data = await res.json();
    assert(data.success === true, 'GET /api/dashboard/stats returns success: true');
    assert(data.stats.totalLeads >= 5, `totalLeads is ${data.stats.totalLeads} (expected >= 5)`);
    assert(data.pipelineCounts !== undefined, 'pipelineCounts dictionary returned');
    assert(data.recentLeads.length > 0, 'recentLeads contains records');
  } catch (err: any) {
    assert(false, `Dashboard API error: ${err.message}`);
  }

  // Test 2: Leads Filtering & Search API
  console.log('\n2. Testing Leads Filtering API...');
  let sampleLeadId = '';
  try {
    const res = await fetch(`${BASE_URL}/api/leads?search=Meenakshi`);
    const data = await res.json();
    assert(data.success === true, 'GET /api/leads with search returns success');
    assert(data.data.length > 0, `Search returned ${data.data.length} matches`);
    sampleLeadId = data.data[0].id;
    assert(Boolean(sampleLeadId), `Retrieved sample lead ID: ${sampleLeadId}`);
  } catch (err: any) {
    assert(false, `Leads filter error: ${err.message}`);
  }

  // Test 3: Lead Details & Status Update (PATCH)
  console.log('\n3. Testing Lead Update (PATCH) & Status Management...');
  try {
    const patchRes = await fetch(`${BASE_URL}/api/leads/${sampleLeadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        crmStatus: 'CONTACTED',
        notes: 'Called shop manager. Scheduled meeting for next Thursday.',
      }),
    });
    const patchData = await patchRes.json();
    assert(patchData.success === true, 'PATCH /api/leads/[id] updated successfully');
    assert(patchData.data.crmStatus === 'CONTACTED', 'crmStatus successfully updated to CONTACTED');
    assert(patchData.data.notes.includes('Scheduled meeting'), 'Notes correctly persisted');
  } catch (err: any) {
    assert(false, `Lead update error: ${err.message}`);
  }

  // Test 4: CSV Import with Deduplication
  console.log('\n4. Testing CSV Import with Automatic Deduplication...');
  try {
    // Row 1: duplicate of Pandian (phone 9842111222)
    // Row 2: new lead 1
    // Row 3: new lead 2
    const testCsv = `Business Name,Category,Phone,Website,City,Address
Pandian IT Duplicate,IT Services,9842111222,https://pandianit.in,Madurai,Byepass Road
Annamalai Computer Hub,Computer Hardware,9842999888,,Madurai,Simmakkal
Kurinji Digital Agency,Web & Graphics,9842777666,https://kurinjidigital.com,Madurai,Anna Nagar`;

    const importRes = await fetch(`${BASE_URL}/api/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv: testCsv }),
    });
    const importData = await importRes.json();
    assert(importData.success === true, 'POST /api/import succeeded');
    assert(importData.result.totalRows === 3, 'Import parsed 3 rows');
    assert(importData.result.importedCount === 2, `Imported 2 new rows (got ${importData.result.importedCount})`);
    assert(importData.result.duplicateCount === 1, `Skipped 1 duplicate row (got ${importData.result.duplicateCount})`);
  } catch (err: any) {
    assert(false, `CSV import error: ${err.message}`);
  }

  // Test 5: CSV Export
  console.log('\n5. Testing CSV Export Engine...');
  try {
    const exportRes = await fetch(`${BASE_URL}/api/export`);
    const csvContent = await exportRes.text();
    const contentType = exportRes.headers.get('content-type') || '';
    assert(contentType.includes('text/csv'), 'Content-Type header is text/csv');
    assert(csvContent.includes('Business Name,Category,Website'), 'CSV contains expected standard headers');
    assert(csvContent.includes('Madurai'), 'CSV content includes city records');
  } catch (err: any) {
    assert(false, `CSV export error: ${err.message}`);
  }

  // Test 6: Verify Original Playwright Code Integrity
  console.log('\n6. Verifying Playwright Files Preserved...');
  try {
    const pomPath = path.join(process.cwd(), 'pom', 'gmap_pom.ts');
    const basePath = path.join(process.cwd(), 'base', 'gmap_base.ts');
    const testPath = path.join(process.cwd(), 'tests', 'gmaplead.spec.ts');

    const pomExists = await fs.stat(pomPath).then(() => true).catch(() => false);
    const baseExists = await fs.stat(basePath).then(() => true).catch(() => false);
    const testExists = await fs.stat(testPath).then(() => true).catch(() => false);

    assert(pomExists, 'pom/gmap_pom.ts preserved intact');
    assert(baseExists, 'base/gmap_base.ts preserved intact');
    assert(testExists, 'tests/gmaplead.spec.ts preserved intact');
  } catch (err: any) {
    assert(false, `Playwright file check error: ${err.message}`);
  }

  console.log(`\n========================================`);
  console.log(`Verification Summary: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase2Tests().catch((err) => {
  console.error(err);
  process.exit(1);
});
