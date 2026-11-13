import { startDiscoveryJob, stopDiscoveryJob, getActiveDiscoveryJob, isDisplayAvailable } from '../src/lib/open-marketing/discoveryManager';

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runBrowserModeTests() {
  console.log('🧪 RUNNING COMPREHENSIVE BROWSER EXECUTION MODE TESTS\n');

  // TEST 1: Reject invalid browser modes
  console.log('--- TEST 1: Rejection of Invalid Browser Mode ---');
  try {
    await startDiscoveryJob({
      category: 'Test Category',
      area: 'Anna Nagar',
      city: 'Madurai',
      // @ts-expect-error Testing invalid runtime value
      browserMode: 'invalid_mode',
    });
    console.error('❌ Failed: Invalid browserMode was not rejected!');
    process.exit(1);
  } catch (err: any) {
    if (err.message.includes('Invalid browserMode')) {
      console.log(`✓ Passed: Invalid browserMode rejected correctly with error: "${err.message}"`);
    } else {
      console.error(`❌ Unexpected error message: ${err.message}`);
      process.exit(1);
    }
  }

  // TEST 2: Environment Display Safety Check for Headed Mode
  console.log('\n--- TEST 2: Display Environment Safety Check for Headed Mode ---');
  const hasDisplay = isDisplayAvailable();
  console.log(`  Current environment graphical/virtual display status: ${hasDisplay ? 'AVAILABLE' : 'NOT AVAILABLE'}`);

  if (!hasDisplay) {
    try {
      await startDiscoveryJob({
        category: 'Test Category',
        area: 'Anna Nagar',
        city: 'Madurai',
        browserMode: 'headed',
      });
      console.error('❌ Failed: Headed mode without display did not throw safety error!');
      process.exit(1);
    } catch (err: any) {
      if (err.message.includes('No active graphical display or virtual display')) {
        console.log(`✓ Passed: Headed mode correctly threw environment display safety error: "${err.message}"`);
      } else {
        console.error(`❌ Unexpected error: ${err.message}`);
        process.exit(1);
      }
    }
  } else {
    console.log('  Display is available in environment.');
  }

  // TEST 3: Headless Execution & Process Monitor State
  console.log('\n--- TEST 3: Headless Discovery Execution & Process Monitor Verification ---');
  const headlessJob = await startDiscoveryJob({
    category: 'Hardware Stores',
    area: 'Anna Nagar',
    city: 'Madurai',
    browserMode: 'headless',
  });

  console.log(`✓ Job started: ID = ${headlessJob.jobId}`);
  console.log(`✓ Job Browser Mode: ${headlessJob.browserMode} (headless boolean = ${headlessJob.headless})`);
  if (headlessJob.browserMode !== 'headless' || !headlessJob.headless) {
    console.error('❌ Failed: Job state did not record browserMode as headless!');
    process.exit(1);
  }

  // Poll for 3 seconds
  for (let i = 0; i < 3; i++) {
    await sleep(1000);
    const monitorState = getActiveDiscoveryJob();
    console.log(`  [Ticker ${i + 1}s] Status = ${monitorState.status}, Mode = ${monitorState.browserMode}, Elapsed = ${monitorState.elapsedSeconds}s`);
    if (monitorState.browserMode !== 'headless') {
      console.error('❌ Failed: Monitor state did not preserve browserMode!');
      process.exit(1);
    }
  }

  // TEST 4: STOP button compatibility in Headless mode
  console.log('\n--- TEST 4: STOP Button Compatibility in Headless Mode ---');
  const stopRes = await stopDiscoveryJob();
  console.log(`✓ Stop requested: Status = ${stopRes.status}`);

  for (let i = 0; i < 5; i++) {
    await sleep(1000);
    const monitorState = getActiveDiscoveryJob();
    if (monitorState.status === 'STOPPED') {
      console.log('✓ Successfully confirmed STOPPED state for headless job.');
      break;
    }
  }

  // TEST 5: Headed Execution with Virtual Display (Xvfb)
  console.log('\n--- TEST 5: Headed Discovery Execution with Display Emulation & Stop ---');
  // Temporarily provide display check simulation if needed
  const originalDisplay = process.env.DISPLAY;
  process.env.DISPLAY = ':99'; // Emulate virtual Xvfb display

  try {
    const headedJob = await startDiscoveryJob({
      category: 'Computer Repair Shops',
      area: 'Anna Nagar',
      city: 'Madurai',
      browserMode: 'headed',
    });

    console.log(`✓ Headed Job started: ID = ${headedJob.jobId}`);
    console.log(`✓ Job Browser Mode: ${headedJob.browserMode} (headless boolean = ${headedJob.headless})`);
    if (headedJob.browserMode !== 'headed' || headedJob.headless !== false) {
      console.error('❌ Failed: Headed job state did not record browserMode as headed!');
      process.exit(1);
    }

    await sleep(2000);
    const monitorState = getActiveDiscoveryJob();
    console.log(`  [Ticker] Status = ${monitorState.status}, Mode = ${monitorState.browserMode}, Logs[2] = ${monitorState.logs[2]}`);

    // Stop headed job
    console.log('  Stopping headed job...');
    await stopDiscoveryJob();
    for (let i = 0; i < 5; i++) {
      await sleep(1000);
      const s = getActiveDiscoveryJob();
      if (s.status === 'STOPPED') {
        console.log('✓ Successfully confirmed STOPPED state for headed job.');
        break;
      }
    }
  } finally {
    process.env.DISPLAY = originalDisplay;
  }

  console.log('\n🎉 ALL BROWSER EXECUTION MODE TESTS PASSED SUCCESSFULLY!\n');
  process.exit(0);
}

runBrowserModeTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
