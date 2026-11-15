import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { DiscoveryJobState, DiscoveryJobStatus, BrowserExecutionMode } from '@/types/open-marketing';

interface InternalJob extends DiscoveryJobState {
  process?: ChildProcess | null;
  pid?: number | null;
}

export function isDisplayAvailable(): boolean {
  const display = process.env.DISPLAY;
  if (display && display.trim().length > 0) {
    const match = display.match(/:(\d+)/);
    if (match) {
      const socketPath = `/tmp/.X11-unix/X${match[1]}`;
      if (fs.existsSync(socketPath)) {
        return true;
      }
    }
    return true;
  }

  const waylandDisplay = process.env.WAYLAND_DISPLAY;
  if (waylandDisplay && waylandDisplay.trim().length > 0) {
    const runtimeDir = process.env.XDG_RUNTIME_DIR || `/run/user/${process.getuid ? process.getuid() : 1000}`;
    const waylandSocket = path.join(runtimeDir, waylandDisplay.trim());
    try {
      if (fs.existsSync(waylandSocket)) {
        return true;
      }
    } catch (e) {}
  }

  return false;
}

let activeJob: InternalJob = {
  jobId: null,
  status: 'IDLE',
  category: '',
  area: '',
  city: '',
  startTime: null,
  endTime: null,
  elapsedSeconds: 0,
  logs: [],
  counters: {
    discoveredCount: 0,
    processedCount: 0,
    qualifiedCount: 0,
    errorCount: 0,
  },
  error: null,
  command: '',
  headless: true,
  browserMode: 'headless',
};

let tickerInterval: NodeJS.Timeout | null = null;

function startTicker() {
  if (tickerInterval) clearInterval(tickerInterval);
  tickerInterval = setInterval(() => {
    if (activeJob.status === 'RUNNING' || activeJob.status === 'STOPPING') {
      if (activeJob.startTime) {
        activeJob.elapsedSeconds = Math.floor((Date.now() - activeJob.startTime) / 1000);
      }
    } else {
      if (tickerInterval) {
        clearInterval(tickerInterval);
        tickerInterval = null;
      }
    }
  }, 1000);
}

function parseLogChunk(text: string) {
  // Extract real discovered count
  const discoveredMatch = text.match(/Unique businesses discovered\s*:\s*(\d+)/i) ||
                          text.match(/TOTAL UNIQUE BUSINESSES\s*:\s*(\d+)/i) ||
                          text.match(/Raw items found\s*:\s*(\d+)/i);
  if (discoveredMatch) {
    activeJob.counters.discoveredCount = parseInt(discoveredMatch[1], 10);
  }

  // Extract real qualified count
  const qualMatch = text.match(/High-Priority Qualified Leads\s*:\s*(\d+)/i) ||
                    text.match(/Qualified Customer Leads\s*:\s*(\d+)/i);
  if (qualMatch) {
    activeJob.counters.qualifiedCount = parseInt(qualMatch[1], 10);
  }

  // Count audited websites / processed leads
  const processedMatch = text.match(/Websites Successfully Audited\s*:\s*(\d+)/i);
  if (processedMatch) {
    activeJob.counters.processedCount = parseInt(processedMatch[1], 10);
  }

  if (text.includes('[STDERR]') || text.toLowerCase().includes('fatal execution error')) {
    activeJob.counters.errorCount++;
  }
}

export function getActiveDiscoveryJob(): DiscoveryJobState {
  if (activeJob.status === 'RUNNING' || activeJob.status === 'STOPPING') {
    if (activeJob.startTime) {
      activeJob.elapsedSeconds = Math.floor((Date.now() - activeJob.startTime) / 1000);
    }
  }
  const { process: _proc, pid: _pid, ...publicState } = activeJob;
  return publicState;
}

