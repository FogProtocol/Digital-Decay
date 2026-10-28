import { ProtectedCategory, ProtectedSite } from '../types';

// Global TLD patterns for government and verified infrastructure
const GLOBAL_GOV_REGEX = /\.(gov|gob|gouv|gc|mil|nic|fed|admin)\.[a-z]{2,3}$/i;
const VERIFIED_TLD_REGEX = /\.(gov|mil|bank|creditunion)$/i;

// Common non-confidential false-positive words to exclude
const FALSE_POSITIVE_EXCLUSIONS = [
  'foodbank', 'bloodbank', 'powerbank', 'soundbank', 'riverbank',
  'snowbank', 'cloudy', 'healthysnack', 'healthyliving'
];

export const MULTILINGUAL_SECTOR_KEYWORDS: Record<ProtectedCategory, string[]> = {
  government: ['gov', 'gob', 'gouv', 'citizen', 'passport', 'visa', 'immi', 'court', 'police', 'aadhaar', 'pension'],
  tax: ['tax', 'impot', 'steuer', 'tribut', 'hacienda', 'receita', 'customs', 'douane', 'zoll'],
  banking: ['bank', 'banque', 'banco', 'banca', 'credit', 'kredit', 'loan', 'lending', 'finance', 'wealth', 'invest', 'crypto', 'wallet', 'upi'],
  email: ['mail', 'email', 'inbox', 'webmail', 'post'],
  healthcare: ['health', 'sante', 'salud', 'hospital', 'clinic', 'medical', 'pharma', 'patient', 'doctor', 'medicare', 'nhs', 'insurance'],
  'password-manager': ['vault', 'pass', 'auth', 'login', 'sso', 'identity', 'keychain', 'credential', '2fa', 'mfa', 'okta'],
  'cloud-storage': ['cloud', 'drive', 'storage', 'backup', 'sync', 'dropbox', 'box', 'sharepoint'],
  work: ['intranet', 'corp', 'internal', 'hr', 'payroll', 'workplace', 'jira', 'confluence', 'workspace', 'vpn'],
  custom: []
};

export const DEFAULT_PROTECTED_SITES: ProtectedSite[] = [
  // Banks
  { domain: 'sbi.co.in', category: 'banking', isDefault: true, addedAt: 0 },
  { domain: 'onlinesbi.sbi', category: 'banking', isDefault: true, addedAt: 0 },
  { domain: 'canarabank.com', category: 'banking', isDefault: true, addedAt: 0 },
  { domain: 'bankofbaroda.in', category: 'banking', isDefault: true, addedAt: 0 },
  { domain: 'hdfcbank.com', category: 'banking', isDefault: true, addedAt: 0 },
  { domain: 'icicibank.com', category: 'banking', isDefault: true, addedAt: 0 },
  { domain: 'paypal.com', category: 'banking', isDefault: true, addedAt: 0 },
  { domain: 'chase.com', category: 'banking', isDefault: true, addedAt: 0 },
  // Government / Tax
  { domain: 'incometax.gov.in', category: 'tax', isDefault: true, addedAt: 0 },
  { domain: 'uidai.gov.in', category: 'government', isDefault: true, addedAt: 0 },
  { domain: 'irs.gov', category: 'tax', isDefault: true, addedAt: 0 },
  { domain: 'usa.gov', category: 'government', isDefault: true, addedAt: 0 },
  // Email
  { domain: 'gmail.com', category: 'email', isDefault: true, addedAt: 0 },
  { domain: 'mail.google.com', category: 'email', isDefault: true, addedAt: 0 },
  { domain: 'outlook.com', category: 'email', isDefault: true, addedAt: 0 },
  { domain: 'proton.me', category: 'email', isDefault: true, addedAt: 0 },
  // Healthcare
  { domain: 'mychart.org', category: 'healthcare', isDefault: true, addedAt: 0 },
  { domain: 'nhs.uk', category: 'healthcare', isDefault: true, addedAt: 0 },
  // Password & Cloud
  { domain: 'bitwarden.com', category: 'password-manager', isDefault: true, addedAt: 0 },
  { domain: '1password.com', category: 'password-manager', isDefault: true, addedAt: 0 },
  { domain: 'drive.google.com', category: 'cloud-storage', isDefault: true, addedAt: 0 },
  { domain: 'dropbox.com', category: 'cloud-storage', isDefault: true, addedAt: 0 }
];

export function normalizeDomain(input: string): string {
  try {
    let raw = input.trim().toLowerCase();
    if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
      raw = `https://${raw}`;
    }
    const url = new URL(raw);
    let hostname = url.hostname;
    if (hostname.startsWith('www.')) {
      hostname = hostname.slice(4);
    }
    return hostname;
  } catch {
    return input.trim().toLowerCase().replace(/^www\./, '');
  }
}

export interface ProtectionResult {
  isProtected: boolean;
  category?: ProtectedCategory;
  reason?: string;
  isHeuristic?: boolean;
}

export function isDomainProtected(
  domain: string,
  allowlist: ProtectedSite[],
  userUnprotectedDomains: string[] = []
): ProtectionResult {
  const normalized = normalizeDomain(domain);

  // 1. HIGHEST PRIORITY: User explicitly unshielded this domain
  if (userUnprotectedDomains.includes(normalized)) {
    return { isProtected: false };
  }

  // 2. Official Government / Verified TLDs
  if (GLOBAL_GOV_REGEX.test(normalized) || VERIFIED_TLD_REGEX.test(normalized)) {
    return { isProtected: true, category: 'government', reason: 'Verified official public TLD', isHeuristic: false };
  }

  // 3. User allowlist or verified default seeds
  for (const item of allowlist) {
    const target = normalizeDomain(item.domain);
    if (normalized === target || normalized.endsWith(`.${target}`)) {
      return { isProtected: true, category: item.category, reason: 'Protected in allowlist', isHeuristic: false };
    }
  }

  // 4. Check known false positives
  for (const fp of FALSE_POSITIVE_EXCLUSIONS) {
    if (normalized.includes(fp)) {
      return { isProtected: false };
    }
  }

  // 5. Keyword Heuristics (Soft Shield - User can unshield anytime)
  const parts = normalized.split(/[.-]/);
  for (const [category, keywords] of Object.entries(MULTILINGUAL_SECTOR_KEYWORDS) as [ProtectedCategory, string[]][]) {
    for (const kw of keywords) {
      if (parts.some((part) => part.includes(kw))) {
        return {
          isProtected: true,
          category,
          reason: `Suggested protection: contains '${kw}'`,
          isHeuristic: true
        };
      }
    }
  }

  return { isProtected: false };
}
