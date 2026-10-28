import { describe, it, expect } from 'vitest';
import {
  getDaysInactive,
  evaluateSiteStatus,
  isSiteEligibleForReview,
  MS_PER_DAY
} from '../src/utils/inactivity';
import { SiteVisit } from '../src/types';

describe('Inactivity Calculation Engine', () => {
  const NOW = 1700000000000;

  it('calculates 0 days for visits today', () => {
    expect(getDaysInactive(NOW, NOW)).toBe(0);
  });

  it('calculates exact calendar days for past timestamps', () => {
    const tenDaysAgo = NOW - 10 * MS_PER_DAY;
    expect(getDaysInactive(tenDaysAgo, NOW)).toBe(10);

    const sixtyDaysAgo = NOW - 60 * MS_PER_DAY;
    expect(getDaysInactive(sixtyDaysAgo, NOW)).toBe(60);
  });

  it('evaluates status as active for recent visits', () => {
    const fiveDaysAgo = NOW - 5 * MS_PER_DAY;
    expect(evaluateSiteStatus(fiveDaysAgo, 60, NOW)).toBe('active');
  });

  it('evaluates status as approaching when within 7 days of the 60-day threshold', () => {
    const fiftyFiveDaysAgo = NOW - 55 * MS_PER_DAY;
    expect(evaluateSiteStatus(fiftyFiveDaysAgo, 60, NOW)).toBe('approaching');
  });

  it('evaluates status as dormant when 60 or more days inactive', () => {
    const sixtyDaysAgo = NOW - 60 * MS_PER_DAY;
    expect(evaluateSiteStatus(sixtyDaysAgo, 60, NOW)).toBe('dormant');

    const ninetyDaysAgo = NOW - 90 * MS_PER_DAY;
    expect(evaluateSiteStatus(ninetyDaysAgo, 60, NOW)).toBe('dormant');
  });

  it('excludes already cleaned sites from review eligibility', () => {
    const seventyDaysAgo = NOW - 70 * MS_PER_DAY;
    const cleanedSite: SiteVisit = {
      domain: 'old-shop.com',
      origin: 'https://old-shop.com',
      lastVisited: seventyDaysAgo,
      visitCount: 1,
      safeForAutoClean: false,
      status: 'cleaned'
    };
    expect(isSiteEligibleForReview(cleanedSite, 60, NOW)).toBe(false);
  });
});
