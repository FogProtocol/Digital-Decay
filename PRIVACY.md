# Privacy Policy for Digital Decay

**Last Updated:** October 2026

Digital Decay is an open-source, privacy-first browser extension created to reduce users' digital footprints by cleaning local dormant website data and assisting with official account-deletion requests.

### 1. Zero Data Collection & Zero Telemetry
- Digital Decay **does NOT collect, transmit, sell, or monetize any personal data**.
- There are **no tracking scripts, analytics beacons, external APIs, or phone-home servers**.
- The extension does not track, collect, or store location data, personal identity, search queries, or browsing history outside of your local machine.

### 2. Local-Only Storage
All extension settings, visit timestamps, protected domain allowlists, and review queues are stored strictly on your local device using the browser's local storage API (`chrome.storage.local`). No information ever leaves your device.

### 3. Permissions Justification
- **`storage`**: Used to save your settings, preferences, allowlists, and review queues locally.
- **`alarms`**: Used to schedule periodic background checks to determine if websites have exceeded your chosen inactivity threshold.
- **`browsingData`**: Used exclusively to clear local cache, cookies, and storage for dormant domains after user confirmation or review queue expiration.
- **`tabs` & `webNavigation`**: Used locally to record the last time you visited a domain to track inactivity and identify official account deletion or privacy policy links.
- **`Host Permissions (*://*/*)`**: Required locally to monitor domain access timestamps and detect deletion links on visited pages. No page content or credentials are ever recorded or exfiltrated.

### 4. Third-Party Services
Digital Decay does not integrate with any third-party services, advertisers, or cloud databases.

### 5. Data Deletion and Control
You have full control over your data. You can clear the review queue, reset settings, or remove all stored extension data at any time by clearing the extension data in your browser settings or uninstalling the extension.

### 6. Contact & Open Source
For questions or support, visit the open-source repository at:
https://github.com/FogProtocol/Digital-Decay
