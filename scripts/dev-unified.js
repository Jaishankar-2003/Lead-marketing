#!/usr/bin/env node

/**
 * Unified Development Supervisor
 * Launches both Marketing Next.js application (port 3000) and
 * Open Marketing Express backend (port 3001) with clean process management,
 * health checking, and signal forwarding.
 */

const { spawn, execSync } = require('child_process');
const http = require('http');
const net = require('net');
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

function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    server.once('listening', () => {
      server.close(() => resolve(false));
    });
    server.listen(port, '0.0.0.0');
  });
}

function killProcessOnPort(port) {
  try {
    const pids = execSync(`lsof -ti:${port} 2>/dev/null || fuser ${port}/tcp 2>/dev/null`, { encoding: 'utf8' }).trim();
    if (pids) {
      const pidList = pids.split(/\s+/).filter(Boolean);
      console.log(`[Supervisor] Terminating stale process on port ${port} (PIDs: ${pidList.join(', ')})...`);
      execSync(`kill -9 ${pidList.join(' ')} 2>/dev/null || true`);
      return true;
    }
  } catch (e) {}
  return false;
}

function checkHealth(port, path = '/api/health') {
  return new Promise((resolve) => {
    const tryHost = (host) => {
      const req = http.get(
        {
          host,
          port,
          path,
          timeout: 1500,
        },
        (res) => {
          resolve(res.statusCode >= 200 && res.statusCode < 400);
        }
      );
      req.on('error', () => {
        if (host === '127.0.0.1') {
          tryHost('localhost');
        } else {
          resolve(false);
        }
      });
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    };
    tryHost('127.0.0.1');
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

  console.log('\n[Supervisor] Gracefully stopping all services...');

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
process.on('uncaughtException', (err) => {
  console.error('[Supervisor Error]', err);
  shutdown(1);
});

async function main() {
  console.log('================================================================');
  console.log('🚀 Starting LeadPilot & Open Marketing Unified Platform');
  console.log('================================================================\n');

  // 0. Ensure PostgreSQL is running
  try {
    const { execSync } = require('child_process');
    console.log('[Database] Checking PostgreSQL database service...');
    execSync('bash scripts/db-start.sh', { cwd: MARKETING_ROOT, stdio: 'inherit' });
    console.log('[Database] PostgreSQL is ready.\n');
  } catch (err) {
    console.warn('[Database] Notice: PostgreSQL check finished with status:', err.status || 0);
  }

  // 1. Check if Open Marketing Backend is already running or port 3001 is in use
  const inUse3001 = await isPortInUse(OPEN_MARKETING_PORT);
  let backendReady = false;

  if (inUse3001) {
    const healthy = await checkHealth(OPEN_MARKETING_PORT);
    if (healthy) {
      console.log(`[OpenMarketing] Backend already running and healthy on port ${OPEN_MARKETING_PORT}`);
      backendReady = true;
    } else {
      console.log(`[OpenMarketing] Port ${OPEN_MARKETING_PORT} is blocked by an unresponsive process. Freeing port...`);
      killProcessOnPort(OPEN_MARKETING_PORT);
      await new Promise((r) => setTimeout(r, 600));
    }
  }

  if (!backendReady) {
    console.log(`[OpenMarketing] Launching backend service from: ${OPEN_MARKETING_BACKEND_DIR}`);
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

    openMarketingChild.on('exit', (code) => {
      if (!isShuttingDown) {
        console.error(`[OpenMarketing] Process exited unexpectedly with code ${code}`);
      }
    });

    console.log(`[OpenMarketing] Awaiting backend health verification on port ${OPEN_MARKETING_PORT}...`);
    const ready = await waitForBackend(OPEN_MARKETING_PORT);
    if (!ready) {
      console.error(`\n❌ [OpenMarketing] Backend failed to start on port ${OPEN_MARKETING_PORT} within timeout.`);
      shutdown(1);
      return;
    }
    console.log(`✓ [OpenMarketing] Backend health check PASSED (http://127.0.0.1:${OPEN_MARKETING_PORT}/api/health)\n`);
  }

  // 2. Ensure port 3000 is clean before launching Next.js
  const inUse3000 = await isPortInUse(MARKETING_PORT);
  if (inUse3000) {
    const nextHealthy = await checkHealth(MARKETING_PORT, '/');
    if (!nextHealthy) {
      console.log(`[Marketing] Port ${MARKETING_PORT} is blocked by a stale process. Freeing port...`);
      killProcessOnPort(MARKETING_PORT);
      await new Promise((r) => setTimeout(r, 600));
    }
  }

  // 2. Launch Marketing Next.js application
  console.log(`[Marketing] Starting Next.js Dev Server on port ${MARKETING_PORT}...`);
  console.log(`[Marketing] Unified UI will be available at: http://localhost:${MARKETING_PORT}\n`);

  nextChild = spawn('npx', ['next', 'dev', '-p', String(MARKETING_PORT)], {
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
      console.log(`[Marketing] Next.js process exited with code ${code}`);
      shutdown(code || 0);
    }
  });
}

main();
