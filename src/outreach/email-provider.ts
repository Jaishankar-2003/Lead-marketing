import nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { sanitizeErrorMessage } from '../lib/outreach-security';

export interface EmailSendPayload {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  unsubscribeUrl?: string;
  headers?: Record<string, string>;
}

export interface EmailSendResult {
  success: boolean;
  provider: string;
  messageId?: string;
  accepted?: string[];
  rejected?: string[];
  errorCode?: string;
  errorMessage?: string;
  isTemporary?: boolean;
  isAuthError?: boolean;
  isQuotaError?: boolean;
  unconfigured?: boolean;
}

export interface SmtpConfigStatus {
  configured: boolean;
  provider: string;
  host: string;
  port: number;
  secure: boolean;
  from: string;
  userMasked: string | null;
  hasPassword: boolean;
  missingVars: string[];
}

export interface SmtpVerifyResult {
  configured: boolean;
  connected: boolean;
  provider: string;
  host: string;
  port: number;
  secure: boolean;
  from: string;
  userMasked: string | null;
  error?: string;
  hint?: string;
  missingVars: string[];
}

export interface EmailProvider {
  readonly name: string;
  getConfigStatus(): SmtpConfigStatus;
  verifyConnection(): Promise<SmtpVerifyResult>;
  sendEmail(payload: EmailSendPayload): Promise<EmailSendResult>;
}

function maskEmailOrUser(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const atIndex = trimmed.indexOf('@');
  if (atIndex > 1) {
    const local = trimmed.slice(0, atIndex);
    const domain = trimmed.slice(atIndex + 1);
    const visible = local.slice(0, Math.min(2, local.length));
    return `${visible}***@${domain}`;
  }
  if (trimmed.length <= 3) return '***';
  return `${trimmed.slice(0, 2)}***${trimmed.slice(-1)}`;
}

function parseBooleanEnv(val: string | undefined, fallback: boolean): boolean {
  if (val === undefined) return fallback;
  const norm = val.trim().toLowerCase();
  if (norm === 'true' || norm === '1' || norm === 'yes') return true;
  if (norm === 'false' || norm === '0' || norm === 'no') return false;
  return fallback;
}

function classifySmtpError(err: unknown): {
  errorCode: string;
  errorMessage: string;
  isTemporary: boolean;
  isAuthError: boolean;
  isQuotaError: boolean;
  hint?: string;
} {
  const anyErr = err as { code?: string; responseCode?: number; message?: string; response?: string };
  const rawMessage = sanitizeErrorMessage(err);
  const combined = `${anyErr?.code || ''} ${anyErr?.responseCode || ''} ${anyErr?.response || ''} ${rawMessage}`.toLowerCase();

  const isAuthError =
    anyErr?.responseCode === 535 ||
    anyErr?.code === 'EAUTH' ||
    combined.includes('535') ||
    combined.includes('username and password not accepted') ||
    combined.includes('invalid login') ||
    combined.includes('authentication failed') ||
    combined.includes('badcredentials');

  if (isAuthError) {
    return {
      errorCode: 'SMTP_AUTH_FAILED',
      errorMessage:
        'Gmail/SMTP authentication failed. Verify SMTP_USER and ensure SMTP_PASSWORD is a valid 16-character Google App Password (regular account passwords are rejected).',
      isTemporary: false,
      isAuthError: true,
      isQuotaError: false,
      hint: 'Enable 2-Step Verification on Google Account, generate a 16-character App Password, and set SMTP_PASSWORD in .env.',
    };
  }

  const isQuotaError =
    combined.includes('daily user sending quota exceeded') ||
    combined.includes('550 5.4.5') ||
    combined.includes('sending limit') ||
    combined.includes('rate limit') ||
    combined.includes('too many') ||
    anyErr?.responseCode === 421 ||
    anyErr?.responseCode === 454;

  if (isQuotaError) {
    return {
      errorCode: 'SMTP_QUOTA_OR_RATE_LIMIT',
      errorMessage: 'SMTP sending limit or rate threshold reached. Pause sending and retry later.',
      isTemporary: true,
      isAuthError: false,
      isQuotaError: true,
      hint: 'Reduce batch size or increase interval between sends.',
    };
  }

  const isTemporary =
    anyErr?.code === 'ETIMEDOUT' ||
    anyErr?.code === 'ECONNRESET' ||
    anyErr?.code === 'ECONNREFUSED' ||
    anyErr?.code === 'ESOCKET' ||
    anyErr?.code === 'EDNS' ||
    (typeof anyErr?.responseCode === 'number' && anyErr.responseCode >= 400 && anyErr.responseCode < 500);

  return {
    errorCode: anyErr?.code || (anyErr?.responseCode ? `SMTP_${anyErr.responseCode}` : 'SMTP_SEND_ERROR'),
    errorMessage: rawMessage,
    isTemporary,
    isAuthError: false,
    isQuotaError: false,
  };
}

