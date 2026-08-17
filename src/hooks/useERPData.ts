import { useState, useEffect } from 'react';
import { hydrateDbFromSupabase } from '../lib/clientSupabaseSync';
import { ensureIndependentProductSerials } from '../lib/serialUtils';

// Centralised in-memory cache and routing of subscribers for the entire ERP
let cachedData: any = null;
let cachedLoading = true;
const dataSubscribers = new Set<(data: any) => void>();
const loadingSubscribers = new Set<(loading: boolean) => void>();
let pollingTimer: any = null;
let isFirstLoadTriggered = false;
let isFetching = false;
let lastSyncedDataStr = '';

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

export function notifyCrossTabSync(reason?: string) {
  if (syncChannel) {
    try {
      syncChannel.postMessage('REFETCH');
    } catch (e) {}
  }
}

export function setERPLocalData(updater: (prev: any) => any) {
  if (cachedData) {
    cachedData = updater({ ...cachedData });
    if (cachedData.finishedGoods) {
      cachedData.finishedGoods = ensureIndependentProductSerials(cachedData.finishedGoods);
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('arcenol_db_clean', JSON.stringify(cachedData));
    }
    lastSyncedDataStr = JSON.stringify(cachedData);
    dataSubscribers.forEach((cb) => {
      try { cb(cachedData); } catch (e) {}
    });
    notifyCrossTabSync();
  }
}

// Attempt to load from storage on startup
if (typeof window !== 'undefined') {
  const saved = localStorage.getItem('arcenol_db_clean');
  if (saved) {
    try {
      cachedData = JSON.parse(saved);
      if (cachedData?.finishedGoods) {
        cachedData.finishedGoods = ensureIndependentProductSerials(cachedData.finishedGoods);
      }
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
      lastSyncedDataStr = JSON.stringify(cachedData);
      cachedLoading = false;
    } catch (e) {}
  }
}

const performFetch = async () => {
  if (isFetching) return;
  isFetching = true;
  try {
    let json: any = null;
    try {
      const res = await fetch('/api/data', { cache: 'no-store' });
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        json = await res.json();
      }
    } catch (e) {
      // Endpoint fallback
    }

    if (!json) {
      json = cachedData || {
        inventory: [],
        leads: [],
        dealers: [],
        customers: [],
        warehouses: [],
        gradedInventory: [],
        wipInventory: [],
        invoices: [],
        vouchers: [],
        vyaparRecords: [],
        complaints: [],
        warranty: [],
        products: []
      };
      // Fallback hydrate client-side directly if not already hydrated by api mock
      try {
        await hydrateDbFromSupabase(json);
      } catch (sbErr) {}
    }

    if (!json.warranty) {
      json.warranty = cachedData?.warranty || [];
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

    if (json?.finishedGoods) {
      json.finishedGoods = ensureIndependentProductSerials(json.finishedGoods);
    }

    const currentStr = JSON.stringify(json);
    const dataHasChanged = currentStr !== lastSyncedDataStr;

    cachedData = json;
    lastSyncedDataStr = currentStr;

    if (cachedLoading) {
      cachedLoading = false;
      loadingSubscribers.forEach((cb) => {
        try { cb(false); } catch (e) {}
      });
    }

    // Only notify active React hook listeners if data actually changed to prevent constant UI flickering
    if (dataHasChanged) {
      dataSubscribers.forEach((cb) => {
        try { cb(json); } catch (e) {}
      });
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('arcenol_db_clean', currentStr);
    }
  } catch (err) {
    console.warn('[ERP State Sync Warning]:', err);
  } finally {
    isFetching = false;
  }
};

const initGlobalPolling = () => {
  performFetch();
  if (!isFirstLoadTriggered) {
    isFirstLoadTriggered = true;
    if (pollingTimer) clearInterval(pollingTimer);
    pollingTimer = setInterval(performFetch, 10000);

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
