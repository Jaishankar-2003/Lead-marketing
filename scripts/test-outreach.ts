import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

// Load local .env if running directly via sucrase-node so env parity matches Next.js server
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
import {
  buildWhatsAppUrl,
  buildWhatsAppWebUrl,
  extractLeadEmails,
  extractLeadPhones,
  isValidEmail,
  normalizeWhatsAppPhone,
  renderTemplate,
} from '../src/lib/outreach-utils';
import {
  checkRateLimit,
  createUnsubscribeToken,
  sanitizeErrorMessage,
  verifyUnsubscribeToken,
} from '../src/lib/outreach-security';
import { SmtpEmailProvider } from '../src/outreach/email-provider';
import {
  openPersistentWhatsAppChat,
  resolveSafeProfileDir,
  setWhatsAppLauncherForTesting,
} from '../src/outreach/whatsapp-session';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';

async function apiJson(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function runUnitTests() {
  console.log('1. Running Outreach Utility & Security Unit Tests...');

  // Email validation & extraction
  assert.equal(isValidEmail('owner@example.com'), true);
  assert.equal(isValidEmail('bad-email'), false);
  assert.equal(isValidEmail('logo@2x.png'), false);

  const emailAudit = extractLeadEmails({
    email: 'Owner@Business.IN',
    enrichedEmail: 'owner@business.in, not-an-email, sales@business.in',
  });
  assert.deepEqual(emailAudit.valid, ['owner@business.in', 'sales@business.in']);
  assert.deepEqual(emailAudit.invalid, ['not-an-email']);

  // Indian & E.164 WhatsApp normalization
  assert.equal(normalizeWhatsAppPhone('9876543210'), '919876543210');
  assert.equal(normalizeWhatsAppPhone('098765 43210'), '919876543210');
  assert.equal(normalizeWhatsAppPhone('+91-98765-43210'), '919876543210');
  assert.equal(normalizeWhatsAppPhone('0452 2530000'), null); // Landline rejected for WhatsApp
  assert.equal(normalizeWhatsAppPhone('+1 (415) 555-2671'), '14155552671');
  assert.equal(normalizeWhatsAppPhone('12345'), null);

  const landlineAudit = extractLeadPhones({ phone: '0452 2530000' });
  assert.equal(landlineAudit.rawPhones.length, 1); // Preserved for tel: Call action
  assert.equal(landlineAudit.whatsappPhones.length, 0);

  const phoneAudit = extractLeadPhones({
    phone: '9876543210',
    enrichedPhone: '+91 98765 43210, 9123456789',
  });
  assert.equal(phoneAudit.whatsappPhones.length, 2);

  const waUrl = buildWhatsAppUrl('919876543210', 'Hello Madurai Shop!');
  assert.equal(waUrl, 'https://wa.me/919876543210?text=Hello%20Madurai%20Shop!');

  // Placeholder rendering without undefined/null/broken tokens
  const renderedFull = renderTemplate(
    'Hi {{contactName}} at {{businessName}} ({{city}}) {{website}} {{email}} {{phone}} - {{serviceName}} {{unknownVar}}',
    {
      businessName: 'Madurai Tech',
      contactName: 'Karthik',
      city: 'Madurai',
      website: 'https://maduraitech.in',
      email: 'hi@maduraitech.in',
      phone: '9876543210',
      serviceProspect: 'WEBSITE_DEV',
    }
  );
  assert(!renderedFull.includes('undefined'));
  assert(!renderedFull.includes('null'));
  assert(!renderedFull.includes('{{'));
  assert(renderedFull.includes('Karthik'));
  assert(renderedFull.includes('Website Design & Development'));

  const renderedSparse = renderTemplate(
    'Hi {{contactName}}, calling {{businessName}} in {{city}} {{website}}',
    {
      businessName: 'Solo Bakery',
      contactName: null,
      city: null,
      website: null,
    }
  );
  assert(!renderedSparse.includes('undefined'));
  assert(!renderedSparse.includes('null'));
  assert(!renderedSparse.includes('{{'));
  assert(renderedSparse.includes('Solo Bakery'));

  // Signed HMAC unsubscribe tokens
  const token = createUnsubscribeToken('lead_123', 'test@example.com');
  const verified = verifyUnsubscribeToken(token);
  assert.deepEqual(verified, { leadId: 'lead_123', email: 'test@example.com' });
  assert.equal(verifyUnsubscribeToken(`${token}tampered`), null);

  // Rate limiter
  const bucket = `test-bucket-${Date.now()}`;
  assert.equal(checkRateLimit(bucket, 2, 10_000).allowed, true);
  assert.equal(checkRateLimit(bucket, 2, 10_000).allowed, true);
  assert.equal(checkRateLimit(bucket, 2, 10_000).allowed, false);

  // Error sanitization
  const sanitized = sanitizeErrorMessage(new Error('auth failed password=supersecretvalue123'));
  assert(!sanitized.includes('supersecretvalue123'));

  // SMTP graceful unconfigured behavior
  const smtp = new SmtpEmailProvider();
  const status = smtp.getConfigStatus();
  assert.equal(typeof status.configured, 'boolean');

  // Persistent WhatsApp Web URL & Profile Safety Tests
  assert.equal(
    buildWhatsAppWebUrl('919876543210', 'Hi Shop'),
    'https://web.whatsapp.com/send?phone=919876543210&text=Hi%20Shop'
  );
  const prevProfileEnv = process.env.WHATSAPP_PROFILE_DIR;
  const prevModeEnv = process.env.WHATSAPP_SESSION_MODE;
  try {
    const safeDir = resolveSafeProfileDir();
    assert(safeDir.endsWith('.whatsapp-profile'));
    process.env.WHATSAPP_PROFILE_DIR = 'public/bad-profile';
    assert.throws(() => resolveSafeProfileDir(), /unsafe application folder/i);
    delete process.env.WHATSAPP_PROFILE_DIR;

    // Mock persistent browser lifecycle: 1st launch -> reuse 2nd/3rd -> concurrent serialization -> close recovery -> external fallback
    let launchCount = 0;
    let alive = false;
    const navigatedUrls: string[] = [];
    const closeListeners: Array<() => void> = [];

    const createMockPage = () => {
      let pageClosed = false;
      return {
        isClosed: () => pageClosed || !alive,
        on: () => {},
        goto: async (url: string) => {
          navigatedUrls.push(url);
        },
        bringToFront: async () => {},
        waitForTimeout: async () => {},
        locator: () => ({
          first: () => ({ isVisible: async () => false }),
          innerText: async () => 'Chats',
        }),
      };
    };

    let mockPage = createMockPage();
    setWhatsAppLauncherForTesting(async (userDataDir) => {
      assert.equal(userDataDir, safeDir);
      launchCount += 1;
      alive = true;
      mockPage = createMockPage();
      return {
        pages: () => {
          if (!alive) throw new Error('Context closed');
          return [mockPage as any];
        },
        newPage: async () => mockPage as any,
        on: (evt: string, fn: () => void) => {
          if (evt === 'close') closeListeners.push(fn);
        },
      } as any;
    });

    process.env.WHATSAPP_SESSION_MODE = 'auto';

    // Customer 1 -> launches persistent browser once
    const chat1 = await openPersistentWhatsAppChat('919800000001', 'Msg 1');
    assert.equal(chat1.mode, 'persistent_browser');
    assert.equal(chat1.reusedSession, false);
    assert.equal(launchCount, 1);

    // Customer 2 & 3 -> reuse SAME browser context without launching a 2nd Chromium process
    const chat2 = await openPersistentWhatsAppChat('919800000002', 'Msg 2');
    const chat3 = await openPersistentWhatsAppChat('919800000003', 'Msg 3');
    assert.equal(chat2.reusedSession, true);
    assert.equal(chat3.reusedSession, true);
    assert.equal(launchCount, 1);
    assert.equal(navigatedUrls.length, 3);
    assert(navigatedUrls[1].includes('phone=919800000002'));
    assert(navigatedUrls[2].includes('phone=919800000003'));

    // Concurrent calls share serialized queue -> still only 1 browser instance
    await Promise.all([
      openPersistentWhatsAppChat('919800000004', 'Concurrent 1'),
      openPersistentWhatsAppChat('919800000005', 'Concurrent 2'),
    ]);
    assert.equal(launchCount, 1);

    // Unexpected browser closure recovery -> cleanly relaunches using the same profileDir
    alive = false;
    closeListeners.forEach((fn) => fn());
    const chat6 = await openPersistentWhatsAppChat('919800000006', 'Recovered');
    assert.equal(chat6.mode, 'persistent_browser');
    assert.equal(chat6.reusedSession, false);
    assert.equal(launchCount, 2);

    // External mode fallback -> preserves external click-to-chat URL without launching Chromium
    process.env.WHATSAPP_SESSION_MODE = 'external';
    const ext = await openPersistentWhatsAppChat('919800000007', 'External');
    assert.equal(ext.mode, 'external_fallback');
    assert(ext.targetUrl.startsWith('https://web.whatsapp.com/send?phone=919800000007'));
  } finally {
    setWhatsAppLauncherForTesting(undefined);
    if (prevProfileEnv !== undefined) process.env.WHATSAPP_PROFILE_DIR = prevProfileEnv;
    else delete process.env.WHATSAPP_PROFILE_DIR;
    if (prevModeEnv !== undefined) process.env.WHATSAPP_SESSION_MODE = prevModeEnv;
    else delete process.env.WHATSAPP_SESSION_MODE;
  }

  console.log('   ✔ Unit tests passed.');
}

async function runApiIntegrationTests() {
  console.log('2. Running Outreach REST API Integration Tests...');

  const suffix = Date.now();
  const createdLeadIds: string[] = [];
  let customTemplateId: string | null = null;
  let dupTemplateId: string | null = null;

  try {
    // A. Templates GET (seeds defaults) + POST + PATCH + Duplicate + DELETE
    const tplList = await apiJson('/api/outreach/templates');
    assert.equal(tplList.status, 200);
    assert.equal(tplList.data.success, true);
    assert(tplList.data.templates.length >= 7, 'Default templates should seed automatically');

    const tplCreate = await apiJson('/api/outreach/templates', {
      method: 'POST',
      body: JSON.stringify({
        name: `E2E Outreach Template ${suffix}`,
        category: 'SEO Improvement',
        subject: 'SEO audit for {{businessName}}',
        body: 'Hello {{contactName}} in {{city}}',
        isDefault: false,
      }),
    });
    assert.equal(tplCreate.status, 201);
    customTemplateId = tplCreate.data.template.id;

    const tplDup = await apiJson(`/api/outreach/templates/${customTemplateId}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'duplicate' }),
    });
    assert.equal(tplDup.status, 201);
    dupTemplateId = tplDup.data.template.id;

    // B. SMTP Status never exposes secrets
    const smtpRes = await apiJson('/api/outreach/smtp');
    assert.equal(smtpRes.status, 200);
    assert.equal(smtpRes.data.success, true);
    assert.equal('password' in smtpRes.data.smtp, false);

    // C. Create 4 test leads covering all contact archetypes + opt-out
    const tail = String(suffix).slice(-6);
    const leadPayloads = [
      {
        businessName: `Outreach Alpha ${suffix}`,
        email: `alpha-${suffix}@example.com`,
        phone: `9801${tail}`,
        city: 'Madurai',
      },
      {
        businessName: `Outreach Missing ${suffix}`,
        phone: `9802${tail}`,
        city: 'Madurai',
      },
      {
        businessName: `Outreach DupEmail ${suffix}`,
        email: `alpha-${suffix}@example.com`,
        city: 'Madurai',
      },
      {
        businessName: `Outreach OptedOut ${suffix}`,
        email: `optedout-${suffix}@example.com`,
        phone: `9803${tail}`,
        city: 'Madurai',
      },
    ];

    for (const payload of leadPayloads) {
      const created = await apiJson('/api/leads', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      assert(created.status === 200 || created.status === 201, `Expected 200/201 creating ${payload.businessName}, got ${created.status}`);
      assert.equal(created.data.success, true, `Expected success creating ${payload.businessName}`);
      createdLeadIds.push(created.data.data.id);
    }

    const [alphaId, missingId, dupId, optedOutId] = createdLeadIds;

    // Mark lead #4 opted out via API
    const optOutRes = await apiJson(`/api/leads/${optedOutId}/opt-out`, {
      method: 'POST',
      body: JSON.stringify({ doNotContact: true, reason: 'E2E opt-out test' }),
    });
    assert.equal(optOutRes.status, 200);
    assert.equal(optOutRes.data.lead.doNotContact, true);

    // D. Bulk Recipient Audit Preview
    const auditRes = await apiJson('/api/outreach/campaigns/preview', {
      method: 'POST',
      body: JSON.stringify({
        leadIds: createdLeadIds,
        channel: 'EMAIL',
        subject: 'Proposal for {{businessName}}',
        body: 'Hi {{contactName}} in {{city}}',
      }),
    });
    assert.equal(auditRes.status, 200);
    assert.equal(auditRes.data.summary.selectedCount, 4);
    assert.equal(auditRes.data.summary.eligibleCount, 1);
    assert.equal(auditRes.data.summary.missingCount, 1);
    assert.equal(auditRes.data.summary.duplicateCount, 1);
    assert.equal(auditRes.data.summary.optedOutCount, 1);
    assert.equal(auditRes.data.samples.length, 1);
    assert.equal(auditRes.data.samples[0].recipient, `alpha-${suffix}@example.com`);
    assert(auditRes.data.samples[0].subject.startsWith('Proposal for Outreach '));

    // E. Single Email Send requires confirmation + respects unconfigured SMTP / opt-out safely
    const noConfirmRes = await apiJson('/api/outreach/email/send', {
      method: 'POST',
      body: JSON.stringify({
        leadId: alphaId,
        to: `alpha-${suffix}@example.com`,
        subject: 'Hello',
        body: 'Body',
        confirmed: false,
      }),
    });
    assert.equal(noConfirmRes.status, 400);

    const optOutBlockedRes = await apiJson('/api/outreach/email/send', {
      method: 'POST',
      body: JSON.stringify({
        leadId: optedOutId,
        to: `optedout-${suffix}@example.com`,
        subject: 'Hello',
        body: 'Body',
        confirmed: true,
      }),
    });
    assert.equal(optOutBlockedRes.status, 403);

    if (!smtpRes.data.smtp.configured) {
      const uncfgSend = await apiJson('/api/outreach/email/send', {
        method: 'POST',
        body: JSON.stringify({
          leadId: alphaId,
          to: `alpha-${suffix}@example.com`,
          subject: 'Hello',
          body: 'Body',
          confirmed: true,
        }),
      });
      assert.equal(uncfgSend.status, 503);
      assert.equal(uncfgSend.data.unconfigured, true);

      // Lead must NOT have been falsely promoted to CONTACTED
      const alphaCheck = await apiJson(`/api/leads/${alphaId}`);
      assert.equal(alphaCheck.data.data.crmStatus, 'NEW');
      assert.equal(alphaCheck.data.data.lastContactedAt, null);
    }

    // F. WhatsApp flow: /open validates phone & opt-out, logs OPENED without promoting CRM; WHATSAPP_CONFIRMED_SENT promotes CRM
    const badWaOpen = await apiJson('/api/outreach/whatsapp/open', {
      method: 'POST',
      body: JSON.stringify({
        leadId: alphaId,
        phone: '123',
        message: 'Invalid phone check',
      }),
    });
    assert.equal(badWaOpen.status, 400);

    const optOutWaOpen = await apiJson('/api/outreach/whatsapp/open', {
      method: 'POST',
      body: JSON.stringify({
        leadId: optedOutId,
        phone: '9988776655',
        message: 'Opted out check',
      }),
    });
    assert.equal(optOutWaOpen.status, 403);

    const waOpenSession = await apiJson('/api/outreach/whatsapp/open', {
      method: 'POST',
      body: JSON.stringify({
        leadId: alphaId,
        phone: `9801${tail}`,
        message: 'Persistent session open test',
      }),
    });
    assert.equal(waOpenSession.status, 200);
    assert.equal(waOpenSession.data.success, true);
    assert(waOpenSession.data.targetUrl.startsWith(`https://web.whatsapp.com/send?phone=919801${tail}`));

    // Confirm lead CRM status is STILL NEW (opening chat must NEVER mark sent)
    const alphaAfterOpen = await apiJson(`/api/leads/${alphaId}`);
    assert.equal(alphaAfterOpen.data.data.crmStatus, 'NEW');
    assert.equal(alphaAfterOpen.data.data.lastContactedAt, null);

    // Log endpoint compatibility check
    const waOpen = await apiJson('/api/outreach/whatsapp/log', {
      method: 'POST',
      body: JSON.stringify({
        leadId: alphaId,
        action: 'WHATSAPP_OPENED',
        recipient: `+919801${tail}`,
        message: 'Test intro',
      }),
    });
    assert.equal(waOpen.status, 200);
    assert.equal(waOpen.data.crmUpdated, false);
    assert.equal(waOpen.data.lead.crmStatus, 'NEW');

    const waConfirm = await apiJson('/api/outreach/whatsapp/log', {
      method: 'POST',
      body: JSON.stringify({
        leadId: alphaId,
        action: 'WHATSAPP_CONFIRMED_SENT',
        recipient: `+919801${tail}`,
        message: 'Test intro',
      }),
    });
    assert.equal(waConfirm.status, 200);
    assert.equal(waConfirm.data.crmUpdated, true);
    assert.equal(waConfirm.data.lead.crmStatus, 'CONTACTED');
    assert(waConfirm.data.lead.lastContactedAt);

    // G. Follow-up scheduling (past due -> appears in OVERDUE) + completion + Lead filter
    const pastDate = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    const fuCreate = await apiJson('/api/outreach/follow-ups', {
      method: 'POST',
      body: JSON.stringify({
        leadId: alphaId,
        dueAt: pastDate,
        notes: 'E2E overdue follow-up test',
      }),
    });
    assert.equal(fuCreate.status, 201);
    const fuId = fuCreate.data.followUp.id;

    const overdueLeadSearch = await apiJson('/api/leads?followUp=overdue&limit=100');
    assert.equal(overdueLeadSearch.status, 200);
    assert(overdueLeadSearch.data.data.some((l: any) => l.id === alphaId));

    const fuComplete = await apiJson(`/api/outreach/follow-ups/${fuId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'COMPLETED' }),
    });
    assert.equal(fuComplete.status, 200);
    assert.equal(fuComplete.data.followUp.status, 'COMPLETED');

    // H. Unsubscribe endpoint via signed token
    const unsubToken = createUnsubscribeToken(missingId, 'missing@example.com');
    const unsubRes = await apiJson(`/api/outreach/unsubscribe?token=${encodeURIComponent(unsubToken)}`);
    assert.equal(unsubRes.status, 200);
    assert.equal(unsubRes.data.unsubscribed, true);

    const missingCheck = await apiJson(`/api/leads/${missingId}`);
    assert.equal(missingCheck.data.data.doNotContact, true);

    // I. Analytics endpoint responds cleanly
    const analyticsRes = await apiJson('/api/outreach/analytics');
    assert.equal(analyticsRes.status, 200);
    assert.equal(analyticsRes.data.success, true);
    assert(typeof analyticsRes.data.analytics.whatsappConfirmedSent === 'number');

    console.log('   ✔ API integration tests passed.');
  } finally {
    // Cleanup all test artifacts so real database records remain pristine
    if (createdLeadIds.length > 0) {
      await apiJson('/api/leads', {
        method: 'DELETE',
        body: JSON.stringify({ ids: createdLeadIds }),
      }).catch(() => {});
    }
    if (dupTemplateId) {
      await apiJson(`/api/outreach/templates/${dupTemplateId}`, { method: 'DELETE' }).catch(() => {});
    }
    if (customTemplateId) {
      await apiJson(`/api/outreach/templates/${customTemplateId}`, { method: 'DELETE' }).catch(() => {});
    }
  }
}

async function main() {
  await runUnitTests();
  await runApiIntegrationTests();
  console.log('\n✅ ALL OUTREACH TESTS PASSED!');
}

main().catch((err) => {
  console.error('\n❌ OUTREACH TEST FAILED:', err);
  process.exit(1);
});

