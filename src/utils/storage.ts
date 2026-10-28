import browser from 'webextension-polyfill';
import {
  CleanupRecord,
  ExtensionSettings,
  ProtectedCategory,
  SiteVisit
} from '../types';
import {
  DEFAULT_PROTECTED_SITES,
  isDomainProtected,
  normalizeDomain
} from './allowlist';
import {
  DEFAULT_INACTIVITY_THRESHOLD_DAYS,
  getDaysInactive
} from './inactivity';

const STORAGE_KEYS = {
  VISITS: 'visits',
  SETTINGS: 'settings',
  CLEANUP_HISTORY: 'cleanupHistory'
} as const;

export const DEFAULT_SETTINGS: ExtensionSettings = {
  inactivityThresholdDays: DEFAULT_INACTIVITY_THRESHOLD_DAYS, // 60 days
  autoCleanEnabled: true,                                     // Enabled: auto-logout dormant sites
  soundEnabled: true,                                         // Custom audio enabled
  undoWindowDays: 7,
  protectedSites: DEFAULT_PROTECTED_SITES,
  customUnprotectedDomains: [],                               // User-unshielded overrides
  sonarRadarEnabled: true                                     // 360° Tactical Sonar Radar sweep default ON
};

/**
 * Loads extension settings from browser.storage.local, initializing defaults if first run.
 */
export async function getSettings(): Promise<ExtensionSettings> {
  const result = await browser.storage.local.get(STORAGE_KEYS.SETTINGS);
  const saved = result[STORAGE_KEYS.SETTINGS] as Partial<ExtensionSettings> | undefined;
  if (!saved) {
    await browser.storage.local.set({ [STORAGE_KEYS.SETTINGS]: DEFAULT_SETTINGS });
    return DEFAULT_SETTINGS;
  }
  return { ...DEFAULT_SETTINGS, ...saved };
}

/**
 * Updates extension settings.
 */
export async function updateSettings(
  partial: Partial<ExtensionSettings>
): Promise<ExtensionSettings> {
  const current = await getSettings();
  const updated: ExtensionSettings = { ...current, ...partial };
  await browser.storage.local.set({ [STORAGE_KEYS.SETTINGS]: updated });
  return updated;
}

/**
 * Retrieves all tracked site visits.
 */
export async function getAllVisits(): Promise<Record<string, SiteVisit>> {
  const result = await browser.storage.local.get(STORAGE_KEYS.VISITS);
  return (result[STORAGE_KEYS.VISITS] as Record<string, SiteVisit>) || {};
}

/**
 * Records a site visit when you navigate to a page.
 * Safely filters out internal browser pages.
 */
export async function recordVisit(rawUrl: string): Promise<SiteVisit | null> {
  if (
    !rawUrl ||
    rawUrl.startsWith('chrome://') ||
    rawUrl.startsWith('edge://') ||
    rawUrl.startsWith('about:') ||
    rawUrl.startsWith('chrome-extension://') ||
    rawUrl.startsWith('moz-extension://') ||
    rawUrl.startsWith('view-source:')
  ) {
    return null;
  }

  try {
    const url = new URL(rawUrl);
    if (!['http:', 'https:'].includes(url.protocol)) return null;

    const domain = normalizeDomain(url.hostname);
    if (!domain || domain === 'localhost' || domain.includes('127.0.0.1')) {
      return null;
    }

    const origin = url.origin;
    const now = Date.now();
    const visits = await getAllVisits();
    const existing = visits[domain];

    const updated: SiteVisit = {
      domain,
      origin,
      lastVisited: now,
      visitCount: existing ? existing.visitCount + 1 : 1,
      safeForAutoClean: existing ? existing.safeForAutoClean : false,
      status: 'active',
      lastCleaned: existing?.lastCleaned
    };

    visits[domain] = updated;
    await browser.storage.local.set({ [STORAGE_KEYS.VISITS]: visits });
    return updated;
  } catch {
    return null;
  }
}

/**
 * Returns all sites that are dormant (>= 60 days without a visit)
 * and are NOT protected by the allowlist.
 */
export async function getDormantSites(): Promise<SiteVisit[]> {
  const visits = await getAllVisits();
  const settings = await getSettings();
  const now = Date.now();
  const dormantSites: SiteVisit[] = [];

  for (const visit of Object.values(visits)) {
    if (visit.status === 'cleaned') continue;

    const protection = isDomainProtected(
      visit.domain,
      settings.protectedSites,
      settings.customUnprotectedDomains
    );

    // If site is protected by allowlist, do not queue it for cleanup
    if (protection.isProtected) continue;

    const days = getDaysInactive(visit.lastVisited, now);
    if (days >= settings.inactivityThresholdDays) {
      dormantSites.push({
        ...visit,
        status: 'dormant'
      });
    }
  }

  return dormantSites.sort((a, b) => a.lastVisited - b.lastVisited);
}