export class SmtpEmailProvider implements EmailProvider {
  readonly name = 'gmail_smtp';

  private readEnvConfig() {
    const provider = (process.env.EMAIL_PROVIDER || 'gmail_smtp').trim() || 'gmail_smtp';
    const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
    const portParsed = Number(process.env.SMTP_PORT || '587');
    const port = Number.isFinite(portParsed) && portParsed > 0 ? portParsed : 587;
    const secure = parseBooleanEnv(process.env.SMTP_SECURE, port === 465);
    const user = (process.env.SMTP_USER || '').trim();
    const pass = (process.env.SMTP_PASSWORD || '').replace(/\s+/g, '');
    const from = (process.env.EMAIL_FROM || user || '').trim();

    const missingVars: string[] = [];
    if (!host) missingVars.push('SMTP_HOST');
    if (!user) missingVars.push('SMTP_USER');
    if (!pass) missingVars.push('SMTP_PASSWORD');
    if (!from) missingVars.push('EMAIL_FROM');

    return {
      provider,
      host,
      port,
      secure,
      user,
      pass,
      from,
      missingVars,
      configured: missingVars.length === 0,
    };
  }

  getConfigStatus(): SmtpConfigStatus {
    const cfg = this.readEnvConfig();
    return {
      configured: cfg.configured,
      provider: cfg.provider,
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      from: cfg.from,
      userMasked: maskEmailOrUser(cfg.user),
      hasPassword: Boolean(cfg.pass),
      missingVars: cfg.missingVars,
    };
  }

