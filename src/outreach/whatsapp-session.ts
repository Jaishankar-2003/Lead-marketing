import fs from 'fs';
import path from 'path';
import { chromium, BrowserContext, Page } from '@playwright/test';
import { buildWhatsAppWebUrl } from '../lib/outreach-utils';

export type WhatsAppOpenMode = 'persistent_browser' | 'external_fallback';

export interface WhatsAppOpenResult {
  success: boolean;
  mode: WhatsAppOpenMode;
  targetUrl: string;
  normalizedPhone: string;
  reusedSession: boolean;
  needsQrAuth: boolean;
  statusMessage: string;
  fallbackReason?: string;
}

export interface WhatsAppSessionStatus {
  desktopSessionSupported: boolean;
  browserActive: boolean;
  mode: string;
  unsupportedReason?: string;
}

interface InternalSessionState {
  context: BrowserContext | null;
  page: Page | null;
  operationQueue: Promise<unknown>;
  lastUsedAt: number | null;
}

export type PersistentContextLauncher = (
  userDataDir: string
) => Promise<BrowserContext>;

const globalForWhatsApp = globalThis as unknown as {
  __leadpilotWhatsAppSession?: InternalSessionState;
  __leadpilotWhatsAppLauncherOverride?: PersistentContextLauncher;
};

function getSessionState(): InternalSessionState {
  if (!globalForWhatsApp.__leadpilotWhatsAppSession) {
    globalForWhatsApp.__leadpilotWhatsAppSession = {
      context: null,
      page: null,
      operationQueue: Promise.resolve(),
      lastUsedAt: null,
    };
  }
  return globalForWhatsApp.__leadpilotWhatsAppSession;
}

export function setWhatsAppLauncherForTesting(launcher?: PersistentContextLauncher) {
  globalForWhatsApp.__leadpilotWhatsAppLauncherOverride = launcher;
}

export function resolveSafeProfileDir(): string {
  const projectRoot = path.resolve(process.cwd());
  const configured = (process.env.WHATSAPP_PROFILE_DIR || '.whatsapp-profile').trim();
  const resolved = path.isAbsolute(configured)
    ? path.resolve(configured)
    : path.resolve(projectRoot, configured);

  // Never allow profile directory inside publicly served or source directories
  const forbiddenPrefixes = [
    path.resolve(projectRoot, 'public'),
    path.resolve(projectRoot, 'src'),
    path.resolve(projectRoot, '.next'),
  ];
  for (const forbidden of forbiddenPrefixes) {
    if (resolved === forbidden || resolved.startsWith(`${forbidden}${path.sep}`)) {
      throw new Error('Configured WhatsApp profile directory resolves inside an unsafe application folder.');
    }
  }
  if (resolved === path.parse(resolved).root) {
    throw new Error('Configured WhatsApp profile directory cannot be filesystem root.');
  }

  fs.mkdirSync(resolved, { recursive: true });
  return resolved;
}

export function checkDesktopBrowserCapability(): {
  supported: boolean;
  reason?: string;
} {
  const mode = (process.env.WHATSAPP_SESSION_MODE || 'auto').trim().toLowerCase();
  if (mode === 'external') {
    return {
      supported: false,
      reason: 'WHATSAPP_SESSION_MODE is set to external; opening in your browser tab instead.',
    };
  }

  if (globalForWhatsApp.__leadpilotWhatsAppLauncherOverride) {
    return { supported: true };
  }

  if (
    process.platform === 'linux' &&
    !process.env.DISPLAY &&
    !process.env.WAYLAND_DISPLAY
  ) {
    return {
      supported: false,
      reason:
        'No desktop display server detected on this host (remote/headless environment). Opening WhatsApp Web in your local browser tab instead.',
    };
  }

  return { supported: true };
}

async function defaultPersistentLauncher(userDataDir: string): Promise<BrowserContext> {
  const userAgent =
    process.platform === 'win32'
      ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
      : process.platform === 'darwin'
      ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
      : 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

  return chromium.launchPersistentContext(userDataDir, {
    headless: false,
    viewport: null,
    userAgent,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--ozone-platform-hint=auto',
    ],
  });
}

async function isContextAlive(context: BrowserContext | null): Promise<boolean> {
  if (!context) return false;
  try {
    context.pages();
    return true;
  } catch {
    return false;
  }
}

async function detectNeedsQrPassive(page: Page): Promise<boolean> {
  try {
    // Passive non-invasive check only: wait briefly to see if QR prompt renders vs active chat UI
    await page.waitForTimeout(800);
    const hasQr = await page
      .locator('canvas[aria-label*="Scan" i], [data-testid="qrcode"]')
      .first()
      .isVisible({ timeout: 500 })
      .catch(() => false);
    if (hasQr) return true;

    const bodyText = await page
      .locator('body')
      .innerText({ timeout: 500 })
      .catch(() => '');
    const lower = bodyText.toLowerCase();
    return (
      lower.includes('steps to log in') ||
      lower.includes('use whatsapp on your computer') ||
      lower.includes('link with phone number')
    );
  } catch {
    return false;
  }
}

