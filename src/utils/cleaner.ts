import browser from 'webextension-polyfill';
import { getSettings, markSiteCleaned } from './storage';
import { isDomainProtected, normalizeDomain } from './allowlist';

export interface CleanSiteResult {
  success: boolean;
  domain: string;
  origin: string;
  cleanedTypes: string[];
  message: string;
  honestyNotice: string;
}

/**
 * Cleans all local browser data for a specific domain.
 */
export async function cleanSiteData(domain: string, origin?: string): Promise<CleanSiteResult> {
  const normalized = normalizeDomain(domain);
  const targetOrigin = origin || `https://${normalized}`;
  const settings = await getSettings();

  // 1. Safety Guard: Refuse to clean protected domains
  const protection = isDomainProtected(
    normalized,
    settings.protectedSites,
    settings.customUnprotectedDomains
  );

  if (protection.isProtected) {
    throw new Error(
      `Safety guard blocked cleanup: ${normalized} is protected (${protection.reason || protection.category})`
    );
  }

  const cleanedTypes: string[] = [];

  // 2. Clear origin-scoped browsing data (cache, localStorage, indexedDB, serviceWorkers)
  try {
    if (browser.browsingData && browser.browsingData.remove) {
      const removalOptions: any = {
        origins: [targetOrigin]
      };
      await (browser.browsingData.remove as any)(
        removalOptions,
        {
          cache: true,
          cookies: true,
          localStorage: true,
          indexedDB: true,
          serviceWorkers: true
        }
      );
      cleanedTypes.push('cache', 'cookies', 'localStorage', 'indexedDB', 'serviceWorkers');
    }
  } catch (err) {
    console.warn(`Origin-filtered browsingData cleanup failed, falling back to cookie cleanup:`, err);
  }

  // 3. Clear all cookies for domain to ensure 100% session logout
  try {
    if (browser.cookies) {
      const cookies = await browser.cookies.getAll({ domain: normalized });
      for (const cookie of cookies) {
        const protocol = cookie.secure ? 'https:' : 'http:';
        const cookieUrl = `${protocol}//${cookie.domain.replace(/^\./, '')}${cookie.path}`;
        await browser.cookies.remove({
          url: cookieUrl,
          name: cookie.name,
          storeId: cookie.storeId
        });
      }
      if (!cleanedTypes.includes('cookies')) {
        cleanedTypes.push('cookies');
      }
    }
  } catch (err) {
    console.warn(`Direct cookie cleanup encountered an issue:`, err);
  }

  // 4. Record the cleanup in local storage history
  await markSiteCleaned(normalized, targetOrigin, cleanedTypes);

  return {
    success: true,
    domain: normalized,
    origin: targetOrigin,
    cleanedTypes,
    message: 'Local browser data deleted and logged out successfully.',
    honestyNotice:
      'Honesty Guarantee: All local cookies, cache, and storage on this computer were deleted. Your account on their server is not deleted.'
  };
}
