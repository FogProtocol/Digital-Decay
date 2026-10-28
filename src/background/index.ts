import browser from 'webextension-polyfill';
import {
  getDormantSites,
  getAllVisits,
  getCleanupHistory,
  getSettings,
  protectSite,
  recordVisit,
  unprotectSite,
  updateSettings
} from '../utils/storage';
import { cleanSiteData } from '../utils/cleaner';

const INACTIVITY_ALARM_NAME = 'digital-decay-inactivity-check';

/**
 * Checks all tracked sites and automatically logs out / wipes local session data
 * for any site exceeding the dormancy threshold (if autoCleanEnabled is on).
 */
export async function checkAndAutoCleanDormantSites() {
  try {
    const settings = await getSettings();
    if (!settings.autoCleanEnabled) return;

    const dormantSites = await getDormantSites();
    for (const site of dormantSites) {
      try {
        await cleanSiteData(site.domain, site.origin);
        console.log(`[Digital Decay] Auto-logged out and cleaned dormant site: ${site.domain}`);
      } catch (err) {
        console.error(`[Digital Decay] Failed to auto-clean ${site.domain}:`, err);
      }
    }
  } catch (err) {
    console.error('[Digital Decay] Error in checkAndAutoCleanDormantSites:', err);
  }
}

// 1. On Extension Installed or Updated
browser.runtime.onInstalled.addListener(async (details) => {
  console.log('[Digital Decay] Extension installed / updated:', details.reason);
  await getSettings(); // Initializes defaults if not already set

  // Create daily alarm (1440 minutes = 24 hours)
  await browser.alarms.create(INACTIVITY_ALARM_NAME, {
    periodInMinutes: 1440
  });

  // Check dormant sites on startup / update
  await checkAndAutoCleanDormantSites();
});

// Run check when browser starts
if (browser.runtime.onStartup) {
  browser.runtime.onStartup.addListener(async () => {
    await checkAndAutoCleanDormantSites();
  });
}

// 2. Track site visits locally when navigation completes
if (browser.webNavigation && browser.webNavigation.onCompleted) {
  browser.webNavigation.onCompleted.addListener(async (details) => {
    // Only track top-level frame (frameId === 0), ignore embedded iframes
    if (details.frameId === 0 && details.url) {
      await recordVisit(details.url);
    }
  });
}

// 3. Fallback tab updated listener for additional coverage
browser.tabs.onUpdated.addListener(async (_tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    await recordVisit(tab.url);
  }
});

// 4. Daily Alarm Check
browser.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === INACTIVITY_ALARM_NAME) {
    await checkAndAutoCleanDormantSites();
  }
});

// 5. Message bus between UI (Popup/Options) and Background Worker
browser.runtime.onMessage.addListener(async (message: any) => {
  switch (message.type) {
    case 'GET_POPUP_DATA': {
      const settings = await getSettings();
      const dormantSites = await getDormantSites();
      const visits = await getAllVisits();
      const cleanupHistory = await getCleanupHistory();

      return {
        success: true,
        data: {
          settings,
          dormantSites,
          totalTrackedCount: Object.keys(visits).length,
          protectedCount: settings.protectedSites.length,
          totalCleanedCount: cleanupHistory.length,
          recentCleanups: cleanupHistory.slice(0, 5)
        }
      };
    }

    case 'CLEAN_SITE': {
      const result = await cleanSiteData(message.domain, message.origin);
      return { success: true, result };
    }

    case 'PROTECT_SITE': {
      await protectSite(message.domain, message.category || 'custom');
      return { success: true };
    }

    case 'UNPROTECT_SITE': {
      await unprotectSite(message.domain);
      return { success: true };
    }

    case 'UPDATE_SETTINGS': {
      const updated = await updateSettings(message.settings);
      if (updated.autoCleanEnabled) {
        checkAndAutoCleanDormantSites().catch(console.error);
      }
      return { success: true, settings: updated };
    }

    case 'CHECK_AUTO_CLEAN': {
      await checkAndAutoCleanDormantSites();
      return { success: true };
    }

    default:
      return { success: false, error: 'Unknown message type' };
  }
});