export function getWhatsAppSessionStatus(): WhatsAppSessionStatus {
  const cap = checkDesktopBrowserCapability();
  const state = getSessionState();
  return {
    desktopSessionSupported: cap.supported,
    browserActive: Boolean(state.context),
    mode: (process.env.WHATSAPP_SESSION_MODE || 'auto').trim().toLowerCase(),
    unsupportedReason: cap.reason,
  };
}

/**
 * Opens or reuses a single persistent WhatsApp Web browser session for manual click-to-chat outreach.
 * Never automates message sending or exposes session artifacts.
 */
export async function openPersistentWhatsAppChat(
  normalizedPhone: string,
  message?: string
): Promise<WhatsAppOpenResult> {
  const targetUrl = buildWhatsAppWebUrl(normalizedPhone, message);
  if (!targetUrl) {
    throw new Error('Invalid normalized phone number for WhatsApp Web.');
  }

  const state = getSessionState();

  const runSerialized = async (): Promise<WhatsAppOpenResult> => {
    const cap = checkDesktopBrowserCapability();
    if (!cap.supported) {
      return {
        success: true,
        mode: 'external_fallback',
        targetUrl,
        normalizedPhone,
        reusedSession: false,
        needsQrAuth: false,
        statusMessage:
          cap.reason || 'Opened WhatsApp Web link in your current browser tab.',
        fallbackReason: cap.reason,
      };
    }

    let profileDir: string;
    try {
      profileDir = resolveSafeProfileDir();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Profile directory unavailable.';
      return {
        success: true,
        mode: 'external_fallback',
        targetUrl,
        normalizedPhone,
        reusedSession: false,
        needsQrAuth: false,
        statusMessage: `Persistent browser profile unavailable (${msg}). Opened in external browser fallback.`,
        fallbackReason: msg,
      };
    }

    try {
      const launcher =
        globalForWhatsApp.__leadpilotWhatsAppLauncherOverride || defaultPersistentLauncher;

      let reusedSession = false;
      const alive = await isContextAlive(state.context);

      if (!alive || !state.context) {
        state.context = null;
        state.page = null;
        const context = await launcher(profileDir);
        state.context = context;

        context.on('close', () => {
          const current = getSessionState();
          if (current.context === context) {
            current.context = null;
            current.page = null;
          }
        });
      } else {
        reusedSession = true;
      }

      const activeContext = state.context!;
      let page = state.page;
      if (!page || page.isClosed()) {
        const existingPages = activeContext.pages().filter((p) => !p.isClosed());
        page = existingPages[0] || (await activeContext.newPage());
        state.page = page;
        page.on('close', () => {
          const current = getSessionState();
          if (current.page === page) {
            current.page = null;
          }
        });
      }

      await page.goto(targetUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 25000,
      });

      if (typeof page.bringToFront === 'function') {
        await page.bringToFront().catch(() => {});
      }

      state.lastUsedAt = Date.now();
      const needsQrAuth = await detectNeedsQrPassive(page);

      return {
        success: true,
        mode: 'persistent_browser',
        targetUrl,
        normalizedPhone,
        reusedSession,
        needsQrAuth,
        statusMessage: needsQrAuth
          ? 'WhatsApp Web is waiting for QR authentication. Scan once in the open browser window to link your session.'
          : reusedSession
          ? 'Reused authenticated WhatsApp Web window and navigated to customer chat.'
          : 'Opened WhatsApp Web using your persistent browser profile.',
      };
    } catch (err) {
      // Clear only the in-memory handle; NEVER delete profile directory files
      state.context = null;
      state.page = null;

      const reason =
        err instanceof Error ? err.message : 'Unable to launch persistent WhatsApp browser.';
      const isProfileLocked =
        reason.toLowerCase().includes('processsingleton') ||
        reason.toLowerCase().includes('profile is already in use') ||
        reason.toLowerCase().includes('singletonlock');

      const helpfulReason = isProfileLocked
        ? 'Another Chromium window is currently using the WhatsApp profile. Close any stray WhatsApp browser window or continue in the browser fallback tab.'
        : `Persistent browser window could not be launched (${reason.split('\n')[0]}). Opened in browser tab fallback.`;

      return {
        success: true,
        mode: 'external_fallback',
        targetUrl,
        normalizedPhone,
        reusedSession: false,
        needsQrAuth: false,
        statusMessage: helpfulReason,
        fallbackReason: helpfulReason,
      };
    }
  };

  // Serialize all open operations so concurrent requests never double-launch Chromium against the same profile
  const chained = state.operationQueue.then(runSerialized, runSerialized);
  state.operationQueue = chained.then(
    () => undefined,
    () => undefined
  );
  return chained;
}

