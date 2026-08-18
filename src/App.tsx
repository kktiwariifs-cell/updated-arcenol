import React, { useState, useEffect } from 'react';
import { useAuthStore, UserRole } from './store/authStore';
import { Sidebar } from './components/layout/Sidebar';
import { NotificationCenter } from './components/layout/NotificationCenter';
import { Dashboard } from './modules/Dashboard';
import { Inventory } from './modules/Inventory';
import { StoreKeeperDashboard } from './modules/StoreKeeperDashboard';
import { Production } from './modules/Production';
import { MRP } from './modules/MRP';
import { FinishedGoods } from './modules/FinishedGoods';
import { DealerPerformance } from './modules/DealerPerformance';
import { RegionalSales } from './modules/RegionalSales';
import { ManagementKPI } from './modules/ManagementKPI';
import { Alerts } from './modules/Alerts';
import { CRM } from './modules/CRM';
import { Billing } from './modules/Billing';
import { Warranty } from './modules/Warranty';
import { Service } from './modules/Service';
import { Analytics } from './modules/Analytics';
import { Engagement } from './modules/Engagement';
import { SuperAdmin } from './modules/SuperAdmin';
import { LandingPage } from './modules/LandingPage';
import { UserManual } from './modules/UserManual';
import { InventoryHub } from './modules/InventoryHub';
import { ManufacturingHub } from './modules/ManufacturingHub';
import { CommandMenu } from './components/CommandMenu';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import factoryAssemblyImg from './assets/images/factory_assembly_1781177240715.png';
import { Battery, Zap, ChevronRight, LayoutDashboard, Database, PieChart, Users, ReceiptIndianRupee, ShieldCheck, Wrench, BarChart3, Smartphone, Mail, Lock, Eye, EyeOff, AlertCircle, Globe, Moon, Sun, Check, Cloud, Star, Activity, ShieldAlert, Shield, ToggleLeft, ToggleRight, Laptop, Terminal, Layers, Menu, BookOpen } from 'lucide-react';
import { cn } from './lib/utils';
import { useERPData } from './hooks/useERPData';

