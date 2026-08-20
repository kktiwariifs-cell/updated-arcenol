import React, { useState, useEffect } from "react";
import { 
  Database, 
  Package, 
  Factory, 
  ShieldCheck, 
  Zap, 
  Layers,
  CheckCircle2
} from "lucide-react";
import { StoreKeeperDashboard } from "./StoreKeeperDashboard";
import { Inventory } from "./Inventory";
import { FinishedGoods } from "./FinishedGoods";
import { cn } from "../lib/utils";
import { PanelManualButton, PanelManualModal } from "../components/PanelManualModal";

export const InventoryHub: React.FC<{ initialSubTab?: string; setActiveTab?: (tab: string) => void }> = ({ initialSubTab, setActiveTab }) => {
  const [showManualModal, setShowManualModal] = useState(false);
  const getSubTabFromProp = (tabProp?: string): "stores" | "materials" | "stock_audit" | "finished" => {
    if (!tabProp) return "stores";
    if (["stock_audit", "stock-audit", "physical-audit", "physical_audit", "audit"].includes(tabProp)) {
      return "stock_audit";
    }
    if (tabProp === "materials" || tabProp === "raw") return "materials";
    if (tabProp === "finished") return "finished";
    return "stores";
  };

  const [activeSubTab, setActiveSubTab] = useState<"stores" | "materials" | "stock_audit" | "finished">(
    getSubTabFromProp(initialSubTab)
  );

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(getSubTabFromProp(initialSubTab));
    }
  }, [initialSubTab]);

  return (
    <div className="space-y-6">
      {/* Unified Hub Navigation Header */}
      <div className="bg-white/85 backdrop-blur-md rounded-[2.5rem] p-4 sm:p-6 border border-slate-100 shadow-xl shadow-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full md:w-auto">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-primary-50 rounded-2xl text-primary-600 shrink-0">
              <Layers size={22} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">
                STORES & INVENTORY HUB
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 font-sans">
                Unified stock ledger, physical warehouse maps, and end-of-line battery vaults
              </p>
            </div>
          </div>
          <div className="md:hidden self-start">
            <PanelManualButton onClick={() => setShowManualModal(true)} />
          </div>
        </div>

        {/* Cohesive Sub-Tab Switches & Manual trigger */}
        <div className="flex items-center gap-2.5 max-w-full overflow-x-auto">
          <div className="hidden md:block">
            <PanelManualButton onClick={() => setShowManualModal(true)} />
          </div>
          <div className="flex bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/50 self-start md:self-center shrink-0 max-w-full overflow-x-auto scrollbar-none whitespace-nowrap gap-1">
            {[
              { id: "stores", label: "Stores Overview", icon: Database },
              { id: "materials", label: "Raw Materials Ledger", icon: Package },
              { id: "stock_audit", label: "Physical Stock Audit", icon: CheckCircle2 },
              { id: "finished", label: "Finished Battery Vault", icon: Factory }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id as any)}
                  className={cn(
                    "flex items-center px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 cursor-pointer active:scale-95 shrink-0",
                    isActive
                      ? "bg-emerald-600 text-white shadow-md font-extrabold"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  <Icon size={14} className={cn("mr-1.5 sm:mr-2", isActive ? "text-white" : "text-slate-400")} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Embedded Contextual Panel Manual Modal */}
      <PanelManualModal 
        isOpen={showManualModal}
        onClose={() => setShowManualModal(false)}
        panelKey="inventory"
        onOpenFullManual={() => setActiveTab?.('user-manual')}
      />

      {/* Render Consolidated Module Sheets */}
      <div className="transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
        {activeSubTab === "stores" && (
          <StoreKeeperDashboard activeTab="store-keeper" />
        )}
        {activeSubTab === "materials" && (
          <Inventory />
        )}
        {activeSubTab === "stock_audit" && (
          <Inventory initialTab="stock_audit" />
        )}
        {activeSubTab === "finished" && (
          <FinishedGoods />
        )}
      </div>
    </div>
  );
};