/**
 * Adds a site to the user's protected allowlist (Shield Site).
 */
export async function protectSite(domain: string, category: ProtectedCategory = 'custom'): Promise<void> {
  const settings = await getSettings();
  const normalized = normalizeDomain(domain);

  const updatedUnprotected = settings.customUnprotectedDomains.filter((d) => d !== normalized);

  const existingIndex = settings.protectedSites.findIndex(
    (s) => normalizeDomain(s.domain) === normalized
  );

  const updatedProtected = [...settings.protectedSites];
  if (existingIndex >= 0) {
    updatedProtected[existingIndex] = {
      ...updatedProtected[existingIndex],
      category
    };
  } else {
    updatedProtected.push({
      domain: normalized,
      category,
      isDefault: false,
      addedAt: Date.now()
    });
  }

  await updateSettings({
    protectedSites: updatedProtected,
    customUnprotectedDomains: updatedUnprotected
  });
}

/**
 * Removes protection from a site (allows false-positive override).
 */
export async function unprotectSite(domain: string): Promise<void> {
  const settings = await getSettings();
  const normalized = normalizeDomain(domain);

  const updatedProtected = settings.protectedSites.filter(
    (s) => normalizeDomain(s.domain) !== normalized
  );
  const updatedUnprotected = Array.from(new Set([...settings.customUnprotectedDomains, normalized]));

  await updateSettings({
    protectedSites: updatedProtected,
    customUnprotectedDomains: updatedUnprotected
  });
}

/**
 * Marks a site as cleaned after local data wipe.
 */
export async function markSiteCleaned(domain: string, origin: string, dataTypes: string[]): Promise<void> {
  const visits = await getAllVisits();
  const normalized = normalizeDomain(domain);

  if (visits[normalized]) {
    visits[normalized].status = 'cleaned';
    visits[normalized].lastCleaned = Date.now();
    await browser.storage.local.set({ [STORAGE_KEYS.VISITS]: visits });
  }

  const record: CleanupRecord = {
    id: `${normalized}-${Date.now()}`,
    domain: normalized,
    origin,
    cleanedAt: Date.now(),
    dataTypes,
    itemsRemoved: dataTypes.length,
    status: 'deleted_local'
  };

  const historyResult = await browser.storage.local.get(STORAGE_KEYS.CLEANUP_HISTORY);
  const history = (historyResult[STORAGE_KEYS.CLEANUP_HISTORY] as CleanupRecord[]) || [];
  history.unshift(record);

  await browser.storage.local.set({
    [STORAGE_KEYS.CLEANUP_HISTORY]: history.slice(0, 100)
  });
}

/**
 * Retrieves past cleanup history logs.
 */
export async function getCleanupHistory(): Promise<CleanupRecord[]> {
  const result = await browser.storage.local.get(STORAGE_KEYS.CLEANUP_HISTORY);
  return (result[STORAGE_KEYS.CLEANUP_HISTORY] as CleanupRecord[]) || [];
}

/**
 * Development / Demo helper: Seeds mock sites with 65 and 80 days of inactivity
 * so you can immediately see and test the dormant cleanup flow without waiting 60 real days.
 */
export async function seedDemoDormantSites(): Promise<void> {
  const now = Date.now();
  const MS_65_DAYS = 65 * 24 * 60 * 60 * 1000;
  const MS_80_DAYS = 80 * 24 * 60 * 60 * 1000;

  const visits = await getAllVisits();

  visits['old-news-portal.com'] = {
    domain: 'old-news-portal.com',
    origin: 'https://old-news-portal.com',
    lastVisited: now - MS_65_DAYS,
    visitCount: 4,
    safeForAutoClean: false,
    status: 'dormant'
  };

  visits['abandoned-shopping-store.net'] = {
    domain: 'abandoned-shopping-store.net',
    origin: 'https://abandoned-shopping-store.net',
    lastVisited: now - MS_80_DAYS,
    visitCount: 1,
    safeForAutoClean: false,
    status: 'dormant'
  };

  await browser.storage.local.set({ [STORAGE_KEYS.VISITS]: visits });
}