export default function App() {
  const { user, loginWithCredentials, usersList, setUsersList } = useAuthStore();
  const [activeTab, setActiveTabRaw] = useState(() => {
    return localStorage.getItem('arcenol_active_tab') || 'dashboard';
  });
  const [previousTab, setPreviousTab] = useState<string>('dashboard');

  const setActiveTab = (newTab: string) => {
    if (newTab !== 'user-manual' && activeTab !== 'user-manual') {
      setPreviousTab(activeTab);
    } else if (newTab === 'user-manual' && activeTab !== 'user-manual') {
      setPreviousTab(activeTab);
    }
    setActiveTabRaw(newTab);
  };

  useEffect(() => {
    if (activeTab) {
      localStorage.setItem('arcenol_active_tab', activeTab);
    }
  }, [activeTab]);
  const [showLandingPage, setShowLandingPage] = useState(false);
  const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { data } = useERPData();

  useEffect(() => {
    if (data?.users && data.users.length > 0) {
      if (JSON.stringify(data.users) !== JSON.stringify(usersList)) {
        setUsersList(data.users);
      }
    }
  }, [data?.users, setUsersList, usersList]);

  // Secure Credentials Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    if (data?.businessProfile?.companyName) {
      document.title = `${data.businessProfile.companyName} ERP`;
    }
  }, [data]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCommandMenuOpen(false);
      }
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
      if (isCmdOrCtrl && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsCommandMenuOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Anti-Inspection & DevTools Security Guard Block
  useEffect(() => {
    // 1. Disable standard right-click context menus
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // 2. Intercept key combinations commonly used to open browser DevTools / inspect elements
    const handleKeyDown = (e: KeyboardEvent) => {
      // Keys to block:
      // F12 (123)
      // Ctrl+Shift+I or Meta+Option+I (Inspect)
      // Ctrl+Shift+J or Meta+Option+J (Console)
      // Ctrl+Shift+C or Meta+Option+C (Inspect Element selection tool)
      // Ctrl+U or Meta+Option+U (View Source)
      // Ctrl+S or Meta+S (Save Page)
      
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
      const isShiftOrAlt = isMac ? e.altKey : e.shiftKey;

      // F12 Key
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        return false;
      }

      // Ctrl + Shift + I / J / C or Cmd + Option + I / J / C
      if (isCmdOrCtrl && isShiftOrAlt && (e.key === 'i' || e.key === 'I' || e.key === 'j' || e.key === 'J' || e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        return false;
      }

      // Ctrl + U / Cmd + Option + U (View Source)
      if (isCmdOrCtrl && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        return false;
      }

      // Ctrl + S / Cmd + S (Save Page source offline)
      if (isCmdOrCtrl && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        return false;
      }
    };

    // Listen on system node
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleCredentialsLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Please supply active authorization email and security code.');
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    setIsAuthenticating(true);

    setTimeout(() => {
      const res = loginWithCredentials(email, password);
      setIsAuthenticating(false);
      if (res.success) {
        setSuccessMsg('Operational handshake successful. Mapping directory...');
      } else {
        setErrorMsg(res.error || 'Autoclear failed.');
      }
    }, 400);
  };

  // Quick autofill & auto log in tool for convenience
  const handleAutofillAndLogin = (roleUser: any) => {
    setEmail(roleUser.email);
    setPassword(roleUser.password || 'password123');
    setErrorMsg('');
    setSuccessMsg(`Autofilling credentials for ${roleUser.name}...`);
    setIsAuthenticating(true);

    setTimeout(() => {
      const res = loginWithCredentials(roleUser.email, roleUser.password || 'password123');
      setIsAuthenticating(false);
      if (res.success) {
        setSuccessMsg(`Authenticated as ${roleUser.name}.`);
      } else {
        setErrorMsg(res.error || 'Autoclear failed.');
      }
    }, 300);
  };

  useEffect(() => {
    if (user) {
      const savedTab = localStorage.getItem('arcenol_active_tab');
      if (savedTab) {
        setActiveTab(savedTab);
        return;
      }
      if (user.role === UserRole.BILLER) {
        setActiveTab('billing');
      } else if (user.role === UserRole.STORE_KEEPER) {
        setActiveTab('inventory-hub');
      } else if (user.role === UserRole.PRODUCTION_TEAM) {
        setActiveTab('production-hub');
      } else if (user.role === UserRole.SALES_PERSON) {
        setActiveTab('crm');
      } else if (user.role === UserRole.WARRANTY_TEAM) {
        setActiveTab('warranty');
      } else if (user.role === UserRole.SERVICE_TEAM || user.role === UserRole.PLANT_SERVICE_ENGINEER) {
        setActiveTab('service');
      } else if (user.role === UserRole.SUPER_ADMIN) {
        setActiveTab('super-admin');
      } else {
        setActiveTab('dashboard');
      }
    }
  }, [user]);

  // Security guard for role-based navigation and tab visibility
  useEffect(() => {
    if (user && activeTab) {
      const TAB_ALLOWED_ROLES: Record<string, UserRole[]> = {
        'dashboard': Object.values(UserRole),
        'user-manual': Object.values(UserRole),
        'landing-page': Object.values(UserRole),
        'management-kpi': [UserRole.SUPER_ADMIN, UserRole.ADMIN],
        'dealer-performance': [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SALES_PERSON],
        'regional-sales': [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SALES_PERSON],
        'alerts': Object.values(UserRole),
        'inventory': [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STORE_KEEPER, UserRole.PRODUCTION_TEAM],
        'inventory-hub': [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STORE_KEEPER, UserRole.PRODUCTION_TEAM],
        'physical-audit': [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STORE_KEEPER, UserRole.PRODUCTION_TEAM],
        'stock-audit': [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STORE_KEEPER, UserRole.PRODUCTION_TEAM],
        'physical_audit': [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STORE_KEEPER, UserRole.PRODUCTION_TEAM],
        'stock_audit': [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STORE_KEEPER, UserRole.PRODUCTION_TEAM],
        'audit': [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STORE_KEEPER, UserRole.PRODUCTION_TEAM],
        'production': [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PRODUCTION_TEAM, UserRole.STORE_KEEPER],
        'production-hub': [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PRODUCTION_TEAM, UserRole.STORE_KEEPER],
        'mrp': [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PRODUCTION_TEAM, UserRole.STORE_KEEPER],
        'finished-goods': [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STORE_KEEPER, UserRole.PRODUCTION_TEAM],
        'storekeeper': [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STORE_KEEPER, UserRole.PRODUCTION_TEAM],
        'crm': [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SALES_PERSON],
        'billing': [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BILLER],
        'warranty': [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.WARRANTY_TEAM],
        'engagement': [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SALES_PERSON],
        'service': [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SERVICE_TEAM, UserRole.PLANT_SERVICE_ENGINEER],
        'analytics': [UserRole.SUPER_ADMIN, UserRole.ADMIN],
        'super-admin': [UserRole.SUPER_ADMIN, UserRole.ADMIN],
        'data-retention': [UserRole.SUPER_ADMIN, UserRole.ADMIN],
        'purge-records': [UserRole.SUPER_ADMIN, UserRole.ADMIN]
      };

      const allowedRoles = TAB_ALLOWED_ROLES[activeTab];
      if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Fallback to their authorized default view
        if (user.role === UserRole.BILLER) {
          setActiveTab('billing');
        } else if (user.role === UserRole.STORE_KEEPER) {
          setActiveTab('inventory-hub');
        } else if (user.role === UserRole.PRODUCTION_TEAM) {
          setActiveTab('production-hub');
        } else if (user.role === UserRole.SALES_PERSON) {
          setActiveTab('crm');
        } else if (user.role === UserRole.WARRANTY_TEAM) {
          setActiveTab('warranty');
        } else if (user.role === UserRole.SERVICE_TEAM || user.role === UserRole.PLANT_SERVICE_ENGINEER) {
          setActiveTab('service');
        } else if (user.role === UserRole.SUPER_ADMIN) {
          setActiveTab('super-admin');
        } else {
          setActiveTab('dashboard');
        }
      }
    }
  }, [activeTab, user]);

  // Dynamic portal url custom routing and greeting handler
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const portalEmail = params.get('portal');
    if (portalEmail) {
      const match = usersList.find(u => u.email.toLowerCase() === portalEmail.toLowerCase());
      if (match) {
        setEmail(match.email);
        setSuccessMsg(`Welcome to the ${match.role.replace('_', ' ')} Portal.`);
      }
    }
  }, [usersList]);

  if (!user) {
    if (showLandingPage) {
      return (
        <LandingPage 
          onBackToLogin={() => setShowLandingPage(false)} 
          isLoggedIn={false} 
        />
      );
    }

    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4 xl:p-8 relative overflow-hidden font-sans select-none text-slate-100"
        style={{
          background: `radial-gradient(circle at center, #5fe6d9 0%, #46cfc1 40%, #20998c 100%)`
        }}
      >
        {/* Futuristic Background Circuit Matrix Effect styled to match turquoise color scheme */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1d8c80_1px,transparent_1px),linear-gradient(to_bottom,#1d8c80_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-25"></div>

        {/* Outer Grid Layout */}
        <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch justify-center relative z-10">
          
          {/* RIGHT SECTION (Shown FIRST on mobile screens for instant access): Floating Frosted-Glass Card for Login Form */}
          <div className="order-1 lg:order-2 lg:col-span-5 flex flex-col items-center justify-center relative lg:min-h-[600px] py-2 sm:py-4 flex-1">
            
            {/* Elegant glass blur circle directly behind the login panel strictly matches ambient glow */}
            <div className="absolute w-[80%] h-[80%] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none -z-10"></div>
            
            {/* The Premium High-Contrast Card Container */}
            <div className="w-full max-w-[460px] bg-white/95 backdrop-blur-[32px] rounded-[1.8rem] sm:rounded-[2.2rem] border border-white/40 p-4 sm:p-8 md:p-10 shadow-[0_32px_80px_rgba(15,23,42,0.15)] relative overflow-hidden flex flex-col justify-between">
              
              {/* Inner glass accent lines */}
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none rounded-t-[2.2rem]"></div>
              
              <div>
                {/* Branding Block */}
                <div className="flex flex-col items-center justify-center text-center">
                  {/* Styled Arcenol upward delta triangle logo in high-precision layout */}
                  <div className="mb-3 sm:mb-4 relative flex items-center justify-center">
                    <div className="w-[52px] h-[52px] sm:w-[58px] sm:h-[58px] rounded-[16px] sm:rounded-[18px] bg-gradient-to-tr from-blue-600 to-sky-400 p-[2px] flex items-center justify-center shadow-lg shadow-blue-500/20 group cursor-pointer">
                      <div className="w-full h-full bg-[#030612] rounded-[14px] sm:rounded-[16px] flex items-center justify-center transition-colors group-hover:bg-slate-950">
                        {/* Nested Delta Triangle icon */}
                        <div className="w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-b-[18px] border-b-sky-400 drop-shadow-[0_0_12px_rgba(56,189,248,0.6)]"></div>
                      </div>
                    </div>
                  </div>

                  {(() => {
                    const params = new URLSearchParams(window.location.search);
                    const portalEmail = params.get('portal');
                    const match = portalEmail ? usersList.find(u => u.email.toLowerCase() === portalEmail.toLowerCase()) : null;
                    if (match) {
                      return (
                        <>
                          <h2 className="text-xl sm:text-2xl font-black tracking-tight uppercase inline-flex items-center text-[#0B1F3A] mt-2">
                            {match.role.replace('_', ' ')} Portal
                          </h2>
                          <div className="text-[9px] font-mono font-black text-slate-500 tracking-[0.15em] uppercase mt-1">
                            Secure Operator Clearance Node
                          </div>
                          <p className="text-xs font-semibold text-slate-600 leading-relaxed max-w-[320px] mt-2 sm:mt-3 select-none">
                            Enter the authorization password for <span className="font-extrabold text-[#0B1F3A]">{match.name}</span> to access your dedicated workspace.
                          </p>
                        </>
                      );
                    }
                    return (
                      <>
                        <h2 className="text-2xl sm:text-3xl font-black tracking-tight uppercase inline-flex items-center">
                          <span className="text-[#be123c]">A</span>
                          <span className="text-[#15803d]">r</span>
                          <span className="text-[#0B1F3A]">cenol ERP</span>
                        </h2>
                        <div className="text-[9.5px] sm:text-[10px] font-mono font-black text-[#0B1F3A]/80 tracking-[0.2em] uppercase mt-1">
                          Powered by Digital Communique
                        </div>
                        <p className="text-[11.5px] sm:text-[12.5px] font-bold text-[#0B1F3A] leading-relaxed max-w-[320px] mt-2 sm:mt-3 select-none">
                          Comprehensive ERP for Battery Manufacturing, Inventory, CRM, Warranty & Analytics.
                        </p>
                      </>
                    );
                  })()}
                </div>

                {/* Micro Alert messages */}
                {errorMsg && (
                  <div className="mt-4 sm:mt-6 p-3 sm:p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 animate-in fade-in" id="login-error-alert">
                    <AlertCircle className="text-rose-600 shrink-0 mt-0.5" size={15} />
                    <div className="text-[10.5px] text-rose-700 font-bold leading-normal">
                      <p className="text-rose-800 font-black uppercase tracking-wider">Verification Error</p>
                      <p className="mt-0.5 font-medium">{errorMsg}</p>
                    </div>
                  </div>
                )}

                {successMsg && (
                  <div className="mt-4 sm:mt-6 p-3 sm:p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 animate-in fade-in" id="login-success-alert">
                    <ShieldCheck className="text-emerald-600 shrink-0 mt-0.5" size={15} />
                    <div className="text-[10.5px] text-emerald-700 font-bold leading-normal">
                      <p className="text-emerald-800 font-black uppercase tracking-wider">Handshake Active</p>
                      <p className="mt-0.5 font-medium">{successMsg}</p>
                    </div>
                  </div>
                )}

                {/* Form fields */}
                <form onSubmit={handleCredentialsLogin} className="space-y-3.5 sm:space-y-4 mt-5 sm:mt-6">
                  
                  {/* Email Input */}
                  <div className="space-y-1">
                    <div className="relative">
                      <input 
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Username / Email"
                        required
                        disabled={isAuthenticating}
                        className="w-full min-h-[46px] bg-[#f8fafc]/95 hover:bg-white text-slate-900 border border-slate-200 placeholder-slate-400 rounded-xl py-3 px-4 text-xs font-bold leading-tight outline-none focus:ring-4 focus:ring-blue-500/20 focus:bg-white transition-all duration-200"
                        id="login-email-field"
                      />
                    </div>
                  </div>

                  {/* Password Input with eye reveal toggle styled to layout */}
                  <div className="space-y-1">
                    <div className="relative">
                      <input 
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        required
                        disabled={isAuthenticating}
                        className="w-full min-h-[46px] bg-[#f8fafc]/95 hover:bg-white text-slate-900 border border-slate-200 placeholder-slate-400 rounded-xl py-3 pl-4 pr-12 text-xs font-bold leading-tight outline-none focus:ring-4 focus:ring-blue-500/20 focus:bg-white transition-all duration-200"
                        id="login-password-field"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(prev => !prev)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition p-1"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Options checkbox and links */}
                  <div className="flex items-center justify-between text-[11px] text-[#0B1F3A] font-extrabold px-1 py-0.5">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input 
                        type="checkbox"
                        className="rounded bg-white border-slate-350 text-blue-600 focus:ring-0 w-3.5 h-3.5 transition"
                        defaultChecked
                      />
                      Remember Me
                    </label>
                    <a 
                      href="#forgot-password" 
                      onClick={(e) => { e.preventDefault(); alert("Security configuration notice: Please contact Central Registrar Dr. Ananya Sharma to reset manual deployment keystores."); }}
                      className="text-blue-900 hover:text-blue-950 transition hover:underline font-extrabold"
                    >
                      Forgot Password?
                    </a>
                  </div>

                  {/* Actions buttons */}
                  <div className="space-y-2.5 sm:space-y-3 pt-1 sm:pt-2">
                    <button
                      type="submit"
                      disabled={isAuthenticating}
                      className={cn(
                        "w-full min-h-[46px] py-3 px-4 bg-gradient-to-r from-blue-950 to-indigo-950 hover:brightness-110 active:scale-[0.98] rounded-xl text-xs font-bold tracking-wider transition-all duration-150 shadow-lg shadow-blue-500/20 uppercase font-sans flex items-center justify-center gap-2 border border-white/10 cursor-pointer",
                        isAuthenticating && "opacity-80 pointer-events-none"
                      )}
                      id="login-submit-button"
                    >
                      {isAuthenticating ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                          <span className="text-amber-300">Signing In...</span>
                        </>
                      ) : (
                        <span className="font-sans font-black tracking-widest text-[12px] text-white">Sign In</span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => alert("OTP Security check: An encryption payload has been routed to registered helpline contact +91 79 4028 9200. Please enter code once received.")}
                      className="w-full min-h-[44px] py-2.5 px-4 bg-[#0B1F3A] hover:bg-[#061528] active:scale-[0.98] rounded-xl text-xs font-bold tracking-wider transition-all duration-150 border border-slate-700/20 uppercase font-sans flex items-center justify-center text-white cursor-pointer"
                    >
                      <span className="font-sans font-black tracking-widest text-[11px] text-white">Login with OTP</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowLandingPage(true)}
                      className="w-full min-h-[44px] py-2.5 px-4 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] rounded-xl text-xs font-bold tracking-wider transition-all duration-150 border border-slate-250 uppercase font-sans flex items-center justify-center text-slate-800 cursor-pointer"
                    >
                      <span className="font-sans font-black tracking-widest text-[11px]">🌐 Public Landing Page</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Languages select list & Sliders Toggle footer area strictly matched */}
              <div className="mt-6 sm:mt-8 border-t border-slate-350/40 pt-4 sm:pt-5 flex items-center justify-between text-xs text-[#0B1F3A] select-none font-bold">
                {/* Language list selection */}
                <div className="relative">
                  <select 
                    className="bg-transparent text-[11px] font-extrabold outline-none border-none py-1 pl-1 pr-6 cursor-pointer focus:ring-0 text-[#0B1F3A] hover:text-slate-950"
                    defaultValue="en"
                  >
                    <option value="en" className="bg-white font-sans text-[#0B1F3A] font-bold">💻 English</option>
                    <option value="es" className="bg-white font-sans text-[#0B1F3A] font-bold">🏛️ Spanish</option>
                    <option value="fr" className="bg-white font-sans text-[#0B1F3A] font-bold">🏛️ Hindi</option>
                  </select>
                </div>

                {/* Symmetrical Theme slide control */}
                <div className="flex items-center gap-3">
                  {/* Slider pill */}
                  <div className="w-10 h-5 bg-gradient-to-r from-[#38bdf8] to-[#f43f5e] rounded-full p-[2px] cursor-pointer flex justify-end">
                    <div className="w-4 h-full bg-white rounded-full shadow-md"></div>
                  </div>
                  {/* Moon icon dark mode indicator */}
                  <div className="p-1.5 rounded-full bg-white/10 text-[#fbbf24] cursor-pointer hover:bg-white/20 transition-all">
                    <Moon size={11} fill="currentColor" />
                  </div>
                </div>
              </div>

              {/* Secure Login lower emblem centered inside card */}
              <div className="flex flex-col items-center justify-center mt-5 sm:mt-7">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-500/10 border border-emerald-500/35 flex items-center justify-center text-emerald-700 shadow-inner">
                  <ShieldCheck size={18} className="drop-shadow-[0_0_8px_rgba(16,185,129,0.2)]" />
                </div>
                <span className="text-[9.5px] sm:text-[10px] font-black tracking-[0.25em] text-slate-600 uppercase mt-1.5 sm:mt-2">
                  Secure Login
                </span>
              </div>

            </div>

            {/* General bottom layout meta footer */}
            <div className="mt-6 sm:mt-8 text-center space-y-2.5 select-none">
              <span className="text-[10.5px] sm:text-[11px] font-bold text-teal-950 tracking-wide block">
                v1.0 | &copy; 2026 <span className="text-white bg-teal-950/80 hover:bg-teal-950 px-2.5 py-1 rounded-lg font-black tracking-normal transition-colors shadow-sm select-all">Digital Communique</span>. All Rights Reserved.
              </span>
              <div className="flex items-center justify-center gap-2 text-[10px] sm:text-[11px] text-teal-950 font-black flex-wrap">
                <a href="#privacy" onClick={(e) => { e.preventDefault(); alert("System Notice: Privacy node terms are managed under Ministry of Electronics and Information Technology regulations."); }} className="bg-white/20 hover:bg-white/40 px-2.5 py-1 rounded-md transition-all">Privacy Policy</a>
                <span className="text-teal-900/45">|</span>
                <a href="#terms" onClick={(e) => { e.preventDefault(); alert("System Notice: Terms of Service comply with Arcenol Energy multi-region cloud contracts."); }} className="bg-white/20 hover:bg-white/40 px-2.5 py-1 rounded-md transition-all">Terms of Service</a>
                <span className="text-teal-900/45">|</span>
                <a href="#help" onClick={(e) => { e.preventDefault(); alert("Central Helpline: Contact +91 79 4028 9200 for database credentials issues."); }} className="bg-white/20 hover:bg-white/40 px-2.5 py-1 rounded-md transition-all">Help Center</a>
              </div>
            </div>

          </div>

          {/* LEFT SECTION (Telemetry & HUD): Displayed after Login form on mobile, on the left on desktop */}
          <div className="order-2 lg:order-1 lg:col-span-7 flex flex-col justify-start space-y-6 h-full">
            
            {/* Futuristic Telemetry Glass Widgets Block */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 w-full">
                {/* 1. Production Efficiency widget */}
                <div 
                  style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(204, 251, 241, 0.8) 100%)' }}
                  className="flex items-center gap-2.5 sm:gap-3.5 border border-white/50 p-2.5 sm:px-4 sm:py-3 rounded-2xl shadow-[0_8px_32px_rgba(13,148,136,0.08)] cursor-default select-none transition-all hover:border-white w-full backdrop-blur-sm"
                >
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-emerald-600/10 flex items-center justify-center text-emerald-800 border border-emerald-300/40 relative shrink-0">
                    <span className="absolute inset-0 rounded-full bg-emerald-400/30 animate-ping"></span>
                    <Activity size={15} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[9px] sm:text-[10px] text-teal-950/70 font-bold tracking-wide uppercase truncate">Efficiency</div>
                    <div className="text-base sm:text-lg font-black text-slate-900 flex items-baseline gap-1.5 leading-none mt-0.5">
                      98%
                      <span className="text-[8px] text-emerald-700 font-extrabold tracking-widest uppercase hidden lg:inline">OPTL</span>
                    </div>
                  </div>
                </div>

                {/* 2. Inventory Status widget */}
                <div 
                  style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(204, 251, 241, 0.8) 100%)' }}
                  className="flex items-center gap-2.5 sm:gap-3.5 border border-white/50 p-2.5 sm:px-4 sm:py-3 rounded-2xl shadow-[0_8px_32px_rgba(13,148,136,0.08)] cursor-default select-none transition-all hover:border-white w-full backdrop-blur-sm"
                >
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-blue-600/10 flex items-center justify-center text-blue-800 border border-blue-300/40 shrink-0">
                    <Cloud size={15} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[9px] sm:text-[10px] text-teal-950/70 font-bold tracking-wide uppercase truncate">Inventory</div>
                    <div className="text-base sm:text-lg font-black text-slate-900 flex items-baseline gap-1.5 leading-none mt-0.5">
                      Optimal
                      <span className="text-[8px] text-blue-700 font-extrabold tracking-widest uppercase hidden lg:inline">SYNC</span>
                    </div>
                  </div>
                </div>

                {/* 3. Quality Passed widget */}
                <div 
                  style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(204, 251, 241, 0.8) 100%)' }}
                  className="flex items-center gap-2.5 sm:gap-3.5 border border-white/50 p-2.5 sm:px-4 sm:py-3 rounded-2xl shadow-[0_8px_32px_rgba(13,148,136,0.08)] cursor-default select-none transition-all hover:border-white w-full backdrop-blur-sm"
                >
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-teal-600/10 flex items-center justify-center text-teal-800 border border-teal-300/40 shrink-0">
                    <ShieldCheck size={15} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[9px] sm:text-[10px] text-teal-950/70 font-bold tracking-wide uppercase truncate">Quality</div>
                    <div className="text-base sm:text-lg font-black text-slate-900 flex items-baseline gap-1.5 leading-none mt-0.5">
                      100%
                      <span className="text-[8px] text-teal-700 font-extrabold tracking-widest uppercase hidden lg:inline">CERT</span>
                    </div>
                  </div>
                </div>

                {/* 4. Live Dashboard widget */}
                <div 
                  style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(204, 251, 241, 0.8) 100%)' }}
                  className="flex items-center gap-2.5 sm:gap-3.5 border border-white/50 p-2.5 sm:px-4 sm:py-3 rounded-2xl shadow-[0_8px_32px_rgba(13,148,136,0.08)] cursor-default select-none transition-all hover:border-white w-full backdrop-blur-sm"
                >
                  <div className="flex flex-col gap-0.5 items-center justify-center shrink-0">
                    <span className="text-[8px] text-teal-950/75 uppercase font-black tracking-widest leading-none mb-1">Live DB</span>
                    <div className="flex items-end gap-0.5 h-3">
                      <span className="w-1 bg-emerald-600 rounded-xs h-1 animate-pulse"></span>
                      <span className="w-1 bg-emerald-500 rounded-xs h-3 animate-pulse" style={{ animationDelay: '0.2s' }}></span>
                      <span className="w-1 bg-emerald-600 rounded-xs h-2 animate-pulse" style={{ animationDelay: '0.4s' }}></span>
                      <span className="w-1 bg-emerald-700 rounded-xs h-2.5 animate-pulse" style={{ animationDelay: '0.1s' }}></span>
                    </div>
                  </div>
                  <div className="border-l border-teal-200/50 pl-2.5 sm:pl-3 min-w-0">
                    <div className="text-[8.5px] sm:text-[9px] text-teal-950/60 leading-none font-bold uppercase tracking-widest truncate">Global</div>
                    <div className="text-[10px] sm:text-[11px] text-emerald-800 font-black tracking-wider uppercase mt-1 truncate">ONLINE</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Central Industrial Asset Window Wrapper */}
            <div className="relative group rounded-3xl overflow-hidden border border-slate-800/80 shadow-[0_32px_64px_rgba(0,0,0,0.8)] bg-slate-950/50 flex-1 min-h-[420px] hidden lg:flex lg:flex-col">
              {/* Blur accent glow under asset container */}
              <div className="absolute -inset-2 bg-gradient-to-r from-blue-550/10 to-indigo-600/10 blur-3xl opacity-60 rounded-3xl group-hover:opacity-100 transition duration-700"></div>
              
              <img 
                src={data?.businessProfile?.loginLeftImage || factoryAssemblyImg} 
                alt="Automated Industry Node" 
                className="w-full h-full object-cover opacity-85 hover:scale-[1.02] transition-transform duration-700 select-none pointer-events-none" 
                referrerPolicy="no-referrer"
              />

              {/* Embedded Holographic stats overlay */}
              <div className="absolute top-4 right-4 bg-slate-950/90 border border-sky-500/20 p-3.5 rounded-2xl text-[9px] font-mono tracking-tight text-sky-400/95 max-w-[200px] shadow-lg shadow-black/80">
                <div className="flex items-center gap-1.5 font-bold uppercase border-b border-sky-950/30 pb-1.5 mb-1.5 text-slate-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-ping"></span>
                  Assembly Terminal #54
                </div>
                <div className="space-y-0.5 font-semibold text-slate-400 select-all">
                  <div>Core Node: <span className="font-extrabold text-[#34d399]">Active</span></div>
                  <div>Power Load: <span className="font-extrabold text-[#fbbf24]">412 kW</span></div>
                  <div>Excise Registry: <span className="font-extrabold text-[#38bdf8]">U31900GJ</span></div>
                  <div>Database: <span className="font-extrabold text-[#f43f5e]">Supabase Live</span></div>
                </div>
              </div>

              {/* Glowing Ambient line */}
              <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/75 px-3 py-1.5 rounded-xl border border-slate-800/70 text-[10px] text-slate-400 uppercase font-black tracking-widest font-mono">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></span>
                SYSTEM LOCKDOWN HANDSHAKE SECURED
              </div>
            </div>
            
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans relative">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        mobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />
      
      <main className="flex-1 overflow-y-auto p-3.5 sm:p-5 md:p-8 pb-24 lg:pb-8">
        <header className="flex justify-between items-center mb-6 sm:mb-8 gap-3 sm:gap-4">
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            {/* Hamburger menu button for mobile views */}
            <button 
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900 active:scale-95 transition-all shrink-0 shadow-xs cursor-pointer"
              title="Open Navigation Menu"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <h1 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest truncate max-w-[150px] sm:max-w-xs md:max-w-md">
                {data?.businessProfile?.companyName || "Arcenol Energy Solutions"} Digital Ecosystem
              </h1>
              <p className="text-base sm:text-lg font-bold text-slate-900 truncate">
                {activeTab === 'production-hub' || activeTab === 'production' 
                  ? 'Manufacturing Floor & Production Hub'
                  : activeTab === 'inventory-hub' || activeTab === 'inventory'
                  ? 'Stores & Inventory Hub'
                  : activeTab === 'mrp'
                  ? 'MRP & Material Demand Planning'
                  : activeTab === 'crm'
                  ? 'CRM & Distributor Management'
                  : activeTab === 'billing'
                  ? 'Billing & Invoicing Accounts'
                  : activeTab === 'warranty'
                  ? 'Warranty & Claims Management'
                  : activeTab === 'service'
                  ? 'Service & Repair Center'
                  : activeTab === 'management-kpi'
                  ? 'Management KPI Overview'
                  : activeTab === 'dealer-performance'
                  ? 'Dealer Performance Tracking'
                  : activeTab === 'regional-sales'
                  ? 'Regional Sales Analytics'
                  : activeTab === 'alerts'
                  ? 'Operational System Alerts'
                  : activeTab === 'user-manual'
                  ? 'Operations & SOP User Manual'
                  : activeTab === 'super-admin'
                  ? 'Super Admin Control Center'
                  : activeTab.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + ' Module'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1.5 sm:space-x-4 shrink-0">
             {/* User Manual & SOP Quick Access Button */}
             <button 
                onClick={() => setActiveTab('user-manual')}
                className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-2 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 rounded-xl transition duration-150 cursor-pointer text-[10px] font-black uppercase tracking-wider shadow-3xs hover:shadow-xs active:scale-95 shrink-0"
                title="Open Operations & SOP User Manual"
             >
                <BookOpen size={14} className="text-sky-600 shrink-0" />
                <span className="hidden sm:inline">User Manual</span>
             </button>

             {/* Command Menu Pill Selector */}
             <button 
                onClick={() => setIsCommandMenuOpen(true)}
                className="hidden md:flex items-center space-x-2 px-3 py-2 bg-slate-100/80 hover:bg-slate-200 border border-slate-200 rounded-xl transition duration-150 text-slate-400 hover:text-slate-700 cursor-pointer text-[10px] font-black uppercase tracking-wider shadow-3xs hover:shadow-xs active:scale-95 shrink-0 animate-pulse hover:animate-none"
             >
                <span>🔍 Command Search</span>
                <kbd className="bg-white border border-slate-250 px-1.5 py-0.5 rounded text-[8px] text-slate-500 font-mono shadow-3xs select-none">
                  Ctrl K
                </kbd>
             </button>

             <div className="hidden sm:block text-right">
                <p className="text-xs text-slate-400">System Status</p>
                <div className="flex items-center text-xs font-bold text-primary-600">
                   <div className="w-1.5 h-1.5 bg-primary-500 rounded-full mr-1.5 animate-pulse shadow-[0_0_8px_rgba(84,111,155,0.4)]"></div>
                   OPERATIONAL
                </div>
             </div>
             <NotificationCenter />
             <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-primary-600 transition-colors cursor-pointer" onClick={() => setIsCommandMenuOpen(true)}>
                <Zap size={18} />
             </div>
          </div>
        </header>

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} activeTab={activeTab} />}
          {activeTab === 'user-manual' && <UserManual setActiveTab={setActiveTab} previousTab={previousTab} />}
          {activeTab === 'landing-page' && <LandingPage isLoggedIn={true} />}
          {activeTab === 'management-kpi' && <ManagementKPI />}
          {activeTab === 'dealer-performance' && <DealerPerformance />}
          {activeTab === 'regional-sales' && <RegionalSales />}
          {activeTab === 'alerts' && <Alerts />}
          {(activeTab === 'inventory-hub' || activeTab === 'inventory' || activeTab === 'physical-audit' || activeTab === 'stock-audit' || activeTab === 'physical_audit' || activeTab === 'stock_audit' || activeTab === 'audit') && (
            <InventoryHub initialSubTab={activeTab === 'physical-audit' || activeTab === 'stock-audit' || activeTab === 'physical_audit' || activeTab === 'stock_audit' || activeTab === 'audit' ? 'stock_audit' : undefined} />
          )}
          {(activeTab === 'production-hub' || activeTab === 'production') && <ManufacturingHub />}
          {activeTab === 'mrp' && <MRP />}
          {activeTab === 'finished-goods' && <FinishedGoods />}
          {activeTab === 'storekeeper' && <StoreKeeperDashboard />}
          {activeTab === 'crm' && <CRM />}
          {activeTab === 'billing' && <Billing setActiveTab={setActiveTab} />}
          {activeTab === 'warranty' && <Warranty />}
          {activeTab === 'engagement' && <Engagement />}
          {activeTab === 'service' && <Service />}
          {activeTab === 'analytics' && <Analytics />}
          {activeTab === 'super-admin' && <SuperAdmin />}
          {(activeTab === 'data-retention' || activeTab === 'purge-records') && <SuperAdmin initialTab="retention" />}
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSidebar={() => setIsMobileSidebarOpen(true)}
      />

      {/* Global CommandMenu Overlay */}
      <CommandMenu 
        isOpen={isCommandMenuOpen} 
        onClose={() => setIsCommandMenuOpen(false)} 
        setActiveTab={setActiveTab} 
      />
    </div>
  );
}
