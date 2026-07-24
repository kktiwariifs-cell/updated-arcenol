import { useState, useEffect } from 'react';
import { hydrateDbFromSupabase } from '../lib/clientSupabaseSync';

// Centralised in-memory cache and routing of subscribers for the entire ERP
let cachedData: any = null;
let cachedLoading = true;
const dataSubscribers = new Set<(data: any) => void>();
const loadingSubscribers = new Set<(loading: boolean) => void>();
let pollingTimer: any = null;
let isFirstLoadTriggered = false;

// Cross-tab broadcast channel for instant multi-tab sync
let syncChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    syncChannel = new BroadcastChannel('arcenol_erp_sync');
    syncChannel.onmessage = (event) => {
      if (event.data === 'REFETCH') {
        performFetch();
      }
    };
  } catch (e) {}
}

export function notifyCrossTabSync() {
  if (syncChannel) {
    try {
      syncChannel.postMessage('REFETCH');
    } catch (e) {}
  }
}

// Attempt to load from storage on startup
if (typeof window !== 'undefined') {
  const saved = localStorage.getItem('arcenol_db_clean');
  if (saved) {
    try {
      cachedData = JSON.parse(saved);
      const profileBackup = localStorage.getItem('arcenol_business_profile_backup');
      if (profileBackup && cachedData) {
        const bp = JSON.parse(profileBackup);
        cachedData.businessProfile = {
          ...cachedData.businessProfile,
          ...bp,
          logo: cachedData.businessProfile?.logo || bp?.logo || '',
          loginLeftImage: cachedData.businessProfile?.loginLeftImage || bp?.loginLeftImage || ''
        };
      }
      cachedLoading = false;
    } catch (e) {}
  }
}

const performFetch = async () => {
  try {
    const res = await fetch('/api/data', { cache: 'no-store' });
    const contentType = res.headers.get('content-type');
    if (!res.ok || !contentType || !contentType.includes('application/json')) {
      // Server is restarting or returning HTML fallback; retain cached state gracefully
      return;
    }
    const json = await res.json();
    
    // Always ensure Supabase hydration is performed if client inventory is missing or empty
    if (!json.inventory || json.inventory.length === 0) {
      try {
        await hydrateDbFromSupabase(json);
      } catch (sbErr) {
        console.warn('[useERPData] Direct client Supabase hydration warning:', sbErr);
      }
    }
    
    // Ensure logo and settings are backed up and merged seamlessly
    if (typeof window !== 'undefined' && json) {
      const profileBackup = localStorage.getItem('arcenol_business_profile_backup');
      if (profileBackup) {
        try {
          const bp = JSON.parse(profileBackup);
          json.businessProfile = {
            ...json.businessProfile,
            ...bp,
            logo: json.businessProfile?.logo || bp?.logo || '',
            loginLeftImage: json.businessProfile?.loginLeftImage || bp?.loginLeftImage || ''
          };
        } catch (e) {}
      }
      if (json.businessProfile) {
        localStorage.setItem('arcenol_business_profile_backup', JSON.stringify(json.businessProfile));
      }
    }

    cachedData = json;
    cachedLoading = false;

    // Notify all active React hook listeners
    dataSubscribers.forEach((cb) => {
      try { cb(json); } catch (e) {}
    });
    loadingSubscribers.forEach((cb) => {
      try { cb(false); } catch (e) {}
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem('arcenol_db_clean', JSON.stringify(json));
    }
  } catch (err) {
    console.warn('[ERP State Sync Warning]:', err);
  }
};

const initGlobalPolling = () => {
  performFetch();
  if (!isFirstLoadTriggered) {
    isFirstLoadTriggered = true;
    if (pollingTimer) clearInterval(pollingTimer);
    pollingTimer = setInterval(performFetch, 2500);

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => performFetch());
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) performFetch();
      });
    }
  }
};

export function useERPData() {
  const [data, setData] = useState<any>(cachedData);
  const [loading, setLoading] = useState<boolean>(cachedLoading);

  useEffect(() => {
    // Add current component instance state setters to subscribers list
    dataSubscribers.add(setData);
    loadingSubscribers.add(setLoading);

    // Initialise global syncing
    initGlobalPolling();

    return () => {
      dataSubscribers.delete(setData);
      loadingSubscribers.delete(setLoading);
    };
  }, []);

  const refetch = async () => {
    await performFetch();
    notifyCrossTabSync();
  };

  return { data, loading, refetch };
}
