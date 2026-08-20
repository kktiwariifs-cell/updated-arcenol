import React, { useState } from "react";
import { 
  Factory, 
  Cpu, 
  Settings, 
  Zap, 
  Activity,
  Microscope,
  History,
  Boxes,
  ShieldCheck,
  Trash2
} from "lucide-react";
import { Production } from "./Production";
import { MRP } from "./MRP";
import { cn } from "../lib/utils";
import { PanelManualButton, PanelManualModal } from "../components/PanelManualModal";

export const ManufacturingHub: React.FC<{ setActiveTab?: (tab: string) => void }> = ({ setActiveTab }) => {
  const [showManualModal, setShowManualModal] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"wip" | "assembly" | "grading" | "eol_qc" | "scrap_operator" | "mrp" | "history">("wip");

  return (
    <div className="space-y-6">
      {/* Unified Hub Navigation Header */}
      <div className="bg-white/85 backdrop-blur-md rounded-[2.5rem] p-4 sm:p-6 border border-slate-100 shadow-xl shadow-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full md:w-auto">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-emerald-100/50 rounded-2xl text-emerald-600 shrink-0">
              <Factory size={22} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">
                MANUFACTURING & PLAN HUB
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 font-sans">
                Real-time assembly lines, cell grading, EOL battery testing & machine scrap tracking
              </p>
            </div>
          </div>
          <div className="md:hidden self-start">
            <PanelManualButton onClick={() => setShowManualModal(true)} />
          </div>
        </div>

        {/* Cohesive Sub-Tab Switches & SOP */}
        <div className="flex items-center gap-2.5 max-w-full overflow-x-auto">
          <div className="hidden md:block">
            <PanelManualButton onClick={() => setShowManualModal(true)} />
          </div>
          <div className="flex bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/50 self-start md:self-center shrink-0 flex-wrap gap-1 max-w-full overflow-x-auto">
            {[
              { id: "wip", label: "Assembly Floor WIP", icon: Activity },
              { id: "assembly", label: "Pack Assembly", icon: Factory },
              { id: "grading", label: "Cell Grading & IR QC", icon: Microscope },
              { id: "eol_qc", label: "EOL Battery Hi-Pot Cert", icon: ShieldCheck },
              { id: "scrap_operator", label: "Machine Scrap Log", icon: Trash2 },
              { id: "mrp", label: "MRP & Material Demand", icon: Cpu },
              { id: "history", label: "Production Logs", icon: History }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id as any)}
                  className={cn(
                    "flex items-center px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 cursor-pointer active:scale-95 shrink-0",
                    isActive
                      ? "bg-emerald-600 text-white shadow-md font-extrabold"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  <Icon size={14} className={cn("mr-1 sm:mr-1.5", isActive ? "text-white" : "text-slate-400")} />
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
        panelKey={activeSubTab === "mrp" ? "mrp" : "production"}
        onOpenFullManual={() => setActiveTab?.('user-manual')}
      />

      {/* Render Consolidated Module Sheets */}
      <div className="transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
        {activeSubTab === "mrp" ? (
          <MRP />
        ) : (
          <Production initialSubTab={activeSubTab} />
        )}
      </div>
    </div>
  );
};

