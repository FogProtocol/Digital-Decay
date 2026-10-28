export type SiteStatus = 'active' | 'approaching' | 'dormant' | 'cleaned';

export type ProtectedCategory =
  | 'banking'
  | 'email'
  | 'government'
  | 'healthcare'
  | 'tax'
  | 'work'
  | 'password-manager'
  | 'cloud-storage'
  | 'custom';

export interface SiteVisit {
  domain: string;           // e.g. "example.com"
  origin: string;           // e.g. "https://example.com"
  lastVisited: number;      // Epoch timestamp in milliseconds
  visitCount: number;       // Number of times visited
  safeForAutoClean: boolean;// User explicitly marked safe for auto-cleaning
  status: SiteStatus;       // 'active' | 'approaching' | 'dormant' | 'cleaned'
  lastCleaned?: number;     // Timestamp of last local cleanup
}

export interface ProtectedSite {
  domain: string;
  category: ProtectedCategory;
  isDefault: boolean;       // Built-in rule vs user-added
  addedAt: number;
}

export interface CleanupRecord {
  id: string;
  domain: string;
  origin: string;
  cleanedAt: number;
  dataTypes: string[];      // ['cookies', 'cache', 'localStorage', 'indexedDB', 'serviceWorkers']
  itemsRemoved: number;
  status: 'deleted_local' | 'logged_out';
}

export interface ExtensionSettings {
  inactivityThresholdDays: 30 | 60 | 90 | 180;
  autoCleanEnabled: boolean;
  soundEnabled: boolean;    // Plays custom futuristic audio on cleanup & shield
  undoWindowDays: number;   // Default 7 days
  protectedSites: ProtectedSite[];
  customUnprotectedDomains: string[]; // User explicitly unshielded domains
  sonarRadarEnabled?: boolean;        // 360° Tactical Sonar Radar sweep
}

export type StorageSchema = {
  visits: Record<string, SiteVisit>;
  settings: ExtensionSettings;
  cleanupHistory: CleanupRecord[];
};
