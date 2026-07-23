import React, { useState, useEffect, useRef } from "react";
import { 
  Search, 
  Terminal, 
  Layers, 
  Factory, 
  Users, 
  ReceiptIndianRupee, 
  ShieldCheck, 
  BarChart3, 
  Wrench, 
  BookOpen, 
  Bell, 
  Smartphone, 
  Activity, 
  Crown,
  ChevronRight,
  Sparkles,
  Command,
  Settings
} from "lucide-react";
import { useAuthStore, UserRole } from "../store/authStore";
import { cn } from "../lib/utils";

interface CommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
  setActiveTab: (tab: string) => void;
}

export const CommandMenu: React.FC<CommandMenuProps> = ({ isOpen, onClose, setActiveTab }) => {
  const { user, login, usersList } = useAuthStore();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut listener for Ctrl+K / Cmd+K
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Tabs / Module Navigation items
  const modules = [
    { id: "dashboard", label: "Overview Monitoring & Matrix", desc: "System stats, latency counters, and alert previews", icon: Activity, group: "Overview", roles: Object.values(UserRole) },
    { id: "user-manual", label: "Operations Manual PDF", desc: "Detailed ISO-approved system guide & standard SOP walkthroughs", icon: BookOpen, group: "Overview", roles: Object.values(UserRole) },
    { id: "inventory-hub", label: "Stores & Raw Materials Hub", desc: "Dynamic storage bin maps, materials ledger, and stock reports", icon: Layers, group: "Operations", roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STORE_KEEPER, UserRole.PRODUCTION_TEAM] },
    { id: "production-hub", label: "Manufacturing Assembly Floor", desc: "WIP trackers, capacity calculators, and cell grading QC controls", icon: Factory, group: "Operations", roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PRODUCTION_TEAM, UserRole.STORE_KEEPER] },
    { id: "crm", label: "CRM & Distributor Accounts", desc: "Lead pipeline, client onboarding, and regional maps", icon: Users, group: "Commercial", roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SALES_PERSON] },
    { id: "billing", label: "Billing Accounts & Invoicing", desc: "State GST split calculators, payment logs, and dynamic rates scaling", icon: ReceiptIndianRupee, group: "Commercial", roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.BILLER] },
    { id: "warranty", label: "Warranty Coverage Registry", desc: "TAMPER-proof serial activations and replacement claim tests", icon: ShieldCheck, group: "Post-Sales", roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.WARRANTY_TEAM] },
    { id: "service", label: "RMA Service Center Panel", desc: "Returned goods check, technical diagnoses, and recovery weights", icon: Wrench, group: "Post-Sales", roles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SERVICE_TEAM, UserRole.PLANT_SERVICE_ENGINEER] },
    { id: "super-admin", label: "Super Admin Database Console", desc: "Manage ERP credentials, simulation variables, and override policies", icon: Settings, group: "Administration", roles: [UserRole.SUPER_ADMIN] }
  ];

  // Simulator Swapping Profiles
  const rolesShortcuts = [
    { role: UserRole.SUPER_ADMIN, name: "Aravind Swamy (Super Admin)", email: "admin@arcenol.com" },
    { role: UserRole.ADMIN, name: "Rohan Sharma (Operations Owner)", email: "ops@arcenol.com" },
    { role: UserRole.STORE_KEEPER, name: "Baldev Singh (Logistics Master)", email: "store@arcenol.com" },
    { role: UserRole.PRODUCTION_TEAM, name: "Vikram Patel (Plant Supervisor)", email: "production@arcenol.com" },
    { role: UserRole.QUALITY_TEAM, name: "Anjali Verma (Quality Specialist)", email: "quality@arcenol.com" }
  ];

  // Filter Modules by role first, then by query
  const filteredModules = modules
    .filter(m => !user || m.roles.includes(user.role))
    .filter(m => 
      m.label.toLowerCase().includes(query.toLowerCase()) || 
      m.desc.toLowerCase().includes(query.toLowerCase()) ||
      m.group.toLowerCase().includes(query.toLowerCase())
    );

  // Filter Simulator Roles
  const filteredRoles = rolesShortcuts.filter(r => 
    r.name.toLowerCase().includes(query.toLowerCase()) || 
    r.role.toLowerCase().includes(query.toLowerCase()) ||
    r.email.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelectModule = (id: string) => {
    setActiveTab(id);
    onClose();
  };

  const handleSwitchSimulator = (role: UserRole) => {
    login(role);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 md:p-6 animate-in fade-in duration-200">
      {/* Click Outside of Menu */}
      <div className="absolute inset-0 cursor-default" onClick={onClose}></div>

      {/* Main Command Bar Dialogue Box */}
      <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
        
        {/* Search Input Area */}
        <div className="p-5 border-b border-slate-100 flex items-center gap-4.5 bg-slate-50/50 shrink-0">
          <Command size={22} className="text-slate-400 animate-pulse shrink-0" />
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search screen shortcuts, simulated roles, or utilities..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent border-none text-slate-900 placeholder-slate-400 text-sm font-bold outline-none leading-relaxed"
            />
          </div>
          <button
            onClick={onClose}
            className="text-[10px] font-mono text-slate-500 hover:text-slate-800 font-bold bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 px-2.5 py-1 rounded-lg shadow-3xs cursor-pointer active:scale-95 transition-all select-none uppercase tracking-wider"
          >
            ESC OR CLICK TO EXIT
          </button>
        </div>

        {/* Dynamic Lists Viewport */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          
          {/* Section 1: Dashboard and module directories */}
          {filteredModules.length > 0 && (
            <div className="space-y-3 text-left">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 flex items-center gap-2">
                <Sparkles size={11} className="text-primary-500" /> Module Navigation Screen Shortcuts
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {filteredModules.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectModule(item.id)}
                      className="w-full text-left p-3.5 rounded-2xl border border-transparent hover:border-slate-250 hover:bg-slate-50 flex items-start gap-3.5 transition-all group cursor-pointer active:scale-98"
                    >
                      <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl group-hover:bg-primary-900 group-hover:text-primary-400 transition-colors shadow-inner shrink-0">
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0 pr-1">
                        <p className="text-xs font-black text-slate-900 group-hover:text-primary-600 transition-colors">
                          {item.label}
                        </p>
                        <p className="text-[10.5px] text-slate-500 mt-0.5 line-clamp-1 font-medium leading-tight">
                          {item.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 2: Simulator Role Swapping */}
          {filteredRoles.length > 0 && (
            <div className="space-y-3 text-left pt-2 border-t border-slate-100">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 flex items-center gap-2">
                <Terminal size={11} className="text-[#009270]" /> Instant Simulator Role Swapping
              </h4>
              <div className="grid grid-cols-1 gap-1.5">
                {filteredRoles.map((role) => (
                  <button
                    key={role.role}
                    onClick={() => handleSwitchSimulator(role.role)}
                    className="w-full text-left px-4 py-3 rounded-xl border border-dashed border-slate-200 hover:border-solid hover:border-[#009270] hover:bg-[#ebfef9]/70 flex items-center justify-between gap-3 transition-all group cursor-pointer active:scale-99"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#009270] font-black flex items-center justify-center text-xs shadow-3xs group-hover:bg-[#009270] group-hover:text-white transition-colors">
                        {role.name[0]}
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-800 leading-none group-hover:text-[#009270] transition-colors">
                          {role.name}
                        </p>
                        <p className="text-[10px] text-slate-400 tracking-wider font-mono uppercase mt-1 leading-none">
                          {role.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[9px] font-black text-emerald-600 font-mono tracking-widest bg-emerald-150/40 px-2.5 py-1 rounded-md">
                        SIMULATE VIEW
                      </span>
                      <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Fallback state when query yields nothing */}
          {filteredModules.length === 0 && filteredRoles.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Search size={36} className="mx-auto mb-3 animate-pulse text-slate-350" />
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest font-mono">
                No Command or Simulation targets found matching "{query}"
              </p>
            </div>
          )}

        </div>

        {/* Global Stats bar footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-150 flex items-center justify-between text-[10px] font-mono text-slate-400 font-bold shrink-0 select-none">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#009270] animate-ping"></span>
            ACTIVE USER PROFILE: <span className="text-slate-600 font-black uppercase">{user?.name} ({user?.role})</span>
          </div>
          <div className="flex items-center gap-1.5">
            SHORTCUT KEYS: <span className="text-slate-600 font-black">CTRL+K</span>
          </div>
        </div>

      </div>
    </div>
  );
};
