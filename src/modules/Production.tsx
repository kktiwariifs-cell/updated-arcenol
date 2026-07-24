import React, { useState } from "react";
import {
  Factory,
  Box,
  QrCode,
  Printer,
  CheckCircle2,
  History,
  Database,
  Wrench,
  Plus,
  AlertCircle,
  Tag,
  Cpu,
  Zap,
  Activity,
  BadgeCheck,
  Package,
  TrendingUp,
  BarChart3,
  LineChart as LineChartIcon,
  Layers,
  Settings,
  Microscope,
  FlaskConical,
  ClipboardCheck,
  ArrowRight,
  Edit,
  Trash2,
  X,
  Download,
} from "lucide-react";
import { useERPData } from "../hooks/useERPData";
import { downloadReportDataAsPDF } from "../lib/pdfGenerator";
import { useAuthStore, UserRole } from "../store/authStore";
import { QRCodeSVG } from "qrcode.react";
import Barcode from "react-barcode";
import { cn } from "../lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";

export const Production: React.FC = () => {
  const { data, loading, refetch } = useERPData();
  const { user } = useAuthStore();
  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;

  const [activeSubTab, setActiveSubTab] = useState<
    "wip" | "assembly" | "grading" | "history"
  >("wip");

  // Production Step State
  const [step, setStep] = useState(1);
  const [selectedModel, setSelectedModel] = useState("");
  const [qty, setQty] = useState(1);
  const [targetWarehouse, setTargetWarehouse] = useState("Main Warehouse");
  const [targetRack, setTargetRack] = useState("A-01");
  const [serials, setSerials] = useState<string[]>([]);

  // WIP State
  const [wipStep, setWipStep] = useState(1);
  const [wipName, setWipName] = useState("Cell Pack Assembly");
  const [wipQty, setWipQty] = useState(10);
  const [wipInitialStage, setWipInitialStage] = useState("WELDING");

  // Custom WIP Stage Admin state
  const [newStageName, setNewStageName] = useState("");
  const [stageError, setStageError] = useState("");
  const [isCreatingStage, setIsCreatingStage] = useState(false);

  const [selectedWipCommitments, setSelectedWipCommitments] = useState<any | null>(null);

  const [editingWipId, setEditingWipId] = useState<string | null>(null);
  const [editingWipName, setEditingWipName] = useState("");
  const [editingWipQty, setEditingWipQty] = useState<number>(0);

  const handleStartEditWip = (item: any) => {
    setEditingWipId(item.id);
    setEditingWipName(item.name);
    setEditingWipQty(item.qty);
  };

  const handleSaveWipEdit = async (id: string) => {
    try {
      const res = await fetch(`/api/production/wip/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingWipName,
          qty: editingWipQty
        })
      });
      if (res.ok) {
        setEditingWipId(null);
        refetch();
      } else {
        alert("Failed to save WIP updates");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteWip = async (id: string) => {
    if (!confirm("Are you sure you want to delete this WIP run? Raw materials reserved will be returned to stock.")) return;
    try {
      const res = await fetch(`/api/production/wip/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        refetch();
      } else {
        alert("Failed to delete WIP batch.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const stagesList: string[] = data?.wipStages || ["WELDING", "BMS_MOUNTING", "TESTING", "CASING", "GRADING", "QUALITY_CHECK"];

  // Grading State
  const [selectedRaw, setSelectedRaw] = useState<any>(null);
  const [processingDegree, setProcessingDegree] = useState(
    "Voltage Calibration",
  );
  const [outputBatches, setOutputBatches] = useState([
    { grade: "A", qty: 0, rack: "" },
  ]);

  const [isSyncing, setIsSyncing] = useState(false);

  const handleAction = (
    actionName: string,
    callback: () => void | Promise<void>,
  ) => {
    if (isSyncing) return;
    setIsSyncing(true);
    setTimeout(async () => {
      await callback();
      setIsSyncing(false);
    }, 100);
  };

  const handleCreateWipStage = async (e: React.FormEvent) => {
    e.preventDefault();
    setStageError("");
    const normalized = newStageName.trim().toUpperCase().replace(/\s+/g, '_');
    if (!normalized) return;

    if (!/^[A-Z0-9_]+$/.test(normalized)) {
      setStageError("Codes must contain only uppercase letters, numbers, & underscores");
      return;
    }

    if (stagesList.includes(normalized)) {
      setStageError("Stage code already exists in active pipeline");
      return;
    }

    setIsCreatingStage(true);
    try {
      const res = await fetch("/api/production/wip/stages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: normalized }),
      });
      if (res.ok) {
        setNewStageName("");
        refetch();
      } else {
        setStageError("Backend error saving stage");
      }
    } catch (err) {
      setStageError("System connection failure");
    } finally {
      setIsCreatingStage(false);
    }
  };

  const handleStartWIP = async () => {
    // Implementation for starting WIP process
    const components =
      data?.products
        .find((p: any) => p.name === wipName || p.id === selectedModel)
        ?.bom.map((b: any) => ({
          matId: b.matId,
          qty: b.qty * wipQty,
        })) || [];

    await fetch("/api/production/wip/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: wipName,
        qty: wipQty,
        stage: wipInitialStage,
        components,
      }),
    });
    setWipStep(1);
    setActiveSubTab("wip");
    refetch();
  };

  const handleCompleteProduction = async () => {
    const res = await fetch("/api/production/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: selectedModel,
        qty,
        warehouse: targetWarehouse,
        rack: targetRack,
      }),
    });
    const result = await res.json();
    setSerials(result.serials);
    setStep(3);
    refetch();
  };

  const handleProcessGrading = async () => {
    await fetch("/api/processing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inputId: selectedRaw.id,
        processingDegree,
        outputBatches,
      }),
    });
    setSelectedRaw(null);
    setOutputBatches([{ grade: "A", qty: 0, rack: "" }]);
    refetch();
  };

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <Cpu className="animate-spin text-accent-500 mb-6" size={48} />
        <span className="font-black text-xs uppercase tracking-[0.3em] text-slate-400">
          Initializing Manufacturing Core...
        </span>
      </div>
    );

  const wipInventory = data?.wipInventory || [];

  return (
    <div className="space-y-8 pb-20">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">
            Production Console
          </h2>
          <div className="flex items-center mt-2 space-x-4">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              <Zap
                size={14}
                className="mr-2 text-primary-600 shadow-[0_0_8px_rgba(0,0,0,0.1)]"
              />{" "}
              Floor Master Override
            </div>
            <span className="h-1 w-1 rounded-full bg-slate-300"></span>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
              Operational Performance: 94.2%
            </p>
          </div>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-3xl border border-slate-200">
          {[
            { id: "wip", label: "WIP Control", icon: Activity },
            { id: "assembly", label: "Final Assembly", icon: Factory },
            { id: "grading", label: "Cell Grading", icon: FlaskConical },
            { id: "history", label: "Logs", icon: History },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() =>
                handleAction(`Switch to ${tab.label}`, () =>
                  setActiveSubTab(tab.id as any),
                )
              }
              className={cn(
                "flex items-center px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                activeSubTab === tab.id
                  ? "bg-emerald-600 text-white shadow-lg scale-[1.02]"
                  : "text-slate-500 hover:text-slate-300",
              )}
            >
              <tab.icon size={14} className="mr-2" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeSubTab === "wip" ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-10">
          {/* WIP Overview Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 relative overflow-hidden group shadow-xl">
              <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-10 transition-all duration-700">
                <Activity size={140} />
              </div>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">
                Total Semi-Finished Nodes
              </h4>
              <p className="text-6xl font-black text-slate-900 italic tracking-tighter mb-4">
                {wipInventory.length}
              </p>
              <div className="flex items-center text-[10px] font-black text-primary-600 uppercase tracking-widest">
                <TrendingUp size={14} className="mr-2" /> Processing Active
              </div>
            </div>

            <div className="lg:col-span-2 bg-white p-10 rounded-[3.5rem] border border-slate-100 relative overflow-hidden shadow-xl flex flex-col justify-between">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-black text-slate-900 italic tracking-tighter uppercase mb-1">
                    Process Started Flow
                  </h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    Resource-to-WIP Transformation Protocol
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      downloadReportDataAsPDF({
                        title: "WIP Work-In-Progress Production Audit",
                        subtitle: `Active WIP Batches: ${wipInventory.length} | Manufacturing Plant Floor`,
                        headers: ["Batch ID / Serial", "Material Description", "Current Stage", "Batch Qty", "Assigned Operator"],
                        rows: wipInventory.map((w: any) => [
                          w.id || w.serial || 'WIP-BATCH',
                          w.name || 'Lithium Assembly',
                          w.stage || 'PROCESSING',
                          `${w.qty || 1} Pcs`,
                          w.operator || 'Line Tech 1'
                        ]),
                        filename: `WIP_Production_Floor_Report.pdf`
                      });
                    }}
                    className="bg-slate-900 hover:bg-black text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-wider active:scale-95 transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                    title="Download Work-In-Progress Production Report as PDF"
                  >
                    <Download size={13} className="text-sky-400" /> Download PDF
                  </button>
                  <button
                    onClick={() => setWipStep(2)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-wider active:scale-95 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
                  >
                    Initiate NEW Process
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Cell Packs
                  </p>
                  <p className="text-2xl font-black text-slate-900">
                    {wipInventory.filter((w) => w.name.includes("Cell")).length}
                  </p>
                </div>
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    BMS Mounted
                  </p>
                  <p className="text-2xl font-black text-slate-900">
                    {wipInventory.filter((w) => w.name.includes("BMS")).length}
                  </p>
                </div>
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Ready Hub
                  </p>
                  <p className="text-2xl font-black text-slate-900">
                    {wipInventory.filter((w) => w.stage === "READY").length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* WIP Stages Custom Registry Admin Panel */}
          {isAdmin && (
            <div className="traditional-mandala-card rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden space-y-6">
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

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tighter italic flex items-center text-[#7c1d3c]">
                    <Settings className="mr-2.5 shrink-0 animate-spin-slow text-[#7c1d3c]" size={20} />
                    WIP Process Stages Registry [Admin Mode]
                  </h3>
                  <p className="text-[10px] text-[#5a3a44] font-semibold uppercase tracking-wider mt-1">
                    Define custom pipeline milestones. Registered stages can be used when initiating raw stock runs.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono bg-[#7c1d3c]/10 border border-[#7c1d3c]/20 px-2.5 py-1 rounded-md text-[#7c1d3c] font-bold uppercase tracking-wider">
                    Administrative Access Approved
                  </span>
                </div>
              </div>
 
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-2 relative z-10">
                <div className="lg:col-span-2 space-y-3">
                  <label className="block text-[10px] font-black text-[#7c1d3c] uppercase tracking-[0.2em]">
                    Pipeline Process Stages ({stagesList.length})
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {stagesList.map((stg: string) => (
                      <div 
                        key={stg} 
                        className="bg-white/90 hover:bg-white border border-[#7c1d3c]/20 text-[#3c0c1b] px-4 py-2.5 rounded-2xl text-[10px] font-black tracking-widest uppercase flex items-center gap-2 transition-all font-mono shadow-sm"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-[#7c1d3c] shadow-[0_0_8px_rgba(124,29,60,0.6)] animate-pulse"></span>
                        {stg.replace(/_/g, ' ')}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white/90 p-6 rounded-3xl border border-[#7c1d3c]/15 shadow-sm">
                  <form onSubmit={handleCreateWipStage} className="space-y-4">
                    <div className="space-y-1">
                      <label className="block text-[9px] font-black text-[#7c1d3c] uppercase tracking-widest leading-none">
                        Define New Pipeline Code
                      </label>
                      <p className="text-[8px] text-[#5a3a44] font-semibold uppercase tracking-wide leading-tight">
                        Uppercase characters & underscores only
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newStageName}
                        onChange={(e) => {
                          setNewStageName(e.target.value);
                          setStageError("");
                        }}
                        placeholder="e.g. VACUUM_BAKE"
                        className="flex-1 bg-white border border-[#7c1d3c]/30 rounded-xl px-4 py-3 text-xs text-[#7c1d3c] font-mono placeholder-[#7c1d3c]/40 outline-none focus:border-[#7c1d3c] transition-all font-black uppercase text-center tracking-widest"
                        required
                        disabled={isCreatingStage}
                      />
                      <button
                        type="submit"
                        disabled={isCreatingStage}
                        className="bg-[#7c1d3c] hover:bg-[#62142d] text-white font-black px-4 rounded-xl text-xs tracking-wider uppercase transition-all flex items-center justify-center shrink-0 disabled:opacity-50"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    {stageError && (
                      <p className="text-[9px] text-rose-700 font-bold uppercase tracking-wider leading-none">
                        ⚠ {stageError}
                      </p>
                    )}
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* WIP Inventory Table */}
          <div className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-2xl shadow-slate-200/50">
            <div className="p-10 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">
                Semi-Finished Logical Stock
              </h3>
              <div className="flex items-center space-x-3 text-[10px] font-black text-primary-600 uppercase tracking-widest">
                <Settings className="animate-spin-slow" size={16} /> Precision
                Tracking Active
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono">
                <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] border-b border-slate-100">
                  <tr>
                    <th className="px-10 py-8">Assembly Logic</th>
                    <th className="px-10 py-8">Process Stage</th>
                    <th className="px-10 py-8 text-center">Unit Count</th>
                    <th className="px-10 py-8">Last Node Update</th>
                    <th className="px-10 py-8 text-right">Commitments & Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {wipInventory.map((item: any) => {
                    const isEditing = editingWipId === item.id;
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50 transition-all group duration-300"
                      >
                        <td className="px-10 py-8">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingWipName}
                              onChange={(e) => setEditingWipName(e.target.value)}
                              className="bg-slate-50 border border-slate-300 px-3 py-1.5 rounded-lg text-xs font-black font-sans text-slate-800 outline-none w-full uppercase"
                            />
                          ) : (
                            <>
                              <p className="text-[16px] font-black text-slate-900 uppercase tracking-tighter group-hover:text-primary-600 transition-colors leading-none">
                                {item.name}
                              </p>
                              <p className="text-[9px] text-slate-400 font-black uppercase mt-3 tracking-widest italic">
                                {item.id}
                              </p>
                            </>
                          )}
                        </td>
                        <td className="px-10 py-8">
                          {isAdmin ? (
                            <div className="relative inline-block">
                              <select
                                value={item.stage}
                                onChange={async (e) => {
                                  const nextStage = e.target.value;
                                  await fetch("/api/production/wip/update-stage", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ wipId: item.id, stage: nextStage })
                                  });
                                  refetch();
                                }}
                                className="bg-primary-50 hover:bg-primary-100 text-primary-600 border border-primary-100 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest cursor-pointer outline-none transition-all mr-1 pr-8 appearance-none shadow-xs font-mono"
                              >
                                {stagesList.map((stg: string) => (
                                  <option key={stg} value={stg} className="bg-white text-slate-900 font-mono">
                                    {stg.replace(/_/g, ' ')}
                                  </option>
                                ))}
                              </select>
                              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-primary-600 font-extrabold leading-none">
                                ▼
                              </span>
                            </div>
                          ) : (
                            <div className="bg-primary-50 text-primary-600 border border-primary-100 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center w-fit">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary-600 animate-pulse mr-2"></div>
                              {item.stage}
                            </div>
                          )}
                        </td>
                        <td className="px-10 py-8 text-center">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editingWipQty}
                              onChange={(e) => setEditingWipQty(Number(e.target.value))}
                              className="bg-slate-50 border border-slate-300 px-3 py-1.5 rounded-lg text-xs font-black font-mono text-slate-800 outline-none w-24 text-center"
                            />
                          ) : (
                            <span className="text-2xl font-black text-slate-900 italic tracking-tighter">
                              {item.qty}
                            </span>
                          )}
                        </td>
                        <td className="px-10 py-8">
                          <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center">
                            <History size={14} className="mr-2 text-slate-300" />{" "}
                            {item.lastUpdate}
                          </p>
                        </td>
                        <td className="px-10 py-8 text-right">
                          <div className="flex items-center justify-end space-x-3">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => handleSaveWipEdit(item.id)}
                                  className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 border border-emerald-100 transition-all cursor-pointer flex items-center justify-center"
                                  title="Save WIP Updates"
                                >
                                  <CheckCircle2 size={16} />
                                </button>
                                <button
                                  onClick={() => setEditingWipId(null)}
                                  className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 border border-red-100 transition-all cursor-pointer flex items-center justify-center"
                                  title="Cancel Edit"
                                >
                                  <X size={16} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleStartEditWip(item)}
                                  className="p-2 bg-blue-50 text-blue-605 rounded-xl hover:bg-blue-100 border border-blue-100 transition-all cursor-pointer flex items-center justify-center"
                                  title="Edit WIP Run"
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteWip(item.id)}
                                  className="p-2 bg-red-50 text-red-650 rounded-xl hover:bg-red-100 border border-red-100 transition-all cursor-pointer flex items-center justify-center"
                                  title="Delete WIP Run"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => setSelectedWipCommitments(item)}
                              title="View Material Commitments"
                              className="p-3 bg-slate-50 text-slate-500 rounded-2xl hover:text-primary-600 hover:bg-primary-50 border border-slate-100 transition-all group-hover:border-primary-100 cursor-pointer hover:scale-105 active:scale-95 flex items-center justify-center"
                            >
                              <ArrowRight size={20} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* WIP Commitments Modal Overlay */}
          {selectedWipCommitments && (
            <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-2xl rounded-[2.5rem] border-2 border-slate-950 p-8 shadow-5xl animate-in zoom-in-95 duration-300 text-left">
                <div className="flex justify-between items-start mb-6">
                  <div className="text-left">
                    <h1 className="text-[26px] font-black text-slate-950 uppercase tracking-tighter italic leading-none">
                      Material Commitments
                    </h1>
                    <p className="text-[10px] font-black tracking-widest text-primary-600 uppercase mt-2.5 leading-none font-mono">
                      BOM RAW ALLOCATIONS & PROCESS RESERVATIONS
                    </p>
                    <div className="h-[2.5px] bg-primary-600 w-[140px] rounded-full mt-3"></div>
                  </div>
                  <button
                    onClick={() => setSelectedWipCommitments(null)}
                    className="text-[9.5px] font-black text-slate-500 bg-white border border-slate-250 hover:text-[#009cbc] hover:border-[#009cbc] uppercase tracking-widest px-4.5 py-2.5 rounded-2xl cursor-pointer transition-all active:scale-95 leading-none shadow-xs"
                  >
                    CLOSE OVERVIEW
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-200/60 mb-6 font-mono text-xs">
                  <div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">WIP Assembly Node</span>
                    <span className="text-sm font-black text-slate-900 uppercase italic">{selectedWipCommitments.name}</span>
                  </div>
                  <div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Process Batch ID</span>
                    <span className="text-sm font-black text-slate-900 uppercase">{selectedWipCommitments.id}</span>
                  </div>
                  <div className="mt-2">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Active Pipeline Stage</span>
                    <span className="text-xs font-black text-primary-600 uppercase flex items-center mt-0.5">
                      <span className="h-1.5 w-1.5 bg-primary-600 rounded-full animate-pulse mr-2"></span>
                      {selectedWipCommitments.stage.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="mt-2">
                    <span className="text-[8px] font-black text-slate-400 tracking-wider block uppercase">Current Unit Count</span>
                    <span className="text-base font-black text-slate-900 italic">{selectedWipCommitments.qty} Packs Active</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-mono">
                      Committed Inventory Assets ({selectedWipCommitments.components?.length || 0})
                    </span>
                    <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md uppercase tracking-wide font-mono">
                      ✔ ATOMICALLY SECURED
                    </span>
                  </div>

                  <div className="border border-slate-150 rounded-[2rem] overflow-hidden max-h-[250px] overflow-y-auto">
                    <table className="w-full text-left font-mono">
                      <thead className="bg-slate-50 text-[9px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-4">Component Node</th>
                          <th className="px-6 py-4 text-center">Batch Issue Qty</th>
                          <th className="px-6 py-4 text-center">Material Unit</th>
                          <th className="px-6 py-4 text-right">Global Stock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs text-slate-705">
                        {selectedWipCommitments.components && selectedWipCommitments.components.length > 0 ? (
                          selectedWipCommitments.components.map((comp: any, index: number) => {
                            const catalogItem = data?.inventory?.find((i: any) => i.id === comp.matId);
                            const materialName = catalogItem?.name || comp.matId;
                            const materialUnit = catalogItem?.unit || "Pcs";
                            const globalQty = catalogItem?.qty !== undefined ? catalogItem.qty : "N/A";
                            return (
                              <tr key={index} className="hover:bg-slate-50/50">
                                <td className="px-6 py-4">
                                  <div className="font-sans font-black text-slate-900 uppercase text-[11px] leading-tight">
                                    {materialName}
                                  </div>
                                  <div className="text-[8.5px] text-slate-400 font-mono font-bold mt-0.5">
                                    {comp.matId}
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-center text-slate-900 font-extrabold text-sm italic">
                                  {comp.qty.toLocaleString()}
                                </td>
                                <td className="px-6 py-4 text-center text-slate-400 font-black text-[9px] uppercase tracking-wider">
                                  {materialUnit}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="text-slate-900 font-bold text-xs leading-none">
                                    {globalQty === "N/A" ? "N/A" : globalQty.toLocaleString()}
                                  </div>
                                  <div className="text-[8px] text-zinc-500 font-black uppercase mt-1">
                                    {globalQty === "N/A" ? "" : globalQty >= comp.qty ? "Sufficient ✅" : "Depleted 🚨"}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-6 py-8 text-center text-slate-400 font-bold uppercase text-[9px] tracking-widest">
                              No materials actively committed to this tracking node.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <p className="text-[8.5px] text-slate-500 font-bold uppercase tracking-wide leading-tight text-center mt-4 italic">
                    ⚠ Raw Materials are securely allocated to this logical WIP unit and isolated from general ledger issues.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* WIP Modal Overlay */}
          {wipStep === 2 && (
            <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-lg rounded-[2.5rem] border-2 border-slate-950 p-8 shadow-5xl animate-in zoom-in-95 duration-300 text-left">
                <div className="flex justify-between items-start mb-6">
                  <div className="text-left">
                    <h1 className="text-[26px] font-black text-slate-950 uppercase tracking-tighter italic leading-none">
                      PROCESS INITIATION
                    </h1>
                    <p className="text-[10px] font-black tracking-widest text-[#009cbc] uppercase mt-2.5 leading-none">
                      MATERIAL ISSUE & TRANSFORMATION
                    </p>
                    <div className="h-[2.5px] bg-[#009cbc] w-[140px] rounded-full mt-3"></div>
                  </div>
                  <button
                    onClick={() => setWipStep(1)}
                    className="text-[9.5px] font-black text-[#64748b] bg-white border border-slate-250 hover:text-[#009cbc] hover:border-[#009cbc] uppercase tracking-widest px-4.5 py-2.5 rounded-2xl cursor-pointer transition-all active:scale-95 leading-none shadow-xs"
                  >
                    DISCARD PROTOCOL
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2 text-left">
                      <label className="block text-[9.5px] font-black text-slate-400 uppercase tracking-widest leading-none">
                        INVENTORY TARGET TYPE
                      </label>
                      <div className="relative">
                        <select
                          value={wipName}
                          onChange={(e) => setWipName(e.target.value)}
                          className="w-full bg-[#f8fafc] border border-slate-250 rounded-2xl px-5 py-3.5 text-xs font-black text-slate-900 italic uppercase appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-[#009cbc]/20 transition-all shadow-xs pr-10"
                        >
                          <option value="Cell Pack Assembly">
                            CELL PACK ASSEMBLY
                          </option>
                          <option value="BMS Mounted Pack">
                            BMS MOUNTED PACK
                          </option>
                          <option value="Tested Modules">TESTED MODULES</option>
                          <option value="Half-Assembled Chassis">
                            HALF-ASSEMBLED CHASSIS
                          </option>
                        </select>
                        <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-900 font-extrabold text-[10px]">
                          ▼
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 text-left">
                      <label className="block text-[9.5px] font-black text-slate-400 uppercase tracking-widest leading-none">
                        MAGNITUDE COUNT
                      </label>
                      <input
                        type="number"
                        value={wipQty}
                        onChange={(e) =>
                          setWipQty(parseInt(e.target.value) || 0)
                        }
                        className="w-full bg-[#f8fafc] border border-slate-250 rounded-2xl px-5 py-3.5 text-xs font-black text-slate-950 focus:ring-2 focus:ring-[#009cbc]/20 outline-none transition-all shadow-xs font-mono"
                        placeholder="Units to Initiate"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 text-left">
                    <label className="block text-[9.5px] font-black text-slate-400 uppercase tracking-widest leading-none">
                      Initial WIP Stage
                    </label>
                    <div className="relative">
                      <select
                        value={wipInitialStage}
                        onChange={(e) => setWipInitialStage(e.target.value)}
                        className="w-full bg-[#f8fafc] border border-slate-250 rounded-2xl px-5 py-3.5 text-xs font-black text-slate-900 italic uppercase appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-[#009cbc]/20 transition-all shadow-xs pr-10 font-mono"
                      >
                        {stagesList.map((stg: string) => (
                          <option key={stg} value={stg}>
                            {stg.replace(/_/g, ' ')}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-900 font-extrabold text-[10px]">
                        ▼
                      </div>
                    </div>
                  </div>

                  {/* Material Issue Preview Card */}
                  <div className="p-6 bg-[#f4fbfd] border border-[#d1f7fc]/55 rounded-[2rem] shadow-xs">
                    <h4 className="text-[10px] font-black text-[#009cbc] uppercase tracking-wider mb-4 flex items-center leading-none">
                      <Layers size={14} className="mr-2 text-[#009cbc]" />{" "}
                      MATERIAL ISSUE PREVIEW TABLE
                    </h4>
                    <div className="overflow-hidden border border-slate-200/50 rounded-xl bg-white shadow-xs">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-[8.5px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200/60 font-mono">
                            <th className="px-4 py-3">Material Component</th>
                            <th className="px-4 py-3 text-center">Batch Formula</th>
                            <th className="px-4 py-3 text-right">Required Qty</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-xs">
                          {(() => {
                            const getPreviewItems = () => {
                              const nameUpper = wipName.toUpperCase();
                              if (
                                nameUpper.includes("CELL") ||
                                nameUpper.includes("ASSEMBLY")
                              ) {
                                return [
                                  {
                                    name: "Lithium Cells",
                                    qty: wipQty * 200,
                                    unit: "Pcs",
                                    formula: `200 Pcs × ${wipQty}`
                                  },
                                  { 
                                    name: "BMS Module", 
                                    qty: wipQty * 1, 
                                    unit: "Pcs",
                                    formula: `1 Pc × ${wipQty}`
                                  },
                                ];
                              } else if (
                                nameUpper.includes("BMS") ||
                                nameUpper.includes("MOUNTED")
                              ) {
                                return [
                                  {
                                    name: "BMS Microcontroller Board",
                                    qty: wipQty * 1,
                                    unit: "Pcs",
                                    formula: `1 Pc × ${wipQty}`
                                  },
                                  {
                                    name: "Connectors & Ports",
                                    qty: wipQty * 6,
                                    unit: "Pcs",
                                    formula: `6 Pcs × ${wipQty}`
                                  },
                                ];
                              } else {
                                return [
                                  {
                                    name: "Structure Frame Enclosure",
                                    qty: wipQty * 1,
                                    unit: "Pcs",
                                    formula: `1 Pc × ${wipQty}`
                                  },
                                  {
                                    name: "Wiring harness & accessories",
                                    qty: wipQty * 1,
                                    unit: "Set",
                                    formula: `1 Set × ${wipQty}`
                                  },
                                ];
                              }
                            };
                            return getPreviewItems().map((item, index) => (
                              <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-4 py-3 text-slate-700 font-sans font-medium">
                                  {item.name}
                                </td>
                                <td className="px-4 py-3 text-center text-slate-400 font-medium">
                                  {item.formula}
                                </td>
                                <td className="px-4 py-3 text-right text-slate-950 font-black">
                                  {item.qty.toLocaleString()} <span className="text-[10px] text-slate-400 font-extrabold ml-0.5">{item.unit}</span>
                                </td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[8.5px] font-black text-[#64748b] uppercase tracking-widest text-center italic mt-4 leading-tight">
                      REQUIRED STOCK WILL BE ATOMICALLY DEDUCTED ON EXECUTION
                    </p>
                  </div>

                  <button
                    onClick={handleStartWIP}
                    className="w-full bg-[#009cbc] hover:bg-[#008ba3] text-white py-4.5 rounded-[1.5rem] font-black uppercase text-[11px] tracking-widest active:scale-95 transition-all shadow-md shadow-[#009cbc]/15 text-center leading-none cursor-pointer outline-none font-sans"
                  >
                    EXECUTE MATERIAL ISSUE & START WIP
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : activeSubTab === "assembly" ? (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white rounded-[3.5rem] border border-slate-100 overflow-hidden shadow-2xl">
            <div className="flex bg-slate-50 p-2 border-b border-slate-100">
              {[
                { id: 1, label: "Model Selection" },
                { id: 2, label: "BOM Validation" },
                { id: 3, label: "QC & Artifacts" },
              ].map((s) => (
                <div
                  key={s.id}
                  className={cn(
                    "flex-1 p-6 rounded-[1.5rem] text-center text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                    step === s.id
                      ? "bg-emerald-600 text-white shadow-xl shadow-emerald-500/20 scale-[1.02]"
                      : "text-slate-400",
                  )}
                >
                  {s.label}
                </div>
              ))}
            </div>

            <div className="p-12">
              {step === 1 && (
                <div className="space-y-12">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {data?.products.map((p: any) => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedModel(p.id)}
                        className={cn(
                          "p-8 rounded-[2.5rem] border-2 text-left transition-all relative overflow-hidden group",
                          selectedModel === p.id
                            ? "border-primary-500 bg-primary-50 shadow-xl"
                            : "border-slate-100 hover:border-slate-200 bg-slate-50/50",
                        )}
                      >
                        <Box
                          className={cn(
                            "mb-6 transition-colors duration-500",
                            selectedModel === p.id
                              ? "text-primary-600"
                              : "text-slate-300",
                          )}
                          size={36}
                        />
                        <p
                          className={cn(
                            "font-black text-lg uppercase tracking-tighter leading-none mb-2",
                            selectedModel === p.id
                              ? "text-slate-900"
                              : "text-slate-400",
                          )}
                        >
                          {p.name}
                        </p>
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                          ARC_ID: {p.id}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="bg-slate-50 p-10 rounded-[2.5rem] border border-slate-100">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                      Production Magnitude Target
                    </label>
                    <input
                      type="number"
                      value={qty}
                      onChange={(e) => setQty(parseInt(e.target.value) || 1)}
                      className="w-full bg-transparent border-b-4 border-slate-200 text-5xl font-black text-slate-900 italic outline-none focus:border-primary-500 transition-all pb-4 tracking-tighter"
                    />
                  </div>
                  <button
                    disabled={!selectedModel}
                    onClick={() => setStep(2)}
                    className="w-full bg-emerald-600 text-white py-5 rounded-[1.5rem] font-black uppercase text-[12px] tracking-[0.3em] active:scale-95 transition-all shadow-xl shadow-emerald-500/20"
                  >
                    Analyze BOM Integrity →
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-10 animate-in slide-in-from-right duration-500 font-mono">
                  <h3 className="text-xl font-black text-slate-900 italic flex items-center uppercase tracking-tight">
                    <ClipboardCheck className="mr-3 text-emerald-600" />{" "}
                    Automated Material Protocol Analysis
                  </h3>
                  <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-slate-100">
                        <tr>
                          <th className="px-8 py-5">Component Node</th>
                          <th className="px-8 py-5">Requirement</th>
                          <th className="px-8 py-5">Global Stock</th>
                          <th className="px-8 py-5 text-right">Integrity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data?.products
                          .find((p) => p.id === selectedModel)
                          ?.bom.map((b: any, index: number) => {
                            const catalogItem = data?.inventory?.find((i: any) => i.id === b.matId || i.code === b.matId);
                            const componentName = b.name || b.materialName || b.componentName || b.matName || catalogItem?.name || (b.matId ? `Item (${b.matId})` : `Component ${index + 1}`);
                            const unitStr = b.unit || catalogItem?.unit || 'Pcs';
                            const requiredQty = (Number(b.qty) || 0) * qty;
                            const availableQty = catalogItem?.qty !== undefined ? Number(catalogItem.qty) : 0;
                            const hasSufficientStock = availableQty >= requiredQty;

                            return (
                              <tr key={b.matId || b.id || index}>
                                <td className="px-8 py-6 text-[12px] font-black text-slate-900 uppercase tracking-widest">
                                  <div>{componentName}</div>
                                  {b.matId && (
                                    <span className="block text-[8.5px] font-mono text-slate-400 font-bold normal-case mt-0.5">
                                      Ref: {b.matId}
                                    </span>
                                  )}
                                </td>
                                <td className="px-8 py-6 text-[10px] text-slate-500 font-mono font-bold">
                                  {requiredQty.toLocaleString()} {unitStr}
                                </td>
                                <td className="px-8 py-6 text-[10px] text-slate-500 font-mono font-bold">
                                  {availableQty.toLocaleString()} {unitStr}
                                </td>
                                <td className="px-8 py-6 text-right">
                                  <div
                                    className={cn(
                                      "inline-block h-2.5 w-2.5 rounded-full transition-all",
                                      hasSufficientStock
                                        ? "bg-emerald-500 shadow-[0_0_8px_#10b981]"
                                        : "bg-red-500 shadow-[0_0_8px_#ef4444]"
                                    )}
                                    title={hasSufficientStock ? "Sufficient Stock" : "Stock Shortage"}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                  <button
                    onClick={handleCompleteProduction}
                    className="w-full bg-emerald-600 text-white py-5 rounded-[1.5rem] font-black uppercase text-[12px] tracking-[0.3em] active:scale-95 transition-all shadow-xl shadow-emerald-500/20"
                  >
                    Authorize Final Assembly & Serialization
                  </button>
                </div>
              )}

              {step === 3 && (
                <div className="text-center space-y-10 animate-in zoom-in duration-500">
                  <div className="flex flex-col items-center">
                    <div className="h-24 w-24 bg-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.3)] rounded-full flex items-center justify-center text-white mb-8">
                      <BadgeCheck size={48} />
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 italic tracking-tighter uppercase mb-2">
                      Protocol Successful
                    </h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                      Serialized artifacts generated for {qty} units
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                    {serials.map((s) => (
                      <div
                        key={s}
                        className="bg-white p-8 rounded-[2rem] border border-slate-100 flex flex-col items-center shadow-lg"
                      >
                        <Barcode
                          value={s}
                          height={40}
                          fontSize={10}
                          background="#ffffff"
                        />
                        <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <QRCodeSVG value={s} size={100} />
                        </div>
                        <p className="mt-4 text-[12px] font-black text-primary-900 tracking-[0.1em]">
                          {s}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : activeSubTab === "grading" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-in fade-in duration-500">
          <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl space-y-8">
            <h3 className="text-xl font-black text-slate-900 italic uppercase tracking-tight flex items-center mb-10">
              <Microscope className="mr-3 text-primary-600" /> Material Scrutiny
              Panel
            </h3>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
              {data?.inventory
                .filter((i) => i.qty > 0)
                .map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedRaw(item)}
                    className={cn(
                      "w-full p-8 rounded-[2rem] border-2 text-left flex justify-between items-center transition-all duration-300",
                      selectedRaw?.id === item.id
                        ? "bg-primary-50 border-primary-500 shadow-lg"
                        : "bg-slate-50 border-slate-100 hover:border-slate-200",
                    )}
                  >
                    <div>
                      <p className="text-lg font-black text-slate-900 uppercase tracking-tighter mb-1">
                        {item.name}
                      </p>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        BATCH: {item.batch}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-slate-900 italic tracking-tighter">
                        {item.qty}
                      </p>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        U Units
                      </p>
                    </div>
                  </button>
                ))}
            </div>
          </div>

          {selectedRaw && (
            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl animate-in slide-in-from-right duration-500 space-y-10 flex flex-col justify-between">
              <div className="space-y-10">
                <h3 className="text-xl font-black text-slate-900 italic uppercase tracking-tight flex items-center border-b border-slate-100 pb-10">
                  <Settings className="mr-3 text-primary-600" /> Transformation
                  Ruleset
                </h3>
                <div className="space-y-6">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Calibration Logic Degree
                  </label>
                  <select
                    value={processingDegree}
                    onChange={(e) => setProcessingDegree(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-xs font-black text-slate-900 italic focus:ring-1 focus:ring-primary-500 outline-none transition-all uppercase"
                  >
                    <option>Voltage Calibration Matrix</option>
                    <option>Cycle Integrity Pulse</option>
                    <option>Internal Resistance Grading</option>
                  </select>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                    Cell Testing Parameters (QC-Core)
                  </p>
                  <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100">
                    <div className="space-y-2">
                      <label className="text-[8px] font-black text-slate-500 uppercase">
                        Voltage (V)
                      </label>
                      <input
                        type="text"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[10px] font-black text-slate-900 italic outline-none focus:ring-1 focus:ring-primary-500"
                        placeholder="3.7V - 4.2V"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[8px] font-black text-slate-500 uppercase">
                        IR (mΩ)
                      </label>
                      <input
                        type="text"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[10px] font-black text-slate-900 italic outline-none focus:ring-1 focus:ring-primary-500"
                        placeholder="< 30mΩ"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[8px] font-black text-slate-500 uppercase">
                        Capacity (mAh)
                      </label>
                      <input
                        type="text"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[10px] font-black text-slate-900 italic outline-none focus:ring-1 focus:ring-primary-500"
                        placeholder="2500mAh"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[8px] font-black text-slate-500 uppercase">
                        Cycle Count
                      </label>
                      <input
                        type="text"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[10px] font-black text-slate-900 italic outline-none focus:ring-1 focus:ring-primary-500"
                        placeholder="0 - 2000"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                    Graded Vector Distribution (Output)
                  </p>
                  {outputBatches.map((b, i) => (
                    <div key={i} className="flex space-x-3">
                      <select
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-[10px] font-black text-slate-900 italic uppercase focus:ring-1 focus:ring-primary-500 outline-none"
                        value={b.grade}
                        onChange={(e) => {
                          const nb = [...outputBatches];
                          nb[i].grade = e.target.value;
                          setOutputBatches(nb);
                        }}
                      >
                        <option>GRADE X-A</option>
                        <option>GRADE X-B</option>
                        <option>GRADE X-REJECT</option>
                      </select>
                      <input
                        type="number"
                        placeholder="QTY"
                        value={b.qty || ""}
                        onChange={(e) => {
                          const nb = [...outputBatches];
                          nb[i].qty = parseInt(e.target.value) || 0;
                          setOutputBatches(nb);
                        }}
                        className="w-24 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-[10px] font-black text-slate-900 focus:ring-1 focus:ring-primary-500 outline-none"
                      />
                    </div>
                  ))}
                  <button
                    onClick={() =>
                      setOutputBatches([
                        ...outputBatches,
                        { grade: "A", qty: 0, rack: "" },
                      ])
                    }
                    className="text-[9px] font-black text-primary-600 uppercase flex items-center hover:text-primary-800 transition-colors"
                  >
                    <Plus size={14} className="mr-2" /> Add Distribution Target
                  </button>
                </div>
              </div>

              <button
                onClick={handleProcessGrading}
                className="w-full bg-emerald-600 text-white py-5 rounded-[1.5rem] font-black uppercase text-[12px] tracking-[0.3em] active:scale-95 transition-all shadow-xl shadow-emerald-500/20"
              >
                Commit Transformation Protocol
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-2xl animate-in fade-in duration-500">
          <table className="w-full text-left font-mono">
            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
              <tr>
                <th className="px-8 py-6">Audit Timestamp</th>
                <th className="px-8 py-6">Material Profile</th>
                <th className="px-8 py-6">Produced Magnitude</th>
                <th className="px-8 py-6">Serialization Matrix</th>
                <th className="px-8 py-6 text-right">Commitment Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.productionHistory.map((h: any) => (
                <tr key={h.id} className="hover:bg-slate-50 transition-all">
                  <td className="px-8 py-6 text-[10px] font-black text-slate-400">
                    {h.date}
                  </td>
                  <td className="px-8 py-6 text-[12px] font-black text-slate-900 italic">
                    {h.model}
                  </td>
                  <td className="px-8 py-6 text-[14px] font-black text-primary-600 italic">
                    {h.qty} UNITS
                  </td>
                  <td className="px-8 py-6 text-[9px] font-black text-slate-400 uppercase">
                    START: {h.serials[0]}...
                  </td>
                  <td className="px-8 py-6 text-right">
                    <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-4 py-1.5 rounded-full text-[9px] font-black uppercase">
                      COMPLETED / ARCHIVED
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
