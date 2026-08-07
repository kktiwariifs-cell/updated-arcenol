import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Factory, 
  Cpu,
  Users, 
  ReceiptIndianRupee, 
  ShieldCheck, 
  Wrench, 
  BarChart3,
  Settings,
  LogOut,
  ChevronRight,
  Menu,
  X,
  Smartphone,
  Bell,
  Map,
  Database,
  Layers,
  BookOpen
} from 'lucide-react';
import { useAuthStore, UserRole } from '../../store/authStore';
import { useERPData } from '../../hooks/useERPData';
import { cn } from '../../lib/utils';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const navigation = [
  {
    title: 'ADMINISTRATION',
    accentColor: 'bg-amber-400',
    items: [
      { id: 'super-admin', label: 'SUPER ADMIN PANEL', icon: Settings, roles: [UserRole.SUPER_ADMIN] },
    ]
  },
  {
    title: 'OVERVIEW',
    accentColor: 'bg-cyan-400',
    items: [
      { id: 'dashboard', label: 'Overview Monitoring', icon: LayoutDashboard, roles: Object.values(UserRole) },
      { id: 'management-kpi', label: 'MANAGEMENT KPI', icon: BarChart3, roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
      { id: 'dealer-performance', label: 'DEALER PERFORMANCE', icon: Users, roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SALES_PERSON] },
      { id: 'regional-sales', label: 'REGIONAL SALES FLOW', icon: Map, roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SALES_PERSON] },
      { id: 'alerts', label: 'OPERATIONAL ALERTS', icon: Bell, roles: Object.values(UserRole) },
    ]
  },
  {
    title: 'OPERATIONS',
    accentColor: 'bg-emerald-400',
    items: [
      { id: 'inventory-hub', label: 'STORES & INVENTORY HUB', icon: Layers, roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STORE_KEEPER, UserRole.PRODUCTION_TEAM] },
      { id: 'production-hub', label: 'MANUFACTURING FLOOR', icon: Factory, roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PRODUCTION_TEAM, UserRole.STORE_KEEPER] },
    ]
  },
  {
    title: 'COMMERCIALS',
    accentColor: 'bg-purple-400',
    items: [
      { id: 'crm', label: 'CRM & SALES', icon: Users, roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SALES_PERSON] },
      { id: 'billing', label: 'BILLING & ACCOUNTS', icon: ReceiptIndianRupee, roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BILLER] },
    ]
  },
  {
    title: 'POST SALES',
    accentColor: 'bg-rose-400',
    items: [
      { id: 'warranty', label: 'WARRANTY MANAGEMENT', icon: ShieldCheck, roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.WARRANTY_TEAM] },
      { id: 'engagement', label: 'CUSTOMER ENGAGEMENT', icon: Smartphone, roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SALES_PERSON] },
      { id: 'service', label: 'SERVICE CENTER', icon: Wrench, roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SERVICE_TEAM, UserRole.PLANT_SERVICE_ENGINEER] },
      { id: 'analytics', label: 'ANALYTICS REPORTING', icon: BarChart3, roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN] },
    ]
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, mobileOpen = false, onMobileClose }) => {
  const { user, logout } = useAuthStore();
  const [isOpen, setIsOpen] = React.useState(true);
  const { data } = useERPData();

  if (!user) return null;

  return (
    <>
      {/* Mobile Sidebar Overlay Backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300"
          onClick={onMobileClose}
        />
      )}

      <div className={cn(
        "h-screen text-white transition-all duration-300 flex flex-col shadow-2xl overflow-hidden shrink-0",
        "fixed lg:relative inset-y-0 left-0 z-50 lg:z-30",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        isOpen ? "w-64" : "w-64 lg:w-20"
      )} style={{ 
        backgroundImage: "url('/sidebar_bg_pattern.jpg')",
        backgroundSize: '280px',
        backgroundRepeat: 'repeat',
        backgroundPosition: 'top left'
      }}>
        {/* Pure pattern background from Image 2 with crisp text legibility */}
        <div className="absolute inset-0 bg-black/10 pointer-events-none"></div>

        <div className="p-6 flex items-center justify-between border-b border-white/10 bg-white/5 backdrop-blur-sm">
          {isOpen || mobileOpen ? (
            <div className="flex items-center space-x-3 overflow-hidden select-none">
              {data?.businessProfile?.logo ? (
                <img 
                  src={data.businessProfile.logo} 
                  alt="Company Logo" 
                  className="w-18 h-18 object-contain rounded-xl bg-white p-1 border border-white/10 shrink-0 shadow-lg"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-18 h-18 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center font-black text-white shrink-0 border border-white/20 shadow-md text-2xl">
                  A
                </div>
              )}
              <div className="font-black text-base tracking-tighter italic text-white drop-shadow-md leading-none overflow-hidden">
                <span className="truncate block max-w-[110px]">{data?.businessProfile?.shortName || "ARCENOL"}<span className="text-white/40 text-lg">.</span></span>
                <p className="text-[7px] font-bold text-white/50 tracking-[0.1em] uppercase mt-1 truncate max-w-[110px]">
                  {data?.businessProfile?.companyName || "Energy Solutions"}
                </p>
              </div>
            </div>
          ) : (
            <div className="mx-auto flex justify-center shrink-0">
              {data?.businessProfile?.logo ? (
                <img 
                  src={data.businessProfile.logo} 
                  alt="Logo" 
                  className="w-14 h-14 object-contain rounded-xl bg-white p-1 border border-white/10 shadow-md"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="font-black text-2xl italic text-white">A.</span>
              )}
            </div>
          )}
          <button 
            onClick={() => {
              if (window.innerWidth < 1024) {
                onMobileClose?.();
              } else {
                setIsOpen(!isOpen);
              }
            }} 
            className="p-2 hover:bg-white/10 rounded-lg transition-colors shrink-0 cursor-pointer"
          >
            <span className="lg:hidden">
              <X size={20} className="text-white/60" />
            </span>
            <span className="hidden lg:inline">
              {isOpen ? <X size={20} className="text-white/60" /> : <Menu size={20} className="text-white/60" />}
            </span>
          </button>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-3 overflow-y-auto custom-scrollbar relative z-10 scrollbar-thin scrollbar-thumb-white/20 hover:scrollbar-thumb-white/40">
          {navigation.map((section) => {
            const visibleItems = section.items.filter(item => item.roles.includes(user.role));
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title} className="space-y-1 p-1 rounded-2xl transition-all duration-300">
                {(isOpen || mobileOpen) && (
                  <div className="px-1 pt-1.5 pb-1">
                    <div className="flex items-center space-x-2 bg-black/40 border border-white/20 px-2.5 py-1 rounded-lg shadow-sm">
                      <span className={cn("w-2 h-2 rounded-full shrink-0 shadow-sm", section.accentColor)} />
                      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white drop-shadow-sm truncate">
                        {section.title}
                      </span>
                    </div>
                  </div>
                )}
                <div className="space-y-0.5">
                  {visibleItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        onMobileClose?.();
                      }}
                      className={cn(
                        "w-full flex items-center py-2 px-2.5 rounded-xl transition-all duration-300 group relative border border-transparent active:scale-95 cursor-pointer",
                        activeTab === item.id 
                          ? "bg-white text-primary-900 font-black shadow-xl" 
                          : "text-white/70 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      {activeTab === item.id && (
                        <div className="absolute left-0 w-1.5 h-5 bg-primary-600 rounded-r-full shadow-lg" />
                      )}
                      <item.icon size={16} className={cn(
                        "transition-all duration-300 group-hover:scale-110 shrink-0",
                        activeTab === item.id ? "text-primary-600" : "text-white/70 group-hover:text-white"
                      )} />
                      {(isOpen || mobileOpen) && <span className={cn(
                        "ml-3 text-[10px] font-black uppercase tracking-[0.12em] leading-none transition-all duration-300 truncate",
                        activeTab === item.id ? "scale-102" : "group-hover:translate-x-0.5"
                      )}>{item.label}</span>}
                      {(isOpen || mobileOpen) && activeTab === item.id && <ChevronRight size={13} className="ml-auto text-primary-200 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          {/* DOCUMENTATION & HUBS SECTION IN NAV */}
          <div className="space-y-1 p-1 rounded-2xl transition-all duration-300">
            {(isOpen || mobileOpen) && (
              <div className="px-1 pt-1.5 pb-1">
                <div className="flex items-center space-x-2 bg-black/40 border border-white/20 px-2.5 py-1 rounded-lg shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0 shadow-sm" />
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white drop-shadow-sm truncate">
                    DOCUMENTATION & HUB
                  </span>
                </div>
              </div>
            )}
            <div className="space-y-0.5">
              <button
                onClick={() => {
                  setActiveTab('user-manual');
                  onMobileClose?.();
                }}
                className={cn(
                  "w-full flex items-center py-2 px-2.5 rounded-xl transition-all font-black text-[10px] uppercase tracking-[0.12em] group border cursor-pointer active:scale-95",
                  activeTab === 'user-manual'
                    ? "bg-white text-primary-900 shadow-xl border-transparent"
                    : "text-white/70 hover:text-white hover:bg-white/10 border-transparent"
                )}
              >
                <BookOpen size={16} className="group-hover:scale-110 transition-transform shrink-0" />
                {(isOpen || mobileOpen) && <span className="ml-3 truncate">Operations Manual</span>}
              </button>

              <button
                onClick={() => {
                  setActiveTab('landing-page');
                  onMobileClose?.();
                }}
                className={cn(
                  "w-full flex items-center py-2 px-2.5 rounded-xl transition-all font-black text-[10px] uppercase tracking-[0.12em] group border cursor-pointer active:scale-95",
                  activeTab === 'landing-page'
                    ? "bg-white text-primary-900 shadow-xl border-transparent"
                    : "text-white/70 hover:text-white hover:bg-white/10 border-transparent"
                )}
              >
                <Smartphone size={16} className="group-hover:scale-110 transition-transform shrink-0" />
                {(isOpen || mobileOpen) && <span className="ml-3 truncate">Public Download Hub</span>}
              </button>
            </div>
          </div>
        </nav>

        <div className="p-3.5 border-t border-white/15 bg-black/20 backdrop-blur-md relative z-10 shrink-0 space-y-2">
          {(isOpen || mobileOpen) && (
            <div className="flex items-center space-x-2 bg-black/40 border border-white/20 px-2.5 py-1 rounded-lg shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-sm animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white drop-shadow-sm truncate">
                ACTIVE SESSION
              </span>
            </div>
          )}

          <div className="flex items-center space-x-2.5 p-2 rounded-2xl bg-white/10 border border-white/10 shadow-lg backdrop-blur-sm">
            <div className="w-8 h-8 rounded-xl bg-white text-primary-900 flex items-center justify-center font-black text-sm shadow-xl shrink-0">
              {user.name[0]}
            </div>
            {(isOpen || mobileOpen) && (
              <div className="flex-1 overflow-hidden">
                <p className="text-[11px] font-black truncate text-white leading-tight">{user.name}</p>
                <p className="text-[8.5px] font-bold text-white/50 truncate uppercase tracking-widest leading-none mt-0.5">{user.role}</p>
              </div>
            )}
          </div>

          <button 
            onClick={() => {
              logout();
              onMobileClose?.();
            }}
            className="w-full flex items-center py-2.5 px-3 text-white bg-red-600/30 hover:bg-red-600/50 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest group active:scale-95 border border-red-400/40 cursor-pointer shadow-md"
          >
            <LogOut size={16} className="group-hover:-translate-x-1 transition-transform shrink-0 text-red-300" />
            {(isOpen || mobileOpen) && <span className="ml-3 font-black text-white">System Logout</span>}
          </button>
        </div>
      </div>
    </>
  );
};
