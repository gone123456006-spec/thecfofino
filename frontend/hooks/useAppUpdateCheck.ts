import Constants from 'expo-constants';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { getApiBase } from '@/constants/api';
import { isVersionOlder } from '@/utils/compare-version';

export type AppUpdateInfo = {
  updateAvailable: boolean;
  forceUpdate: boolean;
  latestVersion: string;
  installedVersion: string;
};

export function useAppUpdateCheck(): AppUpdateInfo & { refresh: () => void; loading: boolean } {
  const installedVersion = Constants.expoConfig?.version ?? '0.0.0';
  const [latestVersion, setLatestVersion] = useState(installedVersion);
  const [minVersion, setMinVersion] = useState(installedVersion);
  const [loading, setLoading] = useState(true);

  const fetchVersion = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/app/version`, { method: 'GET' });
      if (!res.ok) return;
      const json = (await res.json()) as {
        latestVersion?: string;
        minVersion?: string;
        androidLatestVersionCode?: number;
      };
      if (json.latestVersion) setLatestVersion(json.latestVersion);
      if (json.minVersion) setMinVersion(json.minVersion);

      if (Platform.OS === 'android' && json.androidLatestVersionCode != null) {
        const installedCode =
          (Constants.expoConfig?.android as { versionCode?: number } | undefined)?.versionCode ?? 0;
        if (installedCode < json.androidLatestVersionCode && json.latestVersion) {
          setLatestVersion(json.latestVersion);
        }
      }
    } catch {
      /* offline or server down — no update banner */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchVersion();
  }, [fetchVersion]);

  const updateAvailable = isVersionOlder(installedVersion, latestVersion);
  const forceUpdate = isVersionOlder(installedVersion, minVersion);

  return {
    loading,
    refresh: fetchVersion,
    installedVersion,
    latestVersion,
    updateAvailable,
    forceUpdate,
  };
}
