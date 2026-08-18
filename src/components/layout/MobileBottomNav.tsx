import React from 'react';
import { 
  LayoutDashboard, 
  Layers, 
  Factory, 
  ReceiptIndianRupee, 
  Menu, 
  Users, 
  ShieldCheck, 
  Wrench, 
  Cpu, 
  CheckCircle2, 
  Map, 
  Smartphone,
  BarChart3
} from 'lucide-react';
import { useAuthStore, UserRole } from '../../store/authStore';
import { cn } from '../../lib/utils';

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenSidebar: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenSidebar,
}) => {
  const { user } = useAuthStore();
  if (!user) return null;

  const getNavItems = () => {
    switch (user.role) {
      case UserRole.STORE_KEEPER:
        return [
          { id: 'inventory-hub', label: 'Stores', icon: Layers },
          { id: 'physical-audit', label: 'Audit', icon: CheckCircle2 },
          { id: 'production-hub', label: 'Assembly', icon: Factory },
          { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
        ];
      case UserRole.PRODUCTION_TEAM:
        return [
          { id: 'production-hub', label: 'Floor', icon: Factory },
          { id: 'mrp', label: 'MRP', icon: Cpu },
          { id: 'inventory-hub', label: 'Stores', icon: Layers },
          { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
        ];
      case UserRole.BILLER:
        return [
          { id: 'billing', label: 'Billing', icon: ReceiptIndianRupee },
          { id: 'crm', label: 'Clients', icon: Users },
          { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
        ];
      case UserRole.SALES_PERSON:
        return [
          { id: 'crm', label: 'CRM', icon: Users },
          { id: 'dealer-performance', label: 'Dealers', icon: BarChart3 },
          { id: 'regional-sales', label: 'Territory', icon: Map },
          { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
        ];
      case UserRole.WARRANTY_TEAM:
        return [
          { id: 'warranty', label: 'Warranty', icon: ShieldCheck },
          { id: 'engagement', label: 'Loyalty', icon: Smartphone },
          { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
        ];
      case UserRole.SERVICE_TEAM:
      case UserRole.PLANT_SERVICE_ENGINEER:
        return [
          { id: 'service', label: 'Service', icon: Wrench },
          { id: 'warranty', label: 'Warranty', icon: ShieldCheck },
          { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
        ];
      default: // SUPER_ADMIN, ADMIN, etc.
        return [
          { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
          { id: 'inventory-hub', label: 'Stores', icon: Layers },
          { id: 'production-hub', label: 'Factory', icon: Factory },
          { id: 'billing', label: 'Billing', icon: ReceiptIndianRupee },
        ];
    }
  };

  const navItems = getNavItems();

  const isCurrentActive = (id: string) => {
    if (id === 'inventory-hub') {
      return ['inventory-hub', 'inventory', 'storekeeper', 'finished-goods'].includes(activeTab);
    }
    if (id === 'production-hub') {
      return ['production-hub', 'production'].includes(activeTab);
    }
    return activeTab === id;
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 shadow-[0_-8px_25px_rgba(0,0,0,0.06)] px-2 py-1.5 safe-area-inset-bottom">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isCurrentActive(item.id);
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex flex-col items-center justify-center min-w-[56px] py-1 px-2 rounded-xl transition-all duration-200 cursor-pointer active:scale-90",
                active 
                  ? "text-primary-700 font-black" 
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              <div className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200",
                active ? "bg-primary-50 text-primary-700 shadow-xs" : "bg-transparent text-slate-500"
              )}>
                <Icon size={19} className={cn("transition-transform duration-200", active && "scale-110")} />
              </div>
              <span className={cn(
                "text-[9.5px] uppercase tracking-wider leading-none mt-1 font-bold",
                active ? "text-primary-700 font-extrabold" : "text-slate-500"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Menu / Drawer Open Button */}
        <button
          onClick={onOpenSidebar}
          className="flex flex-col items-center justify-center min-w-[56px] py-1 px-2 rounded-xl text-slate-600 hover:text-slate-900 transition-all duration-200 cursor-pointer active:scale-90"
        >
          <div className="w-9 h-9 rounded-xl bg-slate-100/90 text-slate-700 flex items-center justify-center shadow-xs">
            <Menu size={19} />
          </div>
          <span className="text-[9.5px] uppercase tracking-wider leading-none mt-1 font-bold text-slate-600">
            Menu
          </span>
        </button>
      </div>
    </div>
  );
};
