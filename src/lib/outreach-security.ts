import crypto from 'crypto';

const getSecret = (): string => {
  return process.env.UNSUBSCRIBE_SECRET || process.env.DATABASE_URL || 'leadpilot-local-outreach-secret';
};

export function createUnsubscribeToken(leadId: string, email: string): string {
  const normalized = email.trim().toLowerCase();
  const payload = Buffer.from(`${leadId}:${normalized}`, 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyUnsubscribeToken(token: string): { leadId: string; email: string } | null {
  if (!token || !token.includes('.')) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const decoded = Buffer.from(payload, 'base64url').toString('utf8');
    const sepIdx = decoded.indexOf(':');
    if (sepIdx <= 0) return null;
    const leadId = decoded.slice(0, sepIdx);
    const email = decoded.slice(sepIdx + 1);
    return { leadId, email };
  } catch {
    return null;
  }
}

// Simple server-side sliding-window rate limiter
const rateBuckets = new Map<string, number[]>();

export function checkRateLimit(
  bucketKey: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const cutoff = now - windowMs;
  const timestamps = (rateBuckets.get(bucketKey) || []).filter((t) => t > cutoff);

  if (timestamps.length >= maxRequests) {
    const oldest = timestamps[0] || now;
    rateBuckets.set(bucketKey, timestamps);
    return {
      allowed: false,
      retryAfterMs: Math.max(1000, oldest + windowMs - now),
    };
  }

  timestamps.push(now);
  rateBuckets.set(bucketKey, timestamps);
  return { allowed: true, retryAfterMs: 0 };
}

/**
 * Strips any secret or password values from error messages before returning to UI or storing in logs.
 */
export function sanitizeErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err || 'Unknown error');
  let clean = raw;

  const secretsToRedact = [
    process.env.SMTP_PASSWORD,
    process.env.DATABASE_URL,
    process.env.UNSUBSCRIBE_SECRET,
  ].filter((v): v is string => Boolean(v && v.trim().length > 0));

  for (const secret of secretsToRedact) {
    clean = clean.split(secret).join('[REDACTED]');
  }

  // Mask common SMTP AUTH base64 or key=value password/secret patterns
  clean = clean.replace(/(AUTH\s+(?:PLAIN|LOGIN)\s+)[A-Za-z0-9+/=]+/gi, '$1[REDACTED]');
  clean = clean.replace(/((?:password|pass|secret|token)\s*[:=]\s*)([^\s,;]+)/gi, '$1[REDACTED]');
  return clean;
}

