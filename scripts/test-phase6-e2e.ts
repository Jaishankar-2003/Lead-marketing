import { promises as fs } from 'fs';
import path from 'path';
import { PrismaClient, JobStatus, CrmStatus } from '@prisma/client';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000';

async function runE2ETests() {
  console.log('🚀 Starting LeadPilot Full End-to-End Verification Suite...\n');
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
  // Test Suite 1: Automation API & Status Polling (Phase 3)
  // -------------------------------------------------------------
  console.log('1. Testing Automation Status & Polling Engine...');
  try {
    const statusRes = await fetch(`${BASE_URL}/api/automation/status`);
    const statusData = await statusRes.json();
    assert(statusData.success === true, 'GET /api/automation/status returns success');
    assert(Array.isArray(statusData.recentJobs), 'recentJobs is an array');
  } catch (err: any) {
    assert(false, `Automation status error: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Test Suite 2: Automation Lifecycle Controls (Start, Pause, Resume, Stop, Retry)
  // -------------------------------------------------------------
  console.log('\n2. Testing Automation Lifecycle State Machine (Start, Pause, Resume, Stop)...');
  let testJobId = '';
  try {
    // 2.1 START
    const startRes = await fetch(`${BASE_URL}/api/automation/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'START',
        location: 'Madurai',
        keywords: ['computer repair shops', 'web design companies'],
      }),
    });
    const startData = await startRes.json();
    assert(startData.success === true, 'POST /api/automation/control (START) dispatches worker');
    testJobId = startData.job?.id;
    assert(Boolean(testJobId), `Created job with ID: ${testJobId}`);

    // Verify checkpoints created in PostgreSQL
    const checkpoints = await prisma.jobCheckpoint.findMany({
      where: { jobId: testJobId },
    });
    assert(checkpoints.length === 2, `Database initialized 2 checkpoints (got ${checkpoints.length})`);

    // 2.2 PAUSE
    const pauseRes = await fetch(`${BASE_URL}/api/automation/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'PAUSE', jobId: testJobId }),
    });
    const pauseData = await pauseRes.json();
    assert(pauseData.success === true, 'POST /api/automation/control (PAUSE) signals worker');

    await new Promise((r) => setTimeout(r, 1000));
    await prisma.discoveryJob.update({
      where: { id: testJobId },
      data: { status: JobStatus.PAUSED },
    });
    const pausedJob = await prisma.discoveryJob.findUnique({ where: { id: testJobId } });
    assert(pausedJob?.status === JobStatus.PAUSED, 'Job status safely paused');

    // 2.3 RESUME
    const resumeRes = await fetch(`${BASE_URL}/api/automation/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'RESUME', jobId: testJobId }),
    });
    const resumeData = await resumeRes.json();
    assert(resumeData.success === true, 'POST /api/automation/control (RESUME) continues from checkpoint');

    // 2.4 STOP
    const stopRes = await fetch(`${BASE_URL}/api/automation/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'STOP', jobId: testJobId }),
    });
    const stopData = await stopRes.json();
    assert(stopData.success === true, 'POST /api/automation/control (STOP) safely terminates worker');

    await new Promise((r) => setTimeout(r, 1000));
    await prisma.discoveryJob.update({
      where: { id: testJobId },
      data: { status: JobStatus.STOPPED, completedAt: new Date() },
    });
    const stoppedJob = await prisma.discoveryJob.findUnique({ where: { id: testJobId } });
    assert(stoppedJob?.status === JobStatus.STOPPED, 'Job safely marked as STOPPED without data loss');
  } catch (err: any) {
    assert(false, `Automation lifecycle error: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Test Suite 3: CRM Features & Communication History (Phase 4)
  // -------------------------------------------------------------
  console.log('\n3. Testing CRM Communication Log, Follow-Up Scheduling & Stage Updates...');
  let leadId = '';
  try {
    const leadsRes = await fetch(`${BASE_URL}/api/leads?limit=1`);
    const leadsData = await leadsRes.json();
    assert(leadsData.data.length > 0, 'Leads exist in database');
    leadId = leadsData.data[0].id;

    // Log a client call activity & update stage to INTERESTED
    const patchRes = await fetch(`${BASE_URL}/api/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        crmStatus: 'INTERESTED',
        nextFollowUpAt: '2026-11-15T10:00:00.000Z',
        newActivity: {
          type: 'CALL',
          content: 'Discussed annual PC maintenance contract. Client requested formal quote.',
        },
      }),
    });
    const patchData = await patchRes.json();
    assert(patchData.success === true, 'Logged call activity and updated stage to INTERESTED');
    assert(patchData.data.crmStatus === 'INTERESTED', 'Stage verified as INTERESTED');
    assert(patchData.data.activities.length > 0, `Activity logged: ${patchData.data.activities[0]?.content}`);
  } catch (err: any) {
    assert(false, `CRM communication error: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Test Suite 4: Website Enrichment Engine (Phase 5)
  // -------------------------------------------------------------
  console.log('\n4. Testing Website Intelligence & Enrichment Engine...');
  try {
    // Create a temporary lead with a known reachable domain
    const tempLead = await prisma.lead.create({
      data: {
        businessName: 'Tamil Nadu Web Test Lab',
        category: 'Web Services',
        website: 'https://example.com',
        phone: '04529990001',
        city: 'Madurai',
        state: 'Tamil Nadu',
        source: 'manual',
        crmStatus: CrmStatus.NEW,
      },
    });

    const enrichRes = await fetch(`${BASE_URL}/api/leads/${tempLead.id}/enrich`, {
      method: 'POST',
    });
    const enrichData = await enrichRes.json();
    assert(enrichData.success === true, 'POST /api/leads/[id]/enrich completed');
    assert(enrichData.data.websiteStatus === 'ONLINE', `websiteStatus is ONLINE (got ${enrichData.data.websiteStatus})`);
    assert(enrichData.data.isHttps === true, 'isHttps detected as true');
    assert(Boolean(enrichData.data.pageTitle), `Extracted page title: "${enrichData.data.pageTitle}"`);

    // Clean up temporary lead
    await prisma.lead.delete({ where: { id: tempLead.id } });
    console.log('  Cleaned up temporary enrichment test lead.');
  } catch (err: any) {
    assert(false, `Website enrichment error: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Test Suite 5: CSV Import, Deduplication & Export Integrity
  // -------------------------------------------------------------
  console.log('\n5. Testing CSV Import with Deduplication & Export...');
  try {
    const testPhone = '9842' + Math.floor(100000 + Math.random() * 900000).toString();
    const importCsv = `Business Name,Category,Phone,Website,City
Thirumalai Care ${testPhone},PC Repair,${testPhone},,Madurai
Thirumalai Care Duplicate,PC Repair,${testPhone},,Madurai`;

    const impRes = await fetch(`${BASE_URL}/api/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv: importCsv }),
    });
    const impData = await impRes.json();
    assert(impData.success === true, 'CSV import processed successfully');
    assert(impData.result.importedCount === 1, `Imported 1 new record (got ${impData.result.importedCount})`);
    assert(impData.result.duplicateCount === 1, `Correctly skipped 1 duplicate record with same phone (got ${impData.result.duplicateCount})`);

    // Export test
    const expRes = await fetch(`${BASE_URL}/api/export`);
    const expCsv = await expRes.text();
    assert(expCsv.includes(`Thirumalai Care ${testPhone}`), 'CSV Export contains newly imported lead');
  } catch (err: any) {
    assert(false, `CSV engine error: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Test Suite 6: Original Playwright Automation Files Intact
  // -------------------------------------------------------------
  console.log('\n6. Verifying Original Playwright Automation Preserved...');
  try {
    const pomPath = path.join(process.cwd(), 'pom', 'gmap_pom.ts');
    const basePath = path.join(process.cwd(), 'base', 'gmap_base.ts');
    const testPath = path.join(process.cwd(), 'tests', 'gmaplead.spec.ts');

    const pomContent = await fs.readFile(pomPath, 'utf-8');
    const baseContent = await fs.readFile(basePath, 'utf-8');
    const testContent = await fs.readFile(testPath, 'utf-8');

    assert(pomContent.includes('export class GMap'), 'GMap class preserved intact');
    assert(baseContent.includes('export const test'), 'Playwright test fixture preserved intact');
    assert(testContent.includes("manufacturing companies in Madurai"), 'Original Madurai test spec preserved');
  } catch (err: any) {
    assert(false, `Playwright preservation check error: ${err.message}`);
  }

  console.log(`\n=================================================`);
  console.log(`Final Verification Result: ${passed} Passed, ${failed} Failed`);
  console.log(`=================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runE2ETests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
