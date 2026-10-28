import { describe, it, expect } from 'vitest';
import {
  normalizeDomain,
  isDomainProtected,
  DEFAULT_PROTECTED_SITES
} from '../src/utils/allowlist';

describe('Protected Allowlist & Worldwide Safety Logic', () => {
  it('normalizes domains by removing protocols, www, subpaths and ports', () => {
    expect(normalizeDomain('https://www.chase.com/login')).toBe('chase.com');
    expect(normalizeDomain('http://ONLINESBI.SBI/')).toBe('onlinesbi.sbi');
    expect(normalizeDomain('canarabank.com:443')).toBe('canarabank.com');
  });

  it('protects verified banking domains', () => {
    const sbi = isDomainProtected('onlinesbi.sbi', DEFAULT_PROTECTED_SITES);
    expect(sbi.isProtected).toBe(true);

    const canara = isDomainProtected('canarabank.com', DEFAULT_PROTECTED_SITES);
    expect(canara.isProtected).toBe(true);

    const paypal = isDomainProtected('paypal.com', DEFAULT_PROTECTED_SITES);
    expect(paypal.isProtected).toBe(true);
  });

  it('protects subdomains of allowlisted domains', () => {
    const chaseSub = isDomainProtected('online.chase.com', DEFAULT_PROTECTED_SITES);
    expect(chaseSub.isProtected).toBe(true);

    const googleMail = isDomainProtected('mail.google.com', DEFAULT_PROTECTED_SITES);
    expect(googleMail.isProtected).toBe(true);
  });

  it('protects official government and verified TLDs worldwide', () => {
    expect(isDomainProtected('incometax.gov.in', DEFAULT_PROTECTED_SITES).isProtected).toBe(true);
    expect(isDomainProtected('service.gov.uk', DEFAULT_PROTECTED_SITES).isProtected).toBe(true);
    expect(isDomainProtected('defense.mil', DEFAULT_PROTECTED_SITES).isProtected).toBe(true);
  });

  it('correctly ignores known false positives like foodbank or soundbank', () => {
    expect(isDomainProtected('foodbank.org', DEFAULT_PROTECTED_SITES).isProtected).toBe(false);
    expect(isDomainProtected('riverbankgames.com', DEFAULT_PROTECTED_SITES).isProtected).toBe(false);
  });

  it('allows user unshield overrides to take highest priority', () => {
    // Normally protected
    expect(isDomainProtected('sbi.co.in', DEFAULT_PROTECTED_SITES).isProtected).toBe(true);

    // User explicitly overrides/unshields it
    const overridden = isDomainProtected('sbi.co.in', DEFAULT_PROTECTED_SITES, ['sbi.co.in']);
    expect(overridden.isProtected).toBe(false);
  });
});
