import React, { useEffect, useState } from 'react';
import browser from 'webextension-polyfill';
import {
  Shield,
  Trash2,
  Clock,
  Settings as SettingsIcon,
  Volume2,
  VolumeX,
  AlertTriangle,
  LogOut,
  Plus,
  Lock,
  RefreshCw,
  X,
  Radio,
  Activity
} from 'lucide-react';
import { ExtensionSettings, ProtectedCategory, SiteVisit } from '../types';
import { formatInactivityTime } from '../utils/inactivity';
import { playDecayCleanSound, playShieldSound, playSonarPingSound } from '../utils/audio';
import SonarRadar from './components/SonarRadar';

type ActiveTab = 'review' | 'protected' | 'settings';

interface PopupData {
  settings: ExtensionSettings;
  dormantSites: SiteVisit[];
  totalTrackedCount: number;
  protectedCount: number;
  totalCleanedCount: number;
}

export default function Popup() {
  const [data, setData] = useState<PopupData | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('review');
  const [loading, setLoading] = useState(true);
  const [siteToClean, setSiteToClean] = useState<SiteVisit | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [newProtectedDomain, setNewProtectedDomain] = useState('');
  const [newProtectedCategory, setNewProtectedCategory] = useState<ProtectedCategory>('custom');
  const [radarExpanded, setRadarExpanded] = useState(true);

  const loadData = async () => {
    try {
      const response: any = await browser.runtime.sendMessage({ type: 'GET_POPUP_DATA' });
      if (response && response.success) {
        setData(response.data);
      }
    } catch (err) {
      console.error('Failed to load popup data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleSound = async () => {
    if (!data) return;
    const newSoundState = !data.settings.soundEnabled;
    await browser.runtime.sendMessage({
      type: 'UPDATE_SETTINGS',
      settings: { soundEnabled: newSoundState }
    });
    setData({
      ...data,
      settings: { ...data.settings, soundEnabled: newSoundState }
    });
  };

  const toggleRadar = async () => {
    if (!data) return;
    const currentVal = data.settings.sonarRadarEnabled ?? true;
    const newVal = !currentVal;
    await browser.runtime.sendMessage({
      type: 'UPDATE_SETTINGS',
      settings: { sonarRadarEnabled: newVal }
    });
    setData({
      ...data,
      settings: { ...data.settings, sonarRadarEnabled: newVal }
    });
  };

  const toggleAutoClean = async () => {
    if (!data) return;
    const newAutoCleanState = !data.settings.autoCleanEnabled;
    await browser.runtime.sendMessage({
      type: 'UPDATE_SETTINGS',
      settings: { autoCleanEnabled: newAutoCleanState }
    });
    setData({
      ...data,
      settings: { ...data.settings, autoCleanEnabled: newAutoCleanState }
    });
    setToastMessage(
      newAutoCleanState
        ? 'Auto-Logout enabled for dormant sites'
        : 'Auto-Logout disabled (manual review queue)'
    );
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleConfirmClean = async () => {
    if (!siteToClean) return;
    const domain = siteToClean.domain;
    const origin = siteToClean.origin;
    setSiteToClean(null);

    try {
      const res: any = await browser.runtime.sendMessage({
        type: 'CLEAN_SITE',
        domain,
        origin
      });

      if (res && res.success) {
        if (data?.settings.soundEnabled) {
          playDecayCleanSound();
        }
        setToastMessage(`Cleaned local data for ${domain}`);
        setTimeout(() => setToastMessage(null), 4000);
        await loadData();
      }
    } catch (err: any) {
      alert(`Cleanup failed: ${err.message}`);
    }
  };

  const handleProtectSite = async (domain: string, category: ProtectedCategory = 'custom') => {
    try {
      await browser.runtime.sendMessage({
        type: 'PROTECT_SITE',
        domain,
        category
      });
      if (data?.settings.soundEnabled) {
        playShieldSound();
      }
      setToastMessage(`Shielded ${domain}`);
      setTimeout(() => setToastMessage(null), 3500);
      await loadData();
    } catch (err: any) {
      alert(`Failed to protect site: ${err.message}`);
    }
  };

  const handleUnprotectSite = async (domain: string) => {
    try {
      await browser.runtime.sendMessage({
        type: 'UNPROTECT_SITE',
        domain
      });
      setToastMessage(`Unshielded ${domain}`);
      setTimeout(() => setToastMessage(null), 3500);
      await loadData();
    } catch (err: any) {
      alert(`Failed to unprotect site: ${err.message}`);
    }
  };

  const handleAddCustomProtected = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProtectedDomain.trim()) return;
    await handleProtectSite(newProtectedDomain.trim(), newProtectedCategory);
    setNewProtectedDomain('');
    setNewProtectedCategory('custom');
  };

  if (loading) {
    return (
      <div className="loading-state">
        <RefreshCw size={24} className="spin-icon" />
        <div>Loading Digital Decay...</div>
      </div>
    );
  }

  const dormantSites = data?.dormantSites || [];
  const settings = data?.settings;

  return (
    <div className="popup-container">
      {/* Header */}
      <header className="app-header">
        <div className="brand-wrapper">
          <div className="brand-icon tactical-pulse">
            <Radio size={16} className="radar-sweep-spin" />
          </div>
          <div>
            <div className="brand-title">DIGITAL DECAY</div>
            <div className="brand-tagline">360° Tactical Sonar Recon</div>
          </div>
        </div>
        <div className="header-actions">
          <button
            className={`icon-btn ${radarExpanded ? 'active' : ''}`}
            onClick={() => setRadarExpanded(!radarExpanded)}
            title={radarExpanded ? 'Minimize Tactical Radar' : 'Expand 360° Sonar Radar'}
          >
            <Radio size={15} />
          </button>
          <button
            className={`icon-btn ${settings?.soundEnabled ? 'active' : ''}`}
            onClick={toggleSound}
            title={settings?.soundEnabled ? 'Sound effects enabled' : 'Sound effects muted'}
          >
            {settings?.soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
        </div>
      </header>

      {/* 360° Tactical Sonar Radar Visualizer */}
      {radarExpanded && settings?.sonarRadarEnabled !== false && (
        <SonarRadar
          dormantSites={dormantSites}
          soundEnabled={settings?.soundEnabled ?? true}
          onSelectSite={(site) => {
            setActiveTab('review');
            setSiteToClean(site);
          }}
        />
      )}

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{data?.totalTrackedCount || 0}</div>
          <div className="stat-label">Tracked</div>
        </div>
        <div className="stat-card">
          <div className="stat-value dormant">{dormantSites.length}</div>
          <div className="stat-label">Dormant</div>
        </div>
        <div className="stat-card">
          <div className="stat-value protected">{data?.protectedCount || 0}</div>
          <div className="stat-label">Shielded</div>
        </div>
        <div className="stat-card">
          <div className="stat-value cleaned">{data?.totalCleanedCount || 0}</div>
          <div className="stat-label">Cleaned</div>
        </div>
      </div>

      {/* Tabs */}
      <nav className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === 'review' ? 'active' : ''}`}
          onClick={() => setActiveTab('review')}
        >
          <Clock size={14} />
          Review Queue ({dormantSites.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'protected' ? 'active' : ''}`}
          onClick={() => setActiveTab('protected')}
        >
          <Shield size={14} />
          Protected ({data?.protectedCount || 0})
        </button>
        <button
          className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <SettingsIcon size={14} />
          Settings
        </button>
      </nav>

      {/* Content Area */}
      <main className="content-area">
        {toastMessage && (
          <div className="toast-banner">
            <span>{toastMessage}</span>
            <X size={14} className="cursor-pointer" onClick={() => setToastMessage(null)} />
          </div>
        )}

        {/* TAB 1: Review Queue */}
        {activeTab === 'review' && (
          <div>
            {dormantSites.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">🌱</span>
                <div className="empty-title">No Dormant Sites Found</div>
                <div className="empty-desc">
                  Websites you haven't visited for {settings?.inactivityThresholdDays || 60} days will appear here for review and automatic session logout.
                </div>
                
              </div>
            ) : (
              dormantSites.map((site) => (
                <div key={site.domain} className="site-card">
                  <div className="site-card-header">
                    <div className="site-domain" title={site.domain}>
                      {site.domain}
                    </div>
                    <span className="badge-dormant">
                      {formatInactivityTime(site.lastVisited)}
                    </span>
                  </div>
                  <div className="site-details">
                    <span>Target: Cookies, Cache, Storage & Session Logout</span>
                  </div>
                  <div className="site-card-actions">
                    <button
                      className="btn-clean"
                      onClick={() => setSiteToClean(site)}
                      title="Wipe local browser data and log out"
                    >
                      <Trash2 size={13} />
                      Clean Local Data
                    </button>
                    <button
                      className="btn-shield"
                      onClick={() => handleProtectSite(site.domain, 'custom')}
                      title="Never clean this site"
                    >
                      <Shield size={13} />
                      Shield / Keep
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: Protected Sites */}
        {activeTab === 'protected' && (
          <div>
            <form onSubmit={handleAddCustomProtected} className="protected-form">
              <div className="protected-input-row">
                <input
                  type="text"
                  placeholder="Add domain e.g. onlinesbi.sbi"
                  value={newProtectedDomain}
                  onChange={(e) => setNewProtectedDomain(e.target.value)}
                  className="protected-input"
                />
                <button type="submit" className="btn-shield btn-add">
                  <Plus size={14} />
                  Add
                </button>
              </div>
              <select
                value={newProtectedCategory}
                onChange={(e) => setNewProtectedCategory(e.target.value as ProtectedCategory)}
                className="protected-select"
              >
                <option value="custom">Category: Custom / Other</option>
                <option value="banking">Category: Banking & Finance</option>
                <option value="healthcare">Category: Healthcare</option>
                <option value="email">Category: Email</option>
                <option value="government">Category: Government</option>
                <option value="work">Category: Work & Intranet</option>
                <option value="cloud-storage">Category: Cloud Storage</option>
                <option value="password-manager">Category: Password Manager</option>
              </select>
            </form>

            <div className="protected-list">
              {settings?.protectedSites.map((site) => (
                <div key={site.domain} className="protected-item">
                  <div>
                    <div className="protected-domain">{site.domain}</div>
                    <div className="protected-meta">
                      {site.category} {site.isDefault ? '• Verified Built-in' : '• Custom'}
                    </div>
                  </div>
                  {!site.isDefault && (
                    <button
                      onClick={() => handleUnprotectSite(site.domain)}
                      className="btn-remove-shield"
                      title="Remove protection"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: Settings */}
        {activeTab === 'settings' && (
          <div className="settings-container">
            {/* Tactical Sonar Radar Theme Setting */}
            <div className="settings-card tactical-card">
              <div className="settings-title">
                <Radio size={16} className="text-cyan" />
                360° Tactical Sonar Sweep
              </div>
              <div className="settings-desc">
                Continuous orbital perimeter radar sweeps the local browser sandbox for dormant origin footprints.
              </div>
              <div className="settings-actions-row">
                <button
                  className={`btn-tactical ${settings?.sonarRadarEnabled !== false ? 'active' : ''}`}
                  onClick={toggleRadar}
                >
                  <Radio size={13} />
                  Radar: {settings?.sonarRadarEnabled !== false ? 'Active (Click to Disable)' : 'Disabled (Click to Activate)'}
                </button>
                <button
                  className="btn-tactical btn-ping-test"
                  onClick={() => playSonarPingSound(1180)}
                  title="Test tactical acoustic sonar ping"
                >
                  <Activity size={13} />
                  Test Sonar Ping
                </button>
              </div>
            </div>

            <div className="settings-card">
              <div className="settings-title">
                <LogOut size={16} className="text-cyan" />
                Automatic Dormant Site Logout
              </div>
              <div className="settings-desc">
                Automatically wipes cookies, local session storage, and logs you out when a website passes {settings?.inactivityThresholdDays || 60} days of inactivity (excluding Shielded sites).
              </div>
              <button
                className={`btn-tactical w-full ${settings?.autoCleanEnabled ? 'active' : ''}`}
                onClick={toggleAutoClean}
              >
                <LogOut size={13} />
                Auto-Logout: {settings?.autoCleanEnabled ? 'Active (Click to Disable)' : 'Disabled (Click to Activate)'}
              </button>
            </div>

            <div className="settings-card">
              <div className="settings-title">Inactivity Decay Threshold</div>
              <div className="settings-desc">
                Websites without visits for this period enter the review queue.
              </div>
              <div className="threshold-grid">
                {[30, 60, 90, 180].map((days) => (
                  <button
                    key={days}
                    onClick={() =>
                      browser.runtime
                        .sendMessage({
                          type: 'UPDATE_SETTINGS',
                          settings: { inactivityThresholdDays: days }
                        })
                        .then(loadData)
                    }
                    className={`threshold-btn ${settings?.inactivityThresholdDays === days ? 'active' : ''}`}
                  >
                    {days}d
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-card">
              <div className="settings-title">Audio Feedback (Custom Web Audio)</div>
              <div className="settings-desc">
                Synthesizes the ~1.4s Digital Dissolve, Shield Lock, and Sonar Ping sound effects.
              </div>
              <button className="btn-shield w-full" onClick={toggleSound}>
                {settings?.soundEnabled ? '🔊 Sound: Enabled (Click to Mute)' : '🔇 Sound: Muted (Click to Enable)'}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Confirmation Modal */}
      {siteToClean && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-title">
              <AlertTriangle color="#f59e0b" size={18} />
              Confirm Local Cleanup
            </div>
            <div className="modal-body">
              Are you sure you want to clean local data for <strong>{siteToClean.domain}</strong>?
              <div className="modal-warning-box">
                <span className="text-emerald">Deletes:</span> Local cookies, cache, storage, and logs you out.
                <br />
                <span className="text-muted-xs">Note: This will NOT delete your remote server account.</span>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setSiteToClean(null)}>
                Cancel
              </button>
              <button className="btn-confirm-delete" onClick={handleConfirmClean}>
                Wipe Local Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Honesty Footer */}
      <footer className="honesty-footer">
        <Lock size={12} color="#10b981" />
        <span>100% on-device. Zero telemetry. Never touches servers.</span>
      </footer>
    </div>
  );
}
