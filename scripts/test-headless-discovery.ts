import { startDiscoveryJob, stopDiscoveryJob, getActiveDiscoveryJob } from '../src/lib/open-marketing/discoveryManager';

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function testHeadlessDiscovery() {
  console.log('🧪 TESTING HEADLESS DISCOVERY EXECUTION & STOP CONTROL...\n');

  console.log('1. Starting discovery job...');
  const job = await startDiscoveryJob({
    category: 'Hardware Stores',
    area: 'Anna Nagar',
    city: 'Madurai',
  });

  console.log(`✓ Job started: ID = ${job.jobId}, Headless = ${job.headless}, Status = ${job.status}`);

  // Poll status for 4 seconds
  for (let i = 0; i < 4; i++) {
    await sleep(1000);
    const state = getActiveDiscoveryJob();
    console.log(`  [Ticker ${i + 1}s] Status = ${state.status}, Elapsed = ${state.elapsedSeconds}s, Logs count = ${state.logs.length}`);
  }

  console.log('\n2. Testing STOP action...');
  const stopRes = await stopDiscoveryJob();
  console.log(`✓ Stop requested: Status = ${stopRes.status}`);

  // Wait for clean termination
  for (let i = 0; i < 5; i++) {
    await sleep(1000);
    const state = getActiveDiscoveryJob();
    console.log(`  [Post-Stop ${i + 1}s] Status = ${state.status}, Logs = ${state.logs.slice(-1)[0]}`);
    if (state.status === 'STOPPED') {
      console.log('✓ Successfully confirmed STOPPED state!');
      break;
    }
  }

  const finalState = getActiveDiscoveryJob();
  if (finalState.status === 'STOPPED') {
    console.log('\n🎉 ALL HEADLESS DISCOVERY TESTS PASSED!\n');
    process.exit(0);
  } else {
    console.error(`\n❌ Test failed: expected STOPPED, got ${finalState.status}`);
    process.exit(1);
  }
}

testHeadlessDiscovery().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
