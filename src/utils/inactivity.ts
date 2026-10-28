import { SiteStatus, SiteVisit } from '../types';

// Explicit 60-day default constraint
export const DEFAULT_INACTIVITY_THRESHOLD_DAYS = 60;

// Conversion factor: 1 day = 86,400,000 milliseconds
export const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Calculates the exact number of calendar days a site has been inactive.
 */
export function getDaysInactive(lastVisited: number, now: number = Date.now()): number {
  if (!lastVisited || lastVisited <= 0) return 0;
  const diffMs = Math.max(0, now - lastVisited);
  return Math.floor(diffMs / MS_PER_DAY);
}

/**
 * Evaluates whether a site is active, approaching dormancy, or dormant (>= 60 days).
 */
export function evaluateSiteStatus(
  lastVisited: number,
  thresholdDays: number = DEFAULT_INACTIVITY_THRESHOLD_DAYS, // Defaults to 60 days
  now: number = Date.now()
): SiteStatus {
  const daysInactive = getDaysInactive(lastVisited, now);

  // If 60 or more days have elapsed without a visit -> DORMANT
  if (daysInactive >= thresholdDays) {
    return 'dormant';
  }

  // Warning zone: within 7 days of hitting the 60-day limit (e.g. 53 to 59 days)
  if (daysInactive >= thresholdDays - 7) {
    return 'approaching';
  }

  // Visited recently (less than 53 days)
  return 'active';
}

/**
 * Formats inactivity into clear human text.
 */
export function formatInactivityTime(lastVisited: number, now: number = Date.now()): string {
  const days = getDaysInactive(lastVisited, now);
  if (days === 0) return 'Visited today';
  if (days === 1) return 'Visited yesterday';
  return `Inactive for ${days} days`;
}

/**
 * Checks if a site qualifies for the dormant review queue.
 */
export function isSiteEligibleForReview(
  site: SiteVisit,
  thresholdDays: number = DEFAULT_INACTIVITY_THRESHOLD_DAYS,
  now: number = Date.now()
): boolean {
  if (site.status === 'cleaned') return false;
  return getDaysInactive(site.lastVisited, now) >= thresholdDays;
}