  private createTransporter(portOverride?: number, secureOverride?: boolean) {
    const cfg = this.readEnvConfig();
    const port = portOverride ?? cfg.port;
    const secure = secureOverride ?? cfg.secure;

    const options: SMTPTransport.Options = {
      host: cfg.host,
      port,
      secure,
      requireTLS: !secure && port === 587,
      auth: {
        user: cfg.user,
        pass: cfg.pass,
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
    };

    return nodemailer.createTransport(options);
  }

  async verifyConnection(): Promise<SmtpVerifyResult> {
    const cfg = this.readEnvConfig();
    const base: Omit<SmtpVerifyResult, 'connected'> = {
      configured: cfg.configured,
      provider: cfg.provider,
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      from: cfg.from,
      userMasked: maskEmailOrUser(cfg.user),
      missingVars: cfg.missingVars,
    };

    if (!cfg.configured) {
      return {
        ...base,
        connected: false,
        error: `SMTP is not configured. Missing environment variables: ${cfg.missingVars.join(', ')}.`,
        hint: 'Add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD (Google App Password), and EMAIL_FROM to .env and restart the server.',
      };
    }

    try {
      const transporter = this.createTransporter();
      await transporter.verify();
      return {
        ...base,
        connected: true,
      };
    } catch (primaryErr) {
      // If STARTTLS 587 hits a socket/timeout block, try implicit TLS 465 once if configured for smtp.gmail.com
      const primaryInfo = classifySmtpError(primaryErr);
      if (!primaryInfo.isAuthError && cfg.host === 'smtp.gmail.com' && cfg.port === 587) {
        try {
          const fallbackTransporter = this.createTransporter(465, true);
          await fallbackTransporter.verify();
          return {
            ...base,
            port: 465,
            secure: true,
            connected: true,
            hint: 'Connected via TLS port 465 fallback (STARTTLS 587 was unavailable). Consider setting SMTP_PORT=465 and SMTP_SECURE=true.',
          };
        } catch {
          // Fall through and return primary error
        }
      }

      return {
        ...base,
        connected: false,
        error: primaryInfo.errorMessage,
        hint: primaryInfo.hint,
      };
    }
  }

  async sendEmail(payload: EmailSendPayload): Promise<EmailSendResult> {
    const cfg = this.readEnvConfig();
    if (!cfg.configured) {
      return {
        success: false,
        provider: cfg.provider,
        unconfigured: true,
        errorCode: 'SMTP_NOT_CONFIGURED',
        errorMessage: `Email delivery is not configured (missing ${cfg.missingVars.join(', ')}). Configure Gmail SMTP credentials in .env to enable live delivery.`,
        isTemporary: false,
      };
    }

    const headers: Record<string, string> = {
      ...(payload.headers || {}),
    };
    if (payload.unsubscribeUrl) {
      headers['List-Unsubscribe'] = `<${payload.unsubscribeUrl}>`;
      headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
    }

    const mailOptions = {
      from: cfg.from,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
      replyTo: payload.replyTo || cfg.user,
      headers,
    };

    try {
      const transporter = this.createTransporter();
      const info = await transporter.sendMail(mailOptions);
      return {
        success: true,
        provider: cfg.provider,
        messageId: info.messageId,
        accepted: info.accepted?.map(String),
        rejected: info.rejected?.map(String),
      };
    } catch (primaryErr) {
      const classified = classifySmtpError(primaryErr);
      // Fallback to 465 implicit TLS on network/socket issue when targeting Gmail 587
      if (
        classified.isTemporary &&
        !classified.isAuthError &&
        !classified.isQuotaError &&
        cfg.host === 'smtp.gmail.com' &&
        cfg.port === 587
      ) {
        try {
          const fallbackTransporter = this.createTransporter(465, true);
          const info = await fallbackTransporter.sendMail(mailOptions);
          return {
            success: true,
            provider: cfg.provider,
            messageId: info.messageId,
            accepted: info.accepted?.map(String),
            rejected: info.rejected?.map(String),
          };
        } catch (fallbackErr) {
          const fallbackInfo = classifySmtpError(fallbackErr);
          return {
            success: false,
            provider: cfg.provider,
            errorCode: fallbackInfo.errorCode,
            errorMessage: fallbackInfo.errorMessage,
            isTemporary: fallbackInfo.isTemporary,
            isAuthError: fallbackInfo.isAuthError,
            isQuotaError: fallbackInfo.isQuotaError,
          };
        }
      }

      return {
        success: false,
        provider: cfg.provider,
        errorCode: classified.errorCode,
        errorMessage: classified.errorMessage,
        isTemporary: classified.isTemporary,
        isAuthError: classified.isAuthError,
        isQuotaError: classified.isQuotaError,
      };
    }
  }
}

const globalForEmail = globalThis as unknown as {
  emailProviderOverride?: EmailProvider;
};

/**
 * Returns the active email provider (supports test overrides cleanly without mutating prod behavior).
 */
export function getEmailProvider(): EmailProvider {
  if (globalForEmail.emailProviderOverride) {
    return globalForEmail.emailProviderOverride;
  }
  return new SmtpEmailProvider();
}

export function setEmailProviderForTesting(provider?: EmailProvider) {
  globalForEmail.emailProviderOverride = provider;
}

