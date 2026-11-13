import { CONFIG } from '../config';
import { LeadScores, ScoreLevel, WebsiteAnalysis, WebsiteStatus } from '../types';

interface ScorableData {
  category?: string;
  websiteUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  websiteStatus: WebsiteStatus;
  websiteAnalysis?: WebsiteAnalysis;
}

/**
 * Calculates evidence-based lead scores for:
 * 1. Website Design & Development opportunities
 * 2. PC Repair & IT Support opportunities
 * 3. Computer Networking & Annual Maintenance Contracts (AMC) opportunities
 */
export function scoreLead(data: ScorableData): LeadScores {
  let webDevScore = 0;
  let pcRepairScore = 0;
  let networkingAmcScore = 0;
  const reasons: string[] = [];

  const cat = (data.category || '').toLowerCase();
  const hasPhone = !!data.phone;
  const hasAddress = !!data.address && data.address.length > 5;
  const analysis = data.websiteAnalysis;

  // ==========================================
  // 1. WEBSITE DEVELOPMENT SCORING (0 - 100)
  // ==========================================
  if (data.websiteStatus === 'VERIFIED_NO_WEBSITE') {
    // Verified local establishment with contact details but confirmed NO website
    webDevScore = 85;
    reasons.push('Verified local business with active contact details operating without an official website');
    if (hasPhone) webDevScore += 5;
  } else if (data.websiteStatus === 'WEBSITE_BROKEN') {
    webDevScore = 80;
    reasons.push('Official website is broken or returning fatal error (Immediate rebuild opportunity)');
  } else if (data.websiteStatus === 'WEBSITE_FOUND' && analysis) {
    webDevScore = 15; // baseline for existing site

    if (!analysis.isMobileFriendly) {
      webDevScore += 25;
      reasons.push('Website lacks responsive mobile viewport (Poor smartphone display)');
    }
    if (!analysis.hasHttps) {
      webDevScore += 20;
      reasons.push('Website lacks SSL / HTTPS encryption (Not Secure in browsers)');
    }
    if (analysis.hasOutdatedIndicators) {
      webDevScore += 20;
      reasons.push(analysis.outdatedReasons[0] || 'Outdated technology or legacy design cues detected');
    }
    if (analysis.responseTimeMs && analysis.responseTimeMs > 4500) {
      webDevScore += 10;
      reasons.push('Slow page loading speed (> 4.5s)');
    }
  } else if (data.websiteStatus === 'WEBSITE_UNAVAILABLE') {
    // Do not assume broken without proof; score conservatively
    webDevScore = 30;
    reasons.push('Website experienced temporary timeout or connection issue (Requires verification)');
  } else {
    // NEEDS_VERIFICATION
    webDevScore = 25;
  }

  webDevScore = Math.min(100, Math.max(0, webDevScore));

  // ==========================================
  // 2. PC REPAIR & IT SUPPORT SCORING (0 - 100)
  // ==========================================
  if (
    cat.includes('computer') ||
    cat.includes('electronics') ||
    cat.includes('diagnostic') ||
    cat.includes('clinic') ||
    cat.includes('hospital') ||
    cat.includes('dental')
  ) {
    pcRepairScore += 45;
    reasons.push('High-intensity computing environment (Medical records, diagnostic equipment, or electronics)');
  } else if (
    cat.includes('account') ||
    cat.includes('ca ') ||
    cat.includes('tax') ||
    cat.includes('law') ||
    cat.includes('advocate') ||
    cat.includes('office')
  ) {
    pcRepairScore += 40;
    reasons.push('Professional workstation environment (Accounting software, billing, and document filing)');
  } else if (
    cat.includes('supermarket') ||
    cat.includes('departmental') ||
    cat.includes('textile') ||
    cat.includes('clothing') ||
    cat.includes('retail') ||
    cat.includes('mobile')
  ) {
    pcRepairScore += 35;
    reasons.push('Commercial retail shop (POS billing computers, barcode printers, and checkout terminals)');
  } else {
    pcRepairScore += 20;
  }

  if (hasAddress) pcRepairScore += 15;
  if (hasPhone) pcRepairScore += 10;

  pcRepairScore = Math.min(100, Math.max(0, pcRepairScore));

  // ==========================================
  // 3. NETWORKING & AMC SCORING (0 - 100)
  // ==========================================
  if (
    cat.includes('school') ||
    cat.includes('college') ||
    cat.includes('academy') ||
    cat.includes('institute')
  ) {
    networkingAmcScore += 50;
    reasons.push('Educational campus: Multiple computer labs, staff Wi-Fi, and recurring network AMC');
  } else if (
    cat.includes('hospital') ||
    cat.includes('diagnostic') ||
    cat.includes('clinic')
  ) {
    networkingAmcScore += 50;
    reasons.push('Healthcare facility: Multi-room LAN, patient database server, zero-downtime maintenance contract');
  } else if (
    cat.includes('supermarket') ||
    cat.includes('departmental') ||
    cat.includes('textile') ||
    cat.includes('jewel')
  ) {
    networkingAmcScore += 45;
    reasons.push('Multi-checkout retail showroom: POS local area network, CCTV setup, and regular maintenance');
  } else if (
    cat.includes('account') ||
    cat.includes('ca ') ||
    cat.includes('logistics') ||
    cat.includes('courier') ||
    cat.includes('factory')
  ) {
    networkingAmcScore += 40;
    reasons.push('Business office: Multi-user shared storage, printer network, and annual maintenance');
  } else {
    networkingAmcScore += 15;
  }

  if (hasAddress) networkingAmcScore += 15;
  if (hasPhone) networkingAmcScore += 10;

  networkingAmcScore = Math.min(100, Math.max(0, networkingAmcScore));

  // Determine Ratings
  const toRating = (score: number): ScoreLevel => {
    if (score >= CONFIG.scoring.highThreshold) return 'HIGH';
    if (score >= CONFIG.scoring.mediumThreshold) return 'MEDIUM';
    if (score >= 20) return 'LOW';
    return 'NONE';
  };

  const websiteDevRating = toRating(webDevScore);
  const pcRepairRating = toRating(pcRepairScore);
  const networkingAmcRating = toRating(networkingAmcScore);

  // Overall qualification status
  let qualificationStatus: 'QUALIFIED' | 'NEEDS_VERIFICATION' | 'UNQUALIFIED' = 'UNQUALIFIED';

  if (
    webDevScore >= CONFIG.scoring.mediumThreshold ||
    pcRepairScore >= CONFIG.scoring.mediumThreshold ||
    networkingAmcScore >= CONFIG.scoring.mediumThreshold
  ) {
    if (hasPhone || data.email) {
      qualificationStatus = 'QUALIFIED';
    } else {
      qualificationStatus = 'NEEDS_VERIFICATION';
    }
  } else {
    qualificationStatus = 'UNQUALIFIED';
  }

  return {
    websiteDevScore: webDevScore,
    websiteDevRating,
    pcRepairScore,
    pcRepairRating,
    networkingAmcScore,
    networkingAmcRating,
    qualificationReason: reasons.join('; ') || 'Standard local business discovery',
    qualificationStatus,
  };
}
