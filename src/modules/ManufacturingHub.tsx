import React, { useState } from "react";
import { 
  Factory, 
  Cpu, 
  Settings, 
  Zap, 
  Activity 
} from "lucide-react";
import { Production } from "./Production";
import { MRP } from "./MRP";
import { cn } from "../lib/utils";

export const ManufacturingHub: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<"floor" | "mrp">("floor");

  return (
    <div className="space-y-6">
      {/* Unified Hub Navigation Header */}
      <div className="bg-white/85 backdrop-blur-md rounded-[2.5rem] p-6 border border-slate-100 shadow-xl shadow-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-accent-100/50 rounded-2xl text-accent-600">
              <Factory size={22} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">
                MANUFACTURING & PLAN HUB
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5 font-sans">
                Real-time active assembly lines, cell grading trackers, and material demand shortages
              </p>
            </div>
          </div>
        </div>

        {/* Cohesive Sub-Tab Switches */}
        <div className="flex bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/50 self-start md:self-center shrink-0">
          {[
            { id: "floor", label: "Assembly Floor WIP", icon: Activity },
            { id: "mrp", label: "MRP Materials Shortages", icon: Cpu }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={cn(
                  "flex items-center px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 cursor-pointer active:scale-95",
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
        {activeSubTab === "floor" && (
          <Production />
        )}
        {activeSubTab === "mrp" && (
          <MRP />
        )}
      </div>
    </div>
  );
};
