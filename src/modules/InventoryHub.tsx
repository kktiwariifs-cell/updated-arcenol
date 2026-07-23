import React, { useState } from "react";
import { 
  Database, 
  Package, 
  Factory, 
  ShieldCheck, 
  Zap, 
  Layers 
} from "lucide-react";
import { StoreKeeperDashboard } from "./StoreKeeperDashboard";
import { Inventory } from "./Inventory";
import { FinishedGoods } from "./FinishedGoods";
import { cn } from "../lib/utils";

export const InventoryHub: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<"stores" | "materials" | "finished">("stores");

  return (
    <div className="space-y-6">
      {/* Unified Hub Navigation Header */}
      <div className="bg-white/85 backdrop-blur-md rounded-[2.5rem] p-6 border border-slate-100 shadow-xl shadow-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-primary-50 rounded-2xl text-primary-600">
              <Layers size={22} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">
                STORES & INVENTORY HUB
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5 font-sans">
                Unified stock ledger, physical warehouse maps, and end-of-line battery vaults
              </p>
            </div>
          </div>
        </div>

        {/* Cohesive Sub-Tab Switches */}
        <div className="flex bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/50 self-start md:self-center shrink-0 max-w-full overflow-x-auto scrollbar-none whitespace-nowrap">
          {[
            { id: "stores", label: "Stores Overview", icon: Database },
            { id: "materials", label: "Raw Materials Ledger", icon: Package },
            { id: "finished", label: "Finished Battery Vault", icon: Factory }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={cn(
                  "flex items-center px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 cursor-pointer active:scale-95 shrink-0",
                  isActive
                    ? "bg-emerald-600 text-white shadow-md font-extrabold"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                <Icon size={14} className={cn("mr-2", isActive ? "text-white" : "text-slate-400")} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Render Consolidated Module Sheets */}
      <div className="transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
        {activeSubTab === "stores" && (
          <StoreKeeperDashboard activeTab="store-keeper" />
        )}
        {activeSubTab === "materials" && (
          <Inventory />
        )}
        {activeSubTab === "finished" && (
          <FinishedGoods />
        )}
      </div>
    </div>
  );
};
