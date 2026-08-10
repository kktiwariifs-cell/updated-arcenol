import { createClient } from '@supabase/supabase-js';

// Supabase configuration details provided by administrative credentials
const DEFAULT_SUPABASE_URL = "https://zrycwwcnzaoqhhqkrhig.supabase.co";
const DEFAULT_SUPABASE_KEY = "sb_publishable_t8cKhGdESXfoBRnc0awuOA_XcyOk7tl";

function getSanitizedSupabaseUrl(rawUrl?: any): string {
  if (typeof rawUrl !== 'string') return DEFAULT_SUPABASE_URL;
  let trimmed = rawUrl.trim().replace(/^["']|["']$/g, '').trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') {
    return DEFAULT_SUPABASE_URL;
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }
  return trimmed;
}

function getSanitizedSupabaseKey(rawKey?: any): string {
  if (typeof rawKey !== 'string') return DEFAULT_SUPABASE_KEY;
  let trimmed = rawKey.trim().replace(/^["']|["']$/g, '').trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') {
    return DEFAULT_SUPABASE_KEY;
  }
  return trimmed;
}

const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

const SUPABASE_URL = getSanitizedSupabaseUrl(envUrl);
const SUPABASE_KEY = getSanitizedSupabaseKey(envKey);

// Initialize the Supabase Client
export const supabase = (() => {
  const options = {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  };
  try {
    return createClient(SUPABASE_URL, SUPABASE_KEY, options);
  } catch (err) {
    console.warn('[Supabase] Warning initializing client, falling back to default:', err);
    return createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_KEY, options);
  }
})();

// Helper type for Subsidiary entry
export interface Subsidiary {
  id: string;
  name: string;
  shortName: string;
  type: string;
  gstin: string;
  cin: string;
  contactEmail: string;
  phone: string;
  website: string;
  address: string;
  capacity: string;
  manager: string;
  status: string;
  updated_at?: string;
}

// Helper type for Business Profile entry
export interface BusinessProfile {
  id?: string;
  companyName: string;
  shortName: string;
  establishedYear: string;
  industrySector: string;
  contactEmail: string;
  phone: string;
  website: string;
  cin: string;
  gstin: string;
  address: string;
  manufacturingCapacity: string;
  leadAcidOutput: string;
  depotsCount: number;
  primaryRegion: string;
  complianceOfficer: string;
  nodePassphrase?: string;
  logo: string;
  loginLeftImage: string;
  updated_at?: string;
}

/**
 * Supabase Bridge Database Handshake Helper
 */
export const SupabaseBridge = {
  getURL: () => SUPABASE_URL,
  getKeySnippet: () => SUPABASE_KEY.slice(0, 15) + '...',

  /**
   * Fetch Business Profile / Super Admin Settings from Supabase
   */
  fetchBusinessProfile: async (): Promise<BusinessProfile | null> => {
    const { data, error } = await supabase
      .from('arcenol_business_profile')
      .select('*')
      .eq('id', 'PRIMARY')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }
    return data as BusinessProfile;
  },

  /**
   * Save or update Business Profile in Supabase
   */
  saveBusinessProfile: async (profile: BusinessProfile): Promise<any> => {
    const payload = {
      id: 'PRIMARY',
      companyName: profile.companyName,
      shortName: profile.shortName,
      establishedYear: profile.establishedYear,
      industrySector: profile.industrySector,
      contactEmail: profile.contactEmail,
      phone: profile.phone,
      website: profile.website,
      cin: profile.cin,
      gstin: profile.gstin,
      address: profile.address,
      manufacturingCapacity: profile.manufacturingCapacity,
      leadAcidOutput: profile.leadAcidOutput,
      depotsCount: profile.depotsCount,
      primaryRegion: profile.primaryRegion,
      complianceOfficer: profile.complianceOfficer,
      nodePassphrase: profile.nodePassphrase || 'ARC-NODE-SECURE',
      logo: profile.logo,
      loginLeftImage: profile.loginLeftImage,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('arcenol_business_profile')
      .upsert([payload])
      .select();

    if (error) {
      throw error;
    }
    return data;
  },
  
  /**
   * Fetch all corporate units from Supabase
   */
  fetchSubsidiaries: async (): Promise<Subsidiary[]> => {
    const { data, error } = await supabase
      .from('arcenol_corporate_units')
      .select('*')
      .order('id', { ascending: true });
      
    if (error) {
      throw error;
    }
    return data as Subsidiary[];
  },

  /**
   * Save or insert subsidiary in Supabase
   */
  saveSubsidiary: async (sub: Subsidiary): Promise<any> => {
    const payload = {
      id: sub.id,
      name: sub.name,
      shortName: sub.shortName,
      type: sub.type,
      gstin: sub.gstin,
      cin: sub.cin,
      contactEmail: sub.contactEmail,
      phone: sub.phone,
      website: sub.website,
      address: sub.address,
      capacity: sub.capacity,
      manager: sub.manager,
      status: sub.status,
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('arcenol_corporate_units')
      .upsert([payload])
      .select();

    if (error) {
      throw error;
    }
    return data;
  },

  /**
   * Delete subsidiary from Supabase
   */
  deleteSubsidiary: async (id: string): Promise<any> => {
    const { data, error } = await supabase
      .from('arcenol_corporate_units')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
    return data;
  },

  /**
   * Batch upload/synchronize local array to Supabase
   */
  syncLocalToSupabase: async (subsList: Subsidiary[]): Promise<any> => {
    const payloads = subsList.map(sub => ({
      id: sub.id,
      name: sub.name,
      shortName: sub.shortName,
      type: sub.type,
      gstin: sub.gstin,
      cin: sub.cin,
      contactEmail: sub.contactEmail,
      phone: sub.phone,
      website: sub.website,
      address: sub.address,
      capacity: sub.capacity,
      manager: sub.manager,
      status: sub.status,
      updated_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('arcenol_corporate_units')
      .upsert(payloads);

    if (error) {
      throw error;
    }
    return data;
  },

  /**
   * Sync Full ERP state to Supabase via backend API
   */
  triggerFullBackendSync: async (): Promise<any> => {
    const res = await fetch('/api/supabase/sync-all', { method: 'POST' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to trigger full Supabase backend sync');
    }
    return await res.json();
  }
};
