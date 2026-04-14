import { useEffect } from 'react';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Updates = require('expo-updates') as typeof import('expo-updates/build/index');

/**
 * Silently checks for OTA updates when the app loads.
 * - If an update is available it downloads and reloads automatically.
 * - Only runs in production (no-op in Expo Go / development).
 * Drop this anywhere inside the NavigationContainer tree.
 */
export default function UpdateManager() {
  useEffect(() => {
    if (__DEV__) return; // never run in development / Expo Go

    (async () => {
      try {
        const check = await Updates.checkForUpdateAsync();
        if (check.isAvailable) {
          await Updates.fetchUpdateAsync();
          // Reload immediately — app restarts with new JS bundle
          await Updates.reloadAsync();
        }
      } catch (_) {
        // Network error or EAS unreachable — silently ignore, app works normally
      }
    })();
  }, []);

  return null;
}
