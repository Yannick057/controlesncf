import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const LAST_SEEN_VERSION_KEY = 'sncf_last_seen_version';
const NOTIFICATION_SHOWN_KEY = 'sncf_update_notification_shown';

// Parse version string to compare
function parseVersion(version: string): number[] {
  return version.split('.').map(n => parseInt(n, 10) || 0);
}

// Compare versions: returns > 0 if a > b, < 0 if a < b, 0 if equal
function compareVersions(a: string, b: string): number {
  const vA = parseVersion(a);
  const vB = parseVersion(b);
  for (let i = 0; i < Math.max(vA.length, vB.length); i++) {
    const diff = (vA[i] || 0) - (vB[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export interface VersionInfo {
  version: string;
  title: string;
  content: string;
  releaseDate: string;
}

export function useVersionNotification() {
  const [latestVersion, setLatestVersion] = useState<VersionInfo | null>(null);
  const [lastSeenVersion, setLastSeenVersion] = useState<string | null>(null);
  const [hasNewVersion, setHasNewVersion] = useState(false);
  const [shouldShowNotification, setShouldShowNotification] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Fetch latest version from database
  const fetchLatestVersion = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('release_notes')
        .select('version, title, content, release_date')
        .order('release_date', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') { // No rows found
          console.error('Error fetching latest version:', error);
        }
        return null;
      }

      return {
        version: data.version,
        title: data.title,
        content: data.content,
        releaseDate: data.release_date,
      } as VersionInfo;
    } catch (error) {
      console.error('Error fetching latest version:', error);
      return null;
    }
  }, []);

  // Check for new version
  useEffect(() => {
    const checkVersion = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      
      // Get stored last seen version
      const storedVersion = localStorage.getItem(LAST_SEEN_VERSION_KEY);
      setLastSeenVersion(storedVersion);

      // Fetch latest version
      const latest = await fetchLatestVersion();
      setLatestVersion(latest);

      if (latest && storedVersion) {
        // Check if there's a newer version
        const isNewer = compareVersions(latest.version, storedVersion) > 0;
        setHasNewVersion(isNewer);

        // Check if we should show notification (only once per version)
        const notificationShownFor = localStorage.getItem(NOTIFICATION_SHOWN_KEY);
        if (isNewer && notificationShownFor !== latest.version) {
          setShouldShowNotification(true);
        }
      } else if (latest && !storedVersion) {
        // First time user - don't show notification, just set the version
        localStorage.setItem(LAST_SEEN_VERSION_KEY, latest.version);
        localStorage.setItem(NOTIFICATION_SHOWN_KEY, latest.version);
      }

      setLoading(false);
    };

    checkVersion();
  }, [user?.id, fetchLatestVersion]);

  // Mark notification as shown
  const dismissNotification = useCallback(() => {
    if (latestVersion) {
      localStorage.setItem(NOTIFICATION_SHOWN_KEY, latestVersion.version);
      setShouldShowNotification(false);
    }
  }, [latestVersion]);

  // Mark changelog as viewed (updates last seen version)
  const markChangelogViewed = useCallback(() => {
    if (latestVersion) {
      localStorage.setItem(LAST_SEEN_VERSION_KEY, latestVersion.version);
      localStorage.setItem(NOTIFICATION_SHOWN_KEY, latestVersion.version);
      setLastSeenVersion(latestVersion.version);
      setHasNewVersion(false);
      setShouldShowNotification(false);
    }
  }, [latestVersion]);

  return {
    latestVersion,
    lastSeenVersion,
    hasNewVersion,
    shouldShowNotification,
    loading,
    dismissNotification,
    markChangelogViewed,
  };
}