export async function startDiscoveryJob(params: {
  category: string;
  area: string;
  city?: string;
  browserMode?: BrowserExecutionMode;
}): Promise<DiscoveryJobState> {
  if (activeJob.status === 'RUNNING' || activeJob.status === 'STOPPING') {
    throw new Error('A discovery process is already running. Please wait or stop it first.');
  }

  const category = params.category.trim();
  const area = params.area.trim();
  const city = (params.city || 'Madurai').trim();

  // Validate browserMode
  let browserMode: BrowserExecutionMode = 'headless';
  if (params.browserMode !== undefined && params.browserMode !== null) {
    const rawMode = String(params.browserMode).toLowerCase().trim();
    if (rawMode === 'headed' || rawMode === 'headless') {
      browserMode = rawMode;
    } else {
      throw new Error(`Invalid browserMode "${params.browserMode}". Only "headless" and "headed" are accepted.`);
    }
  }

  // Display environment safety check for headed mode
  if (browserMode === 'headed') {
    if (!isDisplayAvailable()) {
      throw new Error(
        'Cannot start discovery in Headed Mode: No active graphical display or virtual display (such as X11 $DISPLAY or Xvfb) was detected in the environment. Please run in Headless Mode or configure Xvfb.'
      );
    }
  }

  const isHeadless = browserMode === 'headless';

  if (!category || !area) {
    throw new Error('Category and Area are required to start discovery.');
  }

  const sanitizeRegex = /^[a-zA-Z0-9\s.,\-_&]+$/;
  if (!sanitizeRegex.test(category) || !sanitizeRegex.test(area) || !sanitizeRegex.test(city)) {
    throw new Error('Input contains disallowed characters. Only alphanumeric, spaces, and punctuation allowed.');
  }

  const openMarketingRoot = path.resolve(process.cwd(), 'open marketing ');
  const jobId = `disc-${Date.now()}`;
  const command = `npm run discover -- --category "${category}" --area "${area}" --city "${city}" --browser-mode ${browserMode}`;

  activeJob = {
    jobId,
    status: 'RUNNING',
    category,
    area,
    city,
    startTime: Date.now(),
    endTime: null,
    elapsedSeconds: 0,
    logs: [
      `[${new Date().toISOString()}] Job initialized (${jobId})`,
      `[CONFIG] Category: "${category}" | Area: "${area}" | City: "${city}"`,
      isHeadless
        ? `[MODE] Playwright background headless execution enabled (HEADLESS=true)`
        : `[MODE] Playwright headed browser execution enabled (visible Chromium window)`,
      `[COMMAND] ${command}`,
    ],
    counters: {
      discoveredCount: 0,
      processedCount: 0,
      qualifiedCount: 0,
      errorCount: 0,
    },
    error: null,
    command,
    headless: isHeadless,
    browserMode,
  };

  startTicker();

  try {
    const childArgs = ['run', 'discover', '--', '--category', category, '--area', area, '--city', city, '--browser-mode', browserMode];
    if (isHeadless) {
      childArgs.push('--headless');
    } else {
      childArgs.push('--headed');
    }

    const child = spawn(
      'npm',
      childArgs,
      {
        cwd: openMarketingRoot,
        env: {
          ...process.env,
          HEADLESS: isHeadless ? 'true' : 'false',
          PW_HEADLESS: isHeadless ? 'true' : 'false',
        },
      }
    );

    activeJob.process = child;
    activeJob.pid = child.pid || null;

    if (child.pid) {
      activeJob.logs.push(`[SYSTEM] Background child process spawned (PID: ${child.pid})`);
    }

    child.stdout.on('data', (data) => {
      const text = data.toString();
      parseLogChunk(text);
      const lines = text.split('\n').filter((l: string) => l.trim().length > 0);
      lines.forEach((line: string) => {
        activeJob.logs.push(line);
      });
      if (activeJob.logs.length > 300) {
        activeJob.logs = activeJob.logs.slice(-300);
      }
    });

    child.stderr.on('data', (data) => {
      const text = data.toString();
      parseLogChunk(text);
      const lines = text.split('\n').filter((l: string) => l.trim().length > 0);
      lines.forEach((line: string) => {
        activeJob.logs.push(`[STDERR] ${line}`);
      });
      if (activeJob.logs.length > 300) {
        activeJob.logs = activeJob.logs.slice(-300);
      }
    });

    child.on('error', (err) => {
      activeJob.status = 'FAILED';
      activeJob.error = err.message;
      activeJob.endTime = Date.now();
      activeJob.logs.push(`[FATAL ERROR] Process spawn error: ${err.message}`);
    });

    child.on('close', (code, signal) => {
      activeJob.endTime = Date.now();
      activeJob.process = null;
      activeJob.pid = null;

      if (activeJob.status === 'STOPPING') {
        activeJob.status = 'STOPPED';
        activeJob.logs.push(`[STOPPED] Discovery process terminated cleanly by user.`);
      } else if (code === 0) {
        activeJob.status = 'COMPLETED';
        activeJob.logs.push(`[COMPLETED] Discovery finished successfully with code 0.`);
        // Auto trigger backend sync
        fetch('http://127.0.0.1:3001/api/sync', { method: 'POST' }).catch((err) => {
          console.warn('Post-discovery auto-sync failed:', err.message);
        });
      } else {
        activeJob.status = 'FAILED';
        activeJob.error = `Process exited with code ${code} (${signal || 'terminated'})`;
        activeJob.logs.push(`[EXIT] Discovery process ended with code ${code}.`);
      }
    });

    return getActiveDiscoveryJob();
  } catch (err: any) {
    activeJob.status = 'FAILED';
    activeJob.error = err.message;
    activeJob.endTime = Date.now();
    activeJob.logs.push(`[ERROR] Failed to start discovery: ${err.message}`);
    throw err;
  }
}

export async function stopDiscoveryJob(): Promise<DiscoveryJobState> {
  if (activeJob.status !== 'RUNNING' && activeJob.status !== 'STOPPING') {
    return getActiveDiscoveryJob();
  }

  activeJob.status = 'STOPPING';
  activeJob.logs.push(`[STOPPING] User triggered STOP. Sending SIGTERM to process PID ${activeJob.pid}...`);

  const proc = activeJob.process;
  if (proc && proc.pid) {
    try {
      proc.kill('SIGTERM');
    } catch (e: any) {
      console.warn('SIGTERM error:', e.message);
    }

    // Safeguard force-kill fallback after 4 seconds
    setTimeout(() => {
      if (activeJob.status === 'STOPPING' && activeJob.process) {
        try {
          activeJob.process.kill('SIGKILL');
        } catch (e) {}
        activeJob.status = 'STOPPED';
        activeJob.endTime = Date.now();
        activeJob.logs.push(`[STOPPED] Process force-terminated to release all system resources.`);
      }
    }, 4000);
  } else {
    activeJob.status = 'STOPPED';
    activeJob.endTime = Date.now();
  }

  return getActiveDiscoveryJob();
}
