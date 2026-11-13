#!/usr/bin/env node

/**
 * Unified Production Supervisor
 * Starts Open Marketing backend and Next.js production server.
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const MARKETING_ROOT = path.resolve(__dirname, '..');
const OPEN_MARKETING_BACKEND_DIR = path.resolve(
  MARKETING_ROOT,
  'open marketing /dashboard/backend'
);

const OPEN_MARKETING_PORT = process.env.OPEN_MARKETING_PORT || 3001;
const MARKETING_PORT = process.env.PORT || 3000;

let openMarketingChild = null;
let nextChild = null;
let isShuttingDown = false;

function checkHealth(port, path = '/api/health') {
  return new Promise((resolve) => {
    const req = http.get(
      {
        host: '127.0.0.1',
        port,
        path,
        timeout: 1000,
      },
      (res) => {
        resolve(res.statusCode === 200);
      }
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForBackend(port, maxRetries = 30, intervalMs = 400) {
  for (let i = 0; i < maxRetries; i++) {
    const healthy = await checkHealth(port);
    if (healthy) return true;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

function shutdown(exitCode = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log('\n[Supervisor] Stopping all production services...');

  if (openMarketingChild) {
    try {
      openMarketingChild.kill('SIGTERM');
    } catch (e) {}
  }

  if (nextChild) {
    try {
      nextChild.kill('SIGTERM');
    } catch (e) {}
  }

  setTimeout(() => {
    if (openMarketingChild) {
      try {
        openMarketingChild.kill('SIGKILL');
      } catch (e) {}
    }
    if (nextChild) {
      try {
        nextChild.kill('SIGKILL');
      } catch (e) {}
    }
    process.exit(exitCode);
  }, 1500);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
process.on('SIGHUP', () => shutdown(0));

async function main() {
  console.log('================================================================');
  console.log('🚀 Starting LeadPilot & Open Marketing Production Platform');
  console.log('================================================================\n');

  const backendAlreadyRunning = await checkHealth(OPEN_MARKETING_PORT);

  if (backendAlreadyRunning) {
    console.log(`[OpenMarketing] Backend active on port ${OPEN_MARKETING_PORT}`);
  } else {
    console.log(`[OpenMarketing] Launching backend from: ${OPEN_MARKETING_BACKEND_DIR}`);
    openMarketingChild = spawn('node', ['dist/index.js'], {
      cwd: OPEN_MARKETING_BACKEND_DIR,
      env: { ...process.env, PORT: String(OPEN_MARKETING_PORT) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    openMarketingChild.stdout.on('data', (d) => {
      const line = d.toString().trim();
      if (line) console.log(`[OpenMarketing] ${line}`);
    });

    openMarketingChild.stderr.on('data', (d) => {
      const line = d.toString().trim();
      if (line) console.error(`[OpenMarketing ERR] ${line}`);
    });

    const ready = await waitForBackend(OPEN_MARKETING_PORT);
    if (!ready) {
      console.error(`❌ [OpenMarketing] Backend failed to start on port ${OPEN_MARKETING_PORT}`);
      shutdown(1);
      return;
    }
    console.log(`✓ [OpenMarketing] Health check verified on port ${OPEN_MARKETING_PORT}\n`);
  }

  console.log(`[Marketing] Starting Next.js Production Server on port ${MARKETING_PORT}...`);
  nextChild = spawn('npx', ['next', 'start', '-p', String(MARKETING_PORT)], {
    cwd: MARKETING_ROOT,
    env: {
      ...process.env,
      PORT: String(MARKETING_PORT),
      OPEN_MARKETING_BACKEND_URL: `http://127.0.0.1:${OPEN_MARKETING_PORT}`,
    },
    stdio: 'inherit',
  });

  nextChild.on('exit', (code) => {
    if (!isShuttingDown) {
      shutdown(code || 0);
    }
  });
}

main();
