import React, { useState } from 'react';
import { 
  Wrench, AlertCircle, Clock, CheckCircle2, ChevronRight, Search, 
  Filter, User, FileText, ClipboardList, Package, Activity, 
  MoreVertical, ArrowLeft, PenTool as Tool, Play, CheckCircle, Zap,
  ShieldCheck, ShieldAlert, BarChart3, Star, TrendingUp, Users,
  Microscope, Settings, HelpCircle, HardDrive, Cpu, Droplets, ZapOff,
  ChevronDown, Terminal, Database
} from 'lucide-react';
import { useERPData } from '../hooks/useERPData';
import { cn } from '../lib/utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

export const Service: React.FC = () => {
  const { data, loading, refetch } = useERPData();
  const [view, setView] = useState<'dashboard' | 'detail' | 'analytics'>('dashboard');
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [updateForm, setUpdateForm] = useState({ stage: '', rootCause: '', notes: '', engineer: '', serial: '', type: '', date: '' });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Diagnostic Logs persistent list state
  const diagnosticLogs = data?.diagnosticLogs || [];

  const handleAction = (actionName: string, callback: () => void | Promise<void>) => {
    if (isSyncing) return;
    setIsSyncing(true);
    setTimeout(async () => {
      await callback();
      setIsSyncing(false);
    }, 100);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[500px]">
      <Wrench className="animate-spin text-primary-600 mb-6" size={48} />
      <span className="font-black text-xs uppercase tracking-[0.3em] text-slate-400">Initializing Service Intelligence Node...</span>
    </div>
  );

  const complaints = data?.complaints || [];
  const activeComplaint = selectedComplaint 
    ? (complaints.find((c: any) => c.id === selectedComplaint.id) || selectedComplaint) 
    : null;
  const engineers = data?.engineers || [];
  const failureCats = data?.failureCategories || [];

  // KPI Calculations
  const openComplaints = complaints.filter((c: any) => c.status === 'OPEN').length;
  const pendingRepairs = complaints.filter((c: any) => ['REGISTERED', 'RECEIVED', 'UNDER_INSPECTION', 'REPAIR_STARTED'].includes(c.stage)).length;
  const readyDispatch = complaints.filter((c: any) => c.stage === 'READY_FOR_DISPATCH' || c.stage === 'QC_PASSED').length;
  const closedCases = complaints.filter((c: any) => c.status === 'RESOLVED' || c.status === 'CLOSED').length;
  
  // Failure Analytics Data
  const failureData = failureCats.map(cat => ({
     name: cat,
     value: complaints.filter(c => c.rootCause === cat).length
  })).filter(d => d.value > 0);

  const COLORS = ['#0891b2', '#0284c7', '#d97706', '#dc2626', '#7c3aed'];

  const handleUpdate = async () => {
    if (!selectedComplaint) return;
    await fetch(`/api/complaints/${selectedComplaint.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
          ...updateForm,
          status: (updateForm.stage === 'CLOSED' || updateForm.stage === 'DELIVERED') ? 'RESOLVED' : 'OPEN',
          resolvedDate: (updateForm.stage === 'CLOSED' || updateForm.stage === 'DELIVERED') ? new Date().toISOString().split('T')[0] : selectedComplaint.resolvedDate
      })
    });

    const now = new Date();
    const timestampStr = now.toISOString().replace('T', ' ').substring(0, 19);
    const newLog = {
      id: `LOG-UPD-${Date.now()}`,
      nodeId: selectedComplaint.id,
      serial: updateForm.serial || selectedComplaint.serial,
      timestamp: timestampStr,
      stage: updateForm.stage,
      rootCause: updateForm.rootCause || 'Pending Scrutiny',
      notes: updateForm.notes || 'Status node updated with parameters.',
      engineer: updateForm.engineer || selectedComplaint.engineer || 'System Operator'
    };
    await fetch('/api/diagnostic-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLog)
    });

    setView('dashboard');
    refetch();
  };

  const handleDelete = async () => {
    if (!selectedComplaint) return;
    await fetch(`/api/complaints/${selectedComplaint.id}`, {
      method: 'DELETE'
    });
    setConfirmDelete(false);
    setSelectedComplaint(null);
    setView('dashboard');
    refetch();
  };

  return (
    <div className={cn("space-y-12 pb-20 transition-all duration-500", isSyncing && "opacity-50 blur-[1px]")}>
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Service Operations</h2>
          <div className="flex items-center mt-2 space-x-4">
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                <Tool size={14} className="mr-2 text-primary-600" /> LifeCycle Maintenance Node
             </p>
             <span className="h-1 w-1 rounded-full bg-slate-300"></span>
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                Open Tickets: {openComplaints}
             </p>
          </div>
        </div>
        <div className="flex bg-slate-100/90 p-1.5 rounded-3xl border border-slate-200 backdrop-blur-md overflow-x-auto max-w-full gap-1">
            {[
              { id: 'dashboard', label: 'Monitor & RMA Tickets', icon: Activity, color: 'bg-rose-500', activeClass: 'bg-rose-600 text-white shadow-lg shadow-rose-200 border-rose-700' },
              { id: 'analytics', label: 'Failure & MTBF Analysis', icon: Microscope, color: 'bg-red-500', activeClass: 'bg-red-600 text-white shadow-lg shadow-red-200 border-red-700' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => handleAction(`Switch to ${tab.label}`, () => setView(tab.id as any))}
                className={cn(
                  "flex items-center px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 cursor-pointer shrink-0 border",
                  view === tab.id
                    ? cn(tab.activeClass, "scale-[1.02]")
                    : "bg-white/80 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-white shadow-xs"
                )}
              >
                <span className={cn("w-2 h-2 rounded-full mr-2 shrink-0 transition-all", tab.color, view === tab.id ? "bg-white animate-pulse" : "")} />
                <tab.icon size={14} className="mr-2 shrink-0" />
                {tab.label}
              </button>
            ))}
        </div>
      </div>

      {view === 'dashboard' ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-12">
            {/* KPI Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
               {[
                 { label: 'Open Complaints', value: openComplaints, icon: AlertCircle, color: 'text-amber-600', note: 'Priority Grid' },
                 { label: 'Pending Repairs', value: pendingRepairs, icon: Tool, color: 'text-blue-600', note: 'In-Circuit' },
                 { label: 'Dispatch Ready', value: readyDispatch, icon: Package, color: 'text-emerald-600', note: 'QC Passed' },
                 { label: 'Closed Ledger', value: closedCases, icon: CheckCircle2, color: 'text-primary-600', note: 'Finalized' }
               ].map((kpi, i) => (
                 <div key={i} className="bg-white p-8 rounded-[3rem] border border-slate-100 relative overflow-hidden group hover:scale-[1.02] transition-all cursor-pointer shadow-xl shadow-slate-200/50">
                    <div className={cn("absolute -right-4 -top-4 opacity-[0.05] group-hover:opacity-10 transition-all", kpi.color)}>
                       <kpi.icon size={120} />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{kpi.label}</p>
                    <p className="text-5xl font-black text-slate-900 italic tracking-tighter mb-4">{kpi.value}</p>
                    <span className={cn("px-3 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest", kpi.color, "bg-slate-50 border border-slate-100")}>
                       {kpi.note}
                    </span>
                 </div>
               ))}
            </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
               {/* Left: Complaints List */}
               <div className="lg:col-span-2 bg-white rounded-[3.5rem] border border-slate-100 overflow-hidden shadow-2xl flex flex-col min-h-[600px] shadow-slate-200/50">
                  <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                     <div>
                        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Live Service Pool</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2 italic decoration-primary-500 decoration-2 underline underline-offset-4">RMA Processing Nodes</p>
                     </div>
                     <div className="bg-slate-100 p-2 rounded-2xl flex items-center border border-slate-200">
                        <Search size={18} className="text-slate-400 ml-2" />
                        <input 
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                          className="bg-transparent border-none text-[10px] font-black text-slate-900 placeholder-slate-400 outline-none w-40 uppercase tracking-widest px-4 focus:ring-0" 
                          placeholder="SCRUTINY FILTER..." 
                        />
                        {searchTerm && (
                          <button 
                            onClick={() => setSearchTerm('')}
                            className="text-slate-400 hover:text-slate-700 text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-200 hover:bg-slate-300 transition-colors cursor-pointer"
                            title="Clear Scrutiny Filter"
                          >
                            ✕
                          </button>
                        )}
                     </div>
                  </div>
                  <div className="overflow-x-auto flex-1 font-mono">
                     <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] border-b border-slate-100">
                           <tr>
                              <th className="px-10 py-6">Complaint Node</th>
                              <th className="px-10 py-6">Serial / Axis</th>
                              <th className="px-10 py-6">Stage</th>
                              <th className="px-10 py-6 text-right">Action</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                           {complaints.slice().reverse().filter((c: any) => {
                              if (!searchTerm) return true;
                              const s = searchTerm.toLowerCase();
                              return (
                                c.id.toLowerCase().includes(s) ||
                                c.serial.toLowerCase().includes(s) ||
                                (c.type || '').toLowerCase().includes(s) ||
                                c.stage.toLowerCase().includes(s) ||
                                (c.notes || '').toLowerCase().includes(s) ||
                                (c.rootCause || '').toLowerCase().includes(s)
                              );
                           }).map((c: any) => (
                              <tr key={c.id} className="hover:bg-slate-50 transition-all group duration-300">
                                 <td className="px-10 py-8">
                                    <p className="text-[14px] font-black text-slate-900 uppercase tracking-widest leading-none group-hover:text-primary-600 transition-colors">{c.id}</p>
                                    <p className="text-[9px] text-slate-400 font-black uppercase mt-3 tracking-widest flex items-center">
                                       <Clock size={12} className="mr-1.5" /> {c.date}
                                    </p>
                                 </td>
                                 <td className="px-10 py-8">
                                    <p className="text-[11px] font-black text-slate-700 tracking-[0.2em] mb-1.5">{c.serial}</p>
                                    <div className="flex items-center space-x-2">
                                       <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
                                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{c.type}</span>
                                    </div>
                                 </td>
                                 <td className="px-10 py-8">
                                    <span className={cn(
                                       "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center w-fit",
                                       c.status === 'RESOLVED' || c.status === 'CLOSED' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-blue-50 text-blue-600 border border-blue-100"
                                    )}>
                                       {c.stage.replace('_', ' ')}
                                    </span>
                                 </td>
                                 <td className="px-10 py-8 text-right">
                                    <button 
                                      onClick={() => { setSelectedComplaint(c); setUpdateForm({ stage: c.stage, rootCause: c.rootCause || '', notes: c.notes, engineer: c.engineer }); setView('detail'); }}
                                      className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-primary-600 hover:bg-primary-50 transition-all active:scale-90 border border-slate-100"
                                    >
                                       <ChevronRight size={20} />
                                    </button>
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </div>

               {/* Right: Engineer Matrix */}
               <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 flex flex-col justify-between overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-500/[0.02] to-transparent pointer-events-none"></div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 italic flex items-center uppercase tracking-tight mb-10">
                       <Users className="mr-3 text-primary-600" /> Technician Efficiency
                    </h3>
                    <div className="space-y-6">
                       {engineers.map((e: any) => {
                          const solvedCount = complaints.filter((c: any) => 
                             c.engineer === e.name && (c.status === 'RESOLVED' || c.status === 'CLOSED' || c.stage === 'CLOSED' || c.stage === 'DELIVERED')
                          ).length;
                          const displaySolved = Math.max(e.casesSolved || 0, solvedCount);
                          const isFiltered = searchTerm.toLowerCase() === e.name.toLowerCase();

                          return (
                             <button 
                                key={e.id} 
                                onClick={() => setSearchTerm(isFiltered ? '' : e.name)}
                                className={cn(
                                   "w-full text-left p-6 rounded-3xl border flex items-center justify-between group transition-all cursor-pointer active:scale-95",
                                   isFiltered 
                                      ? "bg-primary-50 border-primary-400 shadow-md ring-2 ring-primary-500/20" 
                                      : "bg-slate-50 border-slate-100 hover:border-primary-200 hover:bg-slate-100/80"
                                )}
                                title={`Click to filter live service pool by ${e.name}`}
                             >
                                <div className="flex items-center space-x-4">
                                   <div className={cn(
                                      "h-12 w-12 rounded-2xl flex items-center justify-center font-black border transition-colors",
                                      isFiltered ? "bg-primary-600 text-white border-primary-600" : "bg-white text-primary-600 border-slate-100"
                                   )}>
                                      {e.name[0]}
                                   </div>
                                   <div>
                                      <p className="text-[12px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                         {e.name}
                                         {isFiltered && (
                                            <span className="text-[8px] font-bold bg-primary-600 text-white px-2 py-0.5 rounded-full uppercase tracking-normal">ACTIVE FILTER</span>
                                         )}
                                      </p>
                                      <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-widest">TAT: {e.avgTat || 2} Days</p>
                                   </div>
                                </div>
                                <div className="text-right">
                                   <p className="text-xl font-black text-slate-900 italic tracking-tighter">{displaySolved}</p>
                                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">SOLVED</p>
                                </div>
                             </button>
                          );
                       })}
                    </div>
                  </div>
                  <div className="mt-12 p-8 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200 text-center">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Unit Recovery KPI</p>
                     <p className="text-5xl font-black text-slate-900 tracking-tighter italic underline decoration-primary-500 decoration-4">98.4%</p>
                  </div>
               </div>
            </div>
        </div>
      ) : false ? (
         <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-12">
            {/* Search and control filter */}
            <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/45 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Diagnostic Commands Registry</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1.5 italic">Real-time ledger of device root cause analysis & stage transitions</p>
                </div>
                <div className="bg-slate-100 p-3 rounded-2xl flex items-center border border-slate-200 min-w-[320px]">
                    <Search size={18} className="text-slate-400 ml-2" />
                    <input 
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="bg-transparent border-none text-xs font-black text-slate-900 placeholder-slate-400 outline-none w-full uppercase tracking-widest px-4 focus:ring-0" 
                      placeholder="SEARCH DIAGNOSTICS..." 
                    />
                </div>
            </div>

            {/* Diagnostic Command Table */}
            <div className="bg-white rounded-[3.5rem] border border-slate-100 overflow-hidden shadow-2xl shadow-slate-200/45">
               <div className="overflow-x-auto font-mono">
                  <table className="w-full text-left font-mono">
                     <thead className="bg-[#f8fafc] text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] border-b border-slate-100">
                        <tr>
                           <th className="px-10 py-6">Complaint Reference</th>
                           <th className="px-10 py-6">Operational Stage</th>
                           <th className="px-10 py-6">Root Cause Matrix (RCA)</th>
                           <th className="px-10 py-6">Technical Field Notes</th>
                           <th className="px-10 py-6">Engineer</th>
                           <th className="px-10 py-6 text-right">Diagnostic Deck</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                        {complaints.filter((c: any) => {
                           if (!searchTerm) return true;
                           const s = searchTerm.toLowerCase();
                           return (
                             c.id.toLowerCase().includes(s) ||
                             c.serial.toLowerCase().includes(s) ||
                             (c.type || '').toLowerCase().includes(s) ||
                             c.stage.toLowerCase().includes(s) ||
                             (c.notes || '').toLowerCase().includes(s) ||
                             (c.rootCause || '').toLowerCase().includes(s)
                           );
                        }).length === 0 ? (
                           <tr>
                              <td colSpan={6} className="px-10 py-16 text-center text-slate-400 font-bold uppercase tracking-[0.2em]">
                                 No matching diagnostic nodes found.
                              </td>
                           </tr>
                        ) : (
                           complaints.filter((c: any) => {
                              if (!searchTerm) return true;
                              const s = searchTerm.toLowerCase();
                              return (
                                c.id.toLowerCase().includes(s) ||
                                c.serial.toLowerCase().includes(s) ||
                                (c.type || '').toLowerCase().includes(s) ||
                                c.stage.toLowerCase().includes(s) ||
                                (c.notes || '').toLowerCase().includes(s) ||
                                (c.rootCause || '').toLowerCase().includes(s)
                              );
                           }).map((c: any) => (
                              <tr key={c.id} className="hover:bg-slate-50/70 transition-all duration-300">
                                 <td className="px-10 py-8">
                                    <span className="text-[13px] font-black text-slate-900 tracking-wider block">{c.id}</span>
                                    <span className="text-[9px] text-slate-400 uppercase mt-1 tracking-wider block">{c.serial}</span>
                                 </td>
                                 <td className="px-10 py-8">
                                    <span className={cn(
                                       "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center w-fit",
                                       c.stage === 'CLOSED' || c.stage === 'QC_PASSED' || c.stage === 'READY_FOR_DISPATCH'
                                         ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                                         : "bg-cyan-50 text-cyan-600 border border-cyan-100"
                                    )}>
                                       {c.stage.replace(/_/g, ' ')}
                                    </span>
                                 </td>
                                 <td className="px-10 py-8 border-none bg-transparent">
                                    <span className={cn(
                                       "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest block w-fit",
                                       c.rootCause ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-slate-100 text-slate-400 border border-slate-200"
                                    )}>
                                       {c.rootCause || 'PENDING SCRUTINY'}
                                    </span>
                                 </td>
                                 <td className="px-10 py-8 max-w-[280px]">
                                    <p className="text-slate-800 italic font-medium leading-relaxed line-clamp-2">
                                       {c.notes ? `"${c.notes}"` : '—'}
                                    </p>
                                 </td>
                                 <td className="px-10 py-8 text-slate-700 font-bold uppercase tracking-wider">
                                    {c.engineer}
                                 </td>
                                 <td className="px-10 py-8 text-right">
                                    <button 
                                      onClick={() => { 
                                         setSelectedComplaint(c); 
                                         setUpdateForm({ 
                                            stage: c.stage, 
                                            rootCause: c.rootCause || '', 
                                            notes: c.notes || '', 
                                            engineer: c.engineer || 'Unassigned',
                                            serial: c.serial || '',
                                            type: c.type || '',
                                            date: c.date || ''
                                         }); 
                                         setConfirmDelete(false);
                                         setView('detail'); 
                                      }}
                                      className="inline-flex items-center space-x-2 px-5 py-2.5 bg-cyan-50 text-[#06b6d4] hover:bg-[#06b6d4] hover:text-white rounded-xl transition-all duration-300 font-black uppercase text-[10px] tracking-wider border border-cyan-100 cursor-pointer"
                                    >
                                       <Wrench size={12} />
                                       <span>Scrutinize Node</span>
                                    </button>
                                 </td>
                              </tr>
                           ))
                        )}
                     </tbody>
                  </table>
               </div>
            </div>
         </div>
      ) : view === 'analytics' ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-12">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-2xl overflow-hidden relative shadow-slate-200/50">
                 <h3 className="text-2xl font-black text-slate-900 italic flex items-center uppercase tracking-tight mb-12">
                    <Microscope size={24} className="mr-4 text-primary-600" /> Root Cause Breakdown
                 </h3>
                 <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                          <Pie
                            data={failureData}
                            cx="50%"
                            cy="50%"
                            innerRadius={100}
                            outerRadius={140}
                            paddingAngle={8}
                            dataKey="value"
                          >
                             {failureData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                             ))}
                          </Pie>
                          <Tooltip 
                             contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', fontWeight: 900, color: '#0f172a' }}
                          />
                          <Legend />
                       </PieChart>
                    </ResponsiveContainer>
                 </div>
              </div>

              <div className="space-y-8">
                 <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/50">
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8 italic">Failure Categorization Matrix</h4>
                    <div className="grid grid-cols-1 gap-4">
                       {[
                         { id: 'cell', label: 'Cell Failure', icon: Cpu, color: 'text-red-600', bColor: 'bg-red-50' },
                         { id: 'bms', label: 'BMS Failure', icon: Zap, color: 'text-amber-600', bColor: 'bg-amber-50' },
                         { id: 'charger', label: 'Charger Node Fault', icon: Settings, color: 'text-blue-600', bColor: 'bg-blue-50' },
                         { id: 'water', label: 'External Water Damage', icon: Droplets, color: 'text-cyan-600', bColor: 'bg-cyan-50' },
                         { id: 'drop', label: 'Voltage Drop Delta', icon: ZapOff, color: 'text-purple-600', bColor: 'bg-purple-50' }
                       ].map((cat) => {
                          const count = complaints.filter(c => c.rootCause === cat.label).length;
                          return (
                             <div key={cat.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between group hover:border-slate-300 transition-all">
                                <div className="flex items-center space-x-6">
                                   <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center border", cat.color, cat.bColor, "border-slate-100 group-hover:scale-110 transition-transform duration-500")}>
                                      <cat.icon size={22} />
                                   </div>
                                   <div>
                                      <p className="text-[13px] font-black text-slate-900 uppercase tracking-widest">{cat.label}</p>
                                      <div className="w-32 h-1 bg-slate-200 rounded-full mt-2 overflow-hidden">
                                         <div className={cn("h-full", cat.color.replace('text', 'bg'))} style={{ width: `${(count / complaints.length) * 100}%` }}></div>
                                      </div>
                                   </div>
                                </div>
                                <p className="text-3xl font-black text-slate-900 italic tracking-tighter">{count}</p>
                             </div>
                          );
                       })}
                    </div>
                 </div>
              </div>
           </div>
        </div>
      ) : (
        (() => {
          const compToRender = activeComplaint || selectedComplaint;
          if (!compToRender) return null;
          return (
            <div className="animate-in slide-in-from-right duration-500 space-y-12">
            <button 
              onClick={() => handleAction("Return to Monitor", () => setView('dashboard'))} 
              className="flex items-center text-slate-400 hover:text-slate-900 font-black text-[10px] uppercase tracking-[0.3em] transition-all bg-slate-50 px-6 py-2.5 rounded-xl border border-slate-100"
            >
               <ArrowLeft size={16} className="mr-2" /> DISCARD DIAGNOSTIC VIEW
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
               <div className="lg:col-span-2 space-y-8">
                  {/* Service Ticket Detail */}
                  <div className="bg-white rounded-[4rem] p-12 border border-slate-100 relative overflow-hidden shadow-4xl shadow-slate-200/50 group">
                     <div className="absolute top-0 right-0 p-12 opacity-[0.02] group-hover:rotate-12 transition-transform duration-1000 text-slate-900">
                        <Wrench size={240} />
                     </div>
                     <div className="relative z-10">
                        <div className="flex justify-between items-start mb-16">
                           <div>
                              <span className="text-[10px] font-black text-primary-600 uppercase tracking-[0.4em] italic block mb-3">Diagnostic Artifact Control Unit</span>
                              <h3 className="text-6xl font-black text-slate-900 italic tracking-tighter leading-none">{compToRender.id}</h3>
                              <div className="flex items-center mt-6 space-x-6">
                                 <p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em] font-mono">SER_REF: {compToRender.serial}</p>
                                 <span className="h-1 w-1 bg-slate-200 rounded-full"></span>
                                 <p className="text-[12px] font-black text-primary-600 uppercase tracking-[0.2em] italic">{compToRender.type}</p>
                              </div>
                           </div>
                           <div className="text-right">
                              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2">Registration Dt.</p>
                              <p className="text-2xl font-black text-slate-900 italic underline decoration-primary-500 decoration-2 underline-offset-8">{compToRender.date}</p>
                           </div>
                        </div>

                        {/* Visual Stage Roadmap */}
                        <div className="flex items-center justify-between relative px-2 mb-12">
                           <div className="absolute h-0.5 w-full bg-slate-100 top-6 left-0"></div>
                           {data.serviceStages.map((stage: string, idx: number) => {
                              const currentIdx = data.serviceStages.indexOf(compToRender.stage);
                              const isCompleted = idx <= currentIdx;
                              const isCurrent = idx === currentIdx;
                              return (
                                 <div key={stage} className="relative z-10 flex flex-col items-center group/stage">
                                    <div className={cn(
                                       "h-12 w-12 rounded-[1.25rem] border-2 flex items-center justify-center transition-all duration-700 font-black text-[10px]",
                                       isCurrent ? "bg-primary-600 border-primary-400 text-white shadow-[0_0_20px_rgba(8,145,178,0.4)] scale-110" :
                                       isCompleted ? "bg-primary-50 border-primary-200 text-primary-600" : "bg-white border-slate-100 text-slate-200"
                                    )}>
                                       {isCompleted && !isCurrent ? <CheckCircle size={18} /> : (idx + 1)}
                                    </div>
                                    <p className={cn(
                                       "absolute top-16 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-center leading-tight w-20 max-w-[80px] transition-all",
                                       isCurrent ? "text-slate-900 font-black scale-105 opacity-100" :
                                       isCompleted ? "text-slate-700 font-semibold group-hover/stage:text-slate-900 group-hover/stage:opacity-100" :
                                       "text-slate-500 opacity-80 group-hover/stage:opacity-100"
                                    )}>
                                       {stage.replace(/_/g, ' ')}
                                    </p>
                                 </div>
                              );
                           })}
                        </div>
                     </div>
                  </div>

                  {/* Technical Analysis Data */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="bg-white p-10 rounded-[3rem] border border-slate-100 border-dashed group shadow-lg shadow-slate-200/50">
                        <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-6 flex items-center">
                           <HelpCircle size={14} className="mr-2" /> Symptom Description
                        </h4>
                        <p className="text-sm font-black text-slate-900 leading-relaxed italic group-hover:text-primary-600 transition-colors">"{compToRender.notes}"</p>
                     </div>
                     <div className="bg-primary-50/30 p-10 rounded-[3rem] border border-primary-100 border-dashed group shadow-lg shadow-slate-200/50">
                        <h4 className="text-[10px] font-black text-primary-600 uppercase tracking-[0.3em] mb-6 flex items-center">
                           <Settings size={14} className="mr-2" /> Engineering Observations
                        </h4>
                        <p className="text-sm font-black text-slate-900 leading-relaxed italic">Technician {compToRender.engineer} is actively scrutinizing the circuit matrix and cell chemistry for potential delta drift.</p>
                     </div>
                  </div>

                  {/* Diagnostic Log History Table (Historical Ledger Segment) */}
                  {(() => {
                     const rawLogs = diagnosticLogs.filter((log: any) => log.nodeId === compToRender.id);
                     const nodeLogs = rawLogs.length > 0 ? rawLogs : [
                        {
                           id: `TX-${compToRender.id}-BASE`,
                           nodeId: compToRender.id,
                           serial: compToRender.serial || 'SYSTEM-SERIAL',
                           timestamp: (compToRender.date || '2024-05-08') + ' 09:00:00',
                           stage: compToRender.stage || 'REGISTERED',
                           rootCause: compToRender.rootCause || compToRender.type || 'INSPECTION BASELINE',
                           notes: compToRender.notes || 'System ticket registered and initial diagnostic baseline recorded.',
                           engineer: compToRender.engineer || 'System Operator'
                        }
                     ];

                     return (
                        <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-2xl shadow-slate-200/40">
                           <div className="flex justify-between items-center mb-8 border-b border-slate-50 pb-6">
                              <div>
                                 <h4 className="text-lg font-black text-slate-950 uppercase tracking-tight italic flex items-center">
                                    <Terminal size={18} className="mr-2 text-[#06b6d4]" /> Diagnostic Command Historical Ledger
                                 </h4>
                                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Audit log of system handshakes and manual overrides for {compToRender.id}</p>
                              </div>
                              <span className="bg-cyan-50 text-cyan-600 border border-cyan-100 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest font-mono">
                                 {nodeLogs.length} Handshakes Logged
                              </span>
                           </div>

                           <div className="overflow-x-auto">
                              <table className="w-full text-left font-mono text-xs">
                                 <thead className="bg-[#f8fafc] text-slate-400 text-[9px] font-black uppercase tracking-widest border-b border-slate-100">
                                    <tr>
                                       <th className="px-6 py-4">Transaction Reference</th>
                                       <th className="px-6 py-4">Operational Stage</th>
                                       <th className="px-6 py-4">Root Cause Matrix (RCA)</th>
                                       <th className="px-6 py-4">Commit Notes</th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-100">
                                    {nodeLogs.map((log: any) => (
                                       <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                          <td className="px-6 py-5">
                                             <span className="font-extrabold text-slate-900 block">{log.id.replace('LOG-UPD-', 'TX-').replace('LOG-', 'TX-')}</span>
                                             <span className="text-[9px] text-slate-400 block mt-1">{log.timestamp}</span>
                                          </td>
                                          <td className="px-6 py-5">
                                             <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-800 border border-slate-200 text-[9px] font-extrabold uppercase">
                                                {log.stage ? log.stage.replace(/_/g, ' ') : 'REGISTERED'}
                                             </span>
                                          </td>
                                          <td className="px-6 py-5">
                                             <span className="px-2.5 py-1 rounded bg-slate-100 text-amber-700 border border-amber-100 text-[9px] font-extrabold uppercase">
                                                {log.rootCause || 'PENDING'}
                                             </span>
                                          </td>
                                          <td className="px-6 py-5 text-slate-600 italic leading-relaxed max-w-[280px]">
                                             "{log.notes}"
                                          </td>
                                       </tr>
                                    ))}
                                 </tbody>
                              </table>
                           </div>
                        </div>
                     );
                  })()}
               </div>

               {/* Command Sidebar */}
               <div className="space-y-8">
                  <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-2xl shadow-slate-200/40 sticky top-8">
                     <h3 className="text-2xl font-extrabold text-[#0B1F3A] italic uppercase mb-1 tracking-tight font-sans">Diagnostic Command</h3>
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-8">Update parameters or transition states</p>
                     
                     <div className="space-y-6">
                        {/* --- Section A: Node Parameters (EDIT fields) --- */}
                        <div className="p-6 bg-slate-50/70 rounded-3xl border border-slate-100 space-y-4">
                           <p className="text-[9px] font-black text-[#06b6d4] uppercase tracking-widest block mb-1">Ticket Parameters</p>
                           
                           <div className="space-y-2">
                              <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Serial Reference</label>
                              <input 
                                 type="text" 
                                 className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-950 focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                                 value={updateForm.serial}
                                 onChange={e => setUpdateForm({ ...updateForm, serial: e.target.value })}
                              />
                           </div>

                           <div className="space-y-2">
                              <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Issue Classification</label>
                              <input 
                                 type="text" 
                                 className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-950 focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                                 value={updateForm.type}
                                 onChange={e => setUpdateForm({ ...updateForm, type: e.target.value })}
                              />
                           </div>

                           <div className="space-y-2">
                              <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Registration Date</label>
                              <input 
                                 type="text" 
                                 className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-slate-950 focus:ring-2 focus:ring-cyan-500 outline-none transition-all"
                                 value={updateForm.date}
                                 onChange={e => setUpdateForm({ ...updateForm, date: e.target.value })}
                              />
                           </div>

                           <div className="space-y-2">
                              <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Assigned Engineer</label>
                              <div className="relative">
                                 <select 
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-950 focus:ring-2 focus:ring-cyan-500 outline-none transition-all cursor-pointer appearance-none relative pr-10"
                                    value={updateForm.engineer}
                                    onChange={e => setUpdateForm({ ...updateForm, engineer: e.target.value })}
                                 >
                                    <option value="Unassigned">Unassigned</option>
                                    {engineers.map((eng: any) => <option key={eng.id} value={eng.name}>{eng.name}</option>)}
                                 </select>
                                 <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-500">
                                    <ChevronDown size={14} />
                                 </div>
                              </div>
                           </div>
                        </div>

                        {/* --- Section B: Node State (Stage/RCA overrides) --- */}
                        <div className="space-y-4 pt-2">
                           <div className="space-y-3">
                              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Operational Stage</label>
                              <div className="relative">
                                 <select 
                                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-[1.25rem] px-6 py-4.5 text-xs font-extrabold text-slate-950 italic uppercase focus:ring-2 focus:ring-cyan-500 focus:bg-white outline-none transition-all cursor-pointer appearance-none relative pr-12"
                                    value={updateForm.stage}
                                    onChange={e => setUpdateForm({ ...updateForm, stage: e.target.value })}
                                 >
                                    {data.serviceStages.map((s: string) => <option key={s} value={s} className="bg-white">{s.replace('_', ' ')}</option>)}
                                 </select>
                                 <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none text-slate-800">
                                    <ChevronDown size={14} />
                                 </div>
                              </div>
                           </div>

                           <div className="space-y-3 pb-4 border-b border-slate-100">
                              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Root Cause Matrix (RCA)</label>
                              <div className="relative">
                                 <select 
                                    className="w-full bg-[#f8fafc] border border-slate-200 rounded-[1.25rem] px-6 py-4.5 text-xs font-extrabold text-slate-950 italic uppercase focus:ring-2 focus:ring-cyan-500 focus:bg-white outline-none transition-all cursor-pointer appearance-none relative pr-12"
                                    value={updateForm.rootCause}
                                    onChange={e => setUpdateForm({ ...updateForm, rootCause: e.target.value })}
                                 >
                                    <option value="" className="bg-white">PENDING SCRUTINY</option>
                                    {failureCats.map((f: string) => <option key={f} value={f} className="bg-white">{f}</option>)}
                                 </select>
                                 <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none text-slate-800">
                                    <ChevronDown size={14} />
                                 </div>
                              </div>
                           </div>

                           <div className="space-y-3">
                              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Technical Field Notes</label>
                              <textarea 
                                 className="w-full bg-[#f8fafc] border border-slate-200 rounded-[1.5rem] px-6 py-5 text-xs font-black text-slate-950 italic focus:ring-2 focus:ring-cyan-500 focus:bg-white outline-none transition-all h-36 resize-none placeholder:text-slate-300 font-sans tracking-wide leading-relaxed" 
                                 placeholder="Commit diagnostic observations..."
                                 value={updateForm.notes}
                                 onChange={e => setUpdateForm({ ...updateForm, notes: e.target.value })}
                              />
                           </div>
                        </div>

                        <button 
                           onClick={handleUpdate}
                           className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-5 rounded-full font-extrabold uppercase text-[12px] tracking-[0.2em] active:scale-95 transition-all shadow-xl shadow-emerald-500/15 flex items-center justify-center space-x-2 border-none cursor-pointer"
                        >
                           <span>Update Node State</span>
                           <ChevronRight size={16} className="text-white mt-0.5" />
                        </button>

                        {/* --- Section C: Danger Zone (DELETE functionality) --- */}
                        <div className="pt-6 border-t border-slate-100 space-y-3">
                           <label className="text-[10px] font-extrabold text-red-500 uppercase tracking-widest block">Danger Zone</label>
                           {!confirmDelete ? (
                              <button 
                                 type="button"
                                 onClick={() => setConfirmDelete(true)}
                                 className="w-full bg-red-50 hover:bg-red-100 text-red-600 py-4 rounded-full font-extrabold uppercase text-[10px] tracking-[0.2em] transition-all flex items-center justify-center space-x-2 border border-red-200 cursor-pointer"
                              >
                                 <span>Delete Ticket Node</span>
                              </button>
                           ) : (
                              <div className="space-y-2 p-4 bg-red-50/50 rounded-2xl border border-red-100">
                                 <p className="text-[9px] font-black text-red-600 uppercase tracking-widest text-center">Are you absolutely sure?</p>
                                 <div className="grid grid-cols-2 gap-2">
                                    <button 
                                       type="button"
                                       onClick={handleDelete}
                                       className="bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-extrabold uppercase text-[9px] tracking-widest transition-all border-none cursor-pointer"
                                    >
                                       Confirm Delete
                                    </button>
                                    <button 
                                       type="button"
                                       onClick={() => setConfirmDelete(false)}
                                       className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-extrabold uppercase text-[9px] tracking-widest transition-all border border-slate-200 cursor-pointer"
                                    >
                                       Cancel
                                    </button>
                                 </div>
                              </div>
                           )}
                        </div>
                     </div>
                  </div>

                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 flex items-center group hover:bg-slate-50 transition-all cursor-crosshair shadow-lg shadow-slate-200/50">
                     <div className="h-14 w-14 rounded-2xl bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-600 mr-6 shadow-xl shadow-primary-500/5 group-hover:scale-110 transition-transform">
                        <ShieldCheck size={32} />
                     </div>
                     <div>
                        <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest leading-none">Integrity Lock</p>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2 italic">Standardized RMA Protocol Active</p>
                     </div>
                  </div>
               </div>
            </div>
         </div>
          );
        })()
      )}
    </div>
  );
};
