import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Building, Globe, Mail, Phone, MapPin, 
  CreditCard, Lock, Server, Sliders, Database, Save, 
  RefreshCw, FileText, CheckCircle2, Warehouse, Activity,
  Briefcase, Calendar, AlertTriangle, X, Check, Copy, 
  ExternalLink, Terminal, Wifi, WifiOff, Code, Play,
  UserPlus, Trash2, Edit, Eye, EyeOff, UserCheck, ChevronRight,
  Image as ImageIcon, RotateCcw, UploadCloud
} from 'lucide-react';
import { useERPData } from '../hooks/useERPData';
import { cn } from '../lib/utils';
import { useAuthStore, UserRole, User } from '../store/authStore';
import { supabase, SupabaseBridge } from '../lib/supabase';
import { syncBusinessProfileToSupabase } from '../lib/clientSupabaseSync';

export const SuperAdmin: React.FC = () => {
  const { data, refetch } = useERPData();
  
  // Supabase Database Integration & Status States
  const [supabaseStatus, setSupabaseStatus] = useState<'CONNECTING' | 'CONNECTED' | 'ERROR' | 'TABLE_NOT_FOUND'>('CONNECTING');
  const [supabaseLoading, setSupabaseLoading] = useState(false);
  const [supabaseErrorMsg, setSupabaseErrorMsg] = useState<string | null>(null);
  const [showSqlHelper, setShowSqlHelper] = useState(false);
  const [showSqlCopied, setShowSqlCopied] = useState(false);

  // Local state for the Business Profile Form
  const [formData, setFormData] = useState({
    companyName: '',
    shortName: '',
    establishedYear: '',
    industrySector: '',
    contactEmail: '',
    phone: '',
    website: '',
    cin: '',
    gstin: '',
    address: '',
    manufacturingCapacity: '',
    leadAcidOutput: '',
    depotsCount: 5,
    primaryRegion: 'WEST_SOUTH',
    complianceOfficer: '',
    nodePassphrase: '',
    logo: '',
    loginLeftImage: ''
  });

  // Sister Corporate Entities & Subsidiary Branch Registry States
  const subsidiaries = data?.subsidiaries || [];

  // Sync / Handshake with Supabase on mount
  useEffect(() => {
    let active = true;
    const loadFromSupabase = async () => {
      setSupabaseStatus('CONNECTING');
      try {
        // 1. Fetch remote subsidiaries / sister units
        const remoteSubs = await SupabaseBridge.fetchSubsidiaries();
        if (active) {
          if (remoteSubs && remoteSubs.length > 0) {
            await fetch('/api/subsidiaries/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(remoteSubs)
            });
            refetch();
          } else {
            // Table exists but is completely empty on remote, let's sync baseline defaults to it
            await SupabaseBridge.syncLocalToSupabase(subsidiaries);
          }
        }

        // 2. Fetch remote Super Admin / Corporate Business Profile
        try {
          const remoteProfile = await SupabaseBridge.fetchBusinessProfile();
          if (active && remoteProfile) {
            setFormData(prev => ({
              ...prev,
              companyName: remoteProfile.companyName || prev.companyName,
              shortName: remoteProfile.shortName || prev.shortName,
              establishedYear: remoteProfile.establishedYear || prev.establishedYear,
              industrySector: remoteProfile.industrySector || prev.industrySector,
              contactEmail: remoteProfile.contactEmail || prev.contactEmail,
              phone: remoteProfile.phone || prev.phone,
              website: remoteProfile.website || prev.website,
              cin: remoteProfile.cin || prev.cin,
              gstin: remoteProfile.gstin || prev.gstin,
              address: remoteProfile.address || prev.address,
              manufacturingCapacity: remoteProfile.manufacturingCapacity || prev.manufacturingCapacity,
              leadAcidOutput: remoteProfile.leadAcidOutput || prev.leadAcidOutput,
              depotsCount: remoteProfile.depotsCount || prev.depotsCount,
              primaryRegion: remoteProfile.primaryRegion || prev.primaryRegion,
              complianceOfficer: remoteProfile.complianceOfficer || prev.complianceOfficer,
              nodePassphrase: remoteProfile.nodePassphrase || prev.nodePassphrase,
              logo: remoteProfile.logo || prev.logo,
              loginLeftImage: remoteProfile.loginLeftImage || prev.loginLeftImage
            }));
          }
        } catch (profileErr) {
          console.warn("Supabase initial load profile error (acceptable if table not initialized):", profileErr);
        }

        if (active) {
          setSupabaseStatus('CONNECTED');
          setSupabaseErrorMsg(null);
        }
      } catch (err: any) {
        console.warn("Supabase initial load error:", err);
        if (active) {
          const isTableMissing = err.code === 'PGRST116' || 
                                 err.code === '42P01' || 
                                 err.code === 'PGRST205' || 
                                 (err.message && (
                                   err.message.toLowerCase().includes('relation') ||
                                   err.message.toLowerCase().includes('schema cache') ||
                                   err.message.toLowerCase().includes('table') ||
                                   err.message.toLowerCase().includes('pgrst205')
                                 ));
          if (isTableMissing) {
            setSupabaseStatus('TABLE_NOT_FOUND');
            setSupabaseErrorMsg("Table 'arcenol_corporate_units' not found or not in schema cache. Setup SQL blueprint required.");
          } else {
            setSupabaseStatus('ERROR');
            setSupabaseErrorMsg(err.message || 'Supabase connection failed. Displaying local cache.');
          }
        }
      }
    };

    loadFromSupabase();
    return () => {
      active = false;
    };
  }, []);

  const handleManualSync = async () => {
    setSupabaseLoading(true);
    setSupabaseStatus('CONNECTING');
    try {
      // 1. Sync subsidiaries
      await SupabaseBridge.syncLocalToSupabase(subsidiaries);

      // 2. Sync corporate profile
      await SupabaseBridge.saveBusinessProfile(formData);

      // 3. Trigger full backend database sync for all ERP collections (inventory, leads, dealers, complaints, etc.)
      await SupabaseBridge.triggerFullBackendSync();

      setSupabaseStatus('CONNECTED');
      setSupabaseErrorMsg(null);
      alert("Successfully synchronized complete ERP database (inventory, leads, dealers, complaints, corporate units) to Supabase!");
    } catch (err: any) {
      console.error(err);
      const isTableMissing = err.code === 'PGRST116' || 
                             err.code === '42P01' || 
                             err.code === 'PGRST205' || 
                             (err.message && (
                               err.message.toLowerCase().includes('relation') ||
                               err.message.toLowerCase().includes('schema cache') ||
                               err.message.toLowerCase().includes('table') ||
                               err.message.toLowerCase().includes('pgrst205')
                             ));
      if (isTableMissing) {
        setSupabaseStatus('TABLE_NOT_FOUND');
        alert("Table structures do not exist or schema cache is stale. Please copy and execute the provided SQL setup script 'supabase_setup.sql' in your Supabase SQL Editor first!");
      } else {
        setSupabaseStatus('ERROR');
        setSupabaseErrorMsg(err.message || 'Handshake failed.');
        alert(`Handshake failed: ${err.message || 'Network error'}`);
      }
    } finally {
      setSupabaseLoading(false);
    }
  };


  // Search & Filter state
  const [subSearch, setSubSearch] = useState('');
  const [subTypeFilter, setSubTypeFilter] = useState('ALL');

  // Filtered sister corporate entities based on current search & tab
  const filteredSubs = subsidiaries.filter(sub => {
    // Type/Sector Tab Filter
    if (subTypeFilter !== 'ALL') {
      const typeLower = (sub.type || '').toLowerCase();
      if (subTypeFilter === 'HQ' && !typeLower.includes('headquarters') && !typeLower.includes('production')) {
        return false;
      }
      if (subTypeFilter === 'LOGISTICS' && !typeLower.includes('logistics') && !typeLower.includes('depot')) {
        return false;
      }
      if (subTypeFilter === 'RD' && !typeLower.includes('research') && !typeLower.includes('testing') && !typeLower.includes('lab') && !typeLower.includes('r&d')) {
        return false;
      }
      if (subTypeFilter === 'COMPLIANCE' && !typeLower.includes('compliance') && !typeLower.includes('reclamation') && !typeLower.includes('recycling') && !typeLower.includes('unit')) {
        return false;
      }
    }

    // Keyword Search Filter
    if (subSearch.trim()) {
      const searchLower = subSearch.toLowerCase();
      const nameMatch = (sub.name || '').toLowerCase().includes(searchLower);
      const shortMatch = (sub.shortName || '').toLowerCase().includes(searchLower);
      const managerMatch = (sub.manager || '').toLowerCase().includes(searchLower);
      const addressMatch = (sub.address || '').toLowerCase().includes(searchLower);
      const gstinMatch = (sub.gstin || '').toLowerCase().includes(searchLower);
      const cinMatch = (sub.cin || '').toLowerCase().includes(searchLower);
      return nameMatch || shortMatch || managerMatch || addressMatch || gstinMatch || cinMatch;
    }

    return true;
  });

  // Subsidiary edit/add states
  const [editingSub, setEditingSub] = useState<string | null>(null);
  const [showSubModal, setShowSubModal] = useState(false);
  const [subForm, setSubForm] = useState({
    name: '',
    shortName: '',
    type: 'Regional Logistics & Depot',
    gstin: '',
    cin: '',
    contactEmail: '',
    phone: '',
    website: 'www.arcenol.com',
    address: '',
    capacity: '5,000 MWh / Year',
    manager: '',
    status: 'ACTIVE'
  });

  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'profile' | 'users'>('profile');

  // User credentials management states and hooks
  const { usersList, addUser, updateUser, deleteUser, resetDefaultUsers, loginWithCredentials, fetchUsersFromServer } = useAuthStore();

  useEffect(() => {
    fetchUsersFromServer();
  }, [fetchUsersFromServer]);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'QUALITY_TEAM' as UserRole,
    department: ''
  });
  const [isEditingUser, setIsEditingUser] = useState<string | null>(null);
  const [userErrors, setUserErrors] = useState('');
  const [userSuccess, setUserSuccess] = useState('');
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  

  
  // Guard initialization to prevent subsequent background polls from wiping active form edits
  const [hasInitialized, setHasInitialized] = useState(false);

  // Provision for editing state & logo drag-and-drop activation states
  const [isEditable, setIsEditable] = useState(true);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isLeftImgDragActive, setIsLeftImgDragActive] = useState(false);

  // Load business profile values from ERP context data store
  useEffect(() => {
    if (data?.businessProfile && !hasInitialized) {
      setFormData({
        companyName: data.businessProfile.companyName || '',
        shortName: data.businessProfile.shortName || '',
        establishedYear: data.businessProfile.establishedYear || '',
        industrySector: data.businessProfile.industrySector || '',
        contactEmail: data.businessProfile.contactEmail || '',
        phone: data.businessProfile.phone || '',
        website: data.businessProfile.website || '',
        cin: data.businessProfile.cin || '',
        gstin: data.businessProfile.gstin || '',
        address: data.businessProfile.address || '',
        manufacturingCapacity: data.businessProfile.manufacturingCapacity || '',
        leadAcidOutput: data.businessProfile.leadAcidOutput || '',
        depotsCount: Number(data.businessProfile.depotsCount || 5),
        primaryRegion: data.businessProfile.primaryRegion || 'WEST_SOUTH',
        complianceOfficer: data.businessProfile.complianceOfficer || '',
        nodePassphrase: data.businessProfile.nodePassphrase || '',
        logo: data.businessProfile.logo || '',
        loginLeftImage: data.businessProfile.loginLeftImage || ''
      });
      setHasInitialized(true);
    }
  }, [data, hasInitialized]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (!isEditable) return; // Guard input modification if lock is active
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'depotsCount' ? Number(value) : value
    }));
    // Reset save success feedback on input edit
    if (saveStatus === 'success') {
      setSaveStatus('idle');
    }
  };

  // Drag and drop events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleLogoFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleLogoFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    document.getElementById('logo-file-input')?.click();
  };

  const compressAndResizeImage = (file: File, maxWidth: number, maxHeight: number): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onerror = () => resolve('');
      reader.onload = (e) => {
        const rawResult = e.target?.result as string;
        if (!rawResult) {
          resolve('');
          return;
        }
        if (file.type === 'image/svg+xml') {
          resolve(rawResult);
          return;
        }
        const img = new Image();
        img.onerror = () => resolve(rawResult);
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(rawResult);
              return;
            }

            ctx.drawImage(img, 0, 0, width, height);
            const resizedBase64 = canvas.toDataURL('image/jpeg', 0.85);
            resolve(resizedBase64 || rawResult);
          } catch (e) {
            resolve(rawResult);
          }
        };
        img.src = rawResult;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleLogoFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Corporate logo must be an image file (PNG, JPG, SVG, WebP).');
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000);
      return;
    }

    const base64 = await compressAndResizeImage(file, 512, 512);
    if (!base64) {
      setErrorMessage('Failed to process image file.');
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000);
      return;
    }

    setFormData(prev => ({
      ...prev,
      logo: base64
    }));
    setIsEditable(true); // Automatically enable full edit mode on logo upload
    setSaveStatus('idle');
  };

  const handleLeftImgDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsLeftImgDragActive(true);
  };

  const handleLeftImgDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsLeftImgDragActive(false);
  };

  const handleLeftImgDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsLeftImgDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleLeftImgFile(e.dataTransfer.files[0]);
    }
  };

  const handleLeftImgFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleLeftImgFile(e.target.files[0]);
    }
  };

  const triggerLeftImgFileInput = () => {
    document.getElementById('login-left-img-input')?.click();
  };

  const handleLeftImgFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Login left image must be an image file (PNG, JPG, SVG, WebP).');
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000);
      return;
    }

    const base64 = await compressAndResizeImage(file, 1280, 800);
    if (!base64) {
      setErrorMessage('Failed to process login left image file.');
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 5000);
      return;
    }

    setFormData(prev => ({
      ...prev,
      loginLeftImage: base64
    }));
    setIsEditable(true);
    setSaveStatus('idle');
  };

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditable) return;
    setSaveStatus('saving');
    setErrorMessage('');

    try {
      // Backup in localStorage immediately on browser side
      if (typeof window !== 'undefined') {
        localStorage.setItem('arcenol_business_profile_backup', JSON.stringify(formData));
      }

      // 1. Save to Express server cache
      const response = await fetch('/api/business-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Server responded with an operational error while updating the business profile.');
      }

      await refetch();

      // 2. Also back up the corporate profile to Supabase (catch and log warnings gracefully)
      try {
        await SupabaseBridge.saveBusinessProfile(formData);
        await syncBusinessProfileToSupabase(formData);
      } catch (sbErr) {
        console.warn("Supabase profile save deferred/failed (acceptable if database is not set up):", sbErr);
      }

      setSaveStatus('success');
      setHasInitialized(true); // Retain active form state
      
      // Auto dismiss success toast
      setTimeout(() => {
        setSaveStatus('idle');
      }, 5000);
    } catch (err: any) {
      console.error(err);
      setSaveStatus('error');
      setErrorMessage(err.message || 'Something went wrong while persisting settings.');
    }
  };

  const handleOpenAddSub = () => {
    setEditingSub(null);
    setSubForm({
      name: '',
      shortName: '',
      type: 'Regional Logistics & Depot',
      gstin: '',
      cin: '',
      contactEmail: '',
      phone: '',
      website: 'www.arcenol.com',
      address: '',
      capacity: '5,000 MWh / Year',
      manager: '',
      status: 'ACTIVE'
    });
    setShowSubModal(true);
  };

  const handleOpenEditSub = (sub: any) => {
    setEditingSub(sub.id);
    setSubForm({
      name: sub.name,
      shortName: sub.shortName,
      type: sub.type,
      gstin: sub.gstin,
      cin: sub.cin,
      contactEmail: sub.contactEmail,
      phone: sub.phone,
      website: sub.website || 'www.arcenol.com',
      address: sub.address,
      capacity: sub.capacity,
      manager: sub.manager,
      status: sub.status
    });
    setShowSubModal(true);
  };

  const handleSaveSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subForm.name.trim() || !subForm.shortName.trim()) {
      alert('Subsidiary Name and Short Name are required.');
      return;
    }

    const subId = editingSub || `SUB-${Date.now()}`;
    const targetSub = { id: subId, ...subForm };

    // 1. Update local state / cache (Express database sync)
    if (editingSub) {
      await fetch(`/api/subsidiaries/${editingSub}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subForm)
      });
    } else {
      await fetch('/api/subsidiaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targetSub)
      });
    }
    refetch();
    setShowSubModal(false);
    setEditingSub(null);

    // 2. Transmit to Supabase PostgreSQL real-time engine
    setSupabaseLoading(true);
    try {
      await SupabaseBridge.saveSubsidiary(targetSub);
      if (supabaseStatus === 'TABLE_NOT_FOUND' || supabaseStatus === 'ERROR') {
        setSupabaseStatus('CONNECTED');
        setSupabaseErrorMsg(null);
      }
    } catch (err: any) {
      console.warn("Supabase backup deferred until schema initialized:", err);
      if (err.code === 'PGRST116' || err.code === '42P01' || (err.message && err.message.includes('relation'))) {
        setSupabaseStatus('TABLE_NOT_FOUND');
      } else {
        setSupabaseErrorMsg(`Sync deferred: ${err.message || 'connection lag'}`);
      }
    } finally {
      setSupabaseLoading(false);
    }
  };

  const handleDeleteSub = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the business profile for ${name}?`)) {
      // 1. Delete from local state list
      await fetch(`/api/subsidiaries/${id}`, {
        method: 'DELETE'
      });
      refetch();

      // 2. Remove connection from Supabase
      setSupabaseLoading(true);
      try {
        await SupabaseBridge.deleteSubsidiary(id);
      } catch (err: any) {
        console.warn("Supabase delete deferred:", err);
        if (err.code === 'PGRST116' || err.code === '42P01' || (err.message && err.message.includes('relation'))) {
          setSupabaseStatus('TABLE_NOT_FOUND');
        } else {
          setSupabaseErrorMsg(`Sync failed: ${err.message || 'connection lag'}`);
        }
      } finally {
        setSupabaseLoading(false);
      }
    }
  };

  // UX Shortcut: Inject this subsidiary back into the active editing form
  const handlePushToActiveForm = (sub: any) => {
    setFormData({
      companyName: sub.name,
      shortName: sub.shortName || '',
      establishedYear: '2018', // baseline established year
      industrySector: sub.type || 'Energy Storage Infrastructure',
      contactEmail: sub.contactEmail || '',
      phone: sub.phone || '',
      website: sub.website || 'www.arcenol.com',
      cin: sub.cin || '',
      gstin: sub.gstin || '',
      address: sub.address || '',
      manufacturingCapacity: sub.capacity || '',
      leadAcidOutput: '150,000 Metric Tons / Year', // typical estimate
      depotsCount: 5,
      primaryRegion: 'WEST_SOUTH',
      complianceOfficer: sub.manager || 'Dr. Ananya Sharma',
      nodePassphrase: 'ARC-NODE-SECURE',
      logo: formData.logo || ''
    });
    setIsEditable(true);

    // Provide visual toast feedback
    setSaveStatus('success');
    setErrorMessage('');
    setTimeout(() => {
      setSaveStatus('idle');
    }, 4000);

    // Scroll to the top of the form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNodeSessionSwitch = (email: string, pass: string, name: string) => {
    const res = loginWithCredentials(email, pass);
    if (!res.success) {
      setUserErrors(res.error || 'Handshake failed.');
    }
  };

  return (
    <div className="space-y-12 pb-20 transition-all duration-500">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200/80">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic flex items-center">
            <ShieldCheck className="text-primary-600 mr-3 shrink-0" size={38} />
            SUPER ADMIN PANEL
          </h2>
          <div className="flex items-center mt-2 space-x-4">
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center bg-slate-100 px-3 py-1 rounded-full border border-slate-200/50">
               <Sliders size={14} className="mr-2 text-primary-600" /> Platform Administration & Core Matrix Settings
             </p>
             <span className="h-1 w-1 rounded-full bg-slate-200"></span>
             <p className="text-[10px] font-bold text-primary-600 uppercase tracking-[0.2em]">
               Authorization: Level 10 Superordinate
             </p>
          </div>
        </div>

        {/* Core Administrative Control Switcher */}
        <div className="flex space-x-2 bg-slate-100 p-1 rounded-2xl border border-slate-200/60 max-w-xl shrink-0 select-none">
          <button
            onClick={() => setActiveTab('profile')}
            className={cn(
              "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === 'profile' 
                ? "bg-white text-slate-950 shadow-md border border-slate-200/20" 
                : "text-slate-500 hover:text-slate-900"
            )}
          >
            Business Profile
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={cn(
              "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === 'users' 
                ? "bg-white text-indigo-650 shadow-md border border-slate-200/20" 
                : "text-slate-500 hover:text-slate-900"
            )}
            id="super-admin-users-tab-btn"
          >
            User Accounts
          </button>
        </div>
      </div>

      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Business Profile Settings Column */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSubmitProfile} className="bg-white rounded-[2.5rem] border border-slate-200/80 shadow-xl overflow-hidden">
              {/* Card Header */}
              <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic flex items-center">
                    <Building className="mr-2.5 text-primary-600" size={20} />
                    Corporate Registry Blueprint
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mt-1.5">Define corporate DNA, tax identifiers, and public-facing profiles</p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="font-mono text-[9px] uppercase font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200/50 select-none flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                    ACTIVE PROFILE EDITING
                  </div>
                </div>
              </div>

              {/* Card Form Inputs */}
              <div className="p-8 space-y-8">
                
                {/* Save Feedback Alerts */}
                {saveStatus === 'success' && (
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-xs font-bold text-emerald-800 flex items-center transition-all animate-in fade-in duration-300">
                    <CheckCircle2 className="mr-3 text-emerald-500 font-bold shrink-0" size={18} />
                    <div>
                      <p className="font-black text-[10px] uppercase tracking-wider text-emerald-950">Corporate Registry Updated</p>
                      <p className="text-[10px] font-medium text-emerald-600 mt-1">Changes have been saved and applied to the central directory.</p>
                    </div>
                  </div>
                )}

                {saveStatus === 'error' && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-xs font-bold text-red-800 flex items-center transition-all animate-in fade-in duration-300">
                    <AlertTriangle className="mr-3 text-red-500 font-bold shrink-0" size={18} />
                    <div>
                      <p className="font-black text-[10px] uppercase tracking-wider text-red-950">Update Transaction Aborted</p>
                      <p className="text-[10px] font-medium text-red-600 mt-0.5">{errorMessage}</p>
                    </div>
                  </div>
                )}

                {/* Company Logo Upload & Drag Drop Zone */}
                <div className="space-y-4">
                  <p className="text-[9px] font-black text-primary-600 uppercase tracking-[0.25em] flex items-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary-600 mr-2 animate-ping"></span>
                    Corporate Logo & Visual Brand Identity
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                    {/* Visual Preview */}
                    <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border border-slate-200/60 h-48">
                      {formData.logo ? (
                        <div className="relative group/logo">
                          <img 
                            src={formData.logo} 
                            alt="Preview Logo" 
                            className="w-36 h-36 object-contain rounded-xl bg-white p-2 border border-slate-200 shadow-md transition-transform group-hover/logo:scale-105"
                            referrerPolicy="no-referrer"
                          />
                          {isEditable && (
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, logo: '' }))}
                              className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-lg transition-all hover:scale-110 active:scale-90"
                              title="Remove logo"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <Building size={48} className="text-slate-300 stroke-[1.5]" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-3">No Logo Uploaded</span>
                        </div>
                      )}
                    </div>

                    {/* Interactive Dropzone / Upload Target */}
                    <div className="md:col-span-2">
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={triggerFileInput}
                        className={cn(
                          "border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 h-48 group select-none relative",
                          isDragActive 
                            ? "border-primary-500 bg-primary-50/20" 
                            : "border-slate-200 bg-slate-50 hover:bg-slate-100/50 hover:border-slate-300"
                        )}
                      >
                        <input
                          type="file"
                          id="logo-file-input"
                          className="hidden"
                          accept="image/*"
                          onChange={handleFileSelected}
                        />
                        <div className={cn(
                          "p-3 rounded-full mb-2 transition-transform duration-500",
                          isDragActive ? "bg-primary-100 text-primary-600 scale-110" : "bg-white text-slate-400 group-hover:scale-110 border border-slate-200/50"
                        )}>
                          <FileText size={20} />
                        </div>
                        <p className="text-xs font-bold text-slate-700">
                          {isDragActive ? "Drop Logo File Here" : "Drag & Drop Company Logo"}
                        </p>
                        <p className="text-[9px] text-slate-400 font-medium tracking-tight mt-1">
                          Supports PNG, JPG, WebP (Max 500KB) · Recommended format: 1:1 square ratio
                        </p>
                        {!isEditable ? (
                          <div className="mt-2 bg-primary-50 border border-primary-200 px-3 py-0.5 rounded-full text-[8px] font-black text-primary-700 uppercase tracking-widest flex items-center justify-center gap-1 group-hover:bg-primary-100 transition-colors">
                            Click or Drag to Upload & Edit
                          </div>
                        ) : (
                          <div className="mt-2 bg-emerald-50 border border-emerald-200 px-3 py-0.5 rounded-full text-[8px] font-black text-emerald-700 uppercase tracking-widest flex items-center justify-center gap-1">
                            🔓 Active Editing Mode
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Login Left Cover Image Upload & Drag Drop Zone */}
                <div className="space-y-4">
                  <p className="text-[9px] font-black text-primary-600 uppercase tracking-[0.25em] flex items-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary-600 mr-2 animate-ping"></span>
                    Login Page Left Cover Image
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                    {/* Visual Preview */}
                    <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200/60 h-48 overflow-hidden relative group/cover-preview">
                      {formData.loginLeftImage ? (
                        <div className="relative w-full h-full">
                          <img 
                            src={formData.loginLeftImage} 
                            alt="Preview Left Image" 
                            className="w-full h-full object-cover rounded-xl border border-slate-200 shadow-md transition-transform group-hover/cover-preview:scale-105"
                            referrerPolicy="no-referrer"
                          />
                          {isEditable && (
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, loginLeftImage: '' }))}
                              className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-lg transition-all hover:scale-110 active:scale-90 z-10"
                              title="Remove image"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400">
                          <ImageIcon size={48} className="text-slate-300 stroke-[1.5]" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-3 text-center">No Cover Image (Default Active)</span>
                        </div>
                      )}
                    </div>

                    {/* Interactive Dropzone / Upload Target */}
                    <div className="md:col-span-2">
                      <div
                        onDragOver={handleLeftImgDragOver}
                        onDragLeave={handleLeftImgDragLeave}
                        onDrop={handleLeftImgDrop}
                        onClick={triggerLeftImgFileInput}
                        className={cn(
                          "border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 h-48 group select-none relative",
                          isLeftImgDragActive 
                            ? "border-primary-500 bg-primary-50/20" 
                            : "border-slate-200 bg-slate-50 hover:bg-slate-100/50 hover:border-slate-300"
                        )}
                      >
                        <input
                          type="file"
                          id="login-left-img-input"
                          className="hidden"
                          accept="image/*"
                          onChange={handleLeftImgFileSelected}
                        />
                        <div className={cn(
                          "p-3 rounded-full mb-2 transition-transform duration-500",
                          isLeftImgDragActive ? "bg-primary-100 text-primary-600 scale-110" : "bg-white text-slate-400 group-hover:scale-110 border border-slate-200/50"
                        )}>
                          <UploadCloud size={20} />
                        </div>
                        <p className="text-xs font-bold text-slate-700">
                          {isLeftImgDragActive ? "Drop Cover Image File Here" : "Drag & Drop Login Left Cover Image"}
                        </p>
                        <p className="text-[9px] text-slate-400 font-medium tracking-tight mt-1">
                          Supports PNG, JPG, WebP (Max 1.5MB) · Recommended format: Portrait 4:3 or 16:9 ratio fitting the space
                        </p>
                        {!isEditable ? (
                          <div className="mt-2 bg-primary-50 border border-primary-200 px-3 py-0.5 rounded-full text-[8px] font-black text-primary-700 uppercase tracking-widest flex items-center justify-center gap-1 group-hover:bg-primary-100 transition-colors">
                            Click or Drag to Upload & Edit
                          </div>
                        ) : (
                          <div className="mt-2 bg-emerald-50 border border-emerald-200 px-3 py-0.5 rounded-full text-[8px] font-black text-emerald-700 uppercase tracking-widest flex items-center justify-center gap-1">
                            🔓 Active Editing Mode
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 1: Identity & Establishment */}
                <div className="space-y-4">
                  <p className="text-[9px] font-black text-primary-600 uppercase tracking-[0.25em] flex items-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary-600 mr-2"></span>
                    General Enterprise Representation
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Registered Enterprise Name</label>
                      <div className="relative">
                        <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type="text"
                          name="companyName"
                          required
                          disabled={!isEditable}
                          value={formData.companyName}
                          onChange={handleInputChange}
                          className={cn(
                            "w-full bg-slate-50 border rounded-2xl py-3.5 pl-12 pr-5 text-xs font-bold transition-all outline-none",
                            isEditable 
                              ? "border-slate-200 text-slate-800 focus:ring-2 focus:ring-primary-500/30 cursor-text" 
                              : "border-slate-200/50 text-slate-400 bg-slate-100/30 cursor-not-allowed"
                          )}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Short Name / Prefix</label>
                      <input
                        type="text"
                        name="shortName"
                        required
                        disabled={!isEditable}
                        value={formData.shortName}
                        onChange={handleInputChange}
                        className={cn(
                          "w-full bg-slate-50 border rounded-2xl py-3.5 px-5 text-xs font-black outline-none focus:ring-2 focus:ring-primary-500/30 transition-all font-mono uppercase",
                          isEditable 
                            ? "border-slate-200 text-slate-800 cursor-text animate-pulse-subtle" 
                            : "border-slate-200/50 text-slate-400 bg-slate-100/30 cursor-not-allowed"
                        )}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Industry & Production Sector</label>
                      <div className="relative">
                        <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type="text"
                          name="industrySector"
                          required
                          disabled={!isEditable}
                          value={formData.industrySector}
                          onChange={handleInputChange}
                          className={cn(
                            "w-full bg-slate-50 border rounded-2xl py-3.5 pl-12 pr-5 text-xs font-bold outline-none focus:ring-2 focus:ring-primary-500/30 transition-all font-sans",
                            isEditable 
                              ? "border-slate-200 text-slate-800 cursor-text" 
                              : "border-slate-200/50 text-slate-400 bg-slate-100/30 cursor-not-allowed"
                          )}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Year of Establishment</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type="number"
                          name="establishedYear"
                          required
                          min="1900"
                          max={new Date().getFullYear()}
                          disabled={!isEditable}
                          value={formData.establishedYear}
                          onChange={handleInputChange}
                          className={cn(
                            "w-full bg-slate-50 border rounded-2xl py-3.5 pl-12 pr-5 text-xs font-bold outline-none focus:ring-2 focus:ring-primary-500/30 transition-all font-mono",
                            isEditable 
                              ? "border-slate-200 text-slate-800 cursor-text" 
                              : "border-slate-200/50 text-slate-400 bg-slate-100/30 cursor-not-allowed"
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Contact & Website */}
                <div className="space-y-4 border-t border-slate-100 pt-6">
                  <p className="text-[9px] font-black text-primary-600 uppercase tracking-[0.25em] flex items-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary-600 mr-2"></span>
                    Communication & Gateway Handshakes
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Operations Email</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type="email"
                          name="contactEmail"
                          required
                          disabled={!isEditable}
                          value={formData.contactEmail}
                          onChange={handleInputChange}
                          className={cn(
                            "w-full bg-slate-50 border rounded-2xl py-3.5 pl-12 pr-5 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary-500/30 transition-all font-mono",
                            isEditable 
                              ? "border-slate-200 text-slate-800 cursor-text" 
                              : "border-slate-200/50 text-slate-400 bg-slate-100/30 cursor-not-allowed"
                          )}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Helpline Contact</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type="text"
                          name="phone"
                          required
                          disabled={!isEditable}
                          value={formData.phone}
                          onChange={handleInputChange}
                          className={cn(
                            "w-full bg-slate-50 border rounded-2xl py-3.5 pl-12 pr-5 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary-500/30 transition-all font-sans",
                            isEditable 
                              ? "border-slate-200 text-slate-800 cursor-text" 
                              : "border-slate-200/50 text-slate-400 bg-slate-100/30 cursor-not-allowed"
                          )}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Primary Web Portal</label>
                      <div className="relative">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type="text"
                          name="website"
                          required
                          disabled={!isEditable}
                          value={formData.website}
                          onChange={handleInputChange}
                          className={cn(
                            "w-full bg-slate-50 border rounded-2xl py-3.5 pl-12 pr-5 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary-500/30 transition-all font-mono",
                            isEditable 
                              ? "border-slate-200 text-slate-800 cursor-text" 
                              : "border-slate-200/50 text-slate-400 bg-slate-100/30 cursor-not-allowed"
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3: Regulatory & Location */}
                <div className="space-y-4 border-t border-slate-100 pt-6">
                  <p className="text-[9px] font-black text-primary-600 uppercase tracking-[0.25em] flex items-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary-600 mr-2"></span>
                    Regulatory Identification & Tax Nodes
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Corporate Identity Number (CIN)</label>
                      <div className="relative">
                        <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type="text"
                          name="cin"
                          required
                          disabled={!isEditable}
                          placeholder="e.g. U31900GJ2018PTC102145"
                          value={formData.cin}
                          onChange={handleInputChange}
                          className={cn(
                            "w-full bg-slate-50 border rounded-2xl py-3.5 pl-12 pr-5 text-xs font-black outline-none focus:ring-2 focus:ring-primary-500/30 transition-all font-mono uppercase",
                            isEditable 
                              ? "border-slate-200 text-slate-800 cursor-text" 
                              : "border-slate-200/50 text-slate-400 bg-slate-100/30 cursor-not-allowed"
                          )}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Central GST Registration (GSTIN)</label>
                      <div className="relative">
                        <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type="text"
                          name="gstin"
                          required
                          disabled={!isEditable}
                          placeholder="e.g. 24AAHCA9192M1ZP"
                          value={formData.gstin}
                          onChange={handleInputChange}
                          className={cn(
                            "w-full bg-slate-50 border rounded-2xl py-3.5 pl-12 pr-5 text-xs font-black outline-none focus:ring-2 focus:ring-primary-500/30 transition-all font-mono uppercase",
                            isEditable 
                              ? "border-slate-200 text-slate-800 cursor-text" 
                              : "border-slate-200/50 text-slate-400 bg-slate-100/30 cursor-not-allowed"
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Headquarters Registered Address</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-4 text-slate-400" size={16} />
                      <textarea
                        name="address"
                        required
                        rows={3}
                        disabled={!isEditable}
                        value={formData.address}
                        onChange={handleInputChange}
                        className={cn(
                          "w-full bg-slate-50 border rounded-2xl p-4 pl-12 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary-500/30 transition-all font-sans leading-relaxed resize-none",
                          isEditable 
                            ? "border-slate-200 text-slate-800 cursor-text" 
                            : "border-slate-200/50 text-slate-400 bg-slate-100/30 cursor-not-allowed"
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 4: Operational capacity limits */}
                <div className="space-y-4 border-t border-slate-100 pt-6">
                  <p className="text-[9px] font-black text-primary-600 uppercase tracking-[0.25em] flex items-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary-600 mr-2"></span>
                    Operational Limits & Scale parameters
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Cell Production/Yr</label>
                      <div className="relative">
                        <Activity className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type="text"
                          name="manufacturingCapacity"
                          required
                          disabled={!isEditable}
                          value={formData.manufacturingCapacity}
                          onChange={handleInputChange}
                          className={cn(
                            "w-full bg-slate-50 border rounded-2xl py-3.5 pl-12 pr-5 text-xs font-bold outline-none focus:ring-2 focus:ring-primary-500/30 transition-all font-mono",
                            isEditable 
                              ? "border-slate-200 text-slate-800 cursor-text" 
                              : "border-slate-200/50 text-slate-400 bg-slate-100/30 cursor-not-allowed"
                          )}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Lead-Plate Output/Yr</label>
                      <div className="relative">
                        <Sliders className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type="text"
                          name="leadAcidOutput"
                          required
                          disabled={!isEditable}
                          value={formData.leadAcidOutput}
                          onChange={handleInputChange}
                          className={cn(
                            "w-full bg-slate-50 border rounded-2xl py-3.5 pl-12 pr-5 text-xs font-bold outline-none focus:ring-2 focus:ring-primary-500/30 transition-all font-mono",
                            isEditable 
                              ? "border-slate-200 text-slate-800 cursor-text" 
                              : "border-slate-200/50 text-slate-400 bg-slate-100/30 cursor-not-allowed"
                          )}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Active Warehouses Depots</label>
                      <div className="relative">
                        <Warehouse className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type="number"
                          name="depotsCount"
                          required
                          min="1"
                          max="20"
                          disabled={!isEditable}
                          value={formData.depotsCount || ''}
                          onChange={handleInputChange}
                          className={cn(
                            "w-full bg-slate-50 border rounded-2xl py-3.5 pl-12 pr-5 text-xs font-bold outline-none focus:ring-2 focus:ring-primary-500/30 transition-all font-mono",
                            isEditable 
                              ? "border-slate-200 text-slate-800 cursor-text" 
                              : "border-slate-200/50 text-slate-400 bg-slate-100/30 cursor-not-allowed"
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Primary Trading Region</label>
                      <select
                        name="primaryRegion"
                        disabled={!isEditable}
                        value={formData.primaryRegion}
                        onChange={handleInputChange}
                        className={cn(
                          "w-full bg-slate-50 border rounded-2xl py-3.5 px-5 text-xs font-bold outline-none focus:ring-2 focus:ring-primary-500/30 transition-all font-mono uppercase",
                          isEditable 
                            ? "border-slate-200 text-slate-800 cursor-pointer text-slate-800 bg-white" 
                            : "border-slate-200/50 text-slate-400 bg-slate-100/30 cursor-not-allowed"
                        )}
                      >
                        <option value="WEST_SOUTH">WEST & SOUTH INDIA (PRIMARY)</option>
                        <option value="NORTH_EAST">NORTH & EAST INDIA</option>
                        <option value="ALL">PAN-INDIA CORE OPERATIONS</option>
                        <option value="GLOBAL">INTERNATIONAL EXPORT ZONE</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Chief compliance / Registrar</label>
                      <div className="relative">
                        <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type="text"
                          name="complianceOfficer"
                          required
                          disabled={!isEditable}
                          value={formData.complianceOfficer}
                          onChange={handleInputChange}
                          className={cn(
                            "w-full bg-slate-50 border rounded-2xl py-3.5 pl-12 pr-5 text-xs font-bold outline-none focus:ring-2 focus:ring-primary-500/30 transition-all text-ellipsis",
                            isEditable 
                              ? "border-slate-200 text-slate-800 cursor-text" 
                              : "border-slate-200/50 text-slate-400 bg-slate-100/30 cursor-not-allowed"
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 5: Admin Passphrase Settings */}
                <div className="space-y-4 border-t border-slate-100 pt-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block font-sans">Corporate Administrator Passphrase</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        type="password"
                        name="nodePassphrase"
                        required
                        placeholder="••••••••••••••••••••"
                        disabled={!isEditable}
                        value={formData.nodePassphrase}
                        onChange={handleInputChange}
                        className={cn(
                          "w-full bg-slate-50 border rounded-2xl py-3.5 pl-12 pr-5 text-xs font-bold outline-none focus:ring-2 focus:ring-primary-500/30 transition-all font-mono",
                          isEditable 
                            ? "border-slate-200 text-slate-800 cursor-text" 
                            : "border-slate-200/50 text-slate-400 bg-slate-100/30 cursor-not-allowed"
                        )}
                      />
                    </div>
                    <p className="text-[9px] text-slate-400 font-semibold italic font-sans text-slate-400">Specify an administrative passphrase to safeguard manual configuration deployments.</p>
                  </div>
                </div>

              </div>

              {/* Action Form Footer */}
              <div className="p-8 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden sm:block">
                  Status: {isEditable ? "🔓 Unlocked & Modifying" : "🔒 Locked / View Only"}
                </div>
                <div className="flex space-x-3 w-full sm:w-auto">
                  <button
                    type="button"
                    disabled={!isEditable}
                    onClick={() => {
                      if (data?.businessProfile) {
                        setFormData({ 
                          ...data.businessProfile,
                          logo: data.businessProfile.logo || ''
                        });
                        setSaveStatus('idle');
                      }
                    }}
                    className={cn(
                      "flex-1 sm:flex-none border px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all font-sans",
                      isEditable 
                        ? "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 active:scale-95" 
                        : "bg-slate-100 border-slate-200/50 text-slate-400 cursor-not-allowed"
                    )}
                  >
                    Reset Changes
                  </button>
                  <button
                    type="submit"
                    disabled={!isEditable || saveStatus === 'saving'}
                    className={cn(
                      "flex-1 sm:flex-none px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center",
                      isEditable 
                        ? "bg-primary-600 hover:brightness-110 text-white shadow-primary-500/20" 
                        : "bg-slate-100 text-slate-400 border border-slate-200/50 cursor-not-allowed shadow-none"
                    )}
                  >
                    {saveStatus === 'saving' ? (
                      <>
                        <RefreshCw className="animate-spin mr-2" size={14} />
                        Securing Matrix...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2" size={14} />
                        Deploy Profile State
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>

            {/* Corporate Entity & Subsidiaries Matrix Table CARD */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200/80 shadow-xl overflow-hidden mt-8 p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic flex items-center">
                    <Building className="mr-2.5 text-primary-600" size={20} />
                    Corporate Entity & Subsidiaries Matrix
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mt-1.5">
                    Central directory of sister corporations, manufacturing plants, and regional logistics hubs
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddSub}
                  className="px-4 py-2.5 bg-primary-600 hover:brightness-110 active:scale-[0.98] text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md shadow-primary-500/10 flex items-center gap-1.5 shrink-0 self-start sm:self-center"
                >
                  <Building size={12} />
                  Deploy Sister Unit
                </button>
              </div>

              {/* Supabase PostgreSQL Database Integration Status Section */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="px-2.5 py-1 bg-slate-900 text-slate-100 rounded-lg text-[9px] font-mono font-black uppercase tracking-widest">
                        SUPABASE ACTIVE HANDSHAKE
                      </div>
                      
                      {supabaseStatus === 'CONNECTED' && (
                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/40">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                          CONNECTED & LIVE
                        </div>
                      )}
                      {supabaseStatus === 'CONNECTING' && (
                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-sky-50 text-sky-700 border border-sky-200/40 animate-pulse">
                          <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-spin"></span>
                          CONNECTING HANDSHAKE...
                        </div>
                      )}
                      {supabaseStatus === 'TABLE_NOT_FOUND' && (
                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200/40">
                          <span className="w-1.5 h-1.5 bg-amber-550 rounded-full"></span>
                          SCHEMA REQUIRED
                        </div>
                      )}
                      {supabaseStatus === 'ERROR' && (
                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200/40">
                          <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
                          CONNECTION OFFLINE
                        </div>
                      )}
                    </div>
                    <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500 font-semibold mt-1">
                      <span className="flex items-center gap-1">
                        <Globe size={12} className="text-slate-400" />
                        URL: <span className="font-mono text-slate-700">https://vuastgyyrscopjmnhaew.supabase.co</span>
                      </span>
                      <span className="text-slate-350">|</span>
                      <span className="flex items-center gap-1">
                        <Database size={12} className="text-slate-400" />
                        Table: <span className="font-mono text-slate-700 select-all">arcenol_corporate_units</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
                    <button
                      type="button"
                      onClick={handleManualSync}
                      disabled={supabaseLoading}
                      className={cn(
                        "px-3 py-2 bg-white hover:bg-slate-50 active:scale-95 text-slate-700 rounded-xl text-[9px] font-black uppercase tracking-wider leading-none transition-all border border-slate-200 shadow-sm flex items-center gap-1.5 select-none",
                        supabaseLoading ? "cursor-wait opacity-60" : ""
                      )}
                    >
                      {supabaseLoading ? (
                        <RefreshCw className="animate-spin" size={12} />
                      ) : (
                        <RefreshCw size={12} />
                      )}
                      Force db Sync
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSqlHelper(!showSqlHelper)}
                      className="px-3 py-2 bg-primary-50 hover:bg-primary-100 active:scale-95 text-primary-700 rounded-xl text-[9px] font-black uppercase tracking-wider leading-none transition-all border border-primary-100 flex items-center gap-1.5 select-none"
                    >
                      <Code size={12} />
                      {showSqlHelper ? "Hide SQL Setup" : "Show SQL Setup"}
                    </button>
                  </div>
                </div>

                {/* Display connection error warning if table or network faults */}
                {supabaseErrorMsg && supabaseStatus !== 'TABLE_NOT_FOUND' && (
                  <div className="text-[10px] bg-red-50 text-red-700 p-2.5 px-3 rounded-lg font-bold border border-red-100 flex items-center gap-2 animate-in fade-in">
                    <AlertTriangle size={13} className="shrink-0 text-red-500" />
                    <span>{supabaseErrorMsg}</span>
                  </div>
                )}

                {/* TABLE_NOT_FOUND State Information */}
                {supabaseStatus === 'TABLE_NOT_FOUND' && (
                  <div className="bg-amber-50/75 border border-amber-200/50 rounded-2xl p-4 text-xs space-y-2 text-amber-900 transition-all animate-in fade-in">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-black text-[10px] uppercase tracking-wider text-amber-950">Supabase Table Structure Not Yet Initialized</p>
                        <p className="text-[10px] font-medium leading-relaxed text-amber-800">
                          The client could not locate the table <code className="font-mono bg-white border border-amber-200 text-amber-950 px-1.5 py-0.5 rounded font-black">arcenol_corporate_units</code> (PGRST205 / Table Not Found). 
                          The system has transparently failed over to local cache/localStorage to ensure full operation, but remote database saving is currently queued.
                        </p>
                        <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mt-1">
                          👉 We have created the <code className="font-mono font-black text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded border border-primary-200">supabase_setup.sql</code> script at your project root file directory! You can copy its contents or press "Show SQL Setup" below to run the schema directly in your Supabase SQL Editor.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* SQL Helper Code Area */}
                {showSqlHelper && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-slate-100 space-y-3 font-mono text-[10px] select-text relative transition-all animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-1.5">
                        <Terminal size={12} className="text-slate-400" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Supabase SQL Editor Deployment Blueprint</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const sql = `create table if not exists arcenol_corporate_units (
  id text primary key,
  name text not null,
  shortName text,
  type text,
  gstin text,
  cin text,
  contactEmail text,
  phone text,
  website text,
  address text,
  capacity text,
  manager text,
  status text,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS) policies for secure anonymous REST CRUD
alter table arcenol_corporate_units enable row level security;
create policy "Allow public access to all records" on arcenol_corporate_units for all using (true);`;
                          navigator.clipboard.writeText(sql);
                          setShowSqlCopied(true);
                          setTimeout(() => setShowSqlCopied(false), 3000);
                        }}
                        className="p-1 px-3.5 bg-slate-800 hover:bg-slate-750 active:scale-95 text-white text-[9px] rounded-lg font-bold flex items-center gap-1.5 border border-slate-700 transition"
                      >
                        {showSqlCopied ? (
                          <>
                            <Check size={11} className="text-emerald-400" />
                            Copied Setup Script!
                          </>
                        ) : (
                          <>
                            <Copy size={11} />
                            Copy SQL Code
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="overflow-x-auto text-slate-300 bg-slate-950 p-3 rounded-lg max-h-64 leading-relaxed font-normal text-[9px]">
{`create table if not exists arcenol_corporate_units (
  id text primary key,
  name text not null,
  shortName text,
  type text,
  gstin text,
  cin text,
  contactEmail text,
  phone text,
  website text,
  address text,
  capacity text,
  manager text,
  status text,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS) policies for secure anonymous REST CRUD
alter table arcenol_corporate_units enable row level security;
create policy "Allow public access to all records" on arcenol_corporate_units for all using (true);`}
                    </pre>
                  </div>
                )}
              </div>

              {/* Filters and Search toolbar */}
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                {/* Filter Tabs */}
                <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/40 w-full md:w-auto">
                  {[
                    { key: 'ALL', label: 'All Units' },
                    { key: 'HQ', label: 'Production / HQ' },
                    { key: 'LOGISTICS', label: 'Logistics Depots' },
                    { key: 'RD', label: 'R&D Labs' },
                    { key: 'COMPLIANCE', label: 'Compliance' }
                  ].map(tb => (
                    <button
                      key={tb.key}
                      type="button"
                      onClick={() => setSubTypeFilter(tb.key)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all",
                        subTypeFilter === tb.key
                          ? "bg-white text-slate-950 shadow-sm border border-slate-200/20"
                          : "text-slate-500 hover:text-slate-900"
                      )}
                    >
                      {tb.label}
                    </button>
                  ))}
                </div>

                {/* Search Input */}
                <div className="relative w-full md:w-72">
                  <input
                    type="text"
                    placeholder="Search entities, GSTIN, managers..."
                    value={subSearch}
                    onChange={(e) => setSubSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-4 pl-9 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 transition-all placeholder:text-slate-400"
                  />
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  {subSearch && (
                    <button
                      type="button"
                      onClick={() => setSubSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-405 hover:text-slate-600 font-bold"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* Table Ledger */}
              <div className="border border-slate-200/80 rounded-[1.5rem] overflow-hidden bg-slate-50/10 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                        <th className="p-4 py-4.5 pl-6">Unit Designation & Regional Coding</th>
                        <th className="p-4 py-4.5">Regulatory Identifier (GSTIN | CIN)</th>
                        <th className="p-4 py-4.5">Managerial Responsibility</th>
                        <th className="p-4 py-4.5">Operating Capacity</th>
                        <th className="p-4 py-4.5">Status</th>
                        <th className="p-4 py-4.5 text-right pr-6">Report Control</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/80 bg-white">
                      {filteredSubs.length > 0 ? (
                        filteredSubs.map((sub) => {
                          // Get a stylish default character emblem like 'A' or related prefix
                          const emblemLetter = sub.shortName?.charAt(0) || 'A';
                          return (
                            <tr key={sub.id} className="hover:bg-slate-50/60 transition-all duration-150 group">
                              <td className="p-4 py-5 pl-6 align-middle">
                                <div className="flex items-start gap-4">
                                  {/* Custom BRAND SQUARE as shown in mockup */}
                                  <div className="w-11 h-11 bg-slate-900 border border-slate-800 text-white flex items-center justify-center rounded-xl font-black italic shadow-inner text-base select-none shrink-0 border-indigo-950/20">
                                    <span className="text-transparent bg-clip-text bg-gradient-to-tr from-slate-100 to-indigo-100">{emblemLetter}</span>
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-extrabold text-slate-900 text-xs tracking-tight leading-normal group-hover:text-primary-650 transition-colors">
                                      {sub.name}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2 mt-1.5 font-mono text-[9px] font-bold uppercase select-none">
                                      <span className="text-primary-800 bg-primary-100/70 px-2 py-0.5 rounded-md border border-primary-200/50">
                                        {sub.shortName || 'SUB'}
                                      </span>
                                      <span className="text-slate-500 bg-slate-100/65 px-2 py-0.5 rounded-md border border-slate-200">
                                        {sub.type}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-semibold tracking-tight mt-1.5 flex items-center max-w-sm">
                                      <MapPin size={11} className="mr-1 text-slate-350 shrink-0 mt-0.5" />
                                      <span className="truncate">{sub.address}</span>
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 py-5 font-mono text-[11px] align-middle">
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[8px] font-black text-sky-800 bg-sky-50 border border-sky-200/60 py-0.5 px-1.5 rounded-md uppercase tracking-widest font-sans select-none scale-90 origin-left">
                                      GSTIN
                                    </span>
                                    <span className="font-extrabold text-slate-800 leading-none">{sub.gstin || 'N/A'}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 font-semibold">
                                    <span className="text-[8px] font-black text-slate-500 bg-slate-50 border border-slate-200 py-0.5 px-1.5 rounded-md uppercase tracking-widest font-sans select-none scale-90 origin-left">
                                      CIN
                                    </span>
                                    <span className="text-slate-500 leading-none">{sub.cin || 'N/A'}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 py-5 align-middle">
                                <p className="font-black text-slate-800 text-xs">{sub.manager}</p>
                                <div className="flex flex-col mt-1 text-[10px] text-slate-450 font-semibold font-mono space-y-0.5">
                                  <span className="truncate flex items-center">
                                    <Mail size={10} className="mr-1 text-slate-350 shrink-0" />
                                    {sub.contactEmail}
                                  </span>
                                  <span className="flex items-center mt-0.5 text-slate-400">
                                    <Phone size={10} className="mr-1 text-slate-350 shrink-0" />
                                    {sub.phone}
                                  </span>
                                </div>
                              </td>
                              <td className="p-4 py-5 font-mono align-middle">
                                <p className="text-xs font-black text-slate-900 tracking-tight">{sub.capacity}</p>
                                <p className="text-[8px] text-slate-400 font-extrabold uppercase mt-0.5 tracking-wider font-sans select-none">Capacity Metrics</p>
                              </td>
                              <td className="p-4 py-5 align-middle">
                                <span className={cn(
                                  "px-2.5 py-1 rounded-full text-[9px] font-extrabold tracking-wider font-mono inline-flex items-center gap-1.5 border select-none",
                                  sub.status === 'ACTIVE' 
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200/80" 
                                    : sub.status === 'AUDITING' 
                                    ? "bg-amber-50 text-amber-800 border-amber-200/80 animate-pulse-subtle" 
                                    : "bg-rose-50 text-rose-800 border-rose-200/80"
                                )}>
                                  <span className={cn(
                                    "w-1.5 h-1.5 rounded-full shrink-0",
                                    sub.status === 'ACTIVE' ? "bg-emerald-500" :
                                    sub.status === 'AUDITING' ? "bg-amber-500 animate-pulse" :
                                    "bg-rose-500"
                                  )}></span>
                                  {sub.status}
                                </span>
                              </td>
                              <td className="p-4 py-5 text-right pr-6 align-middle whitespace-nowrap">
                                <div className="flex items-center justify-end gap-2">
                                  {/* "Load Metrics" action replacement, referencing mockup */}
                                  <button
                                    type="button"
                                    onClick={() => handlePushToActiveForm(sub)}
                                    className="px-3.5 h-[28px] bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 hover:border-slate-405 shadow-sm rounded-lg text-[9px] font-black uppercase tracking-widest inline-flex items-center transition-all hover:scale-[1.03] active:scale-95"
                                    title="Deploy this sister branch's values with the blueprint editing form above"
                                  >
                                    <RefreshCw size={9} className="mr-1.5 text-slate-400 font-bold shrink-0 animate-spin-slow" />
                                    Load Metrics
                                  </button>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditSub(sub)}
                                      className="p-1.5 bg-white hover:bg-slate-50 text-slate-600 rounded-lg border border-slate-250 shadow-sm transition-all hover:scale-105"
                                      title="Edit sister core details"
                                    >
                                      <Edit size={11} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteSub(sub.id, sub.name)}
                                      className="p-1.5 bg-white hover:bg-red-50 text-red-650 rounded-lg border border-slate-250 hover:border-red-200 shadow-sm transition-all hover:scale-105"
                                      title="Revoke sister unit"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-12 text-center text-slate-400 font-bold uppercase tracking-wider text-xs">
                            <Globe className="mx-auto mb-3 text-slate-300 stroke-[1.5]" size={36} />
                            No core subsidiaries matching search criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-slate-50/50 border border-slate-200/40 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between text-[10px] text-slate-400 font-semibold gap-2">
                <span>Showing {filteredSubs.length} of {subsidiaries.length} corporate registry units</span>
                <span className="flex items-center text-primary-600 font-bold uppercase tracking-wider">
                  <ShieldCheck size={14} className="mr-1 text-primary-500" />
                  Fully auditing all subsidiaries via GSTIN central nodes
                </span>
              </div>
            </div>

            {/* Subsidiary Edit/Create Modal */}
            {showSubModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-300">
                <div className="bg-white rounded-[2.5rem] border border-slate-200/80 shadow-2xl overflow-hidden w-full max-w-2xl animate-in zoom-in-95 duration-200">
                  {/* Modal Header */}
                  <div className="p-8 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic flex items-center">
                        <Building className="mr-2.5 text-primary-600" size={20} />
                        {editingSub ? 'Mutate Corporate Entity' : 'Deploy Sister Entity Branch'}
                      </h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mt-1.5">
                        {editingSub ? 'Modify existing subsidiary database details' : 'Register a new subsidiary unit or warehouse depot'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowSubModal(false)}
                      className="p-11/2 p-2 hover:bg-slate-150 text-slate-405 hover:text-slate-700 rounded-full transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleSaveSub}>
                    <div className="p-8 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
                        <div className="space-y-1.5 md:col-span-2">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Registered Business Name</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Arcenol Power Solutions Ltd"
                            value={subForm.name}
                            onChange={(e) => setSubForm(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-primary-500/10 transition-all"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Short Name / prefix</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. ARC-POW"
                            value={subForm.shortName}
                            onChange={(e) => setSubForm(prev => ({ ...prev, shortName: e.target.value.toUpperCase() }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-black text-slate-800 outline-none focus:ring-2 focus:ring-primary-500/10 transition-all font-mono uppercase"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Functional Role / Sector</label>
                          <select
                            value={subForm.type}
                            onChange={(e) => setSubForm(prev => ({ ...prev, type: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary-500/10"
                          >
                            <option value="Headquarters & Primary Production">Headquarters & Primary Production</option>
                            <option value="Regional Logistics & Depot">Regional Logistics & Depot</option>
                            <option value="Research & Testing Lab">Research & Testing Lab</option>
                            <option value="Compliance & Reclamation Unit">Compliance & Reclamation Unit</option>
                            <option value="Dealers Distribution Office">Dealers Distribution Office</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Operations Supervisor</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. John Doe, M.B.A."
                            value={subForm.manager}
                            onChange={(e) => setSubForm(prev => ({ ...prev, manager: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-primary-500/10 transition-all font-sans"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-[10px]">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block font-sans">Central GSTIN (15 symbols)</label>
                          <input
                            type="text"
                            placeholder="e.g. 24AAHCA9192M1ZP"
                            maxLength={15}
                            value={subForm.gstin}
                            onChange={(e) => setSubForm(prev => ({ ...prev, gstin: e.target.value.toUpperCase() }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-black text-slate-800 outline-none focus:ring-2 focus:ring-primary-500/10 transition-all uppercase"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block font-sans">Corporate Identity Number (CIN)</label>
                          <input
                            type="text"
                            placeholder="e.g. U31900GJ2018PTC102145"
                            value={subForm.cin}
                            onChange={(e) => setSubForm(prev => ({ ...prev, cin: e.target.value.toUpperCase() }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-black text-slate-800 outline-none focus:ring-2 focus:ring-primary-500/10 transition-all uppercase"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Operations Email</label>
                          <input
                            type="email"
                            required
                            placeholder="ops@arcenol.com"
                            value={subForm.contactEmail}
                            onChange={(e) => setSubForm(prev => ({ ...prev, contactEmail: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-primary-500/10 transition-all font-mono"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Helpline Phone</label>
                          <input
                            type="text"
                            required
                            placeholder="+91 XXXXX XXXXX"
                            value={subForm.phone}
                            onChange={(e) => setSubForm(prev => ({ ...prev, phone: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-primary-500/10 transition-all font-sans"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Operating Capacity Level</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. 5,000 MWh / Year"
                            value={subForm.capacity}
                            onChange={(e) => setSubForm(prev => ({ ...prev, capacity: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-primary-500/10 transition-all font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5 md:col-span-2">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Registered Address Location</label>
                          <input
                            type="text"
                            required
                            placeholder="Mihan SEZ, Nagpur, MH - 44002 dump"
                            value={subForm.address}
                            onChange={(e) => setSubForm(prev => ({ ...prev, address: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-primary-500/10 transition-all font-sans"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Operations State</label>
                          <select
                            value={subForm.status}
                            onChange={(e) => setSubForm(prev => ({ ...prev, status: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary-500/10 shadow-sm"
                          >
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="AUDITING">AUDITING</option>
                            <option value="MAINTENANCE">MAINTENANCE</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Modal Action Footer */}
                    <div className="p-8 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setShowSubModal(false)}
                        className="px-6 py-3 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-3 bg-primary-600 hover:brightness-110 active:scale-[0.98] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all"
                      >
                        {editingSub ? 'Mutate Corporate Unit' : 'Save Sister Unit'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Metadata Info Cards */}
          <div className="space-y-6">
            
            {/* Real-time Enterprise Card */}
            <div className="traditional-mandala-card p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
               {/* Traditional Mandalas from Image 5 */}
               <div className="absolute top-0 left-0 w-24 h-24 opacity-[0.08] pointer-events-none transform -translate-x-6 -translate-y-6 select-none">
                  <svg viewBox="0 0 100 100" fill="none" stroke="#7c1d3c" strokeWidth="1.2">
                     <circle cx="50" cy="50" r="45" strokeDasharray="2 2" />
                     <circle cx="50" cy="50" r="38" />
                     <circle cx="50" cy="50" r="30" strokeDasharray="1 1" />
                     <circle cx="50" cy="50" r="22" />
                     <circle cx="50" cy="50" r="14" />
                     <circle cx="50" cy="50" r="6" />
                     {Array.from({ length: 16 }).map((_, i) => {
                        const angle = (i * 360) / 16;
                        return (
                           <g key={i} transform={`rotate(${angle} 50 50)`}>
                              <path d="M50 50 C48 35, 52 35, 50 50" />
                              <path d="M50 50 C46 20, 54 20, 50 50" strokeWidth="0.5" />
                              <circle cx="50" cy="18" r="1.2" fill="#7c1d3c" />
                           </g>
                        );
                     })}
                  </svg>
               </div>
               <div className="absolute right-0 bottom-0 w-28 h-28 opacity-[0.08] pointer-events-none transform translate-x-8 translate-y-8 select-none">
                  <svg viewBox="0 0 100 100" fill="none" stroke="#7c1d3c" strokeWidth="1.2">
                     <circle cx="50" cy="50" r="45" strokeDasharray="2 2" />
                     <circle cx="50" cy="50" r="38" />
                     <circle cx="50" cy="50" r="30" strokeDasharray="1 1" />
                     <circle cx="50" cy="50" r="22" />
                     <circle cx="50" cy="50" r="14" />
                     <circle cx="50" cy="50" r="6" />
                     {Array.from({ length: 16 }).map((_, i) => {
                        const angle = (i * 360) / 16;
                        return (
                           <g key={i} transform={`rotate(${angle} 50 50)`}>
                              <path d="M50 50 C48 35, 52 35, 50 50" />
                              <path d="M50 50 C46 20, 54 20, 50 50" strokeWidth="0.5" />
                              <circle cx="50" cy="18" r="1.2" fill="#7c1d3c" />
                           </g>
                        );
                     })}
                  </svg>
               </div>
              
              <p className="text-[10px] font-black text-[#7c1d3c] uppercase tracking-[0.3em] mb-6 relative z-10">Master Enterprise DNA</p>
              
              <div className="space-y-6 relative z-10">
                <div className="border-b border-[#7c1d3c]/15 pb-4">
                  <p className="text-[9px] font-bold text-[#7c1d3c]/70 uppercase tracking-widest">Active Corporation</p>
                  <h4 className="text-xl font-black italic tracking-tighter uppercase mt-1 text-[#3c0c1b]">
                    {formData.companyName || 'Not Set'}
                  </h4>
                </div>
 
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] font-bold text-[#7c1d3c]/70 uppercase tracking-widest">Identity ID</p>
                    <p className="text-xs font-bold font-mono tracking-wider text-[#3c0c1b] mt-1">{formData.shortName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-[#7c1d3c]/70 uppercase tracking-widest">Established</p>
                    <p className="text-xs font-bold font-mono text-[#3c0c1b] mt-1">{formData.establishedYear || 'N/A'}</p>
                  </div>
                </div>
 
                <div className="pt-4 border-t border-[#7c1d3c]/15 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#7c1d3c]/70 text-[9px] uppercase tracking-widest font-bold">Region Network</span>
                    <span className="font-mono text-[9px] font-black uppercase text-[#3c0c1b]">{formData.primaryRegion}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#7c1d3c]/70 text-[9px] uppercase tracking-widest font-bold">GSTIN verified</span>
                    <span className="font-mono text-[9px] font-black text-[#3c0c1b]">{formData.gstin ? 'YES' : 'NO'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#7c1d3c]/70 text-[9px] uppercase tracking-widest font-bold">Capacity Rate</span>
                    <span className="font-mono text-[9px] font-black text-[#3c0c1b]">{formData.manufacturingCapacity}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Corporate Regulatory Card */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200/80 shadow-lg space-y-6">
              <div className="flex items-center space-x-3 border-b border-slate-50 pb-4">
                <div className="p-2.5 bg-slate-50 text-primary-600 rounded-xl border border-slate-100">
                  <Database size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Master Authority Stats</h4>
                  <p className="text-[9px] text-slate-400 font-semibold tracking-tight uppercase">Operational node clearances</p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { label: "Authorized Officers", value: "01 Master Node", detail: "Dr. Ananya Sharma", progress: 100 },
                  { label: "Regional Warehouses", value: `${formData.depotsCount || 5} Major Hubs`, detail: "GIDC Locations active", progress: 80 },
                  { label: "Integration Node", value: "Secure Loop SSL", detail: "Local DB + Host sync active", progress: 95 }
                ].map((item, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold leading-none">
                      <span className="text-slate-500 text-[9px] uppercase tracking-widest">{item.label}</span>
                      <span className="text-slate-900 text-[9px] uppercase font-black">{item.value}</span>
                    </div>
                    <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary-600 rounded-full" style={{ width: `${item.progress}%` }}></div>
                    </div>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Compliance Matrix Notice */}
            <div className="bg-primary-50/50 p-6 rounded-[2rem] border border-primary-100/50 space-y-3">
              <h5 className="text-[10px] font-black text-primary-900 uppercase tracking-widest flex items-center">
                <ShieldCheck size={14} className="mr-1.5 text-primary-600" />
                Compliance Declaration
              </h5>
              <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                This environment complies with GST laws, Central excise notifications, and the Ministry of Corporate Affairs regulations. Editing the Corporate registry modifies invoices, GRNs, shipping vouchers, and dealer bills globally.
              </p>
            </div>

          </div>
        </div>
      )}



      {activeTab === 'users' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] border border-slate-200/80 shadow-xl p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-indigo-50 text-indigo-650 rounded-2xl">
                  <UserCheck size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">Operator Registries & Credentials</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                    Manage active enterprise command center accounts, secure keys, and clearance nodes
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (confirm('Rebuild baseline credentials? All customized operator credentials will be reset.')) {
                    resetDefaultUsers();
                    setUserSuccess('Baseline credentials database successfully rebuilt.');
                    setIsEditingUser(null);
                    setUserForm({ name: '', email: '', password: '', role: 'QUALITY_TEAM' as UserRole, department: '' });
                  }
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[9px] font-black uppercase tracking-widest font-mono transition-all flex items-center gap-1.5 self-start md:self-center"
              >
                <RefreshCw size={11} className="animate-spin-slow" />
                Restore System Defaults
              </button>
            </div>

            {/* Error and Success Dialogs */}
            {(userErrors || userSuccess) && (
              <div className="my-6 grid grid-cols-1 gap-4">
                {userErrors && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 font-bold flex items-start gap-2.5">
                    <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={15} />
                    <div>
                      <p className="font-extrabold uppercase tracking-wider">Credential Issue</p>
                      <p className="text-red-650 font-medium mt-0.5">{userErrors}</p>
                    </div>
                  </div>
                )}
                {userSuccess && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-bold flex items-start gap-2.5">
                    <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={15} />
                    <div>
                      <p className="font-extrabold uppercase tracking-wider">Operational Success</p>
                      <p className="text-emerald-650 font-medium mt-0.5">{userSuccess}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
              <div className="space-y-8 mt-8">
              {/* CURRENT USERS TABLE (Full width) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] font-mono">
                    Deployed Operators Database ({usersList.length})
                  </p>
                  <span className="text-[8px] font-black bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full uppercase tracking-widest font-mono">
                    Local Ledger Persistent
                  </span>
                </div>

                <div className="border border-slate-100 rounded-[2rem] overflow-hidden bg-slate-50/20 shadow-inner">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                          <th className="p-4 pl-6">Operator Node / Role</th>
                          <th className="p-4">Authorization Email</th>
                          <th className="p-4">Secure Portal Access URL</th>
                          <th className="p-4">Security Code</th>
                          <th className="p-4 text-right pr-6">Deploy Controls</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/60 bg-white">
                        {usersList.map((usr) => {
                          const portalUrl = `${window.location.origin}/?portal=${encodeURIComponent(usr.email)}`;
                          return (
                            <tr key={usr.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-4 pl-6">
                                <p className="font-extrabold text-slate-900 text-xs">{usr.name}</p>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className={cn(
                                    "text-[8px] font-black uppercase px-2 py-0.5 rounded-md font-mono tracking-wider shadow-xs",
                                    usr.role === UserRole.SUPER_ADMIN ? "bg-primary-50 text-primary-600 border border-primary-200/40" :
                                    usr.role === UserRole.ADMIN ? "bg-sky-50 text-sky-600 border border-sky-200/40" :
                                    usr.role === UserRole.STORE_KEEPER ? "bg-amber-50 text-amber-600 border border-amber-200/40" :
                                    "bg-slate-50 text-slate-600 border border-slate-200/35"
                                  )}>
                                    {usr.role.replace('_', ' ')}
                                  </span>
                                  {usr.department && (
                                    <span className="text-[8px] font-bold text-slate-400 font-mono">
                                      [Dept: {usr.department}]
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-4">
                                <span className="text-[11px] font-mono font-bold text-slate-600">{usr.email}</span>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/50 max-w-[200px] truncate block" title={portalUrl}>
                                    {portalUrl}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(portalUrl);
                                      setUserSuccess(`Portal URL for ${usr.name} copied to clipboard!`);
                                      setTimeout(() => setUserSuccess(''), 4000);
                                    }}
                                    className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                                    title="Copy Secure Portal URL"
                                  >
                                    <Copy size={11} />
                                  </button>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] font-mono font-bold text-slate-800 tracking-tight bg-slate-50 p-1.5 rounded-lg border border-slate-100/50 min-w-[70px] text-center">
                                    {revealedPasswords[usr.id] ? usr.password : '••••••••'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setRevealedPasswords(prev => ({ ...prev, [usr.id]: !prev[usr.id] }))}
                                    className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-md"
                                    title="Reveal/Hide Security Code"
                                  >
                                    {revealedPasswords[usr.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                                  </button>
                                </div>
                              </td>
                              <td className="p-4 text-right pr-6 space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsEditingUser(usr.id);
                                    setUserForm({
                                      name: usr.name,
                                      email: usr.email,
                                      password: usr.password || 'password123',
                                      role: usr.role,
                                      department: usr.department || ''
                                    });
                                    setUserSuccess('');
                                    setUserErrors('');
                                  }}
                                  className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg inline-flex items-center border border-slate-100"
                                  title="Edit operator"
                                  id={`edit-usr-btn-${usr.id}`}
                                >
                                  <Edit size={11} />
                                </button>
                                <button
                                  type="button"
                                  disabled={usersList.length <= 1}
                                  onClick={() => {
                                    if (confirm(`Are you absolutely sure you want to revoke permissions and delete ${usr.name}?`)) {
                                      const res = deleteUser(usr.id);
                                      if (res.success) {
                                        setUserSuccess(`Operator clearances revoked and account deleted.`);
                                        if (isEditingUser === usr.id) {
                                          setIsEditingUser(null);
                                          setUserForm({ name: '', email: '', password: '', role: 'QUALITY_TEAM' as UserRole, department: '' });
                                        }
                                      } else {
                                        setUserErrors(res.error || 'Failed to revoke permissions.');
                                      }
                                    }
                                  }}
                                  className="p-1.5 bg-red-50 hover:bg-red-100 text-red-650 rounded-lg inline-flex items-center border border-red-100 disabled:opacity-40"
                                  title="Revoke permissions"
                                  id={`delete-usr-btn-${usr.id}`}
                                >
                                  <Trash2 size={11} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Lower Section split into Clearance Nodes & Register Form */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6 border-t border-slate-100">
                {/* SYSTEM CONTROL CLEARANCE NODES (Shifted from login screen) */}
                <div className="lg:col-span-7 space-y-4">
                  <div 
                    style={{ background: 'radial-gradient(circle at 50% 10%, #312e81 0%, #1e1b4b 100%)' }}
                    className="border border-indigo-500/30 rounded-[2.5rem] p-6 md:p-8 shadow-2xl relative overflow-hidden backdrop-blur-md transition-all duration-300 animate-pulse-subtle"
                  >
                    <div className="absolute top-0 right-0 p-3.5 text-[9px] font-mono font-black text-indigo-200/50 tracking-normal select-none">
                      ADMIN CLEARANCE MANAGEMENT HUB
                    </div>

                    <div className="flex items-center gap-3 mb-5 select-none">
                      <div className="p-2 bg-white/10 text-sky-400 border border-white/20 rounded-xl shadow-inner animate-pulse">
                        <Terminal size={16} />
                      </div>
                      <div>
                        <h3 className="text-sm font-black bg-clip-text text-transparent bg-gradient-to-r from-sky-400 via-emerald-400 to-indigo-300 uppercase tracking-widest font-mono">
                          System Control Clearance Nodes
                        </h3>
                        <p className="text-[11px] text-indigo-100/90 font-bold leading-none mt-1">
                          Dynamic operator shortcuts. Click any node to instantly switch sessions.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 select-text">
                      {usersList.map((usr) => {
                        return (
                           <button
                            key={usr.id}
                            type="button"
                            onClick={() => handleNodeSessionSwitch(usr.email, usr.password || 'password123', usr.name)}
                            className="text-left p-3.5 rounded-2xl border border-white/10 hover:border-white/30 cursor-pointer bg-white/5 hover:bg-white/10 text-xs font-mono transition-all space-y-2 relative group focus:outline-none focus:ring-2 focus:ring-indigo-300"
                          >
                            <div className="flex items-center justify-between pointer-events-none">
                              <span className="text-[10px] font-black uppercase tracking-wider leading-none text-sky-400">
                                {usr.name}
                              </span>
                              <span className="text-[8px] px-1.5 bg-white/10 border border-white/20 text-indigo-100 rounded">
                                {usr.role.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="space-y-1 text-[10px] text-slate-300 font-semibold pointer-events-none">
                              <div className="truncate text-slate-300/70">{usr.email}</div>
                              <div className="flex items-center justify-between text-emerald-400 font-bold">
                                <span>Key: <span className="text-amber-200 font-extrabold">{usr.password || 'password123'}</span></span>
                                <ChevronRight size={11} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* REGISTER / EDIT FORM */}
                <div className="lg:col-span-5">
                  <div className="bg-slate-50/50 border border-slate-100 rounded-[2rem] p-6 space-y-5">
                    <div className="flex items-center gap-2 border-b border-slate-100/80 pb-3">
                      <UserPlus className="text-primary-650" size={16} />
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                        {isEditingUser ? 'Mutate Operator Clearance' : 'Deploy New Operator Account'}
                      </h4>
                    </div>

                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        setUserErrors('');
                        setUserSuccess('');

                        if (!userForm.name.trim() || !userForm.email.trim() || !userForm.password.trim()) {
                          setUserErrors('Operator name, email, and security pass are required.');
                          return;
                        }

                        if (isEditingUser) {
                          const res = updateUser(isEditingUser, userForm);
                          if (res.success) {
                            setUserSuccess(`Operator ${userForm.name} updated successfully.`);
                            setUserForm({ name: '', email: '', password: '', role: 'QUALITY_TEAM' as UserRole, department: '' });
                            setIsEditingUser(null);
                          } else {
                            setUserErrors(res.error || 'Could not save changes. Email may already be associated with another operator node.');
                          }
                        } else {
                          const res = addUser(userForm);
                          if (res.success) {
                            setUserSuccess(`Operator ${userForm.name} deployed. Registered to standard authentication.`);
                            setUserForm({ name: '', email: '', password: '', role: 'QUALITY_TEAM' as UserRole, department: '' });
                          } else {
                            setUserErrors(res.error || 'The email address supplied is already bound to an active clearance profile.');
                          }
                        }
                      }} 
                      className="space-y-4"
                    >
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 font-mono block">Operator Name</label>
                        <input
                          type="text"
                          value={userForm.name}
                          onChange={(e) => setUserForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g. Richard Hendricks"
                          required
                          className="w-full bg-white border border-slate-200/70 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500"
                          id="user-form-name-field"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 font-mono block">Node Contact Email (Login)</label>
                        <input
                          type="email"
                          value={userForm.email}
                          onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="e.g. rich@arcenol.com"
                          required
                          className="w-full bg-white border border-slate-200/70 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 font-mono"
                          id="user-form-email-field"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 font-mono block">Clearance Security Code / Password</label>
                        <input
                          type="text"
                          value={userForm.password}
                          onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                          placeholder="e.g. dubaipassword55"
                          required
                          className="w-full bg-white border border-slate-200/70 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 font-mono"
                          id="user-form-pass-field"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase text-slate-400 font-mono block">Clearance Tier (Role)</label>
                          <select
                            value={userForm.role}
                            onChange={(e) => setUserForm(prev => ({ ...prev, role: e.target.value as UserRole }))}
                            className="w-full bg-white border border-slate-200/70 rounded-xl px-2.5 py-2.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary-500/10"
                            id="user-form-role-select"
                          >
                            <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
                            <option value={UserRole.ADMIN}>Ops Admin</option>
                            <option value={UserRole.STORE_KEEPER}>Inventory Logistics</option>
                            <option value={UserRole.PRODUCTION_TEAM}>Manufacturing</option>
                            <option value={UserRole.QUALITY_TEAM}>Quality Control</option>
                            <option value={UserRole.SALES_PERSON}>Sales CRM</option>
                            <option value={UserRole.BILLER}>Finance Hub</option>
                            <option value={UserRole.WARRANTY_TEAM}>Warranty Team</option>
                            <option value={UserRole.SERVICE_TEAM}>RMA Center</option>
                            <option value={UserRole.PLANT_SERVICE_ENGINEER}>Plant Engineer</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase text-slate-400 font-mono block">Department</label>
                          <input
                            type="text"
                            value={userForm.department}
                            onChange={(e) => setUserForm(prev => ({ ...prev, department: e.target.value }))}
                            placeholder="e.g. QC Hub"
                            className="w-full bg-white border border-slate-200/70 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500"
                            id="user-form-dept-field"
                          />
                        </div>
                      </div>

                      <div className="pt-2 flex items-center gap-2">
                        <button
                          type="submit"
                          className="flex-1 py-3 bg-primary-600 hover:brightness-110 active:scale-[0.98] text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-md shadow-primary-500/10"
                          id="user-form-submit-btn"
                        >
                          {isEditingUser ? 'Commit Mutations' : 'Deploy Node Operator'}
                        </button>
                        {isEditingUser && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditingUser(null);
                              setUserForm({ name: '', email: '', password: '', role: 'QUALITY_TEAM' as UserRole, department: '' });
                            }}
                            className="px-3 py-3 bg-slate-250 hover:bg-slate-300 text-slate-700 rounded-xl text-[9px] font-black uppercase tracking-widest"
                            id="user-form-cancel-btn"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* EDIT OPERATOR MODAL OVERLAY */}
      {isEditingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200 no-print p-4">
          <div className="bg-white max-w-lg w-full rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-5 text-left">
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-sky-100 text-sky-600 rounded-2xl">
                  <Edit size={20} />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-sm uppercase tracking-tight">
                    Edit Operator Clearance
                  </h4>
                  <p className="text-xs text-slate-500 font-bold">
                    Target Node: <span className="text-sky-700 font-black">{userForm.name || 'Operator'}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditingUser(null);
                  setUserForm({ name: '', email: '', password: '', role: 'QUALITY_TEAM' as UserRole, department: '' });
                  setUserErrors('');
                  setUserSuccess('');
                }}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-800 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {userErrors && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold">
                {userErrors}
              </div>
            )}
            {userSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold">
                {userSuccess}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setUserErrors('');
                setUserSuccess('');

                if (!userForm.name.trim() || !userForm.email.trim() || !userForm.password.trim()) {
                  setUserErrors('Operator name, email, and security pass are required.');
                  return;
                }

                const res = updateUser(isEditingUser, userForm);
                if (res.success) {
                  setUserSuccess(`Operator ${userForm.name} updated successfully.`);
                  setTimeout(() => {
                    setIsEditingUser(null);
                    setUserForm({ name: '', email: '', password: '', role: 'QUALITY_TEAM' as UserRole, department: '' });
                    setUserSuccess('');
                  }, 1000);
                } else {
                  setUserErrors(res.error || 'Failed to save changes.');
                }
              }}
              className="space-y-4"
            >
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 font-mono block">Operator Name</label>
                <input
                  type="text"
                  value={userForm.name}
                  onChange={(e) => setUserForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 font-mono block">Authorization Email (Login)</label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/20 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 font-mono block">Security Code / Password</label>
                <input
                  type="text"
                  value={userForm.password}
                  onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/20 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 font-mono block">Clearance Tier (Role)</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm(prev => ({ ...prev, role: e.target.value as UserRole }))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-sky-500/20"
                  >
                    <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
                    <option value={UserRole.ADMIN}>Ops Admin</option>
                    <option value={UserRole.STORE_KEEPER}>Inventory Logistics</option>
                    <option value={UserRole.PRODUCTION_TEAM}>Manufacturing</option>
                    <option value={UserRole.QUALITY_TEAM}>Quality Control</option>
                    <option value={UserRole.SALES_PERSON}>Sales CRM</option>
                    <option value={UserRole.BILLER}>Finance Hub</option>
                    <option value={UserRole.WARRANTY_TEAM}>Warranty Team</option>
                    <option value={UserRole.SERVICE_TEAM}>RMA Center</option>
                    <option value={UserRole.PLANT_SERVICE_ENGINEER}>Plant Engineer</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase text-slate-400 font-mono block">Department</label>
                  <input
                    type="text"
                    value={userForm.department}
                    onChange={(e) => setUserForm(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-sky-500/20"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingUser(null);
                    setUserForm({ name: '', email: '', password: '', role: 'QUALITY_TEAM' as UserRole, department: '' });
                    setUserErrors('');
                    setUserSuccess('');
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-sky-600/20 cursor-pointer transition-all"
                >
                  Save Operator Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
